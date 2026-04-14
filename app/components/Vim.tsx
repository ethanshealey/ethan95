'use client';

import React, { useEffect, useRef, useState } from 'react';

type VimMode = 'normal' | 'insert' | 'command';

type VimProps = {
    content: string;
    setContent: React.Dispatch<React.SetStateAction<string | undefined>>;
    close: () => void;
};

const Vim = ({ content, setContent, close }: VimProps) => {
    const [lines, setLines] = useState<string[]>(() =>
        content.length > 0 ? content.split('\n') : ['']
    );
    const [cursor, setCursor] = useState({ row: 0, col: 0 });
    const [mode, setMode] = useState<VimMode>('normal');
    const [cmdInput, setCmdInput] = useState('');
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState('');
    const [modified, setModified] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorLineRef = useRef<HTMLDivElement>(null);
    const cursorCharRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    // Keep cursor scrolled into view (vertical and horizontal)
    useEffect(() => {
        cursorCharRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [cursor.row, cursor.col]);

    const clampCol = (col: number, line: string, insert: boolean) =>
        Math.max(0, Math.min(col, insert ? line.length : Math.max(0, line.length - 1)));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const { row, col } = cursor;
        const line = lines[row] ?? '';

        if (mode === 'command') {
            if (e.key === 'Escape') {
                setMode('normal');
                setCmdInput('');
            } else if (e.key === 'Enter') {
                const cmd = cmdInput.trim();
                if (cmd === 'w') {
                    setContent(lines.join('\n'));
                    setModified(false);
                    setMessage(`${lines.length}L, ${lines.join('\n').length}C written`);
                } else if (cmd === 'q') {
                    if (modified) {
                        setMessage('No write since last change (add ! to override)');
                    } else {
                        close();
                    }
                } else if (cmd === 'q!') {
                    close();
                } else if (cmd === 'wq' || cmd === 'x') {
                    setContent(lines.join('\n'));
                    close();
                } else {
                    setMessage(`Not an editor command: ${cmd}`);
                }
                setMode('normal');
                setCmdInput('');
            } else if (e.key === 'Backspace') {
                setCmdInput(prev => prev.slice(0, -1));
            } else if (e.key.length === 1) {
                setCmdInput(prev => prev + e.key);
            }
            return;
        }

        if (mode === 'insert') {
            if (e.key === 'Escape') {
                setMode('normal');
                setCursor(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
                setPending('');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const before = line.slice(0, col);
                const after = line.slice(col);
                setLines(prev => {
                    const next = [...prev];
                    next.splice(row, 1, before, after);
                    return next;
                });
                setCursor({ row: row + 1, col: 0 });
                setModified(true);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                if (col > 0) {
                    setLines(prev => {
                        const next = [...prev];
                        next[row] = line.slice(0, col - 1) + line.slice(col);
                        return next;
                    });
                    setCursor(prev => ({ ...prev, col: prev.col - 1 }));
                } else if (row > 0) {
                    const prevLine = lines[row - 1];
                    setLines(prev => {
                        const next = [...prev];
                        next.splice(row - 1, 2, prevLine + line);
                        return next;
                    });
                    setCursor({ row: row - 1, col: prevLine.length });
                }
                setModified(true);
            } else if (e.key === 'Home') {
                e.preventDefault();
                setCursor(prev => ({ ...prev, col: 0 }));
            } else if (e.key === 'End') {
                e.preventDefault();
                setCursor(prev => ({ ...prev, col: line.length }));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCursor(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCursor(prev => ({ ...prev, col: Math.min(prev.col + 1, line.length) }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const nr = Math.max(row - 1, 0);
                setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', true) });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nr = Math.min(row + 1, lines.length - 1);
                setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', true) });
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const spaces = '    ';
                setLines(prev => {
                    const next = [...prev];
                    next[row] = line.slice(0, col) + spaces + line.slice(col);
                    return next;
                });
                setCursor(prev => ({ ...prev, col: prev.col + 4 }));
                setModified(true);
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setLines(prev => {
                    const next = [...prev];
                    next[row] = line.slice(0, col) + e.key + line.slice(col);
                    return next;
                });
                setCursor(prev => ({ ...prev, col: prev.col + 1 }));
                setModified(true);
            }
            return;
        }

        // Normal mode
        e.preventDefault();

        if (pending === 'd') {
            if (e.key === 'd') {
                setLines(prev => {
                    if (prev.length === 1) return [''];
                    const next = [...prev];
                    next.splice(row, 1);
                    return next;
                });
                setCursor({ row: Math.min(row, lines.length - 2), col: 0 });
                setModified(true);
            }
            setPending('');
            return;
        }

        if (pending === 'g') {
            if (e.key === 'g') setCursor({ row: 0, col: 0 });
            setPending('');
            return;
        }

        switch (e.key) {
            case 'h':
            case 'ArrowLeft':
                setCursor(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
                break;
            case 'l':
            case 'ArrowRight':
                setCursor(prev => ({ ...prev, col: clampCol(prev.col + 1, line, false) }));
                break;
            case 'j':
            case 'ArrowDown': {
                const nr = Math.min(row + 1, lines.length - 1);
                setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', false) });
                break;
            }
            case 'k':
            case 'ArrowUp': {
                const nr = Math.max(row - 1, 0);
                setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', false) });
                break;
            }
            case '0':
            case 'Home':
                setCursor(prev => ({ ...prev, col: 0 }));
                break;
            case '$':
            case 'End':
                setCursor(prev => ({ ...prev, col: Math.max(0, line.length - 1) }));
                break;
            case 'G':
                setCursor({ row: lines.length - 1, col: clampCol(col, lines[lines.length - 1] ?? '', false) });
                break;
            case 'i':
                setMode('insert'); setMessage(''); setPending('');
                break;
            case 'a':
                setMode('insert');
                setCursor(prev => ({ ...prev, col: Math.min(prev.col + 1, line.length) }));
                setMessage(''); setPending('');
                break;
            case 'I':
                setMode('insert');
                setCursor(prev => ({ ...prev, col: 0 }));
                setMessage(''); setPending('');
                break;
            case 'A':
                setMode('insert');
                setCursor(prev => ({ ...prev, col: line.length }));
                setMessage(''); setPending('');
                break;
            case 'o':
                setLines(prev => { const next = [...prev]; next.splice(row + 1, 0, ''); return next; });
                setCursor({ row: row + 1, col: 0 });
                setMode('insert'); setModified(true); setPending('');
                break;
            case 'O':
                setLines(prev => { const next = [...prev]; next.splice(row, 0, ''); return next; });
                setCursor({ row, col: 0 });
                setMode('insert'); setModified(true); setPending('');
                break;
            case 'x':
                if (line.length > 0) {
                    const newLine = line.slice(0, col) + line.slice(col + 1);
                    setLines(prev => { const next = [...prev]; next[row] = newLine; return next; });
                    setCursor(prev => ({ ...prev, col: clampCol(prev.col, newLine, false) }));
                    setModified(true);
                }
                break;
            case 'd': setPending('d'); break;
            case 'g': setPending('g'); break;
            case ':':
                setMode('command'); setCmdInput(''); setMessage('');
                break;
            case 'Escape':
                setPending(''); setMessage('');
                break;
        }
    };

    const renderLine = (line: string, rowIdx: number) => {
        if (rowIdx !== cursor.row) return <>{line || '\u00A0'}</>;

        if (mode === 'insert') {
            const before = line.slice(0, cursor.col);
            const after = line.slice(cursor.col);
            return (
                <>
                    {before}
                    <span ref={cursorCharRef} className="vim-cursor vim-cursor--insert" />
                    {after || '\u00A0'}
                </>
            );
        }

        const c = Math.min(cursor.col, Math.max(0, line.length - 1));
        const before = line.slice(0, c);
        const ch = line[c] ?? ' ';
        const after = line.slice(c + 1);
        return (
            <>
                {before}
                <span ref={cursorCharRef} className="vim-cursor vim-cursor--block">{ch}</span>
                {after}
            </>
        );
    };

    return (
        <div
            ref={containerRef}
            className="vim-container"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <div className="vim-buffer">
                {lines.map((line, i) => (
                    <div
                        key={i}
                        ref={i === cursor.row ? cursorLineRef : null}
                        className="vim-line"
                    >
                        <span className="vim-gutter">{i + 1}</span>
                        <span className="vim-line-content">{renderLine(line, i)}</span>
                    </div>
                ))}
            </div>
            <div className="vim-statusbar">
                <span>{mode === 'insert' ? '-- INSERT --' : modified ? '[Modified]' : ''}</span>
                <span>{cursor.row + 1},{cursor.col + 1}</span>
            </div>
            <div className="vim-cmdline">
                {mode === 'command' ? `:${cmdInput}` : (message || '\u00A0')}
            </div>
        </div>
    );
};

export default Vim;
