# Deployment guide

Start by deciding who the app is for:

| | **Public** (optional) | **Private** |
| --- | --- | --- |
| Who | Anyone with the link | Only you |
| Where it runs | Vercel, as a normal website | Your laptop (or a server you own) |
| Your data | Stays in each browser that opens it | One copy, synced across your devices |
| Moving data between devices | Export, then import, every time | Automatic |
| Who can see your numbers | Nobody (each visitor has their own empty copy) | Only devices you approve |
| Cost | Free | Free (Tailscale) or paid (always-on server) |

- **Use Private** if this is your own budget and you want it on your laptop and phone.
- **Use Public** if you want others to use the app for their own budgets.

You can do both.

---

## Contents

1. [Running it on your laptop](#1-running-it-on-your-laptop) (both options start here)
2. [Public: a website anyone can use (Vercel)](#2-public-a-website-anyone-can-use-vercel)
3. [Private: just you, on your laptop, phone and any device you choose](#3-private-just-you-on-your-laptop-phone-and-any-device-you-choose)
   - [Option A: Tailscale (recommended, free)](#option-a-tailscale-recommended-free)
   - [Option B: Always on, from any browser](#option-b-always-on-from-any-browser)
4. [Moving your data](#4-moving-your-data)
5. [Troubleshooting](#5-troubleshooting)
6. [Security checklist](#6-security-checklist)

---

## 1. Running it on your laptop

You need **Node.js 22.18 or newer** ([nodejs.org](https://nodejs.org)). Then:

- **Windows:** double-click **`start.bat`**. The first run installs everything; then it opens http://127.0.0.1:5050.
- **Any OS:** `npm install` once, then `npm run build && npm run serve`.

Your data is saved to **`data.json`** in the project folder, with a backup each day in `backups/` (last 30 days). Both are git-ignored, so pushing code to GitHub never uploads your numbers.

Keep the *Budget* window open while you use the app: it's what writes `data.json`. If you close it, nothing is lost. A black banner appears, changes wait in the browser, and they're saved the moment it's running again.

**Start it with Windows** (recommended for the private setup):
1. Press `Win + R`, type `shell:startup`, press Enter.
2. Right-click in that folder → *New → Shortcut* → browse to `start.bat` → *Finish*.

---

## 2. Public: a website anyone can use (Vercel)

A normal Vercel deployment, with nothing else behind it. The app notices there's no data server and saves to the browser it's opened in.

**Each browser and device has its own separate list.** Your phone and laptop don't sync. To move a list to another device you export it there and import it here, every time. That suits other people using the app for themselves. It doesn't suit you keeping one list on several devices; for that, see [Private](#3-private-just-you-on-your-laptop-phone-and-any-device-you-choose).

**Deploy:**
1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `stackvs18/budget`.
3. Keep the detected settings: framework **Vite**, build `npm run build`, output `dist`.
4. **Deploy.** You get a URL like `budget-xyz.vercel.app`. Every push to `main` updates it.

**Moving a list between devices on the public site:**
1. On the device that has it: Settings → Data → **Export backup (.json)**.
2. Send yourself the file (email, Drive, AirDrop…).
3. On the other device: Settings → Data → **Import backup**. This *replaces* that device's list.

**Know before you rely on it:**
- Clearing the browser's site data (or using a private window) wipes that copy. Export backups regularly.
- Sharing the link is safe: visitors get an empty app and can never see anyone else's data.

---

## 3. Private: just you, on your laptop, phone and any device you choose

The goal:
- One list, the same on every device you approve, with changes showing up everywhere automatically.
- Nobody else can open it, or even reach it.

| | Option A: Tailscale | Option B: Always-on server |
| --- | --- | --- |
| Cost | Free | Paid hosting (Render), or a database service later |
| Laptop must be on | Yes | No |
| Works from a device you can't install apps on (a borrowed laptop) | No | Yes, with your password |
| Who can reach it | Only devices signed into *your* Tailscale account | Anyone can reach the login screen; only you have the password |
| Status | **Works today** | Render works today; Vercel + database is planned |

### Option A: Tailscale (recommended, free)

[Tailscale](https://tailscale.com) makes a private network out of your own devices. Your laptop keeps running the app exactly as now, and your phone connects to it over that network. Nothing is put on the public internet: to anyone else the address doesn't exist.

**One-time setup:**

1. **Laptop:** install Tailscale from [tailscale.com/download](https://tailscale.com/download) and sign in (Google, Microsoft, GitHub or Apple account). This account *is* your private network, so use one only you control.
2. **Turn on HTTPS for your network:** open the [admin console → DNS](https://login.tailscale.com/admin/dns). Make sure **MagicDNS** is on, then under **HTTPS Certificates** click **Enable HTTPS**.
3. **Phone:** install **Tailscale** from the App Store or Play Store, sign in with the **same account**, and switch it on.
4. **Laptop:** double-click `start.bat` (or let it start with Windows, see [section 1](#1-running-it-on-your-laptop)).
5. **Laptop:** open a terminal (PowerShell) and run, once:
   ```powershell
   tailscale serve --bg 5050
   ```
   It prints your private address, like `https://your-laptop.tail1234.ts.net`. Tailscale remembers this, including after restarts. If it says *access denied*, run the terminal as administrator.
6. **Phone:** open that address. Then add it to your home screen so it opens like an app:
   - **iPhone (Safari):** Share → **Add to Home Screen**.
   - **Android (Chrome):** ⋮ → **Add to Home screen** / **Install app**.

That's it. The laptop uses http://127.0.0.1:5050 as usual; the phone uses the `ts.net` address. Both read and write the same `data.json`.

**Adding another device you want:** install Tailscale on it, sign in with your account, open the same address. To take a device's access away: [admin console → Machines](https://login.tailscale.com/admin/machines) → ⋯ → **Remove**.

**Keep the laptop reachable:**
- Settings → System → Power: set *"When plugged in, put my device to sleep after"* to **Never**. A sleeping laptop can't answer the phone.
- `start.bat` running (or started with Windows), and Tailscale switched on.

If the laptop is off, the phone shows a banner, keeps your changes on the phone, and saves them the next time you open the app while the laptop is reachable.

**How syncing behaves:**
- Changes from one device appear on another when you switch back to the app, and every 15 seconds while it's open.
- If two devices change things at the same moment, the second one to save sees *"Changed on another device"*. It shows the latest, with a **Use mine** button if you'd rather keep that device's version. Nothing is overwritten silently.

**Why this is private:**
- Only devices signed into your Tailscale account can connect. Everyone else can't reach the laptop at all, so there's no login screen to attack.
- Traffic between your devices is encrypted (WireGuard), and the address uses HTTPS.
- **Never run `tailscale funnel`.** Funnel is the opposite of `serve`: it publishes the app to the whole internet.

**Optional extra lock: a password** on top of Tailscale, so even someone who picks up your unlocked phone has to type it:
```powershell
setx BUDGET_PASSWORD "a-long-password-only-you-know"
```
Close and reopen `start.bat`. Every device now asks once per browser session (any username, this password). To remove it: `setx BUDGET_PASSWORD ""` and restart `start.bat`.

**Turning it off:** `tailscale serve --https=443 off` stops sharing. The app keeps working on the laptop.

### Option B: Always on, from any browser

Use this if you want the app while your laptop is off, or from devices where you can't install Tailscale. The app then lives on a server on the internet, and **a password is the only thing protecting it**. Use a long, unique one.

**Render (works today, paid):** the repository includes [`render.yaml`](render.yaml), which sets up the server, a disk for `data.json`, HTTPS, and the password prompt.
1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Blueprint** → select `stackvs18/budget`.
3. When asked for **`BUDGET_PASSWORD`**, enter a long password (a password manager can generate one).
4. **Apply.** Open the URL; the browser asks for a username (anything) and the password.
5. Settings → Data → **Import backup** to bring your list across. Then use this URL on all your devices.

Persistent disks need a paid Render instance (the blueprint uses `starter`). The free tier wipes files on restart, so don't use it for this.

**Vercel + a database (planned):** the same idea on Vercel. One small function at `api/data.ts` stores the plan in a database (Upstash Redis, Neon Postgres or Supabase via Vercel's Marketplace), behind the same password check. The app needs no other changes. Ask when you want it, and it'll be built and tested like the rest.

**Your own always-on machine** (a mini PC, Raspberry Pi or VPS):
```bash
git clone https://github.com/stackvs18/budget.git && cd budget
npm ci && npm run build
HOST=0.0.0.0 PORT=8080 DATA_DIR=/srv/budget BUDGET_PASSWORD='a-long-password' npm run serve
```
Put HTTPS in front (Caddy, or a Cloudflare Tunnel) and keep it running with `systemd` or `pm2`. Or skip the public internet entirely and use Tailscale on that machine instead, exactly as in Option A.

**On a device that isn't yours:** open the URL in a **private/incognito window**. The browser remembers the password until that window closes, and nothing is left behind afterwards.

---

## 4. Moving your data

| From → to | How |
| --- | --- |
| Laptop → any other setup | Settings → Data → **Export backup**, then **Import backup** on the other side |
| Roll back to an earlier day | Stop the app, copy `backups/data-YYYY-MM-DD.json` over `data.json`, start it again |
| To a spreadsheet | Settings → Data → **Export items (.csv)** |

Imports accept any export from this app, including older formats, and are checked and repaired on the way in.

---

## 5. Troubleshooting

| You see | Means | Do |
| --- | --- | --- |
| Black banner: *"The app's server isn't running"* | `start.bat` was closed, or the laptop is asleep or off | Start it again; your changes save automatically |
| Phone can't open the `ts.net` address | Tailscale is off on the phone, the laptop is asleep, or `start.bat` isn't running | Switch Tailscale on, wake the laptop, check the *Budget* window |
| `tailscale serve` asks you to enable HTTPS | HTTPS certificates are off for your network | Admin console → DNS → **Enable HTTPS**, then run it again |
| *"Changed on another device"* | Two devices edited at once | It's showing the latest. Tap **Use mine** to keep this device's version instead |
| *"Saved in browser"* in the top bar | You're on the public (static) site | Expected. Export backups regularly |
| `Port 5050 is busy` | Budget is already running (maybe from the startup shortcut) | Use the one that's open |
| Password prompt keeps coming back | Wrong password | Check `BUDGET_PASSWORD` (`echo %BUDGET_PASSWORD%` on Windows, or the host's settings) |
| List looks empty | You opened a different setup: the public site instead of your private address, or another browser | Use your private address. Your data is in `data.json` and `backups/` on the laptop |

---

## 6. Security checklist

**Private with Tailscale**
- [ ] The Tailscale account is one only you can sign in to, ideally with two-factor authentication.
- [ ] Only your own devices appear under admin console → Machines.
- [ ] You used `tailscale serve`, **not** `tailscale funnel`.
- [ ] Optional: `BUDGET_PASSWORD` set for an extra lock.

**Private on an always-on server**
- [ ] A long, unique `BUDGET_PASSWORD` (from a password manager).
- [ ] The URL opens with `https://` and asks for the password in a private window.
- [ ] You don't share the URL. The page also tells search engines not to index it.
- [ ] Borrowed devices: private window only.

**Everywhere**
- [ ] `data.json`, `data.*.json` and `backups/` stay git-ignored (they are by default).
- [ ] Occasional Export backup kept somewhere safe.
