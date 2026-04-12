export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Card = { suit: Suit; rank: number; faceUp: boolean };
export type GameState = {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: Card[][];
};
export type Source =
  | { type: 'tableau'; col: number; cardIndex: number }
  | { type: 'waste' }
  | { type: 'foundation'; index: number };

// Layout
export const CARD_W = 65;
export const CARD_H = 90;
export const COL_STEP = 75;
export const PADDING = 10;
export const TABLEAU_Y = 120;
export const FACE_DOWN_STEP = 18;
export const FACE_UP_STEP = 28;
export const BOARD_W = 2 * PADDING + 6 * COL_STEP + CARD_W; // 535
export const BOARD_H = 570;

export const colX = (col: number) => PADDING + col * COL_STEP;

export function tableauCardY(col: Card[], cardIndex: number): number {
  let y = TABLEAU_Y;
  for (let i = 0; i < cardIndex; i++) y += col[i].faceUp ? FACE_UP_STEP : FACE_DOWN_STEP;
  return y;
}

export const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};
export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';
export const getFoundationIndex = (suit: Suit) => SUIT_ORDER.indexOf(suit);

function createDeck(): Card[] {
  return SUIT_ORDER.flatMap(suit =>
    Array.from({ length: 13 }, (_, i) => ({ suit, rank: i + 1, faceUp: false }))
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealGame(): GameState {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let i = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[i++], faceUp: row === col });
    }
  }
  return { stock: deck.slice(i), waste: [], foundations: [[], [], [], []], tableau };
}

export function canMoveToTableau(cards: Card[], targetCol: Card[]): boolean {
  const card = cards[0];
  if (targetCol.length === 0) return card.rank === 13;
  const top = targetCol[targetCol.length - 1];
  return top.faceUp && isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

export function canMoveToFoundation(card: Card, foundations: GameState['foundations']): number {
  const fi = getFoundationIndex(card.suit);
  const pile = foundations[fi];
  if (pile.length === 0 && card.rank === 1) return fi;
  if (pile.length > 0 && pile[pile.length - 1].rank === card.rank - 1) return fi;
  return -1;
}

export type HintResult = {
  source: Source;
  toType: 'foundation' | 'tableau';
  toIndex: number;
};

export function findHint(game: GameState): HintResult | null {
  // 1. Waste top → foundation
  if (game.waste.length > 0) {
    const card = game.waste[game.waste.length - 1];
    const fi = canMoveToFoundation(card, game.foundations);
    if (fi >= 0) return { source: { type: 'waste' }, toType: 'foundation', toIndex: fi };
  }

  // 2. Tableau top → foundation
  for (let ci = 0; ci < 7; ci++) {
    const col = game.tableau[ci];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const fi = canMoveToFoundation(top, game.foundations);
    if (fi >= 0) return { source: { type: 'tableau', col: ci, cardIndex: col.length - 1 }, toType: 'foundation', toIndex: fi };
  }

  // 3 & 4. Tableau → tableau: first pass prioritises moves that expose a face-down card
  for (const mustExpose of [true, false]) {
    for (let fromCol = 0; fromCol < 7; fromCol++) {
      const col = game.tableau[fromCol];
      if (col.length === 0) continue;
      let firstFaceUp = -1;
      for (let i = 0; i < col.length; i++) { if (col[i].faceUp) { firstFaceUp = i; break; } }
      if (firstFaceUp === -1) continue;
      const exposesHidden = firstFaceUp > 0;
      if (mustExpose && !exposesHidden) continue;
      // Try all valid sub-sequences starting from firstFaceUp
      for (let startIdx = firstFaceUp; startIdx < col.length; startIdx++) {
        const cards = col.slice(startIdx);
        for (let toCol = 0; toCol < 7; toCol++) {
          if (toCol === fromCol) continue;
          if (canMoveToTableau(cards, game.tableau[toCol])) {
            return { source: { type: 'tableau', col: fromCol, cardIndex: startIdx }, toType: 'tableau', toIndex: toCol };
          }
        }
      }
    }
  }

  // 5. Waste top → tableau
  if (game.waste.length > 0) {
    const card = game.waste[game.waste.length - 1];
    for (let toCol = 0; toCol < 7; toCol++) {
      if (canMoveToTableau([card], game.tableau[toCol])) {
        return { source: { type: 'waste' }, toType: 'tableau', toIndex: toCol };
      }
    }
  }

  return null;
}

export function hasAnyMove(game: GameState): boolean {
  // 1. Any card → foundation
  const wasteTop = game.waste.length > 0 ? game.waste[game.waste.length - 1] : null;
  if (wasteTop && canMoveToFoundation(wasteTop, game.foundations) >= 0) return true;
  for (let ci = 0; ci < 7; ci++) {
    const top = game.tableau[ci].at(-1);
    if (top?.faceUp && canMoveToFoundation(top, game.foundations) >= 0) return true;
  }

  // 2. Tableau move that reveals a face-down card
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const col = game.tableau[fromCol];
    let firstFaceUp = col.findIndex(c => c.faceUp);
    if (firstFaceUp <= 0) continue; // 0 = nothing hidden below, -1 = no face-up cards
    for (let startIdx = firstFaceUp; startIdx < col.length; startIdx++) {
      const cards = col.slice(startIdx);
      for (let toCol = 0; toCol < 7; toCol++) {
        if (toCol !== fromCol && canMoveToTableau(cards, game.tableau[toCol])) return true;
      }
    }
  }

  // 3. Any stock or waste card that can be played
  for (const card of [...game.stock, ...game.waste]) {
    if (canMoveToFoundation(card, game.foundations) >= 0) return true;
    for (let ci = 0; ci < 7; ci++) {
      if (canMoveToTableau([card], game.tableau[ci])) return true;
    }
  }

  return false;
}

function gameStateKey(game: GameState): string {
  const id = (c: Card) => c.rank + c.suit[0];
  return [
    game.stock.map(id).join(','),
    game.waste.map(id).join(','),
    game.foundations.map(f => f.length).join(','),
    game.tableau.map(col => col.map(c => (c.faceUp ? '' : '~') + id(c)).join(',')).join('|'),
  ].join('/');
}

function generateMoves(game: GameState): GameState[] {
  // Moves are bucketed by priority. For DFS the stack uses pop(), so items
  // added LAST are explored FIRST. Buckets are concatenated lowest→highest
  // priority so that the most productive moves sit at the top of the stack.
  const toFoundation: GameState[] = [];  // highest – direct progress
  const exposeHidden: GameState[] = [];  // second  – reveal a face-down card
  const wasteToTab:   GameState[] = [];  // third   – waste top to tableau
  const tabToTab:     GameState[] = [];  // fourth  – tableau shuffle (no expose)
  const stockMoves:   GameState[] = [];  // fifth   – draw / reset stock
  const foundToTab:   GameState[] = [];  // lowest  – un-win a card

  // Draw from stock or reset waste → stock
  if (game.stock.length > 0) {
    stockMoves.push({
      ...game,
      stock: game.stock.slice(0, -1),
      waste: [...game.waste, { ...game.stock[game.stock.length - 1], faceUp: true }],
    });
  } else if (game.waste.length > 0) {
    stockMoves.push({
      ...game,
      stock: [...game.waste].reverse().map(c => ({ ...c, faceUp: false })),
      waste: [],
    });
  }

  // Waste top → foundation or tableau
  if (game.waste.length > 0) {
    const card = game.waste[game.waste.length - 1];
    const fi = canMoveToFoundation(card, game.foundations);
    if (fi >= 0) toFoundation.push(applyMove(game, { type: 'waste' }, [card], 'foundation', fi));
    for (let ci = 0; ci < 7; ci++)
      if (canMoveToTableau([card], game.tableau[ci]))
        wasteToTab.push(applyMove(game, { type: 'waste' }, [card], 'tableau', ci));
  }

  // Foundation top → tableau (un-winning a card — lowest priority)
  for (let fi = 0; fi < 4; fi++) {
    const pile = game.foundations[fi];
    if (!pile.length) continue;
    const card = pile[pile.length - 1];
    for (let ci = 0; ci < 7; ci++)
      if (canMoveToTableau([card], game.tableau[ci]))
        foundToTab.push(applyMove(game, { type: 'foundation', index: fi }, [card], 'tableau', ci));
  }

  // Tableau → foundation or tableau
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const col = game.tableau[fromCol];
    const firstUp = col.findIndex(c => c.faceUp);
    if (firstUp === -1) continue;
    for (let si = firstUp; si < col.length; si++) {
      const cards = col.slice(si);
      if (si === col.length - 1) {
        const fi = canMoveToFoundation(cards[0], game.foundations);
        if (fi >= 0)
          toFoundation.push(applyMove(game, { type: 'tableau', col: fromCol, cardIndex: si }, cards, 'foundation', fi));
      }
      for (let toCol = 0; toCol < 7; toCol++) {
        if (toCol !== fromCol && canMoveToTableau(cards, game.tableau[toCol])) {
          const reveals = si === firstUp && firstUp > 0;
          (reveals ? exposeHidden : tabToTab).push(
            applyMove(game, { type: 'tableau', col: fromCol, cardIndex: si }, cards, 'tableau', toCol),
          );
        }
      }
    }
  }

  // Lowest priority first so highest ends up on top of the DFS stack
  return [...foundToTab, ...stockMoves, ...tabToTab, ...wasteToTab, ...exposeHidden, ...toFoundation];
}

// DFS over all reachable states. Returns false only when the full reachable
// state space has been explored with no winning path found. Returns true if a
// win is found or the state space exceeds MAX_STATES (benefit of the doubt).
// DFS + priority-ordered generateMoves finds winning paths far faster than BFS.
const MAX_SOLVER_STATES = 200_000;

export function isSolvable(game: GameState): boolean {
  if (game.foundations.every(f => f.length === 13)) return true;

  const visited = new Set<string>();
  const stack: GameState[] = [game];
  visited.add(gameStateKey(game));

  while (stack.length > 0) {
    if (visited.size >= MAX_SOLVER_STATES) return true; // benefit of the doubt
    const state = stack.pop()!;
    for (const next of generateMoves(state)) {
      if (next.foundations.every(f => f.length === 13)) {
        console.log('Valid solver path found with', visited.size, 'states explored');
        return true;
      }
      const key = gameStateKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        stack.push(next);
      }
    }
  }

  return false;
}

// Removes duplicate cards (same suit+rank) from the game state, prioritising
// keeping cards in higher-priority locations: foundation > waste > stock > tableau.
// This guards against rare race conditions where two rapid state updates
// (e.g. drag-drop + double-click auto-move) both push the same card.
function deduplicateGameState(g: GameState): GameState {
  const cardKey = (c: Card) => `${c.suit}:${c.rank}`;
  const seen = new Set<string>();

  // Foundations — highest priority (keep first occurrence in each pile)
  const foundations = g.foundations.map(pile =>
    pile.filter(c => {
      const k = cardKey(c);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
  ) as GameState['foundations'];

  // Waste
  const waste = g.waste.filter(c => {
    const k = cardKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Stock
  const stock = g.stock.filter(c => {
    const k = cardKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Tableau — lowest priority (duplicates removed here first)
  const tableau = g.tableau.map(col =>
    col.filter(c => {
      const k = cardKey(c);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
  );

  return { stock, waste, foundations, tableau };
}

export function applyMove(
  g: GameState,
  source: Source,
  cards: Card[],
  targetType: 'foundation' | 'tableau',
  targetIndex: number,
): GameState {
  const ng: GameState = {
    stock: g.stock.map(c => ({ ...c })),
    waste: g.waste.map(c => ({ ...c })),
    foundations: g.foundations.map(f => f.map(c => ({ ...c }))) as GameState['foundations'],
    tableau: g.tableau.map(col => col.map(c => ({ ...c }))),
  };

  if (source.type === 'tableau') {
    ng.tableau[source.col].splice(source.cardIndex);
    const col = ng.tableau[source.col];
    if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1].faceUp = true;
  } else if (source.type === 'waste') {
    ng.waste.pop();
  } else {
    ng.foundations[source.index].pop();
  }

  const moved = cards.map(c => ({ ...c, faceUp: true }));
  if (targetType === 'foundation') ng.foundations[targetIndex].push(...moved);
  else ng.tableau[targetIndex].push(...moved);

  return deduplicateGameState(ng);
}
