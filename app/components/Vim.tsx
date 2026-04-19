'use client';

import React, { useEffect, useRef, useState } from 'react';

type VimMode = 'normal' | 'insert' | 'command' | 'visual';

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
    const [visualAnchor, setVisualAnchor] = useState<{ row: number; col: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorLineRef = useRef<HTMLDivElement>(null);
    const cursorCharRef = useRef<HTMLSpanElement>(null);
    const historyRef = useRef<string[][]>([]);
    const registerRef = useRef<string | null>(null);
    const registerTypeRef = useRef<'line' | 'char'>('line');
    const preInsertLinesRef = useRef<string[] | null>(null);

    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    // Keep cursor scrolled into view (vertical and horizontal)
    useEffect(() => {
        cursorCharRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [cursor.row, cursor.col]);

    const clampCol = (col: number, line: string, insert: boolean) =>
        Math.max(0, Math.min(col, insert ? line.length : Math.max(0, line.length - 1)));

    const firstNonBlank = (line: string): number => {
        const idx = line.search(/\S/);
        return idx === -1 ? 0 : idx;
    };

    const pushHistory = () => {
        historyRef.current = [...historyRef.current, [...lines]];
    };

    const moveWordForward = (row: number, col: number): { row: number; col: number } => {
        const isWord = (c: string) => /\w/.test(c);
        const isSpace = (c: string) => /\s/.test(c);
        let r = row;
        let c = col;
        const l = lines[r] ?? '';
        if (c < l.length) {
            if (isWord(l[c])) {
                while (c < l.length && isWord(l[c])) c++;
            } else if (!isSpace(l[c])) {
                while (c < l.length && !isWord(l[c]) && !isSpace(l[c])) c++;
            }
            while (c < l.length && isSpace(l[c])) c++;
            if (c < l.length) return { row: r, col: c };
        }
        if (r + 1 < lines.length) {
            const nextLine = lines[r + 1];
            let nc = 0;
            while (nc < nextLine.length && isSpace(nextLine[nc])) nc++;
            return { row: r + 1, col: nc };
        }
        return { row: r, col: clampCol(c, lines[r] ?? '', false) };
    };

    const moveWordBackward = (row: number, col: number): { row: number; col: number } => {
        const isWord = (c: string) => /\w/.test(c);
        const isSpace = (c: string) => /\s/.test(c);
        let r = row;
        let c = col;
        if (c === 0) {
            if (r > 0) { r--; c = lines[r].length; }
            else return { row: 0, col: 0 };
        }
        c--;
        const l = lines[r] ?? '';
        while (c > 0 && isSpace(l[c])) c--;
        if (isWord(l[c])) {
            while (c > 0 && isWord(l[c - 1])) c--;
        } else if (!isSpace(l[c])) {
            while (c > 0 && !isWord(l[c - 1]) && !isSpace(l[c - 1])) c--;
        }
        return { row: r, col: c };
    };

    /** Returns the ordered start/end of the current visual selection. */
    const getSelectionBounds = (anchor: { row: number; col: number }, head: { row: number; col: number }) => {
        const before =
            anchor.row < head.row ||
            (anchor.row === head.row && anchor.col <= head.col);
        return before
            ? { start: anchor, end: head }
            : { start: head, end: anchor };
    };

    /** Extracts the text covered by the current visual selection. */
    const getSelectedText = (anchor: { row: number; col: number }, head: { row: number; col: number }): string => {
        const { start, end } = getSelectionBounds(anchor, head);
        if (start.row === end.row) {
            return lines[start.row].slice(start.col, end.col + 1);
        }
        const first = lines[start.row].slice(start.col);
        const middle = lines.slice(start.row + 1, end.row);
        const last = lines[end.row].slice(0, end.col + 1);
        return [first, ...middle, last].join('\n');
    };

    /** Removes the visual selection from lines, returning the new state. */
    const deleteSelection = (anchor: { row: number; col: number }, head: { row: number; col: number }) => {
        const { start, end } = getSelectionBounds(anchor, head);
        const text = getSelectedText(anchor, head);
        const next = [...lines];
        if (start.row === end.row) {
            next[start.row] = lines[start.row].slice(0, start.col) + lines[start.row].slice(end.col + 1);
        } else {
            const merged = lines[start.row].slice(0, start.col) + lines[end.row].slice(end.col + 1);
            next.splice(start.row, end.row - start.row + 1, merged);
        }
        if (next.length === 0) next.push('');
        const newRow = Math.min(start.row, next.length - 1);
        const newCol = clampCol(start.col, next[newRow] ?? '', false);
        return { newLines: next, newCursor: { row: newRow, col: newCol }, text };
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!text) return;

        if (mode === 'command') {
            setCmdInput(prev => prev + text.replace(/\n/g, ''));
            return;
        }

        pushHistory();

        let insertRow = cursor.row;
        let insertCol = cursor.col;
        let baseLines = [...lines];

        if (mode === 'visual' && visualAnchor) {
            const { newLines, newCursor } = deleteSelection(visualAnchor, cursor);
            baseLines = newLines;
            insertRow = newCursor.row;
            insertCol = newCursor.col;
            setMode('normal');
            setVisualAnchor(null);
        }

        const insertLine = baseLines[insertRow] ?? '';
        const pastedLines = text.split('\n');
        let newLines: string[];
        let newCursor: { row: number; col: number };

        if (pastedLines.length === 1) {
            newLines = [...baseLines];
            newLines[insertRow] = insertLine.slice(0, insertCol) + pastedLines[0] + insertLine.slice(insertCol);
            newCursor = { row: insertRow, col: insertCol + pastedLines[0].length };
        } else {
            const firstLine = insertLine.slice(0, insertCol) + pastedLines[0];
            const lastLine = pastedLines[pastedLines.length - 1] + insertLine.slice(insertCol);
            newLines = [...baseLines];
            newLines.splice(insertRow, 1, firstLine, ...pastedLines.slice(1, -1), lastLine);
            newCursor = {
                row: insertRow + pastedLines.length - 1,
                col: pastedLines[pastedLines.length - 1].length,
            };
        }

        setLines(newLines);
        setCursor(newCursor);
        setModified(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();

        // Let the browser's paste event handle Ctrl/Cmd+V
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') return;

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
                if (preInsertLinesRef.current !== null) {
                    if (JSON.stringify(lines) !== JSON.stringify(preInsertLinesRef.current))
                        historyRef.current = [...historyRef.current, preInsertLinesRef.current];
                    preInsertLinesRef.current = null;
                }
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

        if (mode === 'visual') {
            e.preventDefault();
            const anchor = visualAnchor!;

            const exitVisual = () => {
                setMode('normal');
                setVisualAnchor(null);
                setPending('');
            };

            // Action keys
            if (e.key === 'Escape' || e.key === 'v') { exitVisual(); return; }

            if (e.key === 'y') {
                const text = getSelectedText(anchor, cursor);
                registerRef.current = text;
                registerTypeRef.current = 'char';
                const lineCount = text.split('\n').length;
                setMessage(`${lineCount} line${lineCount > 1 ? 's' : ''} yanked`);
                exitVisual();
                return;
            }

            if (e.key === 'd' || e.key === 'x') {
                pushHistory();
                const { newLines, newCursor, text } = deleteSelection(anchor, cursor);
                registerRef.current = text;
                registerTypeRef.current = 'char';
                setLines(newLines);
                setCursor(newCursor);
                setModified(true);
                exitVisual();
                return;
            }

            if (e.key === ':') {
                setMode('command'); setCmdInput(''); setMessage('');
                setVisualAnchor(null);
                return;
            }

            // gg pending in visual mode
            if (pending === 'g') {
                if (e.key === 'g') setCursor({ row: 0, col: 0 });
                setPending('');
                return;
            }
            if (e.key === 'g') { setPending('g'); return; }

            // Navigation — same motions as normal mode, selection follows cursor
            switch (e.key) {
                case 'h': case 'ArrowLeft':
                    setCursor(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }));
                    break;
                case 'l': case 'ArrowRight':
                    setCursor(prev => ({ ...prev, col: clampCol(prev.col + 1, line, false) }));
                    break;
                case 'j': case 'ArrowDown': {
                    const nr = Math.min(row + 1, lines.length - 1);
                    setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', false) });
                    break;
                }
                case 'k': case 'ArrowUp': {
                    const nr = Math.max(row - 1, 0);
                    setCursor({ row: nr, col: clampCol(col, lines[nr] ?? '', false) });
                    break;
                }
                case '0': case 'Home':
                    setCursor(prev => ({ ...prev, col: 0 }));
                    break;
                case '^':
                    setCursor(prev => ({ ...prev, col: firstNonBlank(line) }));
                    break;
                case '$': case 'End':
                    setCursor(prev => ({ ...prev, col: Math.max(0, line.length - 1) }));
                    break;
                case 'G':
                    setCursor({ row: lines.length - 1, col: clampCol(col, lines[lines.length - 1] ?? '', false) });
                    break;
                case 'w':
                    setCursor(moveWordForward(row, col));
                    break;
                case 'b':
                    setCursor(moveWordBackward(row, col));
                    break;
            }
            return;
        }

        // Normal mode
        e.preventDefault();

        if (pending === 'd') {
            if (e.key === 'd') {
                pushHistory();
                registerRef.current = line;
                registerTypeRef.current = 'line';
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

        if (pending === 'y') {
            if (e.key === 'y') {
                registerRef.current = line;
                registerTypeRef.current = 'line';
                setMessage('1 line yanked');
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
            case '^':
                setCursor(prev => ({ ...prev, col: firstNonBlank(line) }));
                break;
            case '$':
            case 'End':
                setCursor(prev => ({ ...prev, col: Math.max(0, line.length - 1) }));
                break;
            case 'G':
                setCursor({ row: lines.length - 1, col: clampCol(col, lines[lines.length - 1] ?? '', false) });
                break;
            case 'w': {
                const pos = moveWordForward(row, col);
                setCursor(pos);
                break;
            }
            case 'b': {
                const pos = moveWordBackward(row, col);
                setCursor(pos);
                break;
            }
            case 'u':
                if (historyRef.current.length > 0) {
                    const prev = historyRef.current[historyRef.current.length - 1];
                    historyRef.current = historyRef.current.slice(0, -1);
                    setLines(prev);
                    setCursor(c => ({
                        row: Math.min(c.row, prev.length - 1),
                        col: clampCol(c.col, prev[Math.min(c.row, prev.length - 1)] ?? '', false),
                    }));
                    setMessage('');
                } else {
                    setMessage('Already at oldest change');
                }
                break;
            case 'p':
                if (registerRef.current !== null) {
                    pushHistory();
                    const yanked = registerRef.current;
                    if (registerTypeRef.current === 'line') {
                        setLines(prev => { const next = [...prev]; next.splice(row + 1, 0, yanked); return next; });
                        setCursor({ row: row + 1, col: 0 });
                    } else {
                        const parts = yanked.split('\n');
                        if (parts.length === 1) {
                            const newLine = line.slice(0, col + 1) + yanked + line.slice(col + 1);
                            setLines(prev => { const next = [...prev]; next[row] = newLine; return next; });
                            setCursor({ row, col: col + yanked.length });
                        } else {
                            const before = line.slice(0, col + 1) + parts[0];
                            const after = parts[parts.length - 1] + line.slice(col + 1);
                            const middle = parts.slice(1, -1);
                            setLines(prev => {
                                const next = [...prev];
                                next.splice(row, 1, before, ...middle, after);
                                return next;
                            });
                            setCursor({ row: row + parts.length - 1, col: parts[parts.length - 1].length });
                        }
                    }
                    setModified(true);
                }
                break;
            case 'v':
                setMode('visual');
                setVisualAnchor({ row, col });
                setMessage('');
                break;
            case 'i':
                preInsertLinesRef.current = [...lines];
                setMode('insert'); setMessage(''); setPending('');
                break;
            case 'a':
                preInsertLinesRef.current = [...lines];
                setMode('insert');
                setCursor(prev => ({ ...prev, col: Math.min(prev.col + 1, line.length) }));
                setMessage(''); setPending('');
                break;
            case 'I':
                preInsertLinesRef.current = [...lines];
                setMode('insert');
                setCursor(prev => ({ ...prev, col: 0 }));
                setMessage(''); setPending('');
                break;
            case 'A':
                preInsertLinesRef.current = [...lines];
                setMode('insert');
                setCursor(prev => ({ ...prev, col: line.length }));
                setMessage(''); setPending('');
                break;
            case 'o':
                preInsertLinesRef.current = [...lines];
                setLines(prev => { const next = [...prev]; next.splice(row + 1, 0, ''); return next; });
                setCursor({ row: row + 1, col: 0 });
                setMode('insert'); setModified(true); setPending('');
                break;
            case 'O':
                preInsertLinesRef.current = [...lines];
                setLines(prev => { const next = [...prev]; next.splice(row, 0, ''); return next; });
                setCursor({ row, col: 0 });
                setMode('insert'); setModified(true); setPending('');
                break;
            case 'x':
                if (line.length > 0) {
                    pushHistory();
                    const newLine = line.slice(0, col) + line.slice(col + 1);
                    setLines(prev => { const next = [...prev]; next[row] = newLine; return next; });
                    setCursor(prev => ({ ...prev, col: clampCol(prev.col, newLine, false) }));
                    setModified(true);
                }
                break;
            case 'y': setPending('y'); break;
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
        const isCursorRow = rowIdx === cursor.row;

        if (mode === 'insert') {
            if (!isCursorRow) return <>{line || '\u00A0'}</>;
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

        if (mode === 'visual' && visualAnchor) {
            const { start, end } = getSelectionBounds(visualAnchor, cursor);
            const inSelRange = rowIdx >= start.row && rowIdx <= end.row;
            const selStart = inSelRange ? (rowIdx === start.row ? start.col : 0) : 0;
            const selEnd = inSelRange ? (rowIdx === end.row ? end.col : line.length - 1) : -1;
            const cursorCol = isCursorRow ? Math.min(cursor.col, Math.max(0, line.length - 1)) : -1;
            const display = line.length > 0 ? line : ' ';

            return (
                <>
                    {Array.from(display).map((ch, ci) => {
                        const inSel = inSelRange && ci >= selStart && ci <= selEnd;
                        const isCur = ci === cursorCol;
                        return (
                            <span
                                key={ci}
                                ref={isCur ? cursorCharRef : null}
                                className={isCur ? 'vim-cursor vim-cursor--block' : inSel ? 'vim-selection' : undefined}
                            >
                                {ch}
                            </span>
                        );
                    })}
                </>
            );
        }

        // Normal mode
        if (!isCursorRow) return <>{line || '\u00A0'}</>;
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

    const modeLabel = mode === 'insert' ? '-- INSERT --' : mode === 'visual' ? '-- VISUAL --' : modified ? '[Modified]' : '';

    return (
        <div
            ref={containerRef}
            className="vim-container"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
                <span>{modeLabel}</span>
                <span>{cursor.row + 1},{cursor.col + 1}</span>
            </div>
            <div className="vim-cmdline">
                {mode === 'command' ? `:${cmdInput}` : (message || '\u00A0')}
            </div>
        </div>
    );
};

export default Vim;
