'use client';

import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { Button, Frame, MenuList, MenuListItem, Separator, Toolbar } from 'react95';
import { useWindowManager } from '../hooks/useWindowManager';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Card, GameState, Source, HintResult, Suit,
  SUIT_ORDER, SUIT_SYMBOLS, FACE_UP_STEP, BOARD_W, BOARD_H, PADDING, TABLEAU_Y, CARD_W, CARD_H,
  dealGame, canMoveToTableau, canMoveToFoundation,
  getFoundationIndex, applyMove, colX, tableauCardY, findHint, allCardsFlipped,
} from '../components/solitaire/utils/SolitaireUtils';
import { CardFace, CardBack, EmptyPile } from '../components/solitaire/SolitaireCard';
import { set } from 'firebase/database';

const DRAG_THRESHOLD = 8; // px of movement before drag activates
const GRAVITY = 0.4;
const BOUNCE = 0.8;

type AnimCard = { suit: Suit; rank: number; x: number; y: number; vx: number; vy: number };

type DragState = {
  cards: Card[];
  source: Source;
  x: number; y: number;
  ox: number; oy: number;
} | null;

type SelectedState = { cards: Card[]; source: Source } | null;

type PendingInteraction = {
  cards: Card[];
  source: Source;
  cardX: number;
  cardY: number;
  startBX: number; // board-space
  startBY: number;
} | null;

interface SolitaireProps {
  windowId: string;
  focusWindow: (id: string) => void;
}

type SolitaireState = { game: GameState; history: GameState[] };

export default function Solitaire({ windowId, focusWindow }: SolitaireProps) {
  const [{ game, history }, setGameState] = useState<SolitaireState>(() => ({ game: dealGame(), history: [] }));

  // Wraps all game-mutating updates: pushes the previous state onto the history
  // stack only when the state actually changes (functional updates that return
  // the same reference, i.e. invalid moves, are ignored).
  const setGame = useCallback((updater: (g: GameState) => GameState) => {
    setGameState(s => {
      const next = updater(s.game);
      if (next === s.game) return s;
      return { game: next, history: [...s.history, s.game] };
    });
  }, []);
  const [drag, setDragState] = useState<DragState>(null);
  const [selected, setSelected] = useState<SelectedState>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scale, setScale] = useState(1);
  const [stuck, setStuck] = useState(false);
  const won = game.foundations.every(f => f.length === 13);

  const menuRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const pendingRef = useRef<PendingInteraction>(null);
  const scaleRef = useRef(1);
  const selectedRef = useRef<SelectedState>(null);
  const workerRef = useRef<Worker | null>(null);
  const solveSeqRef = useRef(0);
  const prevTableauRef = useRef(game.tableau);
  scaleRef.current = scale;
  selectedRef.current = selected;

  const { openWindow } = useWindowManager();
  const isMobile = useIsMobile();
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  const [hint, setHint] = useState<HintResult | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAnim, setShowAnim] = useState(false);
  const [, setRenderTick] = useState(0);
  const animCardsRef = useRef<AnimCard[]>([]);
  const animRafRef = useRef<number | null>(null);
  const animLaunchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animWinnerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const scaleW = w / BOARD_W;
      if (!isMobileRef.current) {
        setScale(Math.min(1, scaleW));
        return;
      }
      const containerTop = containerRef.current!.getBoundingClientRect().top;
      const availableH = window.innerHeight - containerTop;
      const scaleH = availableH / BOARD_H;
      setScale(Math.min(scaleW, Math.max(scaleH, 0.1)));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const stopAnimation = useCallback(() => {
    if (animRafRef.current) { cancelAnimationFrame(animRafRef.current); animRafRef.current = null; }
    if (animLaunchRef.current) { clearTimeout(animLaunchRef.current); animLaunchRef.current = null; }
    if (animWinnerRef.current) { clearTimeout(animWinnerRef.current); animWinnerRef.current = null; }
    animCardsRef.current = [];
    setShowAnim(false);
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

  const makeWorker = useCallback(() => {
    const w = new Worker(
      new URL('../components/solitaire/utils/solitaireSolver.worker.ts', import.meta.url),
    );
    w.onmessage = (e: MessageEvent<{ solvable: boolean; seq: number }>) => {
      if (e.data.seq === solveSeqRef.current) setStuck(!e.data.solvable);
    };
    w.onerror = (e) => console.error('Solver worker error:', e.message, e);
    return w;
  }, []);

  useEffect(() => {
    workerRef.current = makeWorker();
    return () => workerRef.current?.terminate();
  }, [makeWorker]);

  // Re-run the solver only when the tableau changes. Terminate the current worker
  // first so any in-progress or queued isSolvable call is cancelled immediately.
  useEffect(() => {
    if (won) { setStuck(false); return; }
    if (game.tableau === prevTableauRef.current) return;
    prevTableauRef.current = game.tableau;
    const seq = ++solveSeqRef.current;
    setStuck(false);
    workerRef.current?.terminate();
    workerRef.current = makeWorker();
    workerRef.current.postMessage({ game, seq });
  }, [game, won, makeWorker]);

  /** Resolves the drop target and applies the move when the user releases a drag. Stored in a ref so document handlers always see the latest game state. */
  const dropCardsRef = useRef<(d: NonNullable<DragState>, bx: number, by: number) => void>(() => {});
  dropCardsRef.current = (d: NonNullable<DragState>, bx: number, by: number) => {
    const cardLeft = bx - d.ox;
    const cardTop  = by - d.oy;
    const cardRight = cardLeft + CARD_W;

    const candidates = Array.from({ length: 7 }, (_, ci) => ({
      ci,
      overlap: Math.max(0, Math.min(cardRight, colX(ci) + CARD_W) - Math.max(cardLeft, colX(ci))),
    })).filter(c => c.overlap > 0).sort((a, b) => b.overlap - a.overlap);

    setGame(g => {
      // Foundation: single card, match by suit, generous vertical zone
      if (d.cards.length === 1) {
        const inFoundationZone = cardTop < TABLEAU_Y + 20;
        if (inFoundationZone) {
          const card = d.cards[0];
          const fi = getFoundationIndex(card.suit);
          const pile = g.foundations[fi];
          if (
            (pile.length === 0 && card.rank === 1) ||
            (pile.length > 0 && pile[pile.length - 1].rank === card.rank - 1)
          ) {
            return applyMove(g, d.source, d.cards, 'foundation', fi);
          }
        }
      }

      // Tableau
      for (const { ci } of candidates) {
        if (canMoveToTableau(d.cards, g.tableau[ci])) {
          return applyMove(g, d.source, d.cards, 'tableau', ci);
        }
      }
      return g;
    });
  };

  /** Resolves a tap: if cards were already selected, attempts to move them to the tapped location; otherwise selects the tapped cards. */
  const handleTapRef = useRef<(cards: Card[], source: Source) => void>(() => {});
  handleTapRef.current = (tapCards: Card[], tapSource: Source) => {
    const prev = selectedRef.current;
    if (prev) {
      const destCol = tapSource.type === 'tableau' ? tapSource.col : -1;
      const destFi  = tapSource.type === 'foundation' ? tapSource.index : -1;
      setGame(g => {
        if (destFi >= 0 && prev.cards.length === 1) {
          const card = prev.cards[0];
          if (getFoundationIndex(card.suit) === destFi) {
            const pile = g.foundations[destFi];
            if (
              (pile.length === 0 && card.rank === 1) ||
              (pile.length > 0 && pile[pile.length - 1].rank === card.rank - 1)
            ) return applyMove(g, prev.source, prev.cards, 'foundation', destFi);
          }
        }
        if (destCol >= 0 && canMoveToTableau(prev.cards, g.tableau[destCol])) {
          return applyMove(g, prev.source, prev.cards, 'tableau', destCol);
        }
        return g;
      });
      setSelected(null);
    } else {
      setSelected({ cards: tapCards, source: tapSource });
    }
  };

  const handleEmptyTapRef = useRef<(type: 'tableau' | 'foundation', index: number) => void>(() => {});
  handleEmptyTapRef.current = (targetType: 'tableau' | 'foundation', targetIndex: number) => {
    const prev = selectedRef.current;
    if (!prev) return;
    setGame(g => {
      if (targetType === 'foundation' && prev.cards.length === 1) {
        const card = prev.cards[0];
        if (getFoundationIndex(card.suit) === targetIndex) {
          const pile = g.foundations[targetIndex];
          if (
            (pile.length === 0 && card.rank === 1) ||
            (pile.length > 0 && pile[pile.length - 1].rank === card.rank - 1)
          ) return applyMove(g, prev.source, prev.cards, 'foundation', targetIndex);
        }
      }
      if (targetType === 'tableau' && canMoveToTableau(prev.cards, g.tableau[targetIndex])) {
        return applyMove(g, prev.source, prev.cards, 'tableau', targetIndex);
      }
      return g;
    });
    setSelected(null);
  };

  // Unified pointermove/pointerup handler on the document for drag activation and drop resolution.
  useEffect(() => {
    const getBoardCoords = (clientX: number, clientY: number) => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const s = scaleRef.current;
      return { bx: (clientX - rect.left) / s, by: (clientY - rect.top) / s };
    };

    const onMove = (e: PointerEvent) => {
      const coords = getBoardCoords(e.clientX, e.clientY);
      if (!coords) return;
      const { bx, by } = coords;

      if (!dragRef.current && pendingRef.current) {
        const dx = bx - pendingRef.current.startBX;
        const dy = by - pendingRef.current.startBY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          // Activate drag
          const p = pendingRef.current;
          const newDrag: DragState = {
            cards: p.cards, source: p.source,
            x: bx, y: by,
            ox: p.startBX - p.cardX,
            oy: p.startBY - p.cardY,
          };
          dragRef.current = newDrag;
          setDragState(newDrag);
          setSelected(null);
        }
      } else if (dragRef.current) {
        dragRef.current = { ...dragRef.current, x: bx, y: by };
        setDragState({ ...dragRef.current });
      }
    };

    const onUp = (e: PointerEvent) => {
      const pending = pendingRef.current;
      const d = dragRef.current;
      pendingRef.current = null;
      dragRef.current = null;
      setDragState(null);

      if (d) {
        const coords = getBoardCoords(e.clientX, e.clientY);
        if (coords) dropCardsRef.current(d, coords.bx, coords.by);
      } else if (pending) {
        handleTapRef.current(pending.cards, pending.source);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startInteraction = useCallback((
    e: React.PointerEvent,
    cards: Card[], source: Source, cardX: number, cardY: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const s = scaleRef.current;
    const bx = (e.clientX - rect.left) / s;
    const by = (e.clientY - rect.top) / s;
    pendingRef.current = { cards, source, cardX, cardY, startBX: bx, startBY: by };
  }, []);

  const clickStock = useCallback(() => {
    setSelected(null);
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

  const undo = useCallback(() => {
    setGameState(s => {
      if (s.history.length === 0) return s;
      return { game: s.history[s.history.length - 1], history: s.history.slice(0, -1) };
    });
    setSelected(null);
    setDragState(null);
  }, []);

  useEffect(() => {
    if (!won) { stopAnimation(); return; }

    setShowAnim(true);
    animCardsRef.current = [];
    let launched = 0;

    const launchCard = () => {
      const fi = launched % 4;
      animCardsRef.current = [...animCardsRef.current, {
        suit: SUIT_ORDER[fi],
        rank: Math.floor(launched / 4) + 1,
        x: colX(3 + fi),
        y: PADDING,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 6 + 8),
      }];
      launched++;
      if (launched < 52) animLaunchRef.current = setTimeout(launchCard, 60);
    };
    launchCard();

    const tick = () => {
      animCardsRef.current = animCardsRef.current.map(c => {
        let { x, y, vx, vy } = c;
        vy += GRAVITY;
        x += vx;
        y += vy;
        if (x < 0) { x = 0; vx = Math.abs(vx) * BOUNCE; }
        if (x + CARD_W > BOARD_W) { x = BOARD_W - CARD_W; vx = -Math.abs(vx) * BOUNCE; }
        if (y + CARD_H > BOARD_H) { y = BOARD_H - CARD_H; vy = -Math.abs(vy) * BOUNCE; }
        return { ...c, x, y, vx, vy };
      });
      setRenderTick(t => t + 1);
      animRafRef.current = requestAnimationFrame(tick);
    };
    animRafRef.current = requestAnimationFrame(tick);

    if (!isMobileRef.current) {
      animWinnerRef.current = setTimeout(() => {
        stopAnimation();
        openWindow('solitaire-winner', { props: { won: true } });
      }, 4000);
    }

    return () => stopAnimation();
  }, [won, stopAnimation]);

  const isDraggedCard = (source: Source, cardIndex: number): boolean => {
    const d = drag;
    if (!d) return false;
    if (d.source.type === 'tableau' && source.type === 'tableau')
      return d.source.col === source.col && cardIndex >= d.source.cardIndex;
    if (d.source.type === 'waste' && source.type === 'waste') return true;
    if (d.source.type === 'foundation' && source.type === 'foundation') return d.source.index === source.index;
    return false;
  };

  const isSelectedCard = (source: Source, cardIndex: number): boolean => {
    const s = selected;
    if (!s || drag) return false;
    if (s.source.type === 'tableau' && source.type === 'tableau')
      return s.source.col === source.col && cardIndex >= s.source.cardIndex;
    if (s.source.type === 'waste' && source.type === 'waste') return true;
    if (s.source.type === 'foundation' && source.type === 'foundation') return s.source.index === source.index;
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

  const getHighlight = (
    base: 'source' | 'target' | undefined,
    isSel: boolean,
  ): 'source' | 'target' | 'selected' | undefined => isSel ? 'selected' : base;

  const skipToDone = () => {
    setGame(g => {
      const ng = { ...g };
      
      ng.stock = [];
      ng.waste = [];
      ng.tableau = ng.tableau.map(_ => []);

      // Generate cards
      const aceOfClubs: Card = { suit: 'clubs', rank: 1, faceUp: true };
      const aceOfDiamonds: Card = { suit: 'diamonds', rank: 1, faceUp: true };
      const aceOfHearts: Card = { suit: 'hearts', rank: 1, faceUp: true };
      const aceOfSpades: Card = { suit: 'spades', rank: 1, faceUp: true };

      while(ng.foundations[0].length < 13)
        ng.foundations[0].push(aceOfClubs);
      while(ng.foundations[1].length < 13)
        ng.foundations[1].push(aceOfDiamonds);
      while(ng.foundations[2].length < 13)
        ng.foundations[2].push(aceOfHearts);
      while(ng.foundations[3].length < 13)
        ng.foundations[3].push(aceOfSpades);

      return ng;
    });

    
  }

  /** Renders the stock pile click target; shows a recycle label when the stock is empty. */
  const renderStock = () => (
    <div
      style={{ position: 'absolute', left: colX(0), top: PADDING, cursor: 'pointer' }}
      onClick={clickStock}
    >
      {game.stock.length > 0 ? <CardBack /> : <EmptyPile label="↺" />}
    </div>
  );

  const renderWaste = () => {
    const wasteTop = game.waste[game.waste.length - 1];
    return game.waste.length > 0 ? (
      <CardFace
        card={wasteTop}
        hidden={isDraggedCard({ type: 'waste' }, 0)}
        highlight={getHighlight(isHintWasteSrc ? 'source' : undefined, isSelectedCard({ type: 'waste' }, 0))}
        style={{ position: 'absolute', left: colX(1), top: PADDING }}
        onPointerDown={(e) => startInteraction(e, [wasteTop], { type: 'waste' }, colX(1), PADDING)}
        onDoubleClick={() => autoMove({ type: 'waste' }, wasteTop)}
      />
    ) : (
      <EmptyPile style={{ position: 'absolute', left: colX(1), top: PADDING }} />
    );
  };

  const renderFoundations = () =>
    SUIT_ORDER.map((suit, fi) => {
      const pile = game.foundations[fi];
      const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
      const x = colX(3 + fi);
      return topCard ? (
        <CardFace
          key={suit}
          card={topCard}
          hidden={isDraggedCard({ type: 'foundation', index: fi }, 0)}
          highlight={getHighlight(
            isHintFoundSrc(fi) ? 'source' : isHintFoundTgt(fi) ? 'target' : undefined,
            isSelectedCard({ type: 'foundation', index: fi }, 0),
          )}
          style={{ position: 'absolute', left: x, top: PADDING }}
          onPointerDown={(e) => startInteraction(e, [topCard], { type: 'foundation', index: fi }, x, PADDING)}
        />
      ) : (
        <EmptyPile
          key={suit}
          label={SUIT_SYMBOLS[suit]}
          highlight={isHintFoundTgt(fi) ? 'target' : undefined}
          style={{ position: 'absolute', left: x, top: PADDING }}
          onClick={() => handleEmptyTapRef.current('foundation', fi)}
        />
      );
    });

  const renderTableauColumn = (col: Card[], ci: number) => {
    const x = colX(ci);
    if (col.length === 0) {
      return (
        <EmptyPile
          key={`empty-${ci}`}
          highlight={isHintTabTgt(ci) ? 'target' : undefined}
          style={{ position: 'absolute', left: x, top: TABLEAU_Y }}
          onClick={() => handleEmptyTapRef.current('tableau', ci)}
        />
      );
    }
    return (
      <Fragment key={`col-${ci}`}>
        {col.map((card, cardIndex) => {
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
              highlight={getHighlight(
                isHintTabSrc(ci, cardIndex) ? 'source' : (isHintTabTgt(ci) && isTop) ? 'target' : undefined,
                isSelectedCard({ type: 'tableau', col: ci, cardIndex }, cardIndex),
              )}
              style={{ position: 'absolute', left: x, top: y }}
              onPointerDown={(e) => startInteraction(e, col.slice(cardIndex), { type: 'tableau', col: ci, cardIndex }, x, y)}
              onDoubleClick={isTop ? () => autoMove({ type: 'tableau', col: ci, cardIndex }, card) : undefined}
            />
          );
        })}
      </Fragment>
    );
  };

  const renderDragLayer = (d: NonNullable<DragState>) =>
    d.cards.map((card, i) => (
      <CardFace
        key={`drag-${i}`}
        card={card}
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
      <Toolbar>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <Button variant='menu' size='sm' onClick={() => setShowMenu(v => !v)}>Game</Button>
          {showMenu && (
            <MenuList style={{ position: 'absolute', top: '100%', left: 0, zIndex: 2000 }}>
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { setGameState({ game: dealGame(), history: [] }); setDragState(null); setSelected(null); setShowMenu(false); }}
              >
                New
              </MenuListItem>
              <Separator />
              <MenuListItem
                style={{ cursor: 'pointer' }}
                onClick={() => { openWindow('solitaire-leaderboard'); setShowMenu(false); }}
              >
                Leaderboard
              </MenuListItem>
            </MenuList>
          )}
        </div>
        <Button variant='menu' size='sm' onClick={() => {
          clearHint();
          const h = findHint(game);
          if (h) { setHint(h); hintTimerRef.current = setTimeout(clearHint, 3000); }
        }}>Help</Button>
        {
          allCardsFlipped(game) && (
            <Button variant='menu' size='sm' onClick={skipToDone}>Skip</Button>
          )
        }
        <Button variant='menu' size='sm' onClick={undo} disabled={history.length === 0 || !won}>Undo</Button>
        {!won && stuck && (
          <span style={{ marginLeft: 8, fontSize: 12, color: '#800000', fontFamily: 'sans-serif', alignSelf: 'center' }}>
            No moves remaining
          </span>
        )}
      </Toolbar>

      {/* Responsive wrapper — shrinks board to fit available width */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          overflow: 'hidden',
          height: BOARD_H * scale,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div
          ref={boardRef}
          style={{
            position: 'relative',
            backgroundColor: '#008000',
            width: BOARD_W,
            height: BOARD_H,
            cursor: drag ? 'grabbing' : 'default',
            transformOrigin: 'top left',
            transform: scale !== 1 ? `scale(${scale})` : undefined,
          }}
        >
          {renderStock()}
          {renderWaste()}
          {renderFoundations()}
          {game.tableau.map((col, ci) => renderTableauColumn(col, ci))}
          {drag && renderDragLayer(drag)}
          {showAnim && (
            <>
              <div
                style={{ position: 'absolute', inset: 0, zIndex: 1998, cursor: 'pointer' }}
                onClick={() => { stopAnimation(); openWindow('solitaire-winner', { props: { won: true } }); }}
              />
              {animCardsRef.current.map((ac, i) => (
                <CardFace
                  key={`anim-${i}`}
                  card={{ suit: ac.suit, rank: ac.rank, faceUp: true }}
                  style={{
                    position: 'absolute',
                    left: ac.x,
                    top: ac.y,
                    zIndex: 900 + i,
                    pointerEvents: 'none',
                    boxShadow: '2px 4px 8px rgba(0,0,0,0.4)',
                  }}
                />
              ))}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
