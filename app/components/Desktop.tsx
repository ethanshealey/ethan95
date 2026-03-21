"use client"

import React, { useState } from 'react'
import TaskBar from './TaskBar'
import ApplicationContainer from './ApplicationContainer'
import { useWindowManager } from '../hooks/useWindowManager'
import { Icons } from '../icons/icons'

interface DesktopIconItem {
  id: string
  label: string
  iconSrc: string
  appId?: string
  appName?: string
  onDoubleClick?: () => void
}

const Desktop = () => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const { openWindow, unfocusAll } = useWindowManager()

  const desktopIcons: DesktopIconItem[] = [
    {
      id: 'mycomputer',
      label: 'My Computer',
      iconSrc: Icons.COMPUTER_EXPLORER,
      appId: 'mycomputer',
      appName: 'My Computer',
    },
    {
      id: 'recyclebin',
      label: 'Recycle Bin',
      iconSrc: Icons.RECYCLE_BIN_EMPTY,
      appId: 'recyclebin',
      appName: 'Recycle Bin',
    },
    {
      id: 'mydocuments',
      label: 'My Documents',
      iconSrc: Icons.DIRECTORY_CLOSED,
      appId: 'mydocuments',
      appName: 'My Documents',
    },
    {
      id: 'notepad',
      label: 'Notepad',
      iconSrc: Icons.NOTEPAD,
      appId: 'notepad',
      appName: 'Notepad',
    },
    {
      id: 'photos',
      label: 'Photos',
      iconSrc: Icons.DIRECTORY_PICTURES,
      appId: 'photos',
      appName: 'Photos',
    },
  ]

  const handleIconDoubleClick = (item: DesktopIconItem) => {
    if (item.appId && item.appName) {
      openWindow(item.appId, item.appName)
    }
  }

  return (
    <div id="main" onClick={() => { setSelectedIcon(null); unfocusAll(); }}>
      <div className="desktop-icons">
        {desktopIcons.map((item) => (
          <div
            key={item.id}
            className={`icon-item ${selectedIcon === item.id ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedIcon(item.id)
            }}
            onDoubleClick={() => handleIconDoubleClick(item)}
          >
            <img src={item.iconSrc} alt={item.label} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <ApplicationContainer />
      <TaskBar />
    </div>
  )
}

export default Desktop