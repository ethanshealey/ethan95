export type { Suit, BaseCard } from '../../cards/cardUtils';
export { SUIT_ORDER, SUIT_SYMBOLS, RANK_LABELS, CARD_W, CARD_H, isRed, getFoundationIndex } from '../../cards/cardUtils';
import { Suit, SUIT_ORDER, CARD_W, CARD_H, isRed, getFoundationIndex } from '../../cards/cardUtils';

export type Card = { suit: Suit; rank: number; faceUp?: boolean };

/** @deprecated Use getFoundationIndex instead */
export const getSuitIndex = getFoundationIndex;
export const PADDING = 8;
export const BOARD_W = 600;
export const BOARD_H = 400;
export const FACE_UP_STEP = 20;
export const TOP_Y = PADDING;
export const TABLEAU_Y = TOP_Y + CARD_H + 16; // space for free cells and homes

// Column positions for 8 tableau columns
export function tableauColX(col: number): number {
  return PADDING + col * (CARD_W + 8);
}

// Vertical offset for stacked cards in tableau
export function tableauCardY(col: Card[], cardIndex: number): number {
  return TABLEAU_Y + cardIndex * FACE_UP_STEP;
}

// Position of free cell
export function freeCellX(index: number): number {
  return PADDING + index * (CARD_W + 8);
}

// Position of foundation pile
export function foundationX(index: number): number {
  return BOARD_W - PADDING - CARD_W - (3 - index) * (CARD_W + 8);
}

export interface GameState {
  tableau: Card[][]; // 8 columns
  freeCells: (Card | null)[]; // 4 cells
  foundations: Card[][]; // 4 suits
  seedUsed?: number; // for deterministic shuffling
}

/**
 * Creates a shuffled deck deterministically for FreeCell (by convention, seeds 0-999999 work).
 */
function shuffleDeck(seed: number): Card[] {
  const deck: Card[] = [];
  for (const suit of SUIT_ORDER) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank });
    }
  }

  // Deterministic Fisher-Yates using seed as PRNG
  let rng = seed;
  const next = () => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealGame(seed = Math.floor(Math.random() * 1000000)): GameState {
  const deck = shuffleDeck(seed);
  const tableau: Card[][] = Array.from({ length: 8 }, () => []);

  // Deal: 7, 7, 7, 7, 6, 6, 6, 6 cards per column (left to right)
  let deckIdx = 0;
  for (let col = 0; col < 8; col++) {
    const cardsInCol = col < 4 ? 7 : 6;
    for (let i = 0; i < cardsInCol; i++) {
      tableau[col].push(deck[deckIdx++]);
    }
  }

  return {
    tableau,
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    seedUsed: seed,
  };
}

export type Source =
  | { type: 'tableau'; col: number }
  | { type: 'freecell'; index: number }
  | { type: 'foundation'; index: number };

/**
 * Check if a card can be placed on a tableau column (opposite color, descending rank).
 */
export function canPlaceOnTableau(card: Card, colTop: Card | null): boolean {
  if (!colTop) return true; // empty column accepts any card
  return (
    isRed(card.suit) !== isRed(colTop.suit) &&
    card.rank === colTop.rank - 1
  );
}

/**
 * Check if a card can be placed on a foundation (same suit, ascending rank).
 */
export function canPlaceOnFoundation(card: Card, foundationPile: Card[]): boolean {
  if (foundationPile.length === 0) return card.rank === 1;
  return card.suit === foundationPile[foundationPile.length - 1].suit &&
    card.rank === foundationPile[foundationPile.length - 1].rank + 1;
}


/**
 * Apply a move: move a card from source to destination.
 */
export function applyMove(
  state: GameState,
  source: Source,
  card: Card,
  destType: 'tableau' | 'freecell' | 'foundation',
  destIndex: number,
): GameState | null {
  const next = { ...state, tableau: state.tableau.map(c => [...c]), freeCells: [...state.freeCells], foundations: state.foundations.map(f => [...f]) };

  // Remove from source
  if (source.type === 'tableau') {
    const col = next.tableau[source.col];
    if (col.length === 0 || col[col.length - 1] !== card) return null;
    col.pop();
  } else if (source.type === 'freecell') {
    if (next.freeCells[source.index] !== card) return null;
    next.freeCells[source.index] = null;
  } else if (source.type === 'foundation') {
    const pile = next.foundations[source.index];
    if (pile.length === 0 || pile[pile.length - 1] !== card) return null;
    pile.pop();
  }

  // Add to destination
  if (destType === 'tableau') {
    const col = next.tableau[destIndex];
    const colTop = col.length > 0 ? col[col.length - 1] : null;
    if (!canPlaceOnTableau(card, colTop)) return null;
    col.push(card);
  } else if (destType === 'freecell') {
    if (next.freeCells[destIndex] !== null) return null;
    next.freeCells[destIndex] = card;
  } else if (destType === 'foundation') {
    if (!canPlaceOnFoundation(card, next.foundations[destIndex])) return null;
    next.foundations[destIndex].push(card);
  }

  return next;
}

/**
 * Check if the game is won (all cards in foundations).
 */
export function isGameWon(state: GameState): boolean {
  return state.foundations.every(pile => pile.length === 13);
}

/**
 * Try to auto-move a card to foundation if it matches.
 */
export function tryAutoMove(state: GameState, card: Card, source: Source): GameState | null {
  const fi = getFoundationIndex(card.suit);
  return applyMove(state, source, card, 'foundation', fi);
}

/** Check if cards form a valid FreeCell moveable sequence (alternating color, descending rank, bottom-first). */
export function isValidSequence(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (!canPlaceOnTableau(cards[i + 1], cards[i])) return false;
  }
  return true;
}

/** Max cards moveable at once given current free cells and empty columns (excluding destCol). */
export function maxMoveableCards(state: GameState, destCol: number): number {
  const emptyFreeCells = state.freeCells.filter(c => c === null).length;
  const emptyColumns = state.tableau.filter((col, i) => i !== destCol && col.length === 0).length;
  return (emptyFreeCells + 1) * (1 << emptyColumns);
}

/**
 * Move a sequence of cards from one tableau column to another.
 * `cards` is ordered bottom-first (matching order in state.tableau[sourceCol]).
 */
export function applyMultiMove(
  state: GameState,
  sourceCol: number,
  cards: Card[],
  destCol: number,
): GameState | null {
  if (sourceCol === destCol) return null;
  if (!isValidSequence(cards)) return null;
  if (cards.length > maxMoveableCards(state, destCol)) return null;

  const next = { ...state, tableau: state.tableau.map(c => [...c]), freeCells: [...state.freeCells], foundations: state.foundations.map(f => [...f]) };
  const src = next.tableau[sourceCol];
  const startIdx = src.length - cards.length;
  if (startIdx < 0) return null;
  for (let i = 0; i < cards.length; i++) {
    if (src[startIdx + i] !== cards[i]) return null;
  }
  src.splice(startIdx, cards.length);

  const dst = next.tableau[destCol];
  const dstTop = dst.length > 0 ? dst[dst.length - 1] : null;
  if (!canPlaceOnTableau(cards[0], dstTop)) return null;
  dst.push(...cards);

  return next;
}
