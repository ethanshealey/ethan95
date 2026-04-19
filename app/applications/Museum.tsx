'use client';

import { MuseumItem, MuseumResponse } from '@/types/museum';
import React, { useEffect, useState } from 'react';
import { Frame, Tab, TabBody, Tabs } from 'react95';
import MuseumGroup from '../components/MuseumGroup';
import { Icons } from '../icons/icons';

interface MuseumProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

export default function Museum({ windowId, focusWindow }: MuseumProps) {

    const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0)

    const [ cameras, setCameras ] = useState<MuseumItem[]>([])
    const [ consoles, setConsoles ] = useState<MuseumItem[]>([])
    const [ computers, setComputers ] = useState<MuseumItem[]>([])

    useEffect(() => {
        document.getElementById(windowId)?.focus();

        loadMuseumData()
    }, [])

    const loadMuseumData = async () => {

        const res = await fetch('/api/museum')
        const data: MuseumResponse = await res.json()

        setCameras(data.cameras)
        setConsoles(data.consoles)
        setComputers(data.computers)

        // Preload images for all tabs so switching tabs is instant
        const allItems = [...data.cameras, ...data.consoles, ...data.computers]
        allItems.forEach(({ image }) => { new Image().src = image })

    }

    return (
        <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }} >
            <Frame variant='well' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', overflow: 'scroll' }}>
                <div className="title">
                    <h3>Welcome to my virtual museum of all the vintage and retro items I have collected over the years!</h3>
                </div>
                <div style={{
                    width: '98%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: '15px'
                }}>
                    <Tabs value={activeTab} onChange={(e) => setActiveTab(e)} style={{ width: '100%' }}>
                        <Tab value={0}><img src={Icons.CAMERA} width={'20px'} />&nbsp;&nbsp;Cameras</Tab>
                        <Tab value={1}><img src={Icons.JOYSTICK} width={'20px'} />&nbsp;&nbsp;Consoles</Tab>
                        <Tab value={2}><img src={Icons.COMPUTER} width={'20px'} />&nbsp;&nbsp;Computers</Tab>
                    </Tabs>
                    <TabBody style={{ padding: '8px' }}>
                        {
                            activeTab === 0 ? (<MuseumGroup title={'Cameras'} description={'Antique cameras have been the main focus of my dive into this rabbit hole.'} data={cameras} />) :
                            activeTab === 1 ? (<MuseumGroup title={'Consoles'} description={'What\'s more fun than playing games made decades before you were born? My first exposure to retro gaming was sitting on the floor at my grandparents house playing my Dad\'s old Atari 2600 (specifically playing Pitfall!).'} data={consoles} />) :
                            activeTab === 2 && (<MuseumGroup title={'Computers'} description={'I have always found vintage computers to be super interesting, but due to their size and price I have not collected many.'} data={computers} />)
                        }
                    </TabBody>
                </div>
            </Frame>


        </div>
    );
}
