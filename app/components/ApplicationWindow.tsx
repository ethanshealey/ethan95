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

export default function ApplicationWindow({ windowData, app }: ApplicationWindowProps) {
  const { focusWindow, setPosition, setSize, toggleMinimize, toggleMaximize, closeWindow } = useWindowManager();
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle title bar dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    
    focusWindow(windowData.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - windowData.position.x,
      y: e.clientY - windowData.position.y,
    });
  };

  // Handle window resizing
  const handleResizeStart = (e: React.MouseEvent) => {
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

  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100% - 50px)',
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
          <img src={app.icon} alt={app.name} className="window-icon" />
          <span className="title-bar-text">{windowData.title}</span>
        </div>
        <div className="title-bar-buttons" data-no-drag>
          <button
            className="window-button minimize"
            onClick={(e) => { e.stopPropagation(); toggleMinimize(windowData.id); }}
            title="Minimize"
          />
          <button
            className="window-button maximize"
            onClick={(e) => { e.stopPropagation(); toggleMaximize(windowData.id); }}
            title="Maximize"
          />
          <button
            className="window-button close-button"
            onClick={(e) => { e.stopPropagation(); closeWindow(windowData.id); }}
            title="Close"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="window-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowData.id); }}>
        <AppContent windowId={windowData.id} focusWindow={focusWindow} {...(windowData.props ?? {})} />
      </div>

      {/* Resize Handle (bottom-right corner) */}
      {!isMaximized && (
        <div
          className="window-resize-handle"
          onMouseDown={handleResizeStart}
          data-no-drag
        />
      )}
    </div>
  );
}
