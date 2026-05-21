"use client";

import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { Button, Frame, Toolbar, MenuList, MenuListItem, Separator } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';
import { CardFace, CardBack, EmptyPile } from '../components/cards/CardComponents';
import {
  Card, GameState, Source, Suit,
  SUIT_ORDER, SUIT_SYMBOLS, CARD_W, CARD_H, PADDING,
  BOARD_W, BOARD_H, TOP_Y, TABLEAU_Y, FACE_UP_STEP,
  dealGame, canPlaceOnTableau, canPlaceOnFoundation, getFoundationIndex,
  applyMove, applyMultiMove, isValidSequence, isGameWon, tableauColX, tableauCardY, freeCellX, foundationX,
} from '../components/freecell/utils/FreeCellUtils';

interface FreeCellProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function FreeCell({ windowId, focusWindow }: FreeCellProps) {
  const [game, setGame] = useState<GameState>(() => dealGame());
  const [showMenu, setShowMenu] = useState(false);
  const [drag, setDrag] = useState<{ cards: Card[]; source: Source; x: number; y: number; ox: number; oy: number } | null>(null);
  const [selected, setSelected] = useState<{ cards: Card[]; source: Source } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const dragRef = useRef(drag);
  const selectedRef = useRef(selected);
  const justDroppedRef = useRef(false);

  const { openWindow } = useWindowManager();

  const won = isGameWon(game);

  scaleRef.current = scale;
  dragRef.current = drag;
  selectedRef.current = selected;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      setScale(Math.min(1, w / BOARD_W, h / BOARD_H));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (won) openWindow('freecell-winner', { props: { won: true } });
  }, [won]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const newGame = useCallback(() => {
    setGame(dealGame());
    setDrag(null);
    setSelected(null);
  }, []);

  const getBoardCoords = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const s = scaleRef.current;
    return { bx: (clientX - rect.left) / s, by: (clientY - rect.top) / s };
  }, []);

  const dropCard = useCallback((d: NonNullable<typeof drag>, bx: number, by: number) => {
    if (!d) return;
    const card = d.cards[0];

    const TOP_ZONE = TOP_Y + CARD_H + PADDING;

    // Try foundations first (generous vertical zone at top)
    if (by < TOP_ZONE) {
      for (let fi = 0; fi < 4; fi++) {
        const fx = foundationX(fi);
        if (Math.abs(bx - fx - CARD_W / 2) < CARD_W / 2) {
          const result = applyMove(game, d.source, card, 'foundation', fi);
          if (result) {
            setGame(result);
            setDrag(null);
            return;
          }
        }
      }
    }

    // Try free cells
    if (by < TOP_ZONE) {
      for (let fi = 0; fi < 4; fi++) {
        const fcx = freeCellX(fi);
        if (Math.abs(bx - fcx - CARD_W / 2) < CARD_W / 2 && game.freeCells[fi] === null) {
          const result = applyMove(game, d.source, card, 'freecell', fi);
          if (result) {
            setGame(result);
            setDrag(null);
            return;
          }
        }
      }
    }

    // Try tableau columns (strictly below the top zone to avoid overlap)
    if (by >= TABLEAU_Y) {
      for (let col = 0; col < 8; col++) {
        const cx = tableauColX(col);
        if (bx >= cx && bx < cx + CARD_W) {
          const result = d.source.type === 'tableau'
            ? applyMultiMove(game, d.source.col, d.cards, col)
            : applyMove(game, d.source, card, 'tableau', col);
          if (result) {
            setGame(result);
            setDrag(null);
            return;
          }
        }
      }
    }
  }, [game]);

  // Unified pointermove/pointerup handler
  useEffect(() => {
    const DRAG_THRESHOLD = 8;
    let pending: { cards: Card[]; source: Source; startBX: number; startBY: number; startOX: number; startOY: number } | null = null;

    const onMove = (e: PointerEvent) => {
      const coords = getBoardCoords(e.clientX, e.clientY);
      if (!coords) return;
      const { bx, by } = coords;

      if (!dragRef.current && pending) {
        const dx = bx - pending.startBX;
        const dy = by - pending.startBY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          const newDrag = { cards: pending.cards, source: pending.source, x: bx, y: by, ox: pending.startOX, oy: pending.startOY };
          dragRef.current = newDrag;
          setDrag(newDrag);
          setSelected(null);
        }
      } else if (dragRef.current) {
        dragRef.current = { ...dragRef.current, x: bx, y: by };
        setDrag({ ...dragRef.current });
      }
    };

    const onUp = (e: PointerEvent) => {
      const coords = getBoardCoords(e.clientX, e.clientY);
      if (dragRef.current && coords) {
        justDroppedRef.current = true;
        dropCard(dragRef.current, coords.bx, coords.by);
      } else if (pending) {
        setSelected({ cards: pending.cards, source: pending.source });
      }
      pending = null;
      dragRef.current = null;
      setDrag(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    
    // Store pending in outer scope; ox/oy are grab offsets relative to the card's top-left
    (window as any).__freecellPending = (cards: Card[], source: Source, bx: number, by: number, ox: number, oy: number) => {
      pending = { cards, source, startBX: bx, startBY: by, startOX: ox, startOY: oy };
    };

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      delete (window as any).__freecellPending;
    };
  }, [getBoardCoords, dropCard]);

  const handleDoubleClick = useCallback((card: Card, source: Source) => {
    if (justDroppedRef.current) {
      justDroppedRef.current = false;
      return;
    }
    const fi = getFoundationIndex(card.suit);
    const foundationResult = applyMove(game, source, card, 'foundation', fi);
    if (foundationResult) {
      setGame(foundationResult);
      setSelected(null);
      return;
    }
    const freeIdx = game.freeCells.findIndex(c => c === null);
    if (freeIdx !== -1) {
      const freeCellResult = applyMove(game, source, card, 'freecell', freeIdx);
      if (freeCellResult) {
        setGame(freeCellResult);
        setSelected(null);
      }
    }
  }, [game]);

  const startInteraction = useCallback((e: React.PointerEvent, cards: Card[], source: Source, cardX: number, cardY: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const s = scaleRef.current;
    const bx = (e.clientX - rect.left) / s;
    const by = (e.clientY - rect.top) / s;
    (window as any).__freecellPending?.(cards, source, bx, by, bx - cardX, by - cardY);
  }, []);

  const renderFreeCells = () =>
    game.freeCells.map((cell, i) => {
      const isDragging = drag?.source.type === 'freecell' && drag.source.index === i;
      return cell && !isDragging ? (
        <CardFace
          key={`fc-${i}`}
          card={{ ...cell, faceUp: true }}
          style={{ position: 'absolute', left: freeCellX(i), top: TOP_Y }}
          onPointerDown={(e) => startInteraction(e, [cell], { type: 'freecell', index: i }, freeCellX(i), TOP_Y)}
          onDoubleClick={() => handleDoubleClick(cell, { type: 'freecell', index: i })}
        />
      ) : (
        <EmptyPile
          key={`fc-empty-${i}`}
          label={`Free`}
          style={{ position: 'absolute', left: freeCellX(i), top: TOP_Y }}
        />
      );
    });

  const renderFoundations = () =>
    SUIT_ORDER.map((suit, fi) => {
      const pile = game.foundations[fi];
      const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
      const x = foundationX(fi);
      const isDragging = drag?.source.type === 'foundation' && drag.source.index === fi;
      return topCard && !isDragging ? (
        <CardFace
          key={`found-${suit}`}
          card={{ ...topCard, faceUp: true }}
          style={{ position: 'absolute', left: x, top: TOP_Y }}
          onPointerDown={(e) => startInteraction(e, [topCard], { type: 'foundation', index: fi }, x, TOP_Y)}
          onDoubleClick={() => handleDoubleClick(topCard, { type: 'foundation', index: fi })}
        />
      ) : (
        <EmptyPile
          key={`found-empty-${suit}`}
          label={SUIT_SYMBOLS[suit]}
          style={{ position: 'absolute', left: x, top: TOP_Y }}
        />
      );
    });

  const renderTableau = () => {
    const result = [];
    for (let col = 0; col < 8; col++) {
      const cards = game.tableau[col];
      const x = tableauColX(col);
      if (cards.length === 0) {
        result.push(
          <EmptyPile
            key={`tab-empty-${col}`}
            style={{ position: 'absolute', left: x, top: TABLEAU_Y }}
          />
        );
      } else {
        const numDragging = drag?.source.type === 'tableau' && drag.source.col === col
          ? drag.cards.length
          : 0;
        cards.forEach((card, idx) => {
          if (numDragging > 0 && idx >= cards.length - numDragging) return;
          const y = tableauCardY(cards, idx);
          const sequence = cards.slice(idx);
          const canDrag = isValidSequence(sequence);
          result.push(
            <CardFace
              key={`tab-${col}-${idx}`}
              card={{ ...card, faceUp: true }}
              style={{ position: 'absolute', left: x, top: y }}
              onPointerDown={canDrag ? (e) => startInteraction(e, sequence, { type: 'tableau', col }, x, y) : undefined}
              onDoubleClick={() => handleDoubleClick(card, { type: 'tableau', col })}
            />
          );
        });
      }
    }
    return result;
  };

  const renderDrag = (d: NonNullable<typeof drag>) =>
    d.cards.map((card, i) => (
      <CardFace
        key={`drag-${i}`}
        card={{ ...card, faceUp: true }}
        style={{
          position: 'absolute',
          left: d.x - d.ox,
          top: d.y - d.oy + i * FACE_UP_STEP,
          zIndex: 1000 + i,
          pointerEvents: 'none',
          boxShadow: '3px 3px 8px rgba(0,0,0,0.4)',
        }}
      />
    ));

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Toolbar style={{ padding: 2 }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button variant='menu' size='sm' onClick={() => setShowMenu(v => !v)}>Game</Button>
          {showMenu && (
            <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 2000 }}>
              <MenuListItem style={{ cursor: 'pointer' }} onClick={() => { newGame(); setShowMenu(false); }}>New</MenuListItem>
              <Separator />
              <MenuListItem style={{ cursor: 'pointer' }} onClick={() => { openWindow('freecell-leaderboard'); setShowMenu(false); }}>Leaderboard</MenuListItem>
            </MenuList>
          )}
        </div>
      </Toolbar>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          flex: 1,
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          backgroundColor: '#008000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: BOARD_W * scale,
            height: BOARD_H * scale,
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            ref={boardRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: '#008000',
              width: BOARD_W,
              height: BOARD_H,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              cursor: drag ? 'grabbing' : 'default',
            }}
          >
            {renderFreeCells()}
            {renderFoundations()}
            {renderTableau()}
            {drag && renderDrag(drag)}
          </div>
        </div>
      </div>
    </div>
  );
}
