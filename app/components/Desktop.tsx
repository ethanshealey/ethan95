"use client"

import React, { useEffect, useState } from 'react'
import TaskBar from './TaskBar'
import ApplicationContainer from './ApplicationContainer'
import { useWindowManager } from '../hooks/useWindowManager'
import { APPLICATIONS, RegisteredApp } from '../applications/index'

const TARGET_APPLICATIONS_COL_1: string[] = ['my-computer', 'recycle-bin', 'my-documents', 'notepad', 'internet-explorer', 'games', 'weather', 'command-line']
const TARGET_APPLICATIONS_COL_2: string[] = ['settings', 'compress']

const Desktop = () => {

  // const [ anchor, setAnchor ] = useState<string>(window?.location?.hash ?? '')
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const { openWindow, unfocusAll } = useWindowManager()

  useEffect(() => {
    const showWelcome = localStorage.getItem('showWelcome');
    if (showWelcome === null || showWelcome === 'true') {
      openWindow('welcome');
    }
  }, [])

  // useEffect(( ) => {
  //   if(anchor === '#games')
  //       openWindow('games')
  // }, [])

  return (
    <div id="main" onClick={() => { setSelectedIcon(null); unfocusAll(); }}>
      <div className="desktop-icons">
        {TARGET_APPLICATIONS_COL_1.map((id) => APPLICATIONS.find((app) => app.id === id)).filter((app): app is RegisteredApp => app !== undefined).map((app) => (
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
      <div className="desktop-icons">
        {TARGET_APPLICATIONS_COL_2.map((id) => APPLICATIONS.find((app) => app.id === id)).filter((app): app is RegisteredApp => app !== undefined).map((app) => (
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