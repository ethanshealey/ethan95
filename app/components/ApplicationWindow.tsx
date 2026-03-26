'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useWindowManager } from '../hooks/useWindowManager';
import { AppWindow } from '../context/WindowManagerContext';
import { RegisteredApp, DEFAULT_MIN_SIZE } from '../applications/index';
import Image from 'next/image';

interface ApplicationWindowProps {
  windowData: AppWindow;
  app: RegisteredApp;
}

const MINIMIZE_EXCLUSION_LIST = ['Welcome'];
const MAXIMIZE_EXCLUSION_LIST = ['Welcome', 'Minesweeper', 'Minesweeper Winner'];
const RESIZE_EXCLUSION_LIST   = ['Welcome', 'Minesweeper', 'Minesweeper Winner', 'Minesweeper Records'];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function ApplicationWindow({ windowData, app }: ApplicationWindowProps) {
  const { focusWindow, setPosition, setSize, toggleMinimize, toggleMaximize, closeWindow } = useWindowManager();
  const isMobile = useIsMobile();
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle title bar dragging (desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;

    focusWindow(windowData.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - windowData.position.x,
      y: e.clientY - windowData.position.y,
    });
  };

  // Handle window resizing (desktop only)
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMobile) return;
    focusWindow(windowData.id);
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: windowData.size.width,
      height: windowData.size.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition(
          windowData.id,
          e.clientX - dragOffset.x,
          e.clientY - dragOffset.y
        );
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(resizeStart.width + deltaX, DEFAULT_MIN_SIZE.width);
        const newHeight = Math.max(resizeStart.height + deltaY, DEFAULT_MIN_SIZE.height);
        setSize(windowData.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, windowData.id, setPosition, setSize]);

  if (windowData.isMinimized) {
    return null;
  }

  const AppContent = app.component;
  const isMaximized = windowData.isMaximized;

  // On mobile: always fullscreen (no dragging/positioning)
  const windowStyle: React.CSSProperties = isMobile || isMaximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100% - 50px)',
        zIndex: windowData.zIndex,
      }
    : app.fitContent
    ? {
        position: 'fixed',
        left: windowData.position.x,
        top: windowData.position.y,
        zIndex: windowData.zIndex,
      }
    : {
        position: 'fixed',
        left: windowData.position.x,
        top: windowData.position.y,
        width: windowData.size.width,
        height: windowData.size.height,
        zIndex: windowData.zIndex,
      };

  return (
    <div ref={windowRef} style={windowStyle} className="application-window" onClick={(e) => { e.stopPropagation(); focusWindow(windowData.id); }}>
      {/* Title Bar */}
      <div
        ref={titleBarRef}
        className={`window-title-bar ${!windowData.focused ? 'unfocused' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="title-bar-left">
          { app.icon === 'NONE' ? null : <img src={app.icon} alt={app.name} className="window-icon" /> }  
          <span className="title-bar-text">{windowData.title}</span>
        </div>
        <div className="title-bar-buttons" data-no-drag>
          { !MINIMIZE_EXCLUSION_LIST.includes(windowData.title) && <button
            className="window-button minimize"
            onClick={(e) => { e.stopPropagation(); toggleMinimize(windowData.id); }}
            title="Minimize"
          /> }
          {!isMobile && !MAXIMIZE_EXCLUSION_LIST.includes(windowData.title) && (
            <button
              className="window-button maximize"
              onClick={(e) => { e.stopPropagation(); toggleMaximize(windowData.id); }}
              title="Maximize"
            />
          )}
          <button
            className="window-button close-button"
            onClick={(e) => { e.stopPropagation(); closeWindow(windowData.id); }}
            title="Close"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="window-content" style={app.fitContent ? { flex: 'none' } : undefined} onClick={(e) => { e.stopPropagation(); focusWindow(windowData.id); }}>
        <AppContent windowId={windowData.id} focusWindow={focusWindow} {...(windowData.props ?? {})} />
      </div>

      {/* Resize Handle (bottom-right corner, desktop only) */}
      {!isMaximized && !isMobile && !RESIZE_EXCLUSION_LIST.includes(windowData.title) && (
        <div
          className="window-resize-handle"
          onMouseDown={handleResizeStart}
          data-no-drag
        />
      )}
    </div>
  );
}
