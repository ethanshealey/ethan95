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
    id: 'mycomputer',
    name: 'My Computer',
    icon: Icons.COMPUTER_EXPLORER,
    component: MyComputer,
  },
  {
    id: 'recyclebin',
    name: 'Recycle Bin',
    icon: Icons.RECYCLE_BIN_FULL_COOL,
    component: RecycleBin,
  },
  {
    id: 'mydocuments',
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
    id: 'documentviewer',
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
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APPLICATIONS.find((app) => app.id === id);
}
