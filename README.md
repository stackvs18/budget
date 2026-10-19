# Budget

**A minimal, monochrome budget planner.** List what you want to buy, put a price on it, tick it, and see exactly where your balance lands against the lowest you're willing to let it go.

![Budget: items grouped by category on the left, balance after plan and running numbers on the right](docs/screenshot.png)

- **Plan before you spend.** Tick items to see your balance drop in real time; mark them *Bought* when the money actually goes.
- **A floor, not just a budget.** Set the lowest your balance should ever reach; the app tells you how far above or below it your plan leaves you.
- **Yours to shape.** Categories with optional limits, priorities, incoming money, currency and number style, light/dark theme, density.
- **Private by default.** No accounts, no tracking. Data lives in a JSON file on your machine, or in your browser when hosted statically.
- **Fast and quiet.** Black on white, one typeface family, no animations, about 93 KB of gzipped JavaScript.

---

## Quick start

Requires **Node.js 22.18 or newer** ([nodejs.org](https://nodejs.org)).

```bash
npm install
npm start          # opens http://127.0.0.1:5050
```

On Windows you can double-click **`start.bat`** instead: it installs dependencies the first time, then starts the app.

## Using it

| To | Do this |
| --- | --- |
| Add an item | Type in the top bar: name, category, priority, price, then **Enter**. A new category name creates that category. |
| Add to a category | **+ Add item** under any category. |
| Plan it | Tick the checkbox. *After plan* drops by its price. |
| Mark it bought | Click its status (*Idea → Planned → Bought*). |
| Edit anything | Click the name or price in the row. **Enter** in a price jumps to the next one. |
| Reorder | Drag the ⋮⋮ handle, within a category or into another one (empty categories included). Keyboard: focus the handle, **Space**, arrow keys, **Space**. Works while sorting by *List order*. |
| Delete | The bin icon at the end of the row. Undo from the message that appears. |
| More options | The chevron opens quantity, category, priority, status, note and link. |
| Set your balance | Click *Starting balance* or *Lowest I'll go* in the right column. |
| Jump to a category | Click its name in the right column. |

Price fields accept numbers only. Grouping is added for you (`15000` shows as `₹15,000`).

### How the numbers work

```
After plan     = starting balance + counted income − spent − planned
Budget         = starting balance + counted income − lowest I'll go      (or a fixed amount)
Left to spend  = budget − spent − planned
```

The plan is marked **Tight** when less than 15% of the budget is left (adjustable), and **Over budget** when you go past the budget or below your floor.

### Settings

| Tab | What you can change |
| --- | --- |
| Money | Plan name, balance, floor, budget mode (everything above floor or a fixed amount), *tight* threshold, currency symbol, number style (Indian, international, European), decimals |
| Income | Money you're expecting, with a switch for whether it counts yet |
| Categories | Rename, reorder, per-category spending limits, delete (items move to another category) |
| Priorities | Rename, reorder (used by *Sort → Priority*), add, delete |
| Display | Light / dark / system theme, comfortable or compact rows |
| Data | Export a backup (.json), import one, export items (.csv), start over |

---

## Where your data lives

The app picks a storage mode automatically:

| Running as | Saved to | Shared across devices |
| --- | --- | --- |
| `npm start` or `npm run serve` | `data.json` in the project folder (or `DATA_DIR`) | Yes, for anyone who can reach the server |
| A static host (Vercel, Netlify, …) | This browser's local storage | No. Use *Export / Import* to move it |

The save status in the top bar shows which one is active (*Saved* / *Saved in browser*); click it for backup options.

- Each time the server starts, the previous `data.json` is copied to `data.backup.json`.
- `data*.json` files are git-ignored, so your numbers are never committed.
- Older files (including the first version's format) are upgraded and validated automatically on load and on import.

---

## Deploy

First put the project on GitHub:

```bash
git init
git add .
git commit -m "Budget tracker"
gh repo create budget-tracker --private --source . --push    # or create the repo on github.com and push
```

Then pick one of these:

| | Static host | Your own server |
| --- | --- | --- |
| Examples | Vercel, Netlify, Cloudflare Pages | Render, Railway, a VPS, a home server |
| Cost | Free | Render needs a paid instance for the disk |
| Data | In each browser, private to that device | One `data.json`, synced across your devices |
| Login | Not needed (nobody else can see your data) | Password prompt (`BUDGET_PASSWORD`) |

### Option A: Vercel (static, free)

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
2. Leave the defaults. Vercel detects Vite (build `npm run build`, output `dist`).
3. Deploy. Every push to `main` redeploys.

Netlify and Cloudflare Pages work the same way: build command `npm run build`, publish directory `dist`. The Node version comes from `.nvmrc`.

The data lives in each visitor's own browser, so sharing the link shares an empty app, never your numbers. Export a backup now and then: clearing site data clears the plan.

### Option B: Render (synced, password protected)

The repository includes a [`render.yaml`](render.yaml) blueprint: a Node web service, a 1 GB persistent disk for `data.json`, and a password.

1. In Render, choose **New → Blueprint** and select the repository.
2. Enter a strong **`BUDGET_PASSWORD`** when asked.
3. Deploy. Open the URL; your browser asks for a username (anything) and that password.

### Option C: any machine with Node

```bash
npm ci
npm run build
HOST=0.0.0.0 PORT=8080 DATA_DIR=/srv/budget BUDGET_PASSWORD='choose-a-long-one' npm run serve
```

Put it behind HTTPS (Caddy, nginx, a Cloudflare Tunnel…) so the password isn't sent in plain text.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5050` | Port to listen on |
| `HOST` | `127.0.0.1` | Interface to bind. Anything other than localhost requires a password |
| `DATA_DIR` | project folder | Where `data.json` and `data.backup.json` are kept |
| `BUDGET_PASSWORD` | – | Password for the browser login prompt |

The server refuses to start on a public interface without `BUDGET_PASSWORD`, serves `/healthz` (unauthenticated) for uptime checks, and caches hashed assets for a year.

---

## Development

| Script | |
| --- | --- |
| `npm start` | Dev server, opens the browser |
| `npm run dev` | Dev server without opening a browser |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript, no output |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run serve` | Production server for `dist/` (see *Deploy*) |
| `npm run check` | Typecheck, tests and build: what CI runs |

GitHub Actions runs `typecheck`, `test` and `build` on every push and pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

### Project structure

```
server/
  data-api.ts        GET/PUT /api/data ↔ data.json (used by the dev server and serve.ts)
  serve.ts           production server: static files, data API, password, health check
src/
  types.ts           the data model
  store/budget.ts    zustand store, actions, debounced auto-save
  store/ui.ts        view state (search, open panels)
  lib/calc.ts        all budget maths
  lib/money.ts       currency formatting and the numbers-only input parser
  lib/migrate.ts     upgrades and validates saved or imported data
  lib/api.ts         storage: data server, or browser storage on static hosts
  lib/reorder.ts     drag-and-drop moves
  components/list/      add bar, category sections, item rows
  components/summary/   right-hand numbers column
  components/settings/  settings panel tabs
  index.css          theme: one ink colour at three strengths
seed.json            the blank starting plan
render.yaml          Render blueprint
```

### Adding a setting

1. Add the field to `Settings` or `Display` in `src/types.ts`, and a default in `seed.json`.
2. Validate it in `normalizeSettings` / `normalizeDisplay` in `src/lib/migrate.ts`, so older files get the default.
3. Read it with `useData((d) => d.settings.yourField)` and add a control in `src/components/settings/`.

### Stack

React 19, TypeScript, Vite, Tailwind CSS 4, zustand, dnd-kit, Geist and Geist Mono (bundled locally), lucide icons, Vitest.
