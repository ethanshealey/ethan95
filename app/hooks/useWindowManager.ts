import { useContext } from 'react';
import {
  WindowManagerContext,
  WindowManagerContextType,
  WindowActionsContext,
  WindowActionsType,
  WindowStateContext,
  AppWindow,
} from '../context/WindowManagerContext';

/** @deprecated Prefer useWindowActions or useWindowState for better render isolation. */
export function useWindowManager(): WindowManagerContextType {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error('useWindowManager must be used within a WindowManagerProvider');
  return context;
}

/** Returns stable action callbacks. Components using this hook will not re-render on window state changes. */
export function useWindowActions(): WindowActionsType {
  const context = useContext(WindowActionsContext);
  if (!context) throw new Error('useWindowActions must be used within a WindowManagerProvider');
  return context;
}

/** Returns the live windows array. Components using this hook re-render whenever any window changes. */
export function useWindowState(): AppWindow[] {
  return useContext(WindowStateContext);
}
