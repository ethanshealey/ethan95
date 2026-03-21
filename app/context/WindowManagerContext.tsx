import React, { createContext, useReducer, ReactNode } from 'react';

export interface AppWindow {
  id: string;
  appId: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  focused: boolean;
}

interface WindowManagerState {
  windows: AppWindow[];
  nextZIndex: number;
}

export interface WindowManagerContextType {
  state: WindowManagerState;
  openWindow: (appId: string, title: string, defaultSize?: { width: number; height: number }) => void;
  closeWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setPosition: (id: string, x: number, y: number) => void;
  setSize: (id: string, width: number, height: number) => void;
  focusWindow: (id: string) => void;
  unfocusAll: () => void;
}

type Action =
  | { type: 'OPEN_WINDOW'; payload: { appId: string; title: string; defaultSize?: { width: number; height: number } } }
  | { type: 'CLOSE_WINDOW'; payload: string }
  | { type: 'TOGGLE_MINIMIZE'; payload: string }
  | { type: 'TOGGLE_MAXIMIZE'; payload: string }
  | { type: 'SET_POSITION'; payload: { id: string; x: number; y: number } }
  | { type: 'SET_SIZE'; payload: { id: string; width: number; height: number } }
  | { type: 'FOCUS_WINDOW'; payload: string }
  | { type: 'UNFOCUS_ALL' };

const initialState: WindowManagerState = {
  windows: [],
  nextZIndex: 100,
};

function generateId(): string {
  return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function windowReducer(state: WindowManagerState, action: Action): WindowManagerState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const newWindow: AppWindow = {
        id: generateId(),
        appId: action.payload.appId,
        title: action.payload.title,
        isMinimized: false,
        isMaximized: false,
        position: { x: 50 + state.windows.length * 30, y: 50 + state.windows.length * 30 },
        size: action.payload.defaultSize || { width: 400, height: 300 },
        zIndex: state.nextZIndex,
        focused: true,
      };
      return {
        windows: [...state.windows.map(w => ({ ...w, focused: false })), newWindow],
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'CLOSE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.payload),
      };

    case 'TOGGLE_MINIMIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, isMinimized: !w.isMinimized } : w
        ),
      };

    case 'TOGGLE_MAXIMIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload ? { ...w, isMaximized: !w.isMaximized } : w
        ),
      };

    case 'SET_POSITION':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id
            ? { ...w, position: { x: action.payload.x, y: action.payload.y } }
            : w
        ),
      };

    case 'SET_SIZE':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id
            ? { ...w, size: { width: action.payload.width, height: action.payload.height } }
            : w
        ),
      };

    case 'FOCUS_WINDOW': {
      const maxZIndex = Math.max(...state.windows.map(w => w.zIndex), 0);
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload
            ? { ...w, zIndex: maxZIndex + 1, focused: true }
            : { ...w, focused: false }
        ),
        nextZIndex: maxZIndex + 2,
      };
    }

    case 'UNFOCUS_ALL':
      return {
        ...state,
        windows: state.windows.map(w => ({ ...w, focused: false })),
      };

    default:
      return state;
  }
}

export const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, initialState);

  const openWindow = (appId: string, title: string, defaultSize?: { width: number; height: number }) => {
    dispatch({ type: 'OPEN_WINDOW', payload: { appId, title, defaultSize } });
  };

  const closeWindow = (id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', payload: id });
  };

  const toggleMinimize = (id: string) => {
    dispatch({ type: 'TOGGLE_MINIMIZE', payload: id });
  };

  const toggleMaximize = (id: string) => {
    dispatch({ type: 'TOGGLE_MAXIMIZE', payload: id });
  };

  const setPosition = (id: string, x: number, y: number) => {
    dispatch({ type: 'SET_POSITION', payload: { id, x, y } });
  };

  const setSize = (id: string, width: number, height: number) => {
    dispatch({ type: 'SET_SIZE', payload: { id, width, height } });
  };

  const focusWindow = (id: string) => {
    dispatch({ type: 'FOCUS_WINDOW', payload: id });
  };

  const unfocusAll = () => {
    dispatch({ type: 'UNFOCUS_ALL' });
  };

  return (
    <WindowManagerContext.Provider
      value={{
        state,
        openWindow,
        closeWindow,
        toggleMinimize,
        toggleMaximize,
        setPosition,
        setSize,
        focusWindow,
        unfocusAll,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}
