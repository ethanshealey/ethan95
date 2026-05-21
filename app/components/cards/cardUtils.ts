export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

/** Minimal card shape required by shared card components. */
export type BaseCard = { suit: Suit; rank: number; faceUp?: boolean };

export const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
};

/** Index 0 is intentionally empty; access as RANK_LABELS[rank] for rank 1–13. */
export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const CARD_W = 65;
export const CARD_H = 90;

export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

export const getFoundationIndex = (suit: Suit) => SUIT_ORDER.indexOf(suit);
