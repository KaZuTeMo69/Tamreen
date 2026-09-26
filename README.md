# تمرين — Tamreen

A mobile workout log for a 3-day A / B / C rotation, in Egyptian Arabic.
Plain HTML, CSS and JavaScript — no build step, no libraries. Hosted on GitHub Pages.

All data lives in the phone's browser storage (`localStorage`, key `tamreen-v2`).
Use the backup buttons in the السجل tab — there is no other copy.

**Ask Claude:** the "🤖 اسأل Claude عن الحصة" button on a workout (new or opened from the log)
turns it into a ready-to-paste message — today's sets, the date and recent history per exercise — and
opens the share sheet (phone) or copies it (computer). Paste it into the Claude chat; no API key or cost.

## Files

```
index.html        page markup; loads the CSS and scripts below in order
css/app.css       all styles
js/program.js     the workout program (exercises, sets, rep ranges)
js/seed.js        the first three sessions, loaded on a fresh install
js/store.js       app state, load / save, small helpers, data migration
js/maths.js       volume, best set, next-weight suggestion
js/ui.js          bottom sheet, toast, rest timer
js/views.js       the screens (plan, session, progress, log, settings) and render()
js/actions.js     what the buttons do
js/backup.js      JSON backup / restore, CSV import / export, share / copy helpers, wipe
js/coach.js       builds the "Ask Claude" message for a session
js/main.js        wires the tab bar and draws the first screen
.nojekyll         tells GitHub Pages to serve files as-is (no Jekyll)
```

The scripts are classic `<script>` tags (not modules) and share one global scope,
so the load order in `index.html` matters.

## Run locally

Browsers block some features on `file://`, so serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Deploying changes

GitHub Pages publishes the `main` branch automatically.

- Keep paths relative (`js/app.js`, not `/js/app.js`) — the site lives under `/Tamreen/`.
- File names are case-sensitive on Pages.
- Pages caches files for about 10 minutes. After changing any CSS or JS file,
  bump the `?v=` number on **every** `<link>` / `<script>` in `index.html`
  so phones don't mix old and new files.
- Take a backup from the app before a big update.
