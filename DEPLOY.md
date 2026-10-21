# Deployment guide

How to run Budget on your own PC, put it online, and move your data between the two.

| Option | Cost | Where data lives | Works across devices | Effort |
| --- | --- | --- | --- | --- |
| [1. Local](#1-local-on-your-pc) | Free | `data.json` on your PC | No | None |
| [2. Vercel, static](#2-vercel-static-free) | Free | Each browser | No | 2 minutes |
| [3. Vercel + database](#3-vercel--a-database-planned) | Free tiers available | A hosted database | Yes | Needs one API function (planned) |
| [4. Render](#4-render-with-a-disk) | Paid instance | `data.json` on a Render disk | Yes | 5 minutes |
| [5. Your own server](#5-your-own-server-or-vps) | Varies | `data.json` on that server | Yes | Some ops |

**Recommendation:** use **1** day to day. When you want it on your phone too, go with **3**. Use **2** only if you're fine with each device having its own separate list.

---

## Before you start

- **Node.js 22.18 or newer** for running or building locally ([nodejs.org](https://nodejs.org)). Hosts use the version in `.nvmrc`.
- **The code on GitHub.** This project is at `github.com/stackvs18/budget`. Push your latest changes first:
  ```bash
  git add -A && git commit -m "Update" && git push
  ```
  Your data files (`data.json`, `data.*.json`, `backups/`) are git-ignored and never pushed.
- **A backup of your data.** In the app: Settings → Data → **Export backup (.json)**. You'll import this file into any online setup.

---

## 1. Local, on your PC

```bash
npm install     # first time only
npm start       # opens http://127.0.0.1:5050
```

Or double-click **`start.bat`**.

- Keep the *Budget* terminal window open while you use the app; it's the server that writes `data.json`.
- If you close it anyway, nothing is lost. A black banner appears, changes are kept in the browser, and they're written to `data.json` as soon as the server runs again.
- Backups: `backups/data-YYYY-MM-DD.json`, one per day, last 30 days.

**Start it automatically with Windows (optional).**
1. Press `Win + R`, type `shell:startup`, Enter.
2. Right-click in that folder → *New → Shortcut* → browse to `start.bat` in the project folder → Finish.

It now starts every time you log in; just open http://127.0.0.1:5050 when you need it.

---

## 2. Vercel, static (free)

The app works as a plain website. With no data server present, it saves to the browser it's opened in.

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `stackvs18/budget`.
3. Leave everything as detected:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Deploy.** You get a URL like `budget-xyz.vercel.app`.
5. Open it → Settings → Data → **Import backup** → pick the file you exported.

Every push to `main` redeploys automatically.

**Know the limits:**
- Each browser and device has its own copy. Your phone and laptop won't see each other's changes.
- Clearing site data in that browser deletes the list. Export a backup now and then.
- The link is safe to share: anyone opening it gets an empty app, never your data.

**CLI alternative:**
```bash
npx vercel          # first time: links the folder to a Vercel project, makes a preview
npx vercel --prod   # production deploy
```

---

## 3. Vercel + a database (planned)

This is the setup for "one list, every device". The front end needs no changes: it only ever calls one endpoint.

| Request | Does |
| --- | --- |
| `GET /api/data` | Returns the whole plan as JSON, or `null` if there isn't one yet |
| `PUT /api/data` | Replaces the plan with the JSON body; responds `204` |

Locally `server/data-api.ts` answers these by reading and writing `data.json`. On Vercel, a single function at `api/data.ts` answers them with a database instead.

**Steps when we build it:**
1. **Pick a database.** In Vercel: Storage → **Marketplace**. Any of these works; the plan is one JSON value, so a single key or row is enough.
   - **Upstash Redis:** simplest, a key/value store.
   - **Neon Postgres:** a regular SQL database with one table.
   - **Supabase:** Postgres plus its own auth, if you want proper login later.
2. **Connect it to the project.** Vercel adds the connection secrets as environment variables automatically.
3. **Add `api/data.ts`**: GET reads the stored JSON, PUT validates and stores it with a `savedAt` timestamp. About 40 lines.
4. **Protect it.** Add a `BUDGET_PASSWORD` environment variable and check it in the function (same browser login prompt as option 4), or turn on Vercel's Deployment Protection.
5. **Deploy**, open the URL, sign in, and **Import backup** to move your data across.

The browser safety copy keeps working there too: if the database or network is briefly unreachable, changes wait in the browser and sync when it's back.

> This isn't built yet. Pick a database and ask, and it'll be added and tested with the same checks as the rest of the app.

---

## 4. Render, with a disk

Uses the included [`render.yaml`](render.yaml): a Node web service, a 1 GB persistent disk for `data.json`, a password prompt, and a health check.

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint** → select `stackvs18/budget`.
3. When asked for **`BUDGET_PASSWORD`**, enter a long password.
4. **Apply.** Render builds with `npm ci --include=dev && npm run build` and starts `npm run serve`.
5. Open the URL. The browser asks for a username (type anything) and the password.
6. Settings → Data → **Import backup**.

Persistent disks need a paid instance (the blueprint uses `starter`). Free instances lose files on every restart, so don't use one for this.

---

## 5. Your own server or VPS

Any Linux box, Raspberry Pi or always-on PC with Node 22.18+:

```bash
git clone https://github.com/stackvs18/budget.git && cd budget
npm ci
npm run build
HOST=0.0.0.0 PORT=8080 DATA_DIR=/srv/budget BUDGET_PASSWORD='a-long-password' npm run serve
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `5050` | Port to listen on |
| `HOST` | `127.0.0.1` | `0.0.0.0` to accept outside connections (then a password is required) |
| `DATA_DIR` | project folder | Where `data.json` and `backups/` live |
| `BUDGET_PASSWORD` | — | Password for the browser login prompt |

- **Keep it running:** use a process manager such as `systemd` or `pm2 start "npm run serve" --name budget`.
- **Put HTTPS in front** (Caddy, nginx + Let's Encrypt, or a Cloudflare Tunnel) so the password isn't sent in plain text.
- **Health check:** `GET /healthz` answers `ok` without a password.
- **Updating:** `git pull && npm ci && npm run build`, then restart the process. Data in `DATA_DIR` is untouched.

---

## Moving your data

| From → to | How |
| --- | --- |
| Local → anywhere online | Local app: Settings → Data → **Export backup**. Online app: **Import backup** |
| Online → local | The reverse, or copy the server's `data.json` into the project folder while the local app is stopped |
| Roll back a bad day | Stop the app, copy `backups/data-YYYY-MM-DD.json` over `data.json`, start it again |
| Spreadsheet | Settings → Data → **Export items (.csv)** |

Imports accept any export from this app, including the first version's format. They're validated and repaired on the way in.

---

## Troubleshooting

| You see | Means | Do |
| --- | --- | --- |
| Black banner: *"The app's server isn't running"* | The `start.bat` window (or server process) was closed | Start it again; changes save on their own |
| *"Saved in browser"* in the top bar | You're on a static host (option 2) | Expected; export backups regularly |
| *"Your data couldn't load"* | The server isn't running and this browser has no saved copy | Start the server, then **Retry** |
| `Port 5050 is busy` | Budget is already running, or another app took the port | Use the open one, or close the other app |
| Server exits: *"Refusing to listen … without BUDGET_PASSWORD"* | `HOST` is public but no password is set | Set `BUDGET_PASSWORD` |
| Password prompt keeps coming back | Wrong password | Check `BUDGET_PASSWORD` in the host's environment settings |
| List looks empty after an update | You're on a different browser, device or URL than before | Open the original, or import a backup. Local data is in `data.json` and `backups/` |

---

## Checklist before putting it online

- [ ] Data exported from the local app
- [ ] `npm run check` passes (typecheck, tests, build); CI runs this on every push
- [ ] For options 4–5: a long `BUDGET_PASSWORD`, and HTTPS in front
- [ ] For options 3–5: open the URL in a private window and confirm it asks for the password
- [ ] Data imported and visible on a second device (options 3–5)
