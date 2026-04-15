@AGENTS.md

---

# Ethan95 — Project Documentation

## What This Is

A Windows 95-inspired personal portfolio website. It simulates a full desktop environment — draggable/resizable windows, taskbar, desktop icons, Start menu, ~35 built-in applications. All "pages" are windows opened via the window manager. There is only one actual page route (`/`).

---

## Tech Stack

- **Next.js 16.2** — App Router, all interactive components are `'use client'`
- **React95 v4.0.0** — Windows 95 UI component library (buttons, menus, title bars, etc.)
- **styled-components v5** — Required by React95; provides `ThemeProvider` (`original` theme)
- **SCSS** — `globals.scss` (all layout/component styles), `crt.scss` (CRT monitor effects)
- **Firebase 12** — Firestore (scores, photos, documents), Realtime DB (Minesweeper multiplayer)
- **TypeScript 5**, **ESLint 9**
- **patch-package** — Applies `patches/react95+4.0.0.patch` on `postinstall`

**The patch:** React95's `useIsFocusVisible` hook called `ReactDOM.findDOMNode()` which was removed in React 19. The patch replaces `findDOMNode(instance)` with `instance` directly — ref callbacks already receive the DOM node.

---

## Directory Structure

```
app/
  api/                      # Next.js API routes
    admin/                  # CRUD for Firestore + auth
    minesweeper/            # Score submission + leaderboard
    solitaire/              # Score submission + leaderboard
    sudoku/                 # Score submission + leaderboard
    photos/route.ts         # SSE stream of album data
    weather/route.ts        # Geocode + Open-Meteo proxy
  applications/             # ~35 window app components
  components/               # Core UI components
    minesweeper/            # Grid, tile, multiplayer hook
    solitaire/              # Card component + web worker solver
  context/
    WindowManagerContext.tsx
    SettingsContext.tsx
  hooks/
    useWindowManager.ts
    useEmulatedFileSystem.ts
    useIsMobile.ts
  helpers/
    CommandHelpers.tsx      # CLI command implementations
    peter.ts                # Easter egg
  icons/icons.ts
  globals.scss
  crt.scss
  layout.tsx
  page.tsx
lib/
  firebase.ts
  admin-auth.ts             # HMAC-SHA256 session token signing
  minesweeperRoom.ts
patches/
  react95+4.0.0.patch
public/
  fonts/                    # MS Sans Serif WOFF2, DSEG7 (LED timer font)
  static/images/
scripts/
  scrape-albums.mjs         # Runs pre-build to populate album cache
```

---

## Window Manager

**File:** `app/context/WindowManagerContext.tsx`

### AppWindow shape
```typescript
{
  id: string;           // generated: `window-${Date.now()}-${random}`
  appId: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };   // cascades +30 per new window
  size: { width: number; height: number };
  zIndex: number;
  focused: boolean;
  props?: Record<string, unknown>;       // passed to the app component
}
```

### Three contexts (prefer fine-grained over legacy)
| Hook | Re-renders on state change? | Use when |
|------|-----------------------------|----------|
| `useWindowState()` | Yes | Need current window state |
| `useWindowActions()` | No | Only calling actions |
| `useWindowManager()` | Yes | Legacy, avoid |

### Key behaviors
- `openWindow(appId, { title?, props? })` — new window; focused=true, others unfocused; z-index auto-incremented
- `focusWindow(id)` — sets focused=true on target, false on all others; bumps z-index to top
- `closeWindow(id)` — removes from array, component unmounts
- `toggleMinimize(id)` — window hidden; TaskBar button still visible to restore
- `toggleMaximize(id)` — full viewport (minus taskbar height)
- `unfocusAll()` — called on desktop background click

### Passing data to apps
Use `props` in `openWindow`:
```typescript
openWindow('notepad', { title: 'notes.txt', props: { defaultContent: '...' } })
```
Apps receive `windowId` and `focusWindow` as standard props always.

---

## Application Registry

**File:** `app/applications/index.ts`

Every app has an entry: `{ id, name, component (lazy), icon, defaultSize?, excludeMinimize?, excludeMaximize? }`

To add a new app: create the component, add it to the registry, and it becomes available via `openWindow('id')`, the Programs list, and the Run dialog.

---

## Applications Reference

### System
| App | File | Notes |
|-----|------|-------|
| Welcome | `Welcome.tsx` | Tips carousel, "show on startup" checkbox (localStorage) |
| My Computer | `MyComputer.tsx` | Static icon display (A:, C:, D: drives) |
| My Documents | `MyDocuments.tsx` | Opens Photos, MyProjects, DocumentViewer, Notepad |
| Programs | `Programs.tsx` | Lists all registered apps |
| Run | `Run.tsx` | Type app ID to launch |
| Settings | `Settings.tsx` | CRT toggle |
| Recycle Bin | `RecycleBin.tsx` | Empty by design |
| Internet Explorer | `InternetExplorer.tsx` | URL bar + iframe; preset bookmarks |
| Notepad | `Notepad.tsx` | `<textarea>` with monospace styling; accepts `defaultContent` prop |
| Document Viewer | `DocumentViewer.tsx` | PDF in iframe |
| Admin | `Admin.tsx` | Password-protected Firestore CRUD panel; album scraper |
| Image Compressor | `Compress.tsx` | Client-side image compression via `image-conversion` |

### Media
| App | File | Notes |
|-----|------|-------|
| Photos | `Photos.tsx` | SSE stream from `/api/photos`; thumbnail grid; paginated 24/page |
| Photo Viewer | `PhotoViewer.tsx` | Full-size image; receives `src` prop |
| My Projects | `MyProjects.tsx` | Portfolio project cards with demo/GitHub links |
| Weather | `Weather.tsx` | City search → `/api/weather` → Open-Meteo 7-day forecast |

### Games
| App | File | Notes |
|-----|------|-------|
| Games | `Games.tsx` | Hub launcher for games |
| Minesweeper | `Minesweeper.tsx` | Beginner/Intermediate/Expert; first click safe; multiplayer via Firebase |
| Minesweeper Records | `MinesweeperRecords.tsx` | Leaderboard by difficulty |
| Solitaire | `Solitaire.tsx` | Klondike; drag/drop; undo; web worker solver hint; win leaderboard |
| Sudoku | `Sudoku.tsx` | 9×9; 3 difficulties; arrow key nav; conflict highlighting; win leaderboard |

### CLI
| App | File | Notes |
|-----|------|-------|
| Command Line | `CommandLine.tsx` | DOS emulator (ETHAN-DOS 6.22); hosts Vim when open |

---

## Command Line (CommandLine.tsx)

### How it works
- Single hidden `<input ref={inputRef}>` captures all keypresses (visually invisible)
- Visual display is span-based: prompt + text before cursor + blinking cursor block + text after cursor
- Cursor blinks at 530ms interval (authentic DOS timing)
- History navigated with ↑/↓; double-Tab autocompletes
- Global `keydown` listener on `document` refocuses hidden input whenever the window is focused and Vim is not open — so typing works regardless of where user clicked

### Vim integration
- `vim <file>` / `vi` / `edit` triggers `OPEN_VIM_FLAG` from `processCommand`
- Sets `showEditor=true`, renders `<Vim>` component in place of the terminal
- On Vim close → `showEditor=false` → input re-focuses

### Supported commands
`cd`, `ls`/`dir`, `mkdir`, `cat`, `touch`, `echo`, `vim`/`vi`/`edit`, `rm`/`del`, `cls`/`clear`, `date`, `time`, `help`, `ver`, `programs`, `run <app-id>`, `exit`, `family guy` (easter egg)

---

## Emulated File System (useEmulatedFileSystem.ts)

```typescript
type EmulatedFileSystemObject = {
  name: string;
  type: 'file' | 'directory';
  create_ts: string;
  content?: string;
  children?: EmulatedFileSystemObject[];
}
```

- **Storage:** localStorage key `'filesystem'`, debounced 500ms writes
- **Base structure:** `/home/user/ethan95/readme.txt`, `/etc`, `/var`
- **Returns:** `[fileSystem, location, processCommand, processAutofill, processUpdateFile]`
- `location` is a `string[]` (path segments from root)
- `resolvePath` handles `.`, `..`, `~` resolution

---

## Vim Editor (Vim.tsx)

~700 lines. Full modal editor embedded inside the CLI.

### Modes
- **Normal** (default) — navigate, delete, yank, mode-switch
- **Insert** — type text; `Escape` → Normal
- **Visual** — character selection; `y`/`d`/`x` act on selection; `Escape` → Normal
- **Command** — `:w`, `:q`, `:wq`/`:x`, `:q!`

### Normal mode key bindings
- **Navigation:** `h/j/k/l`, `w/b` (word), `0/$` (line ends), `gg/G` (file ends), `Ctrl+f/b` (page)
- **Edit:** `i/a/o/O` (insert modes), `d`/`c`/`y` + motion (`w`, `$`, `d` for line), `x` (cut char), `p/P` (paste), `u` (undo), `.` (repeat)
- **Select:** `v` → visual mode
- **Search:** `/` → search mode, `n/N` (next/prev)

### State
```typescript
lines: string[]           // file content
cursor: { row, col }
mode: 'normal' | 'insert' | 'command' | 'visual'
visualAnchor: { row, col }
cmdInput: string          // command mode buffer
pending: string           // multi-key commands (e.g. first 'd' in 'dd')
```
Undo history and clipboard register are stored in refs (not state) to avoid re-render churn.

---

## Hooks

### useWindowManager / useWindowState / useWindowActions
See Window Manager section above.

### useIsMobile
`window.matchMedia('(max-width: 768px)')` — returns boolean. On mobile, windows render full-screen and drag/resize is disabled.

### useEmulatedFileSystem
See Emulated File System section above.

---

## Contexts

### WindowManagerContext
See Window Manager section. Provides three contexts: `WindowStateContext`, `WindowActionsContext`, `WindowManagerContext` (legacy).

### SettingsContext
```typescript
{ crtEnabled: boolean, setCrtEnabled: (val: boolean) => void }
```
Persisted to localStorage. Controls CRT scanline/flicker effect (crt.scss applied/removed via class on root container).

---

## Styling

- **MS Sans Serif** loaded from `/public/fonts/` (WOFF2); applied globally
- **React95 components** styled via styled-components + `original` theme
- **globals.scss** — all custom styles: window chrome, desktop, CLI terminal, Vim editor, games, photo gallery, etc.
- **crt.scss** — scanlines overlay, flicker animation, turn-on/off transitions; disabled via class toggle

The window title bar goes blue (focused) / gray (unfocused) based on the `focused` class applied in `ApplicationWindow.tsx`.

---

## API Routes & Security

### Score verification (all three games)
1. On win, client posts to `/api/<game>/token` → server issues `HMAC-SHA256(payload, SCORE_SECRET)` + timestamp
2. Client submits score with token to `PUT /api/<game>`
3. Server re-derives HMAC and validates before writing to Firestore

### Admin auth
- `POST /api/admin/auth` — validates password, returns `{hmac}.{timestamp}` token (1-hour expiry)
- All admin routes require valid token in header
- Uses time-safe comparison

### Environment variables needed
```
SCORE_SECRET               # HMAC key for game scores
NEXT_PUBLIC_SCORE_SECRET   # Same, exposed to client for token request
ADMIN_SECRET               # HMAC key for admin sessions
NEXT_PUBLIC_FIREBASE_*     # Firebase config
```

---

## Build & Dev

```bash
npm run dev       # next dev
npm run build     # runs scrape-albums.mjs then next build
npm run start     # next start
```

`scripts/scrape-albums.mjs` runs pre-build to pull album metadata into cache.

---

## Recent Development History (as of 2026-04-15)

The project grew from a basic window manager outward:
- Window manager + desktop core
- Minesweeper (single → multiplayer via Firebase)
- HMAC score signing for all games
- Solitaire (Klondike + web worker solver)
- Sudoku
- Admin panel (Firestore CRUD + album scraper)
- CLI enhancements (Vim integration, new commands)
- Image compressor
- Visual mode in Vim
- Global keydown redirect for CLI focus
