"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AppBar, Button, MenuList, MenuListItem, Toolbar, Frame, Separator } from 'react95'
import { Icons } from '../icons/icons'
import Applications from '../helpers/Applications'

const TaskBar = () => {

  const [open, setOpen] = useState<boolean>(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={wrapperRef}>
      <AppBar style={{ top: 'auto', bottom: 0, left: 0, zIndex: 10, overflow: 'visible' }}>
        <Toolbar>
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
                {/* <div className='start-menu-ethan95'>
                  <b>Ethan</b>95
                </div> */}
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
                    onClick={() => Applications.Shutdown()}
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
                      src={Icons.DIRECTORY_OPEN_FILE_MYDOCS_2K}
                      alt=""
                      height={25}
                      width={25}
                    />
                    &nbsp; Documents
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
      </AppBar>
    </div>
  )
}

export default TaskBar