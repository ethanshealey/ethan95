"use client"

import React, { useEffect, useState } from 'react'
import TaskBar from './TaskBar'
import ApplicationContainer from './ApplicationContainer'
import { useWindowActions } from '../hooks/useWindowManager'
import { APPLICATIONS, RegisteredApp } from '../applications/index'

const TARGET_APPLICATIONS: string[] = ['my-computer', 'recycle-bin', 'my-documents', 'notepad', 'internet-explorer', 'games', 'weather', 'command-line', 'settings', 'compress', 'calculator']

const Desktop = () => {

  // const [ anchor, setAnchor ] = useState<string>(window?.location?.hash ?? '')
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const { openWindow, unfocusAll } = useWindowActions()

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