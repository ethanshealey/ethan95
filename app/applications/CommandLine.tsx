'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWindowManager } from '../hooks/useWindowManager';
import peter from '../helpers/peter';
import { OPEN_VIM_FLAG, useEmulatedFileSystem } from '../hooks/useEmulatedFileSystem';
import Vim from '../components/Vim';

interface CommandLineProps {
    windowId: string;
    focusWindow: (id: string) => void;
}

const BOOT_LINES = [
    'ETHAN-DOS(R) Version 6.22',
    '            (C)Copyright Ethan Shealey 1981-1994.',
    '',
]

export default function CommandLine({ windowId, focusWindow }: CommandLineProps) {

    const { openWindow, closeWindow } = useWindowManager();
    const [fileSystem, fileSystemLocation, processCommand, processAutofill, processUpdateFile] = useEmulatedFileSystem()
    const [lines, setLines] = useState<string[]>(BOOT_LINES);
    const [currentInput, setCurrentInput] = useState('');
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [cursorVisible, setCursorVisible] = useState(true);
    const [cursorPos, setCursorPos] = useState(0);
    const [showEditor, setShowEditor] = useState<boolean>(false)
    const [editorContents, setEditorContents] = useState<string>()
    const [editorPath, setEditorPath] = useState<string>()

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastTabRef = useRef<number>(0);

    // Blink cursor at 530ms intervals (authentic DOS speed)
    useEffect(() => {
        const id = setInterval(() => setCursorVisible(v => !v), 530);
        return () => clearInterval(id);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if(scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines, currentInput]);

    // Focus hidden input on mount and when returning from the editor
    useEffect(() => {
        if(!showEditor) {
            inputRef.current?.focus()
        }
    }, [showEditor]);

    useEffect(() => {
        if(editorPath !== undefined && editorContents !== undefined)
            processUpdateFile(editorContents, editorPath)
    }, [editorContents])

    const handleCommand = useCallback((raw: string): string[] | null => {
        return processCommand(raw, windowId, openWindow, closeWindow)
    }, [processCommand, windowId, openWindow, closeWindow])

    const submitCommand = useCallback((cmd: string) => {
        const result = handleCommand(cmd);

        if (result === null) {
            setLines([]);
        } else if(result.length > 0 && result[0] === OPEN_VIM_FLAG) {
            result.shift()
            setLines(prev => [...prev, `C:\\${fileSystemLocation.join('\\')}> ${cmd}`])
            setEditorContents(_ => result.join('\n'))
            setShowEditor(true)
            setEditorPath(cmd.split(' ')[1])
        }
        else {
            setLines(prev => [...prev, `C:\\${fileSystemLocation.join('\\')}> ${cmd}`, ...result]);
        }

        if (cmd.trim()) {
            setCmdHistory(prev => [cmd, ...prev]);
        }
        setHistoryIndex(-1);
        setCurrentInput('');
        setCursorPos(0);
    }, [handleCommand, fileSystemLocation]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCursorVisible(true);

        if (e.key === 'Enter') {
            e.preventDefault();
            submitCommand(currentInput);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length === 0) return;
            const newIdx = Math.min(historyIndex + 1, cmdHistory.length - 1);
            setHistoryIndex(newIdx);
            const val = cmdHistory[newIdx] ?? '';
            setCurrentInput(val);
            setCursorPos(val.length);
            setTimeout(() => inputRef.current?.setSelectionRange(val.length, val.length), 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex <= 0) {
                setHistoryIndex(-1);
                setCurrentInput('');
                setCursorPos(0);
                return;
            }
            const newIdx = historyIndex - 1;
            setHistoryIndex(newIdx);
            const val = cmdHistory[newIdx];
            setCurrentInput(val);
            setCursorPos(val.length);
            setTimeout(() => inputRef.current?.setSelectionRange(val.length, val.length), 0);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const now = Date.now();
            if (now - lastTabRef.current < 300) {
                // Handle autofill
                console.log('double tab');
                const result: string[] = processAutofill(currentInput, fileSystem)
                console.log('tabbed result: ', result)

                if(result?.length > 1) {
                    setLines(prev => [
                        ...prev,
                        `C:\\${fileSystemLocation.join('\\')}> ${currentInput}`,
                        result.join('  '),
                    ])
                }
                else if(result[0]?.trim()) {
                    let parts = [ ...currentInput.split(' ') ].slice(0, -1)
                    parts.push(result[0])
                    setCurrentInput(_ => parts.join(' '))
                }
            }
            lastTabRef.current = now;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentInput(e.target.value);
        setCursorPos(e.target.selectionStart ?? e.target.value.length);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            setCursorPos(inputRef.current?.selectionStart ?? currentInput.length);
        }
    };

    const handleSelect = () => {
        setCursorPos(inputRef.current?.selectionStart ?? currentInput.length);
    };

    return (
        <div
            className="cli-container"
            onClick={(e) => { e.stopPropagation(); focusWindow(windowId); inputRef.current?.focus(); }}
        >
            <div ref={scrollRef} className="cli-scroll">
                { showEditor ? (
                    <Vim content={editorContents ?? ''} setContent={setEditorContents} close={() => setShowEditor(false)} />
                ) : (
                    <>
                        {lines.map((line, i) => (
                            <div key={i} className="cli-line">{line || '\u00A0'}</div>
                        ))}
                        <div className="cli-line cli-input-line">
                            <span className="cli-prompt">C:\{fileSystemLocation.join('\\')}&gt;&nbsp;</span>
                            <span className="cli-text">{currentInput.slice(0, cursorPos)}</span>
                            <span className={`cli-cursor${cursorVisible ? ' cli-cursor--on' : ''}`}>_</span>
                            <span className="cli-text">{currentInput.slice(cursorPos)}</span>
                            <input
                                ref={inputRef}
                                className="cli-real-input"
                                value={currentInput}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                onKeyUp={handleKeyUp}
                                onSelect={handleSelect}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
