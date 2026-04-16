import React from 'react';
import { Icons } from '../icons/icons';

const Notepad          = React.lazy(() => import('./Notepad'));
const MyComputer       = React.lazy(() => import('./MyComputer'));
const RecycleBin       = React.lazy(() => import('./RecycleBin'));
const MyDocuments      = React.lazy(() => import('./MyDocuments'));
const Photos           = React.lazy(() => import('./Photos'));
const PhotoViewer      = React.lazy(() => import('./PhotoViewer'));
const DocumentViewer   = React.lazy(() => import('./DocumentViewer'));
const InternetExplorer = React.lazy(() => import('./InternetExplorer'));
const MyProjects       = React.lazy(() => import('./MyProjects'));
const Welcome          = React.lazy(() => import('./Welcome'));
const Programs         = React.lazy(() => import('./Programs'));
const Games            = React.lazy(() => import('./Games'));
const Minesweeper      = React.lazy(() => import('./Minesweeper'));
const MinesweeperWinner  = React.lazy(() => import('./MinesweeperWinner'));
const MinesweeperRecords = React.lazy(() => import('./MinesweeperRecords'));
const Solitaire          = React.lazy(() => import('./Solitaire'));
const SolitaireWinner    = React.lazy(() => import('./SolitaireWinner'));
const SolitaireLeaderboard = React.lazy(() => import('./SolitaireLeaderboard'));
const Admin            = React.lazy(() => import('./Admin'));
const Settings         = React.lazy(() => import('./Settings'));
const Weather          = React.lazy(() => import('./Weather'));
const CommandLine      = React.lazy(() => import('./CommandLine'));
const Run              = React.lazy(() => import('./Run'));
const Sudoku           = React.lazy(() => import('./Sudoku'));
const SudokuWinner     = React.lazy(() => import('./SudokuWinner'));
const SudokuLeaderboard = React.lazy(() => import('./SudokuLeaderboard'));
const Compress         = React.lazy(() => import('./Compress'));
const Calculator       = React.lazy(() => import('./Calculator'));

export const DEFAULT_WINDOW_SIZE = { width: 500, height: 400 };
export const DEFAULT_MIN_SIZE = { width: 300, height: 200 };

export interface RegisteredApp {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
  fitContent?: boolean;
  minSize?: { width: number; height: number };
}

export const APPLICATIONS: RegisteredApp[] = [
  { id: 'welcome',               name: 'Welcome',               icon: Icons.CHM,                            component: Welcome },
  { id: 'notepad',               name: 'Notepad',               icon: Icons.NOTEPAD,                        component: Notepad },
  { id: 'my-computer',           name: 'My Computer',           icon: Icons.COMPUTER_EXPLORER,              component: MyComputer },
  { id: 'recycle-bin',           name: 'Recycle Bin',           icon: Icons.RECYCLE_BIN_FULL_COOL,          component: RecycleBin },
  { id: 'my-documents',          name: 'My Documents',          icon: Icons.DIRECTORY_OPEN_FILE_MYDOCS,     component: MyDocuments },
  { id: 'photos',                name: 'My Pictures',           icon: Icons.PICTURES,                       component: Photos },
  { id: 'photo-viewer',          name: 'Photo Viewer',          icon: Icons.IMAGE_OLD_JPEG,                 component: PhotoViewer },
  { id: 'document-viewer',       name: 'Document Viewer',       icon: Icons.DOCUMENT,                       component: DocumentViewer },
  { id: 'internet-explorer',     name: 'Internet Explorer',     icon: Icons.MSIE2,                          component: InternetExplorer },
  { id: 'my-projects',           name: 'My Projects',           icon: Icons.DIRECTORY_CONTROL_PANEL,        component: MyProjects },
  { id: 'programs',              name: 'Programs',              icon: Icons.DIRECTORY_PROGRAM_GROUP,        component: Programs },
  { id: 'games',                 name: 'Games',                 icon: Icons.DIRECTORY_PROGRAM_GROUP,        component: Games },
  { id: 'minesweeper',           name: 'Minesweeper',           icon: Icons.MINESWEEPER,                    component: Minesweeper },
  { id: 'minesweeper-winner',    name: 'Minesweeper Winner',    icon: Icons.MINESWEEPER,                    component: MinesweeperWinner,    fitContent: true },
  { id: 'minesweeper-records',   name: 'Minesweeper Records',   icon: Icons.MINESWEEPER,                    component: MinesweeperRecords,   fitContent: true },
  { id: 'solitaire',             name: 'Solitaire',             icon: Icons.GAME_SOLITAIRE,                 component: Solitaire,            fitContent: true },
  { id: 'solitaire-winner',      name: 'Solitaire Winner',      icon: Icons.GAME_SOLITAIRE,                 component: SolitaireWinner,      fitContent: true },
  { id: 'solitaire-leaderboard', name: 'Solitaire Leaderboard', icon: Icons.GAME_SOLITAIRE,                 component: SolitaireLeaderboard, fitContent: true },
  { id: 'admin',                 name: 'Admin',                 icon: Icons.DIRECTORY_CONTROL_PANEL,        component: Admin },
  { id: 'settings',              name: 'Settings',              icon: Icons.SETTINGS_GEAR_COOL,             component: Settings },
  { id: 'command-line',          name: 'Command Line',          icon: Icons.CONSOLE_PROMPT,                 component: CommandLine },
  { id: 'run',                   name: 'Run',                   icon: Icons.APPLICATION_HOURGLASS_SMALL_COOL, component: Run,               fitContent: true },
  { id: 'weather',               name: 'Weather',               icon: Icons.WORLD,                          component: Weather },
  { id: 'sudoku',                name: 'Sudoku',                icon: Icons.WINREP,                         component: Sudoku,               fitContent: true },
  { id: 'sudoku-winner',         name: 'Sudoku Winner',         icon: Icons.WINREP,                         component: SudokuWinner,         fitContent: true },
  { id: 'sudoku-leaderboard',    name: 'Sudoku Leaderboard',    icon: Icons.WINREP,                         component: SudokuLeaderboard,    fitContent: true },
  { id: 'compress',              name: 'Image Compressor',      icon: Icons.KODAK_IMAGING,                  component: Compress },
  { id: 'calculator',            name: 'Calculator',            icon: Icons.CALCULATOR,                     component: Calculator,           fitContent: true },
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APPLICATIONS.find((app) => app.id === id);
}
