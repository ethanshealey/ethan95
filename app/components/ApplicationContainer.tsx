'use client';

import React from 'react';
import { useWindowManager } from '../hooks/useWindowManager';
import { getAppById } from '../applications/index';
import ApplicationWindow from './ApplicationWindow';

import { AppWindow } from '../context/WindowManagerContext';

export default function ApplicationContainer() {
  const { state } = useWindowManager();

  return (
    <div className="application-container">
      {state.windows.map((window: AppWindow) => {
        const app = getAppById(window.appId);
        if (!app) return null;
        
        return (
          <ApplicationWindow
            key={window.id}
            windowData={window}
            app={app}
          />
        );
      })}
    </div>
  );
}
