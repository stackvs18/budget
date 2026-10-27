/**
 * Production server: serves the built app (dist/) plus /api/data.
 * Runs directly with Node 22.18+ (built-in TypeScript type stripping): `npm run serve`.
 *
 * Environment:
 *   PORT             port to listen on (default 5050)
 *   HOST             interface to bind (default 127.0.0.1, use 0.0.0.0 on a host like Render)
 *   DATA_DIR         folder that holds data.json (default: the project folder)
 *   BUDGET_PASSWORD  password for the browser login prompt; required when HOST isn't local
 *   OPEN_BROWSER     set to 1 to open the app in the default browser once it's running
 */
import { exec } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createDataHandler } from './data-api.ts';

const root = path.resolve(import.meta.dirname, '..');
const distDir = path.join(root, 'dist');
const dataDir = path.resolve(process.env.DATA_DIR ?? root);
const port = Number(process.env.PORT) || 5050;
const host = process.env.HOST ?? '127.0.0.1';
const password = process.env.BUDGET_PASSWORD ?? '';
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);

if (!isLocal && !password) {
  console.error(`Refusing to listen on ${host} without BUDGET_PASSWORD: anyone could read and edit your budget.`);
  process.exit(1);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const digest = (value: string) => createHash('sha256').update(value).digest();
const expected = digest(password);

/** HTTP Basic auth: any username, the password must match BUDGET_PASSWORD. */
function authorized(req: http.IncomingMessage) {
  if (!password) return true;
  const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Basic' || !encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const given = decoded.slice(decoded.indexOf(':') + 1);
  return timingSafeEqual(digest(given), expected);
}

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  const requested = path.normalize(path.join(distDir, decoded));
  // Must stay inside dist/ (the separator also rules out siblings like "dist-old").
  if (requested !== distDir && !requested.startsWith(distDir + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  // Anything that isn't a real file gets the app shell.
  let file = requested;
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) file = path.join(distDir, 'index.html');

  const body = await fs.readFile(file);
  const hashed = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

await fs.mkdir(dataDir, { recursive: true });
try {
  await fs.access(path.join(distDir, 'index.html'));
} catch {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}

const api = createDataHandler(dataDir);

http
  .createServer((req, res) => {
    // Open health check for hosting platforms; reveals nothing.
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
      return;
    }
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Budget", charset="UTF-8"' }).end('Password required');
      return;
    }
    api(req, res, () => {
      serveStatic(req, res).catch((err) => {
        console.error(err);
        if (!res.headersSent) res.writeHead(500);
        res.end('Server error');
      });
    });
  })
  .listen(port, host, () => {
    const url = `http://${isLocal ? '127.0.0.1' : host}:${port}`;
    console.log(`Budget running at ${url}`);
    console.log(`Data: ${path.join(dataDir, 'data.json')}${password ? ' · password protected' : ''}`);
    if (process.env.OPEN_BROWSER === '1') openBrowser(url);
  });

function openBrowser(url: string) {
  const command = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(command);
}
