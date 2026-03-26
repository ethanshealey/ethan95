# ethan95

A Windows 95-inspired portfolio website built with Next.js. It simulates a classic desktop environment complete with draggable windows, a taskbar, desktop icons, and built-in apps.

## Features

- **Window management** — drag, resize, minimize, maximize, and close windows
- **CRT monitor effect** — animated turn-on/turn-off with scanline overlay
- **Built-in apps**
  - Notepad
  - My Computer
  - My Documents
  - Photos + Photo Viewer
  - Internet Explorer
  - Recycle Bin
  - Welcome screen
  - Minesweeper
- **Photo gallery** — streams Firestore-backed albums via SSE, with pagination and lazy loading
- **Minesweeper** — Beginner / Intermediate / Expert, flagging, flood fill, safe first click (first tile and its neighbors are always mine-free), and a Firestore leaderboard sorted by best time
- **Firebase integration** — Firestore backend via `lib/firebase.ts`
- **Classic Windows 95 UI** — authentic styling via [React95](https://github.com/React95/React95)

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 18
- [React95](https://github.com/React95/React95) — Windows 95 component library
- [styled-components](https://styled-components.com/)
- [Firebase](https://firebase.google.com/) 12
- SCSS
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

A Firebase project with Firestore is required. Configure your credentials in the environment before running.

## API Routes

- `GET /api/minesweeper` — Returns top scores per difficulty, sorted by time ascending
- `PUT /api/minesweeper` — Submits a score `{ username, time, difficulty }`
- `GET /api/photos` — Streams Firestore album data as Server-Sent Events

## Project Structure

```
app/
  applications/   # App components (Notepad, Photos, Minesweeper, Internet Explorer, etc.)
  components/     # Desktop, ApplicationWindow, FileSystem, TaskBar, MinesweeperGrid
  context/        # WindowManagerContext (window state via useReducer)
  hooks/          # useWindowManager
  icons/          # Windows 95 icon set
  api/            # minesweeper + photos API routes
lib/
  firebase.ts     # Firebase client utilities
public/
  fonts/          # MS Sans Serif
  static/         # Images and icons
```

## License

MIT
