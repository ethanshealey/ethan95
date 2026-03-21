"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AppBar, Button, MenuList, MenuListItem, Toolbar, Frame, Separator } from 'react95'
import { Icons } from '../icons/icons'
import { useWindowManager } from '../hooks/useWindowManager'
import { getAppById } from '../applications/index'

const TaskBar = () => {

  const [open, setOpen] = useState<boolean>(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { state, toggleMinimize, focusWindow } = useWindowManager()

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleTrayItemClick = (windowId: string) => {
    const window = state.windows.find(w => w.id === windowId)
    if (window?.isMinimized) {
      toggleMinimize(windowId)
    } else {
      focusWindow(windowId)
    }
  }

  const SHUTDOWN = () => {
    (document.getElementById('switch') as HTMLInputElement).checked = false
  }

  return (
    <div ref={wrapperRef}>
      <AppBar style={{ top: 'auto', bottom: 0, left: 0, right: 0, zIndex: 10, overflow: 'visible', display: 'flex', justifyContent: 'space-between', flexDirection: 'row' }}>
        <Toolbar style={{ flex: 0, display: 'flex', gap: 2 }}>
          <div style={{ position: 'relative' }}>
            <Button
              onClick={() => setOpen(!open)}
              active={open}
              style={{ fontWeight: 'bold' }}
            >
              <Image
                src="/static/images/start-logo.png"
                alt="Start"
                width={20}
                height={20}
                style={{ marginRight: 4 }}
              />
              Start
            </Button>

            {open && (
              <Frame
                variant='outside'
                shadow
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: '100%',
                  zIndex: 1000,
                  marginBottom: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  padding: '.5em',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  maxHeight: '335px',
                }}
              >
                <MenuList
                  style={{
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    margin: '0',
                    padding: '0',
                    backgroundColor: 'transparent',
                  }}
                >
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => SHUTDOWN()}
                  >
                    <Image
                      src={Icons.SHUT_DOWN_WITH_COMPUTER}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Shutdown
                  </MenuListItem>
                  <Separator />
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => { }}
                  >
                    <Image
                      src={Icons.APPLICATION_HOURGLASS_SMALL_COOL}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Run
                  </MenuListItem>
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => { }}
                  >
                    <Image
                      src={Icons.HELP_BOOK_BIG}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Help
                  </MenuListItem>
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => { }}
                  >
                    <Image
                      src={Icons.SEARCH_FILE_2_COOL}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Find
                  </MenuListItem>
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => { }}
                  >
                    <Image
                      src={Icons.SETTINGS_GEAR_COOL}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Settings
                  </MenuListItem>
                  <MenuListItem
                    style={{ display: 'flex', justifyContent: 'start', cursor: 'pointer' }}
                    onClick={() => { }}
                  >
                    <Image
                      src={Icons.DIRECTORY_PROGRAM_GROUP}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Programs
                  </MenuListItem>
                </MenuList>
              </Frame>
            )}
          </div>
        </Toolbar>

        {/* Application Tray */}
        <Toolbar style={{ flex: 1, display: 'flex', gap: 2, marginLeft: 2, alignItems: 'center' }}>
          {state.windows.map(window => {
            const app = getAppById(window.appId)
            if (!app) return null

            return (
              <Button
                key={window.id}
                onClick={() => handleTrayItemClick(window.id)}
                active={window.focused && !window.isMinimized}
                style={{
                  // padding: '0px 30px 0px 10px',
                  fontSize: '11px',
                  width: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 1,
                  paddingTop: 0,
                }}
              >
                <img
                  src={app.icon}
                  alt={app.name}
                  style={{ width: 16, height: 16, marginRight: 4, display: 'inline-block' }}
                />
                <p style={{ fontWeight: 'bold', fontSize: '12px' }}>{window.title}</p>
              </Button>
            )
          })}
        </Toolbar>
      </AppBar>
    </div>
  )
}

export default TaskBar
