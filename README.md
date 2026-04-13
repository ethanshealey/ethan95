# ethan95

A Windows 95-inspired personal portfolio built with Next.js. It simulates a classic desktop environment complete with draggable/resizable windows, a taskbar, desktop icons, and a suite of built-in applications. On mobile, windows go full-screen automatically.

## Applications

| App | Description |
|-----|-------------|
| **Welcome** | Startup tips dialog with "show on startup" preference (persisted via `localStorage`) |
| **My Computer** | Classic Windows 95 file system explorer |
| **My Documents** | Browse and open résumé and other personal documents |
| **My Pictures** | Photo gallery backed by Firestore, streamed via SSE with pagination and lazy loading |
| **Photo Viewer** | Full-size image viewer opened from My Pictures |
| **Document Viewer** | In-app document renderer |
| **My Projects** | Portfolio of personal projects |
| **Internet Explorer** | Embedded browser window |
| **Notepad** | Plain-text editor |
| **Recycle Bin** | Recycle Bin (it's empty) |
| **Programs** | App launcher listing all registered applications |
| **Games** | Games hub — opens Minesweeper, Solitaire, or Sudoku |
| **Minesweeper** | Beginner / Intermediate / Expert difficulties; flood fill, flagging, safe first click; HMAC-signed score submission |
| **Minesweeper Records** | Firestore leaderboard sorted by best time per difficulty |
| **Solitaire** | Classic Klondike solitaire with drag-and-drop, tap-to-select, undo, solver hint, and skip; HMAC-signed win leaderboard |
| **Sudoku** | 9×9 puzzle with Easy / Medium / Hard difficulties; conflict highlighting, related-cell shading, undo, and timer; responsive board (fills available width on mobile); HMAC-signed win leaderboard |
| **Weather** | Search any city for current conditions and a 7-day high/low forecast, powered by Open-Meteo |
| **Command Line** | ETHAN-DOS 6.22 emulator — supports `CLS`, `DIR`, `CD`, `ECHO`, `DATE`, `TIME`, `VER`, `HELP`, `TYPE`, `PROGRAMS`, `RUN`, `EXIT`, and command history (↑ / ↓) |
| **Run** | Open any registered application by ID |
| **Settings** | Toggle the CRT monitor effect on/off |
| **Admin** | Password-protected admin panel for managing Firestore content |

## Features

- **Window management** — drag, resize, minimize, maximize, and close windows; z-order focus tracking
- **Mobile-responsive** — windows switch to full-screen on viewports ≤ 768 px; game boards scale to fill available width
- **CRT monitor effect** — animated power-on/off with scanline overlay, toggleable in Settings
- **HMAC-signed scores** — Minesweeper, Solitaire, and Sudoku scores are signed server-side before being written to Firestore, preventing spoofed submissions
- **Firestore photo streaming** — albums streamed as Server-Sent Events (SSE) for real-time updates
- **Classic Windows 95 UI** — authentic look and feel via [React95](https://github.com/React95/React95) and MS Sans Serif

## Tech Stack

- [Next.js](https://nextjs.org/) 16.2 (App Router)
- [React](https://react.dev/) 18
- [React95](https://github.com/React95/React95) — Windows 95 component library
- [styled-components](https://styled-components.com/) 5
- [Firebase](https://firebase.google.com/) 12 (Firestore)
- [openmeteo](https://github.com/open-meteo/javascript-api) — weather data
- [dseg](https://github.com/keshikan/DSEG) — digital segment font
- SCSS / TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

A Firebase project with Firestore is required. Create a `.env.local` with the following variables before running:

```
SCORE_SECRET=          # server-side HMAC key for score token signing
NEXT_PUBLIC_SCORE_SECRET=  # matching key exposed to the client for token verification
```

Configure your Firebase credentials as well (see `lib/firebase.ts`).

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/minesweeper/token` | Issues a short-lived HMAC token for a score submission |
| `GET`  | `/api/minesweeper` | Returns top scores per difficulty, sorted by time ascending |
| `PUT`  | `/api/minesweeper` | Submits a verified score `{ username, time, difficulty, token, secureToken }` |
| `POST` | `/api/solitaire/token` | Issues a short-lived HMAC token for a win submission |
| `GET`  | `/api/solitaire` | Returns the Solitaire win leaderboard, sorted by wins descending |
| `PUT`  | `/api/solitaire` | Submits a verified win `{ username, token, secureToken }` |
| `POST` | `/api/sudoku/token` | Issues a short-lived HMAC token for a win submission |
| `GET`  | `/api/sudoku` | Returns the Sudoku win leaderboard, sorted by wins descending |
| `PUT`  | `/api/sudoku` | Submits a verified win `{ username, token, secureToken }` |
| `GET`  | `/api/weather` | Geocodes a city name and proxies current + 7-day forecast from Open-Meteo |
| `GET`  | `/api/photos` | Streams Firestore album data as Server-Sent Events |
| `GET/POST/PUT/DELETE` | `/api/admin/[collection]` | CRUD operations on Firestore collections (admin auth required) |
| `GET/PUT/DELETE` | `/api/admin/[collection]/[docId]` | Single-document operations (admin auth required) |
| `POST` | `/api/admin/auth` | Admin login |
| `POST` | `/api/admin/albums/scrape` | Scrapes album metadata into Firestore |

## Project Structure

```
app/
  applications/   # All window apps (Notepad, Minesweeper, Solitaire, Sudoku, Weather, CommandLine, …)
  components/     # Desktop, ApplicationWindow, TaskBar, FileSystem, MinesweeperGrid, SolitaireCard
  context/        # WindowManagerContext (useReducer), SettingsContext (CRT toggle)
  hooks/          # useWindowManager, useIsMobile
  icons/          # Windows 95 icon set
  api/            # API routes (minesweeper, solitaire, sudoku, weather, photos, admin)
lib/
  firebase.ts     # Firebase client utilities
public/
  fonts/          # MS Sans Serif
  static/         # Images, icons, photos
```

## License

MIT
