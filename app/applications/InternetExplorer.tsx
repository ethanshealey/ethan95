'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppBar, Button, Frame, MenuList, MenuListItem, TextInput, Toolbar } from 'react95';

const recommended_urls = [
  'https://will.computer/',
  'https://nate-griffith.com/',
  'https://avery-clark.netlify.app/',
]

interface InternetExplorerProps {
  windowId: string;
  focusWindow: (id: string) => void;
  defaultContent?: string;
}

export default function InternetExplorer({ windowId, focusWindow, defaultContent }: InternetExplorerProps) {
  const DEFAULT_URL = defaultContent ?? undefined
  const [inputValue, setInputValue] = useState(DEFAULT_URL)
  const [url, setUrl] = useState(DEFAULT_URL)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.getElementById(windowId)?.focus();
  }, [])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const navigate = (target = inputValue) => {
    let resolved = target?.trim()
    if (resolved && !/^https?:\/\//i.test(resolved)) {
      resolved = 'https://' + resolved
    }
    setInputValue(resolved)
    setUrl(resolved)
    setDropdownOpen(false)
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column' }} onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <AppBar style={{ position: 'static', display: 'flex' }}>
        <Toolbar style={{ gap: 4, padding: '2px 4px', marginBottom: '2px' }}>
          <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Address:</span>
          <div ref={dropdownRef} style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <TextInput
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') navigate() }}
              style={{ flex: 1, fontSize: '12px' }}
            />
            <Button
              onClick={() => setDropdownOpen(o => !o)}
              active={dropdownOpen}
              style={{ padding: '0 6px', minWidth: 'unset' }}
            >▼</Button>
            {dropdownOpen && (
              <div
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, marginTop: 1, padding: 0 }}
              >
                <MenuList style={{ padding: 0, width: '100%', height: '100%', marginTop: '-5px' }}>
                  {recommended_urls.map(u => (
                    <MenuListItem
                      key={u}
                      onClick={() => navigate(u)}
                      style={{ fontSize: '12px', cursor: 'pointer', padding: '4px 8px' }}
                    >
                      {u}
                    </MenuListItem>
                  ))}
                </MenuList>
              </div>
            )}
          </div>
          <Button onClick={() => navigate()} style={{ whiteSpace: 'nowrap' }}>Go</Button>
        </Toolbar>
      </AppBar>
      <iframe src={url} width="100%" style={{ flex: 1, border: 'none' }} />
    </div>
  );
}
