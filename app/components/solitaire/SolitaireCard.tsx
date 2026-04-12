import { Card, CARD_W, CARD_H, SUIT_SYMBOLS, RANK_LABELS, isRed } from './utils/SolitaireUtils';

export type Highlight = 'source' | 'target' | 'selected' | undefined;

const CARD_SIZE: React.CSSProperties = { width: CARD_W, height: CARD_H };

function highlightBoxShadow(highlight: Highlight): string | undefined {
  if (highlight === 'source')   return '0 0 0 3px gold, 0 0 10px 4px rgba(255,215,0,0.7)';
  if (highlight === 'target')   return '0 0 0 3px #00cc44, 0 0 10px 4px rgba(0,204,68,0.7)';
  if (highlight === 'selected') return '0 0 0 3px #1a73e8, 0 0 10px 4px rgba(26,115,232,0.65)';
  return undefined;
}

export function CardFace({ card, style, hidden, highlight, onPointerDown, onDoubleClick }: {
  card: Card;
  style?: React.CSSProperties;
  hidden?: boolean;
  highlight?: Highlight;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDoubleClick?: () => void;
}) {
  const color = isRed(card.suit) ? '#cc0000' : '#111';
  const sym = SUIT_SYMBOLS[card.suit];
  const lbl = RANK_LABELS[card.rank];
  return (
    <div
      style={{ ...CARD_SIZE, ...style, visibility: hidden ? 'hidden' : undefined, touchAction: onPointerDown ? 'none' : undefined }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        backgroundColor: 'white', border: '1px solid #999', borderRadius: 4,
        boxSizing: 'border-box', color, overflow: 'hidden',
        cursor: onPointerDown ? 'grab' : 'default',
        boxShadow: highlightBoxShadow(highlight),
      }}>
        <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 11, lineHeight: 1.2, fontFamily: 'sans-serif' }}>
          <div style={{ fontWeight: 'bold' }}>{lbl}</div>
          <div>{sym}</div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          {sym}
        </div>
        <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 11, lineHeight: 1.2, transform: 'rotate(180deg)', fontFamily: 'sans-serif' }}>
          <div style={{ fontWeight: 'bold' }}>{lbl}</div>
          <div>{sym}</div>
        </div>
      </div>
    </div>
  );
}

export function CardBack({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ ...CARD_SIZE, ...style }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        backgroundColor: '#000080', border: '2px solid #0000cc',
        borderRadius: 4, boxSizing: 'border-box', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 4, border: '2px solid #4444cc', borderRadius: 2,
          background: 'repeating-linear-gradient(45deg, #000090 0px, #000090 3px, #0000b0 3px, #0000b0 6px)',
        }} />
      </div>
    </div>
  );
}

export function EmptyPile({ style, label, highlight, onClick }: {
  style?: React.CSSProperties;
  label?: string;
  highlight?: 'target';
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        ...CARD_SIZE,
        border: highlight === 'target' ? '2px solid #00cc44' : '1px dashed rgba(255,255,255,0.3)',
        borderRadius: 4, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.35)', fontSize: 22,
        boxShadow: highlight === 'target' ? '0 0 10px 4px rgba(0,204,68,0.7)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {label}
    </div>
  );
}
