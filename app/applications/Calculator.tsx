'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Frame } from 'react95';

interface CalculatorProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type Operator = '+' | '-' | '*' | '/' | null;

function formatDisplay(value: number): string {
  if (!isFinite(value) || isNaN(value)) return 'Error';
  return parseFloat(value.toPrecision(12)).toString();
}

export default function Calculator({ windowId, focusWindow }: CalculatorProps) {
  const [display, setDisplay]                   = useState('0');
  const [pendingValue, setPendingValue]         = useState<number | null>(null);
  const [operator, setOperator]                 = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory]                     = useState(0);
  const [hasMemory, setHasMemory]               = useState(false);
  const [isError, setIsError]                   = useState(false);
  const [pressedKey, setPressedKey]             = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { containerRef.current?.focus(); }, []);

  const applyOp = (a: number, b: number, op: Operator): number => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? Infinity : a / b;
    return b;
  };

  const setError = (msg: string) => {
    setDisplay(msg);
    setIsError(true);
    setPendingValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const pressDigit = useCallback((digit: string) => {
    if (isError) return;
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === '0' ? digit : prev.length < 20 ? prev + digit : prev);
    }
  }, [waitingForOperand, isError]);

  const pressDecimal = useCallback(() => {
    if (isError) return;
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return; }
    if (!display.includes('.')) setDisplay(prev => prev + '.');
  }, [waitingForOperand, display, operator, isError]);

  const pressOperator = useCallback((op: Operator) => {
    if (isError) return;
    const current = parseFloat(display);
    if (pendingValue !== null && !waitingForOperand) {
      const result = applyOp(pendingValue, current, operator);
      if (!isFinite(result)) { setError('Cannot divide by zero'); return; }
      const formatted = formatDisplay(result);
      setDisplay(formatted);
      setPendingValue(parseFloat(formatted));
    } else {
      setPendingValue(current);
    }
    setOperator(op);
    setWaitingForOperand(true);
  }, [display, pendingValue, operator, waitingForOperand, isError]);

  const pressEquals = useCallback(() => {
    if (isError || pendingValue === null || operator === null) return;
    const result = applyOp(pendingValue, parseFloat(display), operator);
    if (!isFinite(result)) { setError('Cannot divide by zero'); return; }
    setDisplay(formatDisplay(result));
    setPendingValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, pendingValue, operator, isError]);

  const pressSqrt = useCallback(() => {
    if (isError) return;
    const val = parseFloat(display);
    if (val < 0) { setError('Error'); return; }
    setDisplay(formatDisplay(Math.sqrt(val)));
    setWaitingForOperand(true);
  }, [display, isError]);

  const pressPercent = useCallback(() => {
    if (isError) return;
    setDisplay(formatDisplay((pendingValue ?? 0) * parseFloat(display) / 100));
    setWaitingForOperand(true);
  }, [display, pendingValue, isError]);

  const pressReciprocal = useCallback(() => {
    if (isError) return;
    const val = parseFloat(display);
    if (val === 0) { setError('Cannot divide by zero'); return; }
    setDisplay(formatDisplay(1 / val));
    setWaitingForOperand(true);
  }, [display, isError]);

  const pressToggleSign = useCallback(() => {
    if (isError) return;
    const val = parseFloat(display);
    if (val !== 0) setDisplay(formatDisplay(-val));
  }, [display, isError]);

  const pressBackspace = useCallback(() => {
    if (waitingForOperand || isError) return;
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  }, [waitingForOperand, isError]);

  const pressCE = useCallback(() => {
    setDisplay('0'); setIsError(false); setWaitingForOperand(false);
  }, []);

  const pressC = useCallback(() => {
    setDisplay('0'); setPendingValue(null); setOperator(null);
    setWaitingForOperand(false); setIsError(false);
  }, []);

  const pressMC    = useCallback(() => { setMemory(0); setHasMemory(false); }, []);
  const pressMR    = useCallback(() => { setDisplay(formatDisplay(memory)); setWaitingForOperand(true); setIsError(false); }, [memory]);
  const pressMS    = useCallback(() => { if (isError) return; setMemory(parseFloat(display)); setHasMemory(true); setWaitingForOperand(true); }, [display, isError]);
  const pressMPlus = useCallback(() => { if (isError) return; setMemory(m => m + parseFloat(display)); setHasMemory(true); }, [display, isError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const key = e.key;
    if (key >= '0' && key <= '9')     { e.preventDefault(); pressDigit(key); }
    else if (key === '.')              { e.preventDefault(); pressDecimal(); }
    else if (key === '+')              { e.preventDefault(); pressOperator('+'); }
    else if (key === '-')              { e.preventDefault(); pressOperator('-'); }
    else if (key === '*')              { e.preventDefault(); pressOperator('*'); }
    else if (key === '/')              { e.preventDefault(); pressOperator('/'); }
    else if (key === 'Enter' || key === '=') { e.preventDefault(); pressEquals(); }
    else if (key === 'Backspace')      { e.preventDefault(); pressBackspace(); }
    else if (key === 'Escape')         { e.preventDefault(); pressC(); }
    else if (key === 'Delete')         { e.preventDefault(); pressCE(); }
    else if (key === '%')              { e.preventDefault(); pressPercent(); }
    else if (key === 'F9')             { e.preventDefault(); pressToggleSign(); }
    else if (key === '@')              { e.preventDefault(); pressSqrt(); }
    else if (key === 'r' || key === 'R') { e.preventDefault(); pressReciprocal(); }
  }, [pressDigit, pressDecimal, pressOperator, pressEquals, pressBackspace, pressC, pressCE, pressPercent, pressToggleSign, pressSqrt, pressReciprocal]);

  // onMouseDown with preventDefault keeps keyboard focus on the container
  const btn = (label: string, action: () => void, opts: { memory?: boolean; op?: boolean; active?: boolean } = {}) => (
    <Button
      className="calc-btn"
      style={{
        ...(opts.memory ? { color: 'darkred' } : {}),
        transform: pressedKey === label ? 'translateY(1px)' : undefined,
        transition: 'transform 30ms ease-in',
      }}
      active={pressedKey === label || opts.active}
      onMouseDown={(e) => { e.preventDefault(); setPressedKey(label); action(); }}
      onMouseUp={() => setPressedKey(null)}
      onMouseLeave={() => setPressedKey(null)}
      tabIndex={-1}
    >
      {label}
    </Button>
  );

  return (
    <div
      ref={containerRef}
      className="calculator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={(e) => { e.stopPropagation(); focusWindow(windowId); containerRef.current?.focus(); }}
    >
      {/* Display */}
      <div className="calc-display-row">
        <span className="calc-memory-indicator">{hasMemory ? 'M' : ''}</span>
        <Frame variant="field" className="calc-display">
          <span className="calc-display-text">{display}</span>
        </Frame>
      </div>

      {/* Backspace / CE / C */}
      <div className="calc-top-row">
        {btn('Backspace', pressBackspace)}
        {btn('CE',        pressCE)}
        {btn('C',         pressC)}
      </div>

      {/* Main grid: 4 rows × 6 cols */}
      <div className="calc-main-grid">
        {/* Row 1 */}
        {btn('MC',   pressMC,                       { memory: true })}
        {btn('7',    () => pressDigit('7'))}
        {btn('8',    () => pressDigit('8'))}
        {btn('9',    () => pressDigit('9'))}
        {btn('/',    () => pressOperator('/'),      { op: true, active: operator === '/' && waitingForOperand })}
        {btn('sqrt', pressSqrt,                     { op: true })}

        {/* Row 2 */}
        {btn('MR',   pressMR,                       { memory: true })}
        {btn('4',    () => pressDigit('4'))}
        {btn('5',    () => pressDigit('5'))}
        {btn('6',    () => pressDigit('6'))}
        {btn('X',    () => pressOperator('*'),      { op: true, active: operator === '*' && waitingForOperand })}
        {btn('%',    pressPercent,                  { op: true })}

        {/* Row 3 */}
        {btn('MS',   pressMS,                       { memory: true })}
        {btn('1',    () => pressDigit('1'))}
        {btn('2',    () => pressDigit('2'))}
        {btn('3',    () => pressDigit('3'))}
        {btn('-',    () => pressOperator('-'),      { op: true, active: operator === '-' && waitingForOperand })}
        {btn('1/x',  pressReciprocal,               { op: true })}

        {/* Row 4 */}
        {btn('M+',   pressMPlus,                    { memory: true })}
        {btn('0',    () => pressDigit('0'))}
        {btn('+/-',  pressToggleSign)}
        {btn('.',    pressDecimal)}
        {btn('+',    () => pressOperator('+'),      { op: true, active: operator === '+' && waitingForOperand })}
        {btn('=',    pressEquals,                   { op: true })}
      </div>
    </div>
  );
}
