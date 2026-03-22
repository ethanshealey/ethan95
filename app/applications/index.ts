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

export const DEFAULT_WINDOW_SIZE = { width: 500, height: 400 };
export const DEFAULT_MIN_SIZE = { width: 300, height: 200 };

export interface RegisteredApp {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
}

export const APPLICATIONS: RegisteredApp[] = [
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
    icon: Icons.DIRECTORY_PICTURES,
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
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APPLICATIONS.find((app) => app.id === id);
}
