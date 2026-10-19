import fs from 'node:fs/promises';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

const MAX_BODY = 2_000_000;

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Middleware for GET/PUT /api/data, backed by data.json in `dataDir`.
 * GET returns `null` when there is no data yet, so the client falls back to seed.json.
 * The first GET of each server run copies data.json to data.backup.json as a restore point.
 * Shared by the Vite dev server (below) and the production server (serve.ts).
 */
export function createDataHandler(dataDir: string): Connect.NextHandleFunction {
  const dataFile = path.join(dataDir, 'data.json');
  const backupFile = path.join(dataDir, 'data.backup.json');
  let backedUp = false;

  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/data') return next();

    const send = (status: number, body = '', type = 'application/json; charset=utf-8') => {
      res.statusCode = status;
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
    };

    try {
      if (req.method === 'GET') {
        let text: string;
        try {
          text = await fs.readFile(dataFile, 'utf8');
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') return send(200, 'null');
          throw err;
        }
        if (!backedUp) {
          await fs.writeFile(backupFile, text);
          backedUp = true;
        }
        return send(200, text);
      }

      if (req.method === 'PUT') {
        const data = JSON.parse(await readBody(req));
        if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
          return send(400, '"Expected an object with an items array"');
        }
        const text = JSON.stringify(data, null, 2);
        const tmp = `${dataFile}.tmp`;
        await fs.writeFile(tmp, text);
        try {
          await fs.rename(tmp, dataFile); // atomic swap, so a crash never leaves half a file
        } catch {
          // Windows can refuse the swap while another program has data.json open.
          await fs.writeFile(dataFile, text);
          await fs.rm(tmp, { force: true });
        }
        return send(204);
      }

      send(405, '"Method not allowed"');
    } catch (err) {
      if (err instanceof SyntaxError) return send(400, '"Invalid JSON"');
      console.error('[data-api]', err);
      send(500, '"Server error"');
    }
  };
}

/** Vite plugin: mounts the data API on the dev and preview servers. */
export function dataApi(rootDir: string): Plugin {
  const handler = createDataHandler(rootDir);
  return {
    name: 'budget-data-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
