"use client"

import React, { useState } from 'react'
import TaskBar from './TaskBar'
import ApplicationContainer from './ApplicationContainer'
import { useWindowManager } from '../hooks/useWindowManager'
import { APPLICATIONS, RegisteredApp } from '../applications/index'

const TARGET_APPLICATIONS: string[] = ['mycomputer', 'recyclebin', 'mydocuments', 'notepad', 'photos']

const Desktop = () => {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const { openWindow, unfocusAll } = useWindowManager()

  return (
    <div id="main" onClick={() => { setSelectedIcon(null); unfocusAll(); }}>
      <div className="desktop-icons">
        {TARGET_APPLICATIONS.map((id) => APPLICATIONS.find((app) => app.id === id)).filter((app): app is RegisteredApp => app !== undefined).map((app) => (
          <div
            key={app.id}
            className={`icon-item ${selectedIcon === app.id ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedIcon(app.id)
            }}
            onDoubleClick={() => openWindow(app.id)}
          >
            <img src={app.icon} alt={app.name} />
            <span>{app.name}</span>
          </div>
        ))}
      </div>
      <ApplicationContainer />
      <TaskBar />
    </div>
  )
}

export default Desktop