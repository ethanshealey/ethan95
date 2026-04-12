'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppBar, Button, Frame, ProgressBar, TextInput, Toolbar } from 'react95';

interface WeatherProps {
    windowId: string;
    focusWindow: (id: string) => void;
    defaultContent?: string;
}

interface WeatherData {
    coords: { latitude: number; longitude: number; timezone: string };
    current: {
        time: string;
        temperature_2m: number;
        is_day: number;
        precipitation: number;
        rain: number;
        showers: number;
        weather_code: number;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
    };
}

const WMO_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

function wmoImage(code: number): string {
    const match = WMO_CODES.includes(code)
        ? code
        : WMO_CODES.reduce((a, b) => Math.abs(b - code) < Math.abs(a - code) ? b : a);
    return `/static/images/weather/WMO-${match}.png`;
}

function weatherLabel(code: number): string {
    if (code === 0)  return 'Clear Sky';
    if (code <= 3)   return 'Partly Cloudy';
    if (code <= 48)  return 'Foggy';
    if (code <= 55)  return 'Drizzle';
    if (code <= 57)  return 'Freezing Drizzle';
    if (code <= 65)  return 'Rain';
    if (code <= 67)  return 'Freezing Rain';
    if (code <= 75)  return 'Snow';
    if (code <= 77)  return 'Snow Grains';
    if (code <= 82)  return 'Rain Showers';
    if (code <= 86)  return 'Snow Showers';
    return 'Thunderstorm';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Weather({ windowId, focusWindow, defaultContent }: WeatherProps) {

    const [inputValue, setInputValue]   = useState('Durham');
    const [loading, setLoading]         = useState(false);
    const [progress, setProgress]       = useState(0);
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [error, setError]             = useState<string | null>(null);
    const [localTime, setLocalTime]     = useState('');
    const progressInterval              = useRef<ReturnType<typeof setInterval> | null>(null);
    const clockInterval                 = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        document.getElementById(windowId)?.focus();
        search();
    }, []);

    useEffect(() => {
        if (clockInterval.current) clearInterval(clockInterval.current);
        if (!weatherData) { setLocalTime(''); return; }

        const tz = weatherData.coords.timezone;
        const tick = () => setLocalTime(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        clockInterval.current = setInterval(tick, 1000);
        return () => { if (clockInterval.current) clearInterval(clockInterval.current); };
    }, [weatherData]);

    const search = async () => {
        if (loading) return;
        setLoading(true);
        setProgress(0);
        setWeatherData(null);
        setError(null);

        progressInterval.current = setInterval(() => {
            setProgress(p => {
                if (p >= 85) { clearInterval(progressInterval.current!); return p; }
                return Math.min(p + Math.random() * 6 + 2, 85);
            });
        }, 150);


        try {
            const res  = await fetch(`/api/weather?location=${encodeURIComponent(inputValue)}`);
            const data = await res.json();
            clearInterval(progressInterval.current!);
            setProgress(100);
            setTimeout(() => {
                if (data.error) setError(data.error);
                else setWeatherData(data.weatherData);
                setLoading(false);
            }, 300);
        } catch {
            clearInterval(progressInterval.current!);
            setError('Failed to fetch weather data.');
            setLoading(false);
        }
    };

    return (
        <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
            <AppBar style={{ position: 'static', display: 'flex' }}>
                <Toolbar style={{ gap: 4, padding: '2px 4px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Location:</span>
                    <TextInput
                        value={inputValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') search(); }}
                        style={{ flex: 1, fontSize: '12px' }}
                        disabled={loading}
                    />
                    <Button onClick={search} style={{ whiteSpace: 'nowrap' }} disabled={loading}>Go</Button>
                </Toolbar>
            </AppBar>

            <Frame variant='well' style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 4, gap: 4, minHeight: 0 }}>
                {loading ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 24px' }}>
                        <span style={{ fontSize: '12px' }}>Fetching weather data...</span>
                        <ProgressBar value={Math.round(progress)} hideValue style={{ width: '100%' }} />
                    </div>
                ) : weatherData ? (<>

                    {/* Current conditions */}
                    <Frame variant='field' style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', flexShrink: 0 }}>
                        <img
                            src={wmoImage(weatherData.current.weather_code)}
                            style={{ width: 48, height: 48, imageRendering: 'pixelated', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1 }}>
                                {Math.round(weatherData.current.temperature_2m)}°F
                            </div>
                            <div style={{ fontSize: '11px', color: '#444' }}>
                                {weatherLabel(weatherData.current.weather_code)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#444', flexShrink: 0 }}>
                            <div>{weatherData.coords.timezone.replace(/_/g, ' ')}</div>
                            <div>{localTime}</div>
                            <div>Precip: {weatherData.current.precipitation} mm</div>
                        </div>
                    </Frame>

                    {/* Forecast rows */}
                    <Frame variant='field' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, fontSize: '11px' }}>
                        <div style={{ display: 'flex', background: '#000080', color: 'white', padding: '2px 0', flexShrink: 0 }}>
                            <span style={{ flex: 2, padding: '0 8px' }}>Day</span>
                            <span style={{ flex: 4, padding: '0 8px' }}>Condition</span>
                            <span style={{ flex: 2, padding: '0 8px', textAlign: 'center' }}>High</span>
                            <span style={{ flex: 2, padding: '0 8px', textAlign: 'center' }}>Low</span>
                        </div>
                        {weatherData.daily.time.slice(0, 7).map((t, i) => (
                            <div
                                key={t}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                    borderBottom: '1px solid #d8d8d8',
                                }}
                            >
                                <span style={{ flex: 2, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <img
                                        src={wmoImage(weatherData.daily.weather_code[i])}
                                        style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
                                    />
                                    {DAYS[new Date(t).getUTCDay()]}
                                </span>
                                <span style={{ flex: 4, padding: '0 8px', color: '#444' }}>
                                    {weatherLabel(weatherData.daily.weather_code[i])}
                                </span>
                                <span style={{ flex: 2, padding: '0 8px', textAlign: 'center' }}>
                                    {Math.round(weatherData.daily.temperature_2m_max[i])}°
                                </span>
                                <span style={{ flex: 2, padding: '0 8px', textAlign: 'center', color: '#666' }}>
                                    {Math.round(weatherData.daily.temperature_2m_min[i])}°
                                </span>
                            </div>
                        ))}
                    </Frame>

                </>) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {error && <span style={{ fontSize: '11px', color: '#c00000' }}>{error}</span>}
                        <img src={wmoImage(0)} style={{ width: 80, height: 80, imageRendering: 'pixelated', opacity: 0.5 }} />
                        <span style={{ fontSize: '11px', color: '#808080' }}>Enter a location above</span>
                    </div>
                )}
            </Frame>
        </div>
    );
}
