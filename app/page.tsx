'use client'
import Desktop from "./components/Desktop";
import { WindowManagerProvider } from "./context/WindowManagerContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { useEffect, useState } from "react";
import './crt.scss';
import { useWindowManager } from "./hooks/useWindowManager";

function HomeInner() {

  const [screenOn, setScreenOn] = useState<boolean>(false)
  const { crtEnabled } = useSettings()

  useEffect(() => {
    setScreenOn(true)
  }, [])

  return (
    <div>
      <input type="checkbox" id="switch" checked={screenOn} onChange={() => setScreenOn((s: boolean) => !s)}/>
      <div className={`crt-container${crtEnabled ? '' : ' no-crt'}`}>
        <div className="screen">
          <WindowManagerProvider>
            <Desktop />
          </WindowManagerProvider>
        </div>
        <div className="overlay">AV-1</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <SettingsProvider>
      <HomeInner />
    </SettingsProvider>
  );
}
