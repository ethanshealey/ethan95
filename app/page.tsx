'use client'
import Desktop from "./components/Desktop";
import { WindowManagerProvider } from "./context/WindowManagerContext";
import { useEffect, useState } from "react";
import './crt.scss';

export default function Home() {

  const [ screenOn, setScreenOn ] = useState<boolean>(false)

  useEffect(() => {
    console.log(screenOn)
    setScreenOn(true)
  }, [])

  return (
    <div>
      <input type="checkbox" id="switch" checked={screenOn} onChange={() => setScreenOn((s: boolean) => !s)}/>
      <div className='crt-container'>
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
