# ethan95

A Windows 95-inspired personal portfolio built with Next.js. It simulates a classic desktop environment complete with draggable/resizable windows, a taskbar, desktop icons, and a suite of built-in applications.

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
| **Programs** | App launcher listing all registered applications |
| **Games** | Games hub |
| **Minesweeper** | Beginner / Intermediate / Expert difficulties; flood fill, flagging, safe first click (first tile and neighbors are always mine-free); HMAC-signed score submission |
| **Minesweeper Records** | Firestore leaderboard sorted by best time per difficulty |
| **Solitaire** | Classic Klondike solitaire |
| **Command Line** | ETHAN-DOS 6.22 emulator — supports `CLS`, `DIR`, `CD`, `ECHO`, `DATE`, `TIME`, `VER`, `HELP`, `TYPE`, `EXIT`, `PROGRAMS`, `RUN`, and command history (↑ / ↓) |
| **Run** | Open any registered application by ID |
| **Notepad** | Plain-text editor |
| **Recycle Bin** | Recycle Bin (it's empty) |
| **Settings** | Toggle the CRT monitor effect on/off |
| **Admin** | Password-protected admin panel for managing Firestore content |

## Features

- **Window management** — drag, resize, minimize, maximize, and close windows; z-order focus tracking
- **CRT monitor effect** — animated power on/off with scanline overlay, toggleable in Settings
- **HMAC-signed scores** — Minesweeper scores are signed server-side before being written to Firestore, preventing spoofed submissions
- **Firestore photo streaming** — albums streamed as Server-Sent Events (SSE) for real-time updates
- **Classic Windows 95 UI** — authentic look and feel via [React95](https://github.com/React95/React95) and MS Sans Serif

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 18
- [React95](https://github.com/React95/React95) — Windows 95 component library
- [styled-components](https://styled-components.com/)
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

A Firebase project with Firestore is required. Set a `SCORE_SECRET` environment variable (used to sign Minesweeper score tokens) and configure your Firebase credentials before running.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/minesweeper/token` | Issues a short-lived HMAC token for a score submission |
| `GET` | `/api/minesweeper` | Returns top scores per difficulty, sorted by time ascending |
| `PUT` | `/api/minesweeper` | Submits a verified score `{ username, time, difficulty, token }` |
| `GET` | `/api/photos` | Streams Firestore album data as Server-Sent Events |
| `GET/POST/PUT/DELETE` | `/api/admin/[collection]` | CRUD operations on Firestore collections (admin auth required) |
| `GET/PUT/DELETE` | `/api/admin/[collection]/[docId]` | Single-document operations (admin auth required) |
| `POST` | `/api/admin/auth` | Admin login |
| `POST` | `/api/admin/albums/scrape` | Scrapes album metadata into Firestore |

## Project Structure

```
app/
  applications/   # All window apps (Notepad, Photos, Minesweeper, Solitaire, CommandLine, etc.)
  components/     # Desktop, ApplicationWindow, TaskBar, FileSystem, MinesweeperGrid, SolitaireCard
  context/        # WindowManagerContext (useReducer), SettingsContext (CRT toggle)
  hooks/          # useWindowManager
  icons/          # Windows 95 icon set
  api/            # API routes (minesweeper, photos, admin)
lib/
  firebase.ts     # Firebase client utilities
scripts/
  scrape-albums   # Build-time script to populate album data
public/
  fonts/          # MS Sans Serif
  static/         # Images, camera photos, console photos
```

## License

MIT
