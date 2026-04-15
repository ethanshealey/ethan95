'use client';

import React from 'react';
import { useWindowState } from '../hooks/useWindowManager';
import { getAppById } from '../applications/index';
import ApplicationWindow from './ApplicationWindow';
import { AppWindow } from '../context/WindowManagerContext';

export default function ApplicationContainer() {
  const windows = useWindowState();

  return (
    <div className="application-container">
      {windows.map((window: AppWindow) => {
        const app = getAppById(window.appId);
        if (!app) return null;
        return <ApplicationWindow key={window.id} windowData={window} app={app} />;
      })}
    </div>
  );
}
