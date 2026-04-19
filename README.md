# ethan95

A Windows 95-inspired personal portfolio built with Next.js. It simulates a complete desktop environment — draggable/resizable windows, a taskbar with Start menu, desktop icons, and a suite of built-in applications. There is a single page route (`/`); everything opens as a window. On mobile, all windows switch to full-screen automatically.

## Applications

### System

| App | Description |
|-----|-------------|
| **Welcome** | Startup tips carousel with a "show on startup" checkbox (persisted to `localStorage`) |
| **My Computer** | Classic drive browser (A:, C:, D:) |
| **My Documents** | Launcher for Photos, My Projects, Document Viewer, and Notepad |
| **Programs** | Full list of every registered application; click to open |
| **Run** | Open any app by typing its registered ID |
| **Settings** | Toggle the CRT monitor effect on/off |
| **Recycle Bin** | Intentionally empty |
| **Internet Explorer** | Embedded browser (`<iframe>`) with a URL bar and preset bookmarks |
| **Notepad** | Plain-text editor; accepts a `defaultContent` prop for pre-filled content |
| **Document Viewer** | PDF renderer (PDF in `<iframe>`) |
| **Admin** | Password-protected Firestore CRUD panel with support for all content collections and museum image uploads to Firebase Storage |
| **Image Compressor** | Client-side image compression — upload an image, adjust quality with a slider (0–100), and download the result; powered by `image-conversion` |
| **Calculator** | Standard four-function calculator with keyboard support |

### Portfolio

| App | Description |
|-----|-------------|
| **Photos** | Album photo gallery backed by Firestore, streamed as Server-Sent Events; paginated 24 photos per page with thumbnail grid |
| **Photo Viewer** | Full-size image viewer opened from Photos |
| **My Projects** | Portfolio project cards with demo and GitHub links |
| **Museum** | Virtual museum of vintage and retro items organized into three tabbed categories — Cameras, Consoles, and Computers — loaded from Firestore |
| **Weather** | Search any city for current conditions and a 7-day high/low forecast, powered by Open-Meteo |

### Games

| App | Description |
|-----|-------------|
| **Games** | Hub launcher for all games |
| **Minesweeper** | Beginner / Intermediate / Expert difficulties; flood-fill reveal; safe first click; real-time multiplayer via Firebase Realtime Database; HMAC-signed score submission |
| **Minesweeper Records** | Leaderboard sorted by best time per difficulty |
| **Solitaire** | Klondike with drag-and-drop and tap-to-select, undo, web-worker solver hint; HMAC-signed win leaderboard |
| **Solitaire Leaderboard** | Win counts leaderboard |
| **Sudoku** | 9×9 puzzle with Easy / Medium / Hard difficulties; arrow-key navigation; conflict and related-cell highlighting; undo; win timer; HMAC-signed win leaderboard |
| **Sudoku Leaderboard** | Win counts leaderboard |
| **Wordle** | Six-guess word game with color-coded tile feedback and an on-screen keyboard; HMAC-signed win leaderboard |
| **Wordle Leaderboard** | Win counts and best-guess-count leaderboard |

### CLI

| App | Description |
|-----|-------------|
| **Command Line** | ETHAN-DOS 6.22 emulator with a fully emulated filesystem persisted to `localStorage`. Supports command history (↑ / ↓) and double-Tab autocomplete. Includes an embedded Vim editor (`vim` / `vi` / `edit`) with Normal, Insert, Visual, and Command modes. Source files can be executed directly from the terminal via the JDoodle compiler API |

**Supported commands:** `cd`, `ls` / `dir`, `mkdir`, `cat`, `touch`, `echo`, `vim` / `vi` / `edit`, `rm` / `del`, `cls` / `clear`, `date`, `time`, `help`, `ver`, `programs`, `run <app-id>`, `exec <file> [-in <stdin>]`, `exit`

**Code execution:** Write a source file with `vim` or `touch`, then run it with `exec <path/to/file>`. Optional `-in` flag passes stdin (e.g. `exec hello.py -in world`). Run `exec langs` to list all supported languages and file extensions. Powered by the [JDoodle Compiler API](https://www.jdoodle.com/compiler-api/) — supports 110+ languages including Python, JavaScript, C, C++, Java, Rust, Go, and more.

---

## Features

- **Window management** — drag, resize, minimize, maximize, and close; automatic z-order and focus tracking
- **Mobile-responsive** — full-screen windows on viewports ≤ 768 px; game boards scale to fill available width
- **CRT monitor effect** — power-on/off animation with scanline overlay, toggled in Settings
- **HMAC-signed scores** — Minesweeper, Solitaire, Sudoku, and Wordle scores are signed server-side before Firestore writes, preventing spoofed submissions
- **SSE photo streaming** — album data streamed as Server-Sent Events from `/api/photos`
- **Emulated filesystem** — localStorage-backed virtual filesystem with path resolution (`.`, `..`, `~`)
- **Vim in the terminal** — full modal editor embedded inside the CLI with Normal, Insert, Visual, and Command modes
- **In-terminal code execution** — `exec <file>` compiles and runs source files from the emulated filesystem via the JDoodle API; supports 110+ languages; optional `-in` flag for stdin input
- **Minesweeper multiplayer** — shared game rooms via Firebase Realtime Database
- **Museum image upload** — Admin panel uploads museum item images directly to Firebase Storage from the browser
- **Classic Windows 95 UI** — authentic look and feel via [React95](https://github.com/React95/React95) and MS Sans Serif

---

## Tech Stack

| | |
|---|---|
| [Next.js](https://nextjs.org/) 16.2 | App Router, all interactive components are `'use client'` |
| [React](https://react.dev/) 18 | |
| [React95](https://github.com/React95/React95) 4.0 | Windows 95 component library |
| [styled-components](https://styled-components.com/) 5 | Required by React95; provides `ThemeProvider` |
| [Firebase](https://firebase.google.com/) 12 | Firestore, Realtime Database, Storage |
| [openmeteo](https://github.com/open-meteo/javascript-api) | Weather data |
| [react-draggable](https://github.com/react-grid-layout/react-draggable) | Window drag behavior |
| [image-conversion](https://github.com/WangYuLue/image-conversion) | Client-side image compression |
| [dseg](https://github.com/keshikan/DSEG) | 7-segment LED font for game timers |
| SCSS, TypeScript 5, ESLint 9 | |
| [patch-package](https://github.com/ds300/patch-package) | Patches React95 for React 19 compatibility |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The build step runs `scripts/scrape-albums.mjs` before `next build` to populate album cache:

```bash
npm run build
npm run start
```

---

## Environment Variables

Create a `.env.local` in the project root:

```env
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# HMAC signing for game scores (use the same random secret for both)
SCORE_SECRET=
NEXT_PUBLIC_SCORE_SECRET=

# HMAC key for admin session tokens
ADMIN_SECRET=

# JDoodle Compiler API (https://www.jdoodle.com/compiler-api/)
JDOODLE_CLIENT_ID=
JDOODLE_CLIENT_SECRET=
```

Firebase services required: **Firestore**, **Realtime Database**, **Storage**.

---

## API Routes

### Games

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/minesweeper/token` | Issue a short-lived HMAC token for a score submission |
| `GET` | `/api/minesweeper` | Top scores per difficulty, sorted by time ascending |
| `PUT` | `/api/minesweeper` | Submit a verified score `{ username, time, difficulty, token, secureToken }` |
| `POST` | `/api/solitaire/token` | Issue a short-lived HMAC token |
| `GET` | `/api/solitaire` | Win leaderboard, sorted by wins descending |
| `PUT` | `/api/solitaire` | Submit a verified win `{ username, token, secureToken }` |
| `POST` | `/api/sudoku/token` | Issue a short-lived HMAC token |
| `GET` | `/api/sudoku` | Win leaderboard, sorted by wins descending |
| `PUT` | `/api/sudoku` | Submit a verified win `{ username, token, secureToken }` |
| `POST` | `/api/wordle/token` | Issue a short-lived HMAC token |
| `GET` | `/api/wordle` | Win leaderboard, sorted by wins descending |
| `PUT` | `/api/wordle` | Submit a verified win `{ username, guesses, token, secureToken }` |

### Compiler

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/compile` | Proxy to JDoodle — accepts `{ script, stdin, language, versionIndex }`, returns `{ output, statusCode, memory, cpuTime }` |

### Content

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/photos` | Stream Firestore album data as Server-Sent Events |
| `GET` | `/api/museum` | Return all museum items grouped by category (cameras, consoles, computers) |
| `GET` | `/api/weather` | Geocode a city and proxy current + 7-day forecast from Open-Meteo |

### Admin (all require `Authorization: Bearer <token>`)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/auth` | Validate password; return a 1-hour HMAC session token |
| `GET` | `/api/admin/[collection]` | List all documents in a collection |
| `POST` | `/api/admin/[collection]` | Add a document |
| `PATCH` | `/api/admin/[collection]/[docId]` | Update a document |
| `DELETE` | `/api/admin/[collection]/[docId]` | Delete a document |
| `POST` | `/api/admin/albums/scrape` | Scrape a Google Photos album URL and return metadata |

Editable collections: `minesweeper`, `albums`, `solitaire`, `sudoku`, `museum_cameras`, `museum_computers`, `museum_consoles`.

---

## Project Structure

```
app/
  api/                    # Next.js API routes
    admin/                #   CRUD + auth + album scraper
    minesweeper/          #   Score token + leaderboard
    solitaire/            #   Score token + leaderboard
    sudoku/               #   Score token + leaderboard
    wordle/               #   Score token + leaderboard
    compile/              #   JDoodle compiler proxy
    museum/               #   Museum data endpoint
    photos/               #   SSE photo stream
    weather/              #   Geocode + Open-Meteo proxy
  applications/           # ~35 window app components
  components/             # ApplicationWindow, TaskBar, Desktop,
                          # minesweeper/, solitaire/, Vim.tsx
  context/
    WindowManagerContext.tsx   # Three fine-grained contexts
    SettingsContext.tsx        # CRT toggle, persisted to localStorage
  hooks/
    useWindowManager.ts
    useWindowState.ts
    useWindowActions.ts
    useEmulatedFileSystem.ts
    useIsMobile.ts
  helpers/
    CommandHelpers.tsx    # CLI command implementations
    LanguageHelper.ts     # File extension → JDoodle language/version map
  icons/icons.ts
  globals.scss            # All layout and component styles
  crt.scss                # CRT scanline and flicker effects
  layout.tsx
  page.tsx
lib/
  firebase.ts             # Firestore, Realtime DB, Storage exports
  admin-auth.ts           # HMAC-SHA256 session token signing
  museum.ts               # MuseumItem and MuseumResponse types
patches/
  react95+4.0.0.patch     # Replaces removed ReactDOM.findDOMNode call
public/
  fonts/                  # MS Sans Serif WOFF2, DSEG7
  static/images/
scripts/
  scrape-albums.mjs       # Pre-build album metadata scraper
```

---

## License

MIT
