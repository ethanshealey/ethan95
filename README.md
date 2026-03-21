# ethan95

A Windows 95-inspired portfolio website built with Next.js. It simulates a classic desktop environment complete with draggable windows, a taskbar, desktop icons, and built-in apps — including a photo gallery that streams from Google Photos shared albums.

## Features

- **Window management** — drag, resize, minimize, maximize, and close windows
- **CRT monitor effect** — animated turn-on/turn-off with scanline overlay
- **Built-in apps**
  - Notepad
  - My Computer
  - My Documents
  - Photos (Google Photos integration)
  - Recycle Bin
- **Photo gallery** — streams shared Google Photos albums with pagination and lazy loading
- **Classic Windows 95 UI** — authentic styling via [React95](https://github.com/React95/React95)

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 18
- [React95](https://github.com/React95/React95) — Windows 95 component library
- [styled-components](https://styled-components.com/)
- SCSS
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Google Photos Setup

Albums are configured in `public/data/albums.json` as a list of Google Photos shared album URLs:

```json
[
  "https://photos.app.goo.gl/..."
]
```

At build time, `scripts/scrape-albums.mjs` fetches and caches album metadata to `public/data/albums-cache.json`. At runtime, a fallback cache with a 1-hour TTL is used if the build cache is unavailable.

To pre-build the album cache manually:

```bash
node scripts/scrape-albums.mjs
```

## Project Structure

```
app/
  applications/   # App components (Notepad, Photos, etc.)
  components/     # Desktop, ApplicationWindow, FileSystem, TaskBar
  context/        # WindowManagerContext (window state via useReducer)
  api/photos/     # SSE endpoint for streaming album data
public/
  data/           # albums.json config + albums-cache.json
  static/icons/   # Windows 95 icon set
  fonts/          # MS Sans Serif
scripts/
  scrape-albums.mjs  # Build-time album scraper
```

## License

MIT
