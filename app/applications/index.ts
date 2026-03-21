import React from 'react';
import { Icons } from '../icons/icons';
import Notepad from './Notepad';
import MyComputer from './MyComputer';
import RecycleBin from './RecycleBin';
import MyDocuments from './MyDocuments';
import Photos from './Photos';

export interface RegisteredApp {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<any>;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
}

export const APPLICATIONS: RegisteredApp[] = [
  {
    id: 'notepad',
    name: 'Notepad',
    icon: Icons.NOTEPAD,
    component: Notepad,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 200 },
  },
  {
    id: 'mycomputer',
    name: 'MyComputer',
    icon: Icons.COMPUTER_EXPLORER,
    component: MyComputer,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 200 },
  },
  {
    id: 'recyclebin',
    name: 'Recycle Bin',
    icon: Icons.RECYCLE_BIN_EMPTY,
    component: RecycleBin,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 200 },
  },
  {
    id: 'mydocuments',
    name: 'My Documents',
    icon: Icons.DIRECTORY_CLOSED,
    component: MyDocuments,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 200 },
  },
  {
    id: 'photos',
    name: 'Photos',
    icon: Icons.DIRECTORY_PICTURES,
    component: Photos,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 200 },
  },
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APPLICATIONS.find((app) => app.id === id);
}
