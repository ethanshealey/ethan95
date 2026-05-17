'use client'
import Desktop from "./components/Desktop";
import { WindowManagerProvider } from "./context/WindowManagerContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { useEffect, useRef, useState } from "react";
import './crt.scss';
import { useWindowManager } from "./hooks/useWindowManager";

function HomeInner() {

  const [screenOn, setScreenOn] = useState<boolean>(false)
  const { crtEnabled, clickSoundEnabled } = useSettings()
  const clickAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setScreenOn(true)
    clickAudioRef.current = new Audio('/static/audio/click-effect.mp3')
    clickAudioRef.current.preload = 'auto'
  }, [])

  useEffect(() => {
    if (!clickSoundEnabled) return
    let downX = 0, downY = 0, downAt = 0
    const onDown = (e: MouseEvent) => { downX = e.clientX; downY = e.clientY; downAt = Date.now() }
    const onUp = (e: MouseEvent) => {
      const dx = e.clientX - downX, dy = e.clientY - downY
      if (Math.sqrt(dx * dx + dy * dy) < 5 && Date.now() - downAt < 300) {
        const audio = clickAudioRef.current
        if (!audio) return
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
    }
  }, [clickSoundEnabled])

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
