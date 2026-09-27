# تمرين — Tamreen

A mobile workout log, in English (left-to-right) or Egyptian Arabic (right-to-left) — English by default,
switch in Settings → Language. It ships with a 3-workout A / B / C program, and anyone can load their own
(see **Programs** below). No accounts and no server: each person opens the same link, and their phone keeps
their own program and history.
Plain HTML, CSS and JavaScript — no build step, no libraries. Hosted on GitHub Pages.

All data lives in the phone's browser storage (`localStorage`, key `tamreen-v2`).
Use the backup buttons in the Log tab — there is no other copy. A JSON backup holds the history, the settings and
the program in use (`program`: schema 1, or `null` for the built-in); backups from older versions still restore.

**Home screen:** the next workout (lime card, start or switch it there), days trained this month against the
goal (ring), bodyweight with its trend (violet card), this week Saturday to Friday, the last workout
(volume, sets, minutes, records) and the latest records. Each card opens the screen with the details.

**Plateaus:** when an exercise's best set hasn't improved in 3 workouts, the home screen ("Needs attention"),
the workout and the Progress tab say what to do: 3 → take a lighter week (about 90% of the last top weight),
4 → go for your best again, 5+ → swap it for a variation. The Ask Claude message mentions it too.

**The workout screen** is built for one hand between sets. One exercise fills the screen — its name, its sets and
"reps left in the tank" — with `3 / 7` and a bar at the top (a mark after the third exercise = the minimum
session) and ← / Next at the bottom (or swipe). Finish is at the top of every exercise; the last page ("Wrap-up")
has notes and Ask Claude.
- The faint numbers in each box are last session's. Tap the set's circle to log it exactly like last time, or
  +/− to log one rep more / less (weights move 2.5 kg for dumbbells, cables and added weight, 5 kg for machines
  and barbells; 5 / 10 lb). Tap a number to type it. A logged set gets a ✓.
- The rest timer starts itself when a set is logged: 120 s for the first three exercises, 90 s after the others
  (Settings → During a workout; it can be turned off). Warm-up sets don't start it. It sits in the bottom bar.
  When the rest is over: a beep, a vibration (Android — iPhones don't let web apps vibrate) and the timer turns
  lime with "Go!". The beep plays over music; the iPhone's silent switch mutes it (the flash still shows).
- The screen stays on while a workout is open (Settings can turn it off).
- No zooming: pinch and double-tap zoom are off, so a sweaty tap never zooms the page.
- An exercise fits the screen without scrolling from iPhone SE 2/3 size up, also in a browser tab.
- "Reps left in the tank" is asked once, when the last set is in (or when you move on without it).
- ⋯ holds what's set once: unit, right / left, warm-up sets, number of sets, swap / rename, the how-to video and
  YouTube link, the plate calculator (barbell), a setup note (seat height, pin) and a manual rest.

**Programs:** Settings → Program. "Get your program" copies a message for the Claude chat: Claude asks for
height, weight, age, experience, goal, equipment, sessions per week and injuries, then replies with the
program as JSON. Paste it into "Import a program" (or choose the file), check the preview, and confirm.
"Export this program" gives the JSON to share. The rotation follows the program: 2, 3 or 5 workouts all work.

- Format (schema 1): `{"schema":1,"name":…,"workouts":[{"id":"A","label":…,"tag":…,"exercises":[{"id":"leg-press-1",
  "name":…,"equipment":"machine|dumbbell|barbell|cable|body","sets":3,"repLow":8,"repHigh":10,"perSide":false,
  "isTime":false,"addWeight":false}]}]}`; optional `"assisted":true` (with `addWeight`) for machine-assisted
  pull-ups, where the weight logged is assistance. The full schema and an example are in `js/programs.js`.
- The program in use is stored under its own key (`tamreen-v2-program`), apart from the history.
- Exercise ids link a program to the history. An id the app already knows under a different name gets a new
  one (name slug + counter), so two exercises never share a history; duplicate ids in a file are refused.
- Switching programs never deletes anything: past workouts keep the name they were logged under, and
  exercises that leave the program keep their definitions, so the log, charts and CSV show them as before.
- Errors name the field, e.g. `workouts[1].exercises[0].equipment (Romanian Deadlift, in Workout B) → one of …`.
- The program editor (tap the program in Settings) changes exercises, sets, reps and equipment in place.

**Ask Claude:** the "🤖 Ask Claude about it" button on a workout (new or opened from the log)
turns it into a ready-to-paste message — today's sets, the date and recent history per exercise — and
opens the share sheet (phone) or copies it (computer). Paste it into the Claude chat; no API key or cost.

## Files

```
index.html        page markup; loads the CSS and scripts below in order
css/app.css       all styles
js/i18n.js        language: tx(arabic, english), direction, number format (loaded in <head>)
js/program.js     the program model: the built-in program, schema-1 checks, loading the program in use
js/programs.js    program import (paste / file) with preview, export, and the "Get your program" prompt
js/store.js       app state, load / save, small helpers, data migration
js/maths.js       volume, best set, next-weight suggestion
js/ui.js          bottom sheet, toast, rest timer
js/views.js       the screens (plan, progress, log, settings, program) and render()
js/charts.js      the SVG charts on the progress tab (drawn after render at the card's width)
js/actions.js     what the buttons do
js/session.js     the workout screen: one exercise at a time, steppers, rest timer, RIR, the ⋯ menu
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
a red check on a pull request means something broke. Each `tests/*.test.js` file covers one batch of changes. Most suites start from `tests/fixtures/seed-data.json`
(three workouts from August); `open({seed:false})` starts from an empty phone, like a new user. `tests/fixtures/v1-data.json` is data saved by
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
