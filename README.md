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
js/program.js     the built-in workout program; edits made in the app are saved in the data (Settings → البرنامج)
js/seed.js        the first three sessions, loaded on a fresh install
js/store.js       app state, load / save, small helpers, data migration
js/maths.js       volume, best set, next-weight suggestion
js/ui.js          bottom sheet, toast, rest timer
js/views.js       the screens (plan, session, progress, log, settings) and render()
js/actions.js     what the buttons do
js/backup.js      JSON backup / restore, CSV import / export, share / copy helpers, wipe
js/coach.js       builds the "Ask Claude" message for a session
js/main.js        wires the tab bar and draws the first screen
sw.js             service worker: keeps a copy of the app so it opens offline
manifest.webmanifest, icons/   make it installable (home-screen icon, full screen)
.nojekyll         tells GitHub Pages to serve files as-is (no Jekyll)
tests/            browser tests (not used by the app itself)
package.json      only for the tests
```

The scripts are classic `<script>` tags (not modules) and share one global scope,
so the load order in `index.html` matters.

## Run locally

Browsers block some features on `file://`, so serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Tests

The tests drive the real app in a headless Chrome (Playwright), on a phone-sized screen in Cairo time,
with fresh storage for every scenario. Needs Node.js 20+.

```
npm install
npx playwright install chromium   # first time only
npm test                          # all suites
npm test -- backup                # only suites whose file name contains "backup"
```

Each `tests/*.test.js` file covers one batch of changes. `tests/fixtures/v1-data.json` is data saved by
the original single-file app, used to check that old data still loads.

## Deploying changes

GitHub Pages publishes the `main` branch automatically.

- Keep paths relative (`js/app.js`, not `/js/app.js`) — the site lives under `/Tamreen/`.
- File names are case-sensitive on Pages.
- After changing any CSS or JS file, bump the `?v=` number on **every** `<link>` / `<script>`
  in `index.html`. This matters twice over: Pages caches files for about 10 minutes, and the
  offline copy on the phone only re-downloads files whose `?v=` changed.
- `sw.js` reads its file list from `index.html`, so it needs no edits when versions change.
- The icons are PNG exports of `icons/icon.svg` (the maskable one has the dumbbell at 70%).
- Take a backup from the app before a big update.

## Offline and install

After the first visit with a connection, the app opens with no signal: the page is fetched fresh when
online (it waits up to 3 s), otherwise the saved copy is used. To install it: on iPhone open it in Safari →
Share → Add to Home Screen; on Android use Chrome's menu → Install app (Settings shows a button when
Chrome offers it).
