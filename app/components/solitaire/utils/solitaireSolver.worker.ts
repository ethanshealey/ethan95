import { isSolvable } from './SolitaireUtils';
import type { GameState } from './SolitaireUtils';

type InMsg  = { game: GameState; seq: number };
type OutMsg = { solvable: boolean; seq: number };

// `self` is typed as Window in the dom lib; cast to avoid targetOrigin requirement
// on postMessage. The runtime is always a DedicatedWorkerGlobalScope here.
const post = (data: OutMsg) =>
  (self as unknown as { postMessage(d: OutMsg): void }).postMessage(data);

addEventListener('message', (e: MessageEvent<InMsg>) => {
  console.log('Worker received message', e.data);
  post({ solvable: isSolvable(e.data.game), seq: e.data.seq });
});
