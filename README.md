# تمرين — Tamreen

A mobile workout log for a 3-day A / B / C rotation, in Egyptian Arabic.
Plain HTML, CSS and JavaScript — no build step, no libraries. Hosted on GitHub Pages.

All data lives in the phone's browser storage (`localStorage`, key `tamreen-v2`).
Use the backup buttons in the السجل tab — there is no other copy.

## Files

```
index.html        page markup; loads the CSS and scripts below in order
css/app.css       all styles
js/program.js     the workout program (exercises, sets, rep ranges)
js/seed.js        the first three sessions, loaded on a fresh install
js/store.js       app state, load / save, small helpers, data migration
js/maths.js       volume, best set, next-weight suggestion
js/ui.js          bottom sheet, toast, rest timer
js/views.js       the screens (plan, session, progress, log) and render()
js/actions.js     what the buttons do
js/backup.js      JSON backup / restore, CSV import / export, wipe
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
