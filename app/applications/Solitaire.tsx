'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Frame, MenuList, MenuListItem, Toolbar } from 'react95';
import {
  Card, GameState, Source, HintResult,
  SUIT_ORDER, SUIT_SYMBOLS, FACE_UP_STEP, BOARD_W, BOARD_H, PADDING, TABLEAU_Y, CARD_W,
  dealGame, canMoveToTableau, canMoveToFoundation,
  getFoundationIndex, applyMove, colX, tableauCardY, findHint, isSolvable,
} from '../components/solitaire/utils/SolitaireUtils';
import { CardFace, CardBack, EmptyPile } from '../components/solitaire/SolitaireCard';

type DragState = {
  cards: Card[];
  source: Source;
  x: number; y: number;
  ox: number; oy: number;
} | null;

interface SolitaireProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

export default function Solitaire({ windowId, focusWindow }: SolitaireProps) {
  const [game, setGame] = useState<GameState>(() => dealGame());
  const [drag, setDragState] = useState<DragState>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const [hint, setHint] = useState<HintResult | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDrag = useCallback((d: DragState) => {
    dragRef.current = d;
    setDragState(d);
  }, []);

  const clearHint = useCallback(() => {
    if (hintTimerRef.current) { clearTimeout(hintTimerRef.current); hintTimerRef.current = null; }
    setHint(null);
  }, []);

  useEffect(() => { clearHint(); }, [game, clearHint]);
  useEffect(() => () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      dragRef.current = { ...dragRef.current, x: e.clientX - rect.left, y: e.clientY - rect.top };
      setDragState({ ...dragRef.current });
    };

    const onUp = (e: MouseEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      if (!d || !boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const bx = e.clientX - rect.left;
      const by = e.clientY - rect.top;
      const cardLeft = bx - d.ox;
      const cardTop = by - d.oy;
      const cardRight = cardLeft + CARD_W;

      // Find all columns the dragged card overlaps, sorted by most overlap first
      const candidates = Array.from({ length: 7 }, (_, ci) => ({
        ci,
        overlap: Math.max(0, Math.min(cardRight, colX(ci) + CARD_W) - Math.max(cardLeft, colX(ci))),
      })).filter(c => c.overlap > 0).sort((a, b) => b.overlap - a.overlap);

      if (candidates.length === 0) return;

      // Foundation zone: single card dropped in foundation row
      if (d.cards.length === 1 && cardTop >= PADDING && cardTop < TABLEAU_Y) {
        const fc = candidates.find(c => c.ci >= 3 && c.ci <= 6);
        if (fc) {
          const fi = fc.ci - 3;
          const card = d.cards[0];
          setGame(g => {
            if (getFoundationIndex(card.suit) !== fi) return g;
            const pile = g.foundations[fi];
            if (pile.length === 0 && card.rank !== 1) return g;
            if (pile.length > 0 && pile[pile.length - 1].rank !== card.rank - 1) return g;
            return applyMove(g, d.source, d.cards, 'foundation', fi);
          });
        }
        return;
      }

      // Tableau: try each overlapping column in order, apply first valid move
      setGame(g => {
        for (const { ci } of candidates) {
          if (canMoveToTableau(d.cards, g.tableau[ci])) {
            return applyMove(g, d.source, d.cards, 'tableau', ci);
          }
        }
        return g;
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = useCallback((
    e: React.MouseEvent, cards: Card[], source: Source, cardX: number, cardY: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const bx = e.clientX - rect.left;
    const by = e.clientY - rect.top;
    setDrag({ cards, source, x: bx, y: by, ox: bx - cardX, oy: by - cardY });
  }, [setDrag]);

  const clickStock = useCallback(() => {
    setGame(g => {
      const ng = { ...g, stock: [...g.stock], waste: [...g.waste] };
      if (ng.stock.length > 0) {
        ng.waste.push({ ...ng.stock.pop()!, faceUp: true });
      } else {
        ng.stock = [...ng.waste].reverse().map(c => ({ ...c, faceUp: false }));
        ng.waste = [];
      }
      return ng;
    });
  }, []);

  const autoMove = useCallback((source: Source, card: Card) => {
    setGame(g => {
      const fi = canMoveToFoundation(card, g.foundations);
      if (fi < 0) return g;
      return applyMove(g, source, [card], 'foundation', fi);
    });
  }, []);

  const won = game.foundations.every(f => f.length === 13);
  const stuck = useMemo(() => !isSolvable(game), [game]);

  const isDraggedCard = (source: Source, cardIndex: number): boolean => {
    const d = drag;
    if (!d) return false;
    if (d.source.type === 'tableau' && source.type === 'tableau')
      return d.source.col === source.col && cardIndex >= d.source.cardIndex;
    if (d.source.type === 'waste' && source.type === 'waste') return true;
    if (d.source.type === 'foundation' && source.type === 'foundation') return d.source.index === source.index;
    return false;
  };

  const hintSrc = hint?.source;
  const isHintWasteSrc = hintSrc?.type === 'waste';
  const isHintTabSrc = (ci: number, idx: number) =>
    hintSrc?.type === 'tableau' && hintSrc.col === ci && idx >= hintSrc.cardIndex;
  const isHintFoundSrc = (fi: number) =>
    hintSrc?.type === 'foundation' && hintSrc.index === fi;
  const isHintTabTgt = (ci: number) => hint?.toType === 'tableau' && hint.toIndex === ci;
  const isHintFoundTgt = (fi: number) => hint?.toType === 'foundation' && hint.toIndex === fi;

  return (
    <div className="app-content" onClick={(e) => { e.stopPropagation(); focusWindow(windowId); }}>
      <Toolbar>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button variant='menu' size='sm' onClick={() => setShowMenu(v => !v)}>Game</Button>
          {showMenu && (
            <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 2000 }}>
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { setGame(dealGame()); setDrag(null); setShowMenu(false); }}
              >
                New
              </MenuListItem>
            </MenuList>
          )}
        </div>
        <Button variant='menu' size='sm' onClick={() => {
          clearHint();
          const h = findHint(game);
          if (h) { setHint(h); hintTimerRef.current = setTimeout(clearHint, 3000); }
        }}>Help</Button>
        {!won && stuck && (
          <span style={{ marginLeft: 8, fontSize: 12, color: '#800000', fontFamily: 'sans-serif', alignSelf: 'center' }}>
            No moves remaining
          </span>
        )}
      </Toolbar>

      <div
        ref={boardRef}
        style={{
          position: 'relative',
          backgroundColor: '#008000',
          width: BOARD_W,
          height: BOARD_H,
          cursor: drag ? 'grabbing' : 'default',
        }}
      >
        {/* Stock */}
        <div
          style={{ position: 'absolute', left: colX(0), top: PADDING, cursor: 'pointer' }}
          onClick={clickStock}
        >
          {game.stock.length > 0 ? <CardBack /> : <EmptyPile label="↺" />}
        </div>

        {/* Waste */}
        {game.waste.length > 0 ? (
          <CardFace
            card={game.waste[game.waste.length - 1]}
            hidden={isDraggedCard({ type: 'waste' }, 0)}
            highlight={isHintWasteSrc ? 'source' : undefined}
            style={{ position: 'absolute', left: colX(1), top: PADDING }}
            onMouseDown={(e) => startDrag(e, [game.waste[game.waste.length - 1]], { type: 'waste' }, colX(1), PADDING)}
            onDoubleClick={() => autoMove({ type: 'waste' }, game.waste[game.waste.length - 1])}
          />
        ) : (
          <EmptyPile style={{ position: 'absolute', left: colX(1), top: PADDING }} />
        )}

        {/* Foundations */}
        {SUIT_ORDER.map((suit, fi) => {
          const pile = game.foundations[fi];
          const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
          const x = colX(3 + fi);
          return topCard ? (
            <CardFace
              key={suit}
              card={topCard}
              hidden={isDraggedCard({ type: 'foundation', index: fi }, 0)}
              highlight={isHintFoundSrc(fi) ? 'source' : isHintFoundTgt(fi) ? 'target' : undefined}
              style={{ position: 'absolute', left: x, top: PADDING }}
              onMouseDown={(e) => startDrag(e, [topCard], { type: 'foundation', index: fi }, x, PADDING)}
            />
          ) : (
            <EmptyPile key={suit} label={SUIT_SYMBOLS[suit]} highlight={isHintFoundTgt(fi) ? 'target' : undefined} style={{ position: 'absolute', left: x, top: PADDING }} />
          );
        })}

        {/* Tableau */}
        {game.tableau.map((col, ci) => {
          const x = colX(ci);
          if (col.length === 0) {
            return <EmptyPile key={`empty-${ci}`} highlight={isHintTabTgt(ci) ? 'target' : undefined} style={{ position: 'absolute', left: x, top: TABLEAU_Y }} />;
          }
          return col.map((card, cardIndex) => {
            const y = tableauCardY(col, cardIndex);
            if (!card.faceUp) {
              return <CardBack key={`${ci}-${cardIndex}`} style={{ position: 'absolute', left: x, top: y }} />;
            }
            const hidden = isDraggedCard({ type: 'tableau', col: ci, cardIndex }, cardIndex);
            const isTop = cardIndex === col.length - 1;
            return (
              <CardFace
                key={`${ci}-${cardIndex}`}
                card={card}
                hidden={hidden}
                highlight={
                  isHintTabSrc(ci, cardIndex) ? 'source'
                  : (isHintTabTgt(ci) && isTop) ? 'target'
                  : undefined
                }
                style={{ position: 'absolute', left: x, top: y }}
                onMouseDown={(e) => startDrag(e, col.slice(cardIndex), { type: 'tableau', col: ci, cardIndex }, x, y)}
                onDoubleClick={isTop ? () => autoMove({ type: 'tableau', col: ci, cardIndex }, card) : undefined}
              />
            );
          });
        })}

        {/* Drag overlay */}
        {drag && drag.cards.map((card, i) => (
          <CardFace
            key={`drag-${i}`}
            card={card}
            style={{
              position: 'absolute',
              left: drag.x - drag.ox,
              top: drag.y - drag.oy + i * FACE_UP_STEP,
              zIndex: 1000 + i,
              pointerEvents: 'none',
              boxShadow: '3px 3px 8px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        {/* Win overlay */}
        {won && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}>
            <Frame variant='window' style={{ padding: '24px 32px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>You Win!</h2>
              <Button onClick={() => setGame(dealGame())}>Play Again</Button>
            </Frame>
          </div>
        )}
      </div>
    </div>
  );
}
