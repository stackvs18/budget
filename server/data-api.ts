import fs from 'node:fs/promises';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

const MAX_BODY = 2_000_000;
const BACKUP_DAYS = 30;

/** Writes today's backup and prunes old ones. */
async function backup(dir: string, text: string) {
  await fs.mkdir(dir, { recursive: true });
  const day = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  await fs.writeFile(path.join(dir, `data-${day}.json`), text);
  const files = (await fs.readdir(dir)).filter((f) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  await Promise.all(files.slice(0, -BACKUP_DAYS).map((f) => fs.rm(path.join(dir, f), { force: true })));
}

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
 * PUT with X-Base-Saved-At is refused (409 + the current file) when the file has been
 * saved since that version, so one device can't silently overwrite another's changes.
 * Every save is stamped with `savedAt` and copied to backups/data-YYYY-MM-DD.json
 * (the day's last save; the newest BACKUP_DAYS days are kept).
 * Shared by the Vite dev server (below) and the production server (serve.ts).
 */
export function createDataHandler(dataDir: string): Connect.NextHandleFunction {
  const dataFile = path.join(dataDir, 'data.json');
  const backupDir = path.join(dataDir, 'backups');
  // Saves run one at a time, so the version check and the write can't interleave.
  let saving: Promise<unknown> = Promise.resolve();

  const readCurrent = async () => {
    try {
      const text = await fs.readFile(dataFile, 'utf8');
      const savedAt = Number(JSON.parse(text)?.savedAt);
      return { text, savedAt: Number.isFinite(savedAt) ? savedAt : 0 };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { text: 'null', savedAt: 0 };
      throw err;
    }
  };

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
        return send(200, text);
      }

      if (req.method === 'PUT') {
        const data = JSON.parse(await readBody(req));
        if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
          return send(400, '"Expected an object with an items array"');
        }
        const header = req.headers['x-base-saved-at'];
        const base = typeof header === 'string' ? Number(header) : NaN;

        type Outcome = { conflict: string } | { savedAt: number };
        const result = saving.catch(() => {}).then(async (): Promise<Outcome> => {
          // Made on an older version than the file: another device saved in between.
          // Hand back the newer copy instead of overwriting it.
          const current = await readCurrent();
          if (Number.isFinite(base) && current.savedAt > base) return { conflict: current.text };

          data.savedAt = Math.max(Date.now(), current.savedAt + 1);
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
          await backup(backupDir, text).catch((err) => console.error('[data-api] backup failed', err));
          return { savedAt: data.savedAt as number };
        });
        saving = result;

        const outcome = await result;
        if ('conflict' in outcome) return send(409, outcome.conflict);
        return send(200, JSON.stringify({ savedAt: outcome.savedAt }));
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
