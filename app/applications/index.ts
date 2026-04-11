import React from 'react';
import { Icons } from '../icons/icons';
import Notepad from './Notepad';
import MyComputer from './MyComputer';
import RecycleBin from './RecycleBin';
import MyDocuments from './MyDocuments';
import Photos from './Photos';
import PhotoViewer from './PhotoViewer';
import DocumentViewer from './DocumentViewer';
import InternetExplorer from './InternetExplorer';
import MyProjects from './MyProjects';
import Welcome from './Welcome';
import Programs from './Programs';
import Games from './Games';
import Minesweeper from './Minesweeper';
import MinesweeperWinner from './MinesweeperWinner';
import MinesweeperRecords from './MinesweeperRecords';
import Solitaire from './Solitaire';
import Admin from './Admin';
import Settings from './Settings';
import Weather from './Weather';
import CommandLine from './CommandLine';
import Run from './Run';

export const DEFAULT_WINDOW_SIZE = { width: 500, height: 400 };
export const DEFAULT_MIN_SIZE = { width: 300, height: 200 };

export interface RegisteredApp {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
  fitContent?: boolean;
}

export const APPLICATIONS: RegisteredApp[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    icon: Icons.CHM,
    component: Welcome,
  },
  {
    id: 'notepad',
    name: 'Notepad',
    icon: Icons.NOTEPAD,
    component: Notepad,
  },
  {
    id: 'my-computer',
    name: 'My Computer',
    icon: Icons.COMPUTER_EXPLORER,
    component: MyComputer,
  },
  {
    id: 'recycle-bin',
    name: 'Recycle Bin',
    icon: Icons.RECYCLE_BIN_FULL_COOL,
    component: RecycleBin,
  },
  {
    id: 'my-documents',
    name: 'My Documents',
    icon: Icons.DIRECTORY_OPEN_FILE_MYDOCS,
    component: MyDocuments,
  },
  {
    id: 'photos',
    name: 'My Pictures',
    icon: Icons.PICTURES,
    component: Photos,
  },
  {
    id: 'photo-viewer',
    name: 'Photo Viewer',
    icon: Icons.IMAGE_OLD_JPEG,
    component: PhotoViewer,
  },
  {
    id: 'document-viewer',
    name: 'Document Viewer',
    icon: Icons.DOCUMENT,
    component: DocumentViewer,
  },
  {
    id: 'internet-explorer',
    name: 'Internet Explorer',
    icon: Icons.MSIE2,
    component: InternetExplorer,
  },
  {
    id: 'my-projects',
    name: 'My Projects',
    icon: Icons.DIRECTORY_CONTROL_PANEL,
    component: MyProjects,
  },
  {
    id: 'programs',
    name: 'Programs',
    icon: Icons.DIRECTORY_PROGRAM_GROUP,
    component: Programs,
  },
  {
    id: 'games',
    name: 'Games',
    icon: Icons.DIRECTORY_PROGRAM_GROUP,
    component: Games,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: Icons.MINESWEEPER,
    component: Minesweeper,
  },
  {
    id: 'minesweeper-winner',
    name: 'Minesweeper Winner',
    icon: Icons.MINESWEEPER,
    component: MinesweeperWinner,
    fitContent: true,
  },
  {
    id: 'minesweeper-records',
    name: 'Minesweeper Records',
    icon: Icons.MINESWEEPER,
    component: MinesweeperRecords,
    fitContent: true,
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    icon: Icons.GAME_SOLITAIRE,
    component: Solitaire,
    fitContent: true,
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Icons.DIRECTORY_CONTROL_PANEL,
    component: Admin,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Icons.SETTINGS_GEAR_COOL,
    component: Settings,
  },
  {
    id: 'command-line',
    name: 'Command Line',
    icon: Icons.CONSOLE_PROMPT,
    component: CommandLine,
  },
  {
    id: 'run',
    name: 'Run',
    icon: Icons.APPLICATION_HOURGLASS_SMALL_COOL,
    component: Run,
    fitContent: true,
  }

  // {
  //   id: 'weather',
  //   name: 'Weather',
  //   icon: Icons.WORLD,
  //   component: Weather,
  // },
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APPLICATIONS.find((app) => app.id === id);
}
