# تمرين — Tamreen

A mobile workout log for a 3-day A / B / C rotation, in English (left-to-right) or Egyptian Arabic
(right-to-left) — English by default, switch in Settings → Language.
Plain HTML, CSS and JavaScript — no build step, no libraries. Hosted on GitHub Pages.

All data lives in the phone's browser storage (`localStorage`, key `tamreen-v2`).
Use the backup buttons in the Log tab — there is no other copy.

**Home screen:** the next workout (lime card, start or switch it there), days trained this month against the
goal (ring), bodyweight with its trend (violet card), this week Saturday to Friday, the last workout
(volume, sets, minutes, records) and the latest records. Each card opens the screen with the details.

**Plateaus:** when an exercise's best set hasn't improved in 3 workouts, the home screen ("Needs attention"),
the workout and the Progress tab say what to do: 3 → take a lighter week (about 90% of the last top weight),
4 → go for your best again, 5+ → swap it for a variation. The Ask Claude message mentions it too.

**Faster logging:** tap last time's numbers on a set to copy them; "Same again" repeats the set above;
"+1 rep" adds a rep to the last set; the rest timer starts by itself when you type a set's reps (not for
warm-ups; Settings → Rest buttons can turn it off); "📌 Setup" keeps a note per exercise (seat height, pin)
that shows every workout.

**Ask Claude:** the "🤖 Ask Claude about it" button on a workout (new or opened from the log)
turns it into a ready-to-paste message — today's sets, the date and recent history per exercise — and
opens the share sheet (phone) or copies it (computer). Paste it into the Claude chat; no API key or cost.

## Files

```
index.html        page markup; loads the CSS and scripts below in order
css/app.css       all styles
js/i18n.js        language: tx(arabic, english), direction, number format (loaded in <head>)
js/program.js     the built-in workout program; edits made in the app are saved in the data (Settings → Program)
js/seed.js        the first three sessions, loaded on a fresh install
js/store.js       app state, load / save, small helpers, data migration
js/maths.js       volume, best set, next-weight suggestion
js/ui.js          bottom sheet, toast, rest timer
js/views.js       the screens (plan, session, progress, log, settings) and render()
js/charts.js      the SVG charts on the progress tab (drawn after render at the card's width)
js/actions.js     what the buttons do
js/backup.js      JSON backup / restore, CSV import / export, share / copy helpers, wipe
js/coach.js       builds the "Ask Claude" message for a session
js/main.js        wires the tab bar and draws the first screen
sw.js             service worker: keeps a copy of the app so it opens offline
manifest.webmanifest, icons/   make it installable (home-screen icon, full screen)
fonts/            Readex Pro (Arabic) and Orbitron, both free (SIL Open Font License) — see below
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

GitHub runs the same tests on every pull request and every push to `main` (`.github/workflows/tests.yml`);
a red check on a pull request means something broke. Each `tests/*.test.js` file covers one batch of changes. `tests/fixtures/v1-data.json` is data saved by
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

## Colours, font and dark mode

Brand colours: black & white for the base (dark / light mode), with violet `#7D39EB` and lime `#C6FF33`
as the secondary colours. They are CSS tokens at the top of `css/app.css`: lime and violet are fills
(black text on lime, white on violet); `--hi` is the highlight for thin marks and highlighted text —
lime in dark mode, violet in light mode (lime on white is nearly invisible). Dark mode follows the phone
unless Settings → Theme forces it. Use the tokens for anything new — the theme test fails on a
hard-coded colour. Every text pair is at least 4.5:1 and every chart mark 3:1 in both themes.

Fonts:
- English: DM Sans (Google Fonts) for text; Orbitron (`fonts/orbitron.woff2`, SIL Open Font License —
  `fonts/Orbitron-OFL.txt`) for titles, buttons and big numbers.
- Arabic: Readex Pro (`fonts/readex-pro-arabic.woff2`, SIL Open Font License — `fonts/ReadexPro-OFL.txt`) for
  Arabic letters; the file holds only the Arabic set, so Latin words and numbers use DM Sans.
- The name at the top left (tap it for Settings) is Orbitron in both languages.

All three fonts are free to use, share and host (OFL), so they can stay in this public repo.

## Languages

Every piece of text is written twice, `tx("عربي","English")`, next to where it is used. The language is a
setting of the phone (`localStorage` key `tamreen-v2-lang`), not of the data, so backups, restores and
"delete all data" leave it alone. Numbers are always written 0–9, in Arabic too (Arabic digits typed on the keyboard are still read). In English the layout runs left-to-right: the charts put the newest
workout on the right and the calendar starts Saturday on the left. Exercise names are the ones you type,
so they are the same in both languages; a day description you edit is shown as you wrote it. The older
test suites pin Arabic (`tests/lib.js`); `tests/i18n.test.js` covers English.

## Offline and install

After the first visit with a connection, the app opens with no signal: the page is fetched fresh when
online (it waits up to 3 s), otherwise the saved copy is used. To install it: on iPhone open it in Safari →
Share → Add to Home Screen; on Android use Chrome's menu → Install app (Settings shows a button when
Chrome offers it).
