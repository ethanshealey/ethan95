'use client';

import React, { useState } from 'react';
import { Icons } from '../icons/icons';

export interface FileItem {
  name: string;
  icon: string;
  type: 'folder' | 'file';
  size?: string;
  modified?: string;
  onOpen?: () => void;
}

interface FileSystemProps {
  items: FileItem[];
  view?: 'icons' | 'list';
}

export const FileIcons = {
  FOLDER: Icons.DIRECTORY_CLOSED,
  FOLDER_OPEN: Icons.DIRECTORY_OPEN,
  FILE: Icons.FILE_LINES,
  DOCUMENT: Icons.DOCUMENT,
  IMAGE: Icons.IMAGE_OLD_JPEG,
  IMAGE_GIF: Icons.IMAGE_OLD_GIF,
  HARD_DRIVE: Icons.HARD_DISK_DRIVE,
  CD_DRIVE: Icons.CD_DRIVE,
  FLOPPY: Icons.FLOPPY_DRIVE_3_5,
  RECYCLE_BIN_EMPTY: Icons.RECYCLE_BIN_EMPTY,
  RECYCLE_BIN_FULL: Icons.RECYCLE_BIN_FULL,
};

export default function FileSystem({ items, view = 'icons' }: FileSystemProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    setSelected(name);
  }

  function handleDoubleClick(e: React.MouseEvent, item: FileItem) {
    e.stopPropagation();
    item.onOpen?.();
  }

  function handleContainerClick() {
    setSelected(null);
  }

  if (view === 'list') {
    return (
      <div className="fs-list-container" onClick={handleContainerClick}>
        <table className="fs-list-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Type</th>
              <th>Modified</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.name}
                className={`fs-list-row${selected === item.name ? ' selected' : ''}`}
                onClick={(e) => handleClick(e, item.name)}
                onDoubleClick={(e) => handleDoubleClick(e, item)}
              >
                <td className="fs-list-name">
                  <img src={item.icon} alt="" className="fs-list-icon" />
                  {item.name}
                </td>
                <td>{item.size ?? ''}</td>
                <td>{item.type === 'folder' ? 'File Folder' : 'File'}</td>
                <td>{item.modified ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="fs-icons-container" onClick={handleContainerClick}>
      {items.map((item) => (
        <div
          key={item.name}
          className={`fs-icon-item${selected === item.name ? ' selected' : ''}`}
          onClick={(e) => handleClick(e, item.name)}
          onDoubleClick={(e) => handleDoubleClick(e, item)}
        >
          <img src={item.icon} alt={item.name} className="fs-icon-img" />
          <span className="fs-icon-label">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
