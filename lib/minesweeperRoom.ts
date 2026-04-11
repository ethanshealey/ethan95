import { ref, set, get, onValue, update, off, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';
import { Difficulty } from '../app/components/minesweeper/utils/MinesweeperUtils';

export type RoomPlayerResult = 'playing' | 'won' | 'lost';
export type RoomMode = 'versus' | 'coop';

export interface RoomPlayerState {
    revealed: string;       // JSON.stringify(number[][])
    flagCount: number;
    timer: number;
    result: RoomPlayerResult;
    lostCell?: string;      // JSON.stringify({x,y}) — used in coop to broadcast the triggering cell
}

export interface Room {
    difficulty: Difficulty;
    mode: RoomMode;
    grid: string;           // JSON.stringify(number[][])
    status: 'waiting' | 'playing' | 'finished';
    createdAt: number;      // server timestamp — used for expiry cleanup
    host: RoomPlayerState;
    guest?: RoomPlayerState;
    shared?: RoomPlayerState; // coop only — single source of truth for board state
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion

export function generateRoomId(): string {
    return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function roomRef(roomId: string) {
    return ref(rtdb, `minesweeper-rooms/${roomId}`);
}

export async function createRoom(
    roomId: string,
    difficulty: Difficulty,
    mode: RoomMode,
    grid: number[][],
    hostState: RoomPlayerState,
    sharedState?: RoomPlayerState,
): Promise<void> {
    const room: Omit<Room, 'guest'> & { shared?: RoomPlayerState } = {
        difficulty,
        mode,
        grid: JSON.stringify(grid),
        status: 'waiting',
        createdAt: serverTimestamp() as unknown as number,
        host: hostState,
    };
    if (mode === 'coop' && sharedState) room.shared = sharedState;
    await set(roomRef(roomId), room);
}

export async function joinRoom(
    roomId: string,
    guestState: RoomPlayerState,
): Promise<Room | null> {
    const rRef = roomRef(roomId);
    const snapshot = await get(rRef);
    if (!snapshot.exists()) return null;
    const room = snapshot.val() as Room;
    if (room.status !== 'waiting') return null;
    await update(rRef, { guest: guestState, status: 'playing' });
    return { ...room, guest: guestState, status: 'playing' };
}

export function subscribeToRoom(roomId: string, callback: (room: Room) => void): () => void {
    const rRef = roomRef(roomId);
    onValue(rRef, (snapshot) => {
        if (snapshot.exists()) callback(snapshot.val() as Room);
    });
    return () => off(rRef);
}

export async function syncPlayerState(
    roomId: string,
    role: 'host' | 'guest',
    patch: Partial<RoomPlayerState>,
): Promise<void> {
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
        updates[`minesweeper-rooms/${roomId}/${role}/${key}`] = val;
    }
    await update(ref(rtdb), updates);
}

export async function syncSharedState(
    roomId: string,
    patch: Partial<RoomPlayerState>,
): Promise<void> {
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
        updates[`minesweeper-rooms/${roomId}/shared/${key}`] = val;
    }
    await update(ref(rtdb), updates);
}
