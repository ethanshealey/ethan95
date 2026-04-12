'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    Room, RoomMode,
    generateRoomId,
    createRoom,
    joinRoom as joinRoomFirebase,
    subscribeToRoom,
    syncPlayerState,
    syncSharedState,
    restartRoom as restartRoomFirebase,
} from '../../../../lib/minesweeperRoom';
import { Difficulty, MINE_COUNTS, generateGrid } from '../utils/MinesweeperUtils';
import { blankRevealed, buildPlayerState, OpponentStats } from '../utils/MinesweeperMultiplayerUtils';

/** Subset of the game's useState dispatchers the hook needs to drive. */
export interface GameSetters {
    setGrid: Dispatch<SetStateAction<number[][]>>;
    setRevealed: Dispatch<SetStateAction<number[][]>>;
    setFlagCount: Dispatch<SetStateAction<number>>;
    setTimer: Dispatch<SetStateAction<number>>;
    setLostCell: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setWon: Dispatch<SetStateAction<boolean>>;
    setGameStarted: Dispatch<SetStateAction<boolean>>;
    setDifficulty: Dispatch<SetStateAction<Difficulty>>;
}

export interface RoomAPI {
    // Connection state
    roomId: string | null;
    playerRole: 'host' | 'guest' | null;
    roomStatus: 'waiting' | 'playing' | null;
    mode: RoomMode;
    opponentStats: OpponentStats | null;
    isCoop: boolean;
    isMultiplayer: boolean;

    // Modal state
    showModeModal: boolean;
    showStartModal: boolean;
    showJoinModal: boolean;
    joinCode: string;
    joinError: string;
    startingRoom: boolean;
    joiningRoom: boolean;
    setMode: Dispatch<SetStateAction<RoomMode>>;
    setShowModeModal: Dispatch<SetStateAction<boolean>>;
    setShowJoinModal: Dispatch<SetStateAction<boolean>>;
    setJoinCode: Dispatch<SetStateAction<string>>;

    // Lifecycle
    startRoom: () => Promise<void>;
    joinRoom: () => Promise<void>;
    restartRoom: () => Promise<void>;
    leaveRoom: () => void;

    // Board sync — called by the component after applying local state updates
    syncReveal: (revealed: number[][], flagCount: number, timer: number) => Promise<void>;
    syncLoss:   (revealed: number[][], flagCount: number, timer: number, lostCell: { x: number; y: number }) => Promise<void>;
    syncWin:    (revealed: number[][], flagCount: number, timer: number) => Promise<void>;
    syncFlag:   (revealed: number[][], flagCount: number, timer: number) => Promise<void>;
}

export function useMinesweeperRoom(
    difficulty: Difficulty,
    timer: number,
    gameSetters: GameSetters,
    onRoomSizeChange: (difficulty: Difficulty) => void,
): RoomAPI {

    // ── Room state ─────────────────────────────────────────────────────────────
    const [roomId, setRoomId]               = useState<string | null>(null);
    const [playerRole, setPlayerRole]       = useState<'host' | 'guest' | null>(null);
    const [roomStatus, setRoomStatus]       = useState<'waiting' | 'playing' | null>(null);
    const [mode, setMode]                   = useState<RoomMode>('versus');
    const [opponentStats, setOpponentStats] = useState<OpponentStats | null>(null);

    // ── Modal state ────────────────────────────────────────────────────────────
    const [showModeModal, setShowModeModal]   = useState(false);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showJoinModal, setShowJoinModal]   = useState(false);
    const [joinCode, setJoinCode]           = useState('');
    const [joinError, setJoinError]         = useState('');
    const [startingRoom, setStartingRoom]   = useState(false);
    const [joiningRoom, setJoiningRoom]     = useState(false);

    // ── Stable refs for subscription callbacks (never capture stale state) ─────
    const roomIdRef     = useRef<string | null>(null);
    const playerRoleRef = useRef<'host' | 'guest' | null>(null);
    const roomStatusRef = useRef<'waiting' | 'playing' | null>(null);
    const modeRef       = useRef<RoomMode>('versus');
    const lostCellRef   = useRef<{ x: number; y: number } | null>(null);
    const unsubRef      = useRef<(() => void) | null>(null);
    const roundRef      = useRef<number>(0);
    roomIdRef.current   = roomId;

    // ── Timer sync to RTDB (versus only) ──────────────────────────────────────
    useEffect(() => {
        if (!roomId || !playerRole || roomStatus !== 'playing' || modeRef.current === 'coop') return;
        syncPlayerState(roomId, playerRole, { timer });
    }, [timer, roomId, playerRole, roomStatus]);

    // ── Leave / cleanup ────────────────────────────────────────────────────────
    const leaveRoom = useCallback(() => {
        unsubRef.current?.();
        unsubRef.current      = null;
        playerRoleRef.current = null;
        roomStatusRef.current = null;
        lostCellRef.current   = null;
        setRoomId(null);
        setPlayerRole(null);
        setRoomStatus(null);
        setOpponentStats(null);
        setShowModeModal(false);
        setShowStartModal(false);
        setShowJoinModal(false);
    }, []);

    // ── Apply game state from an incoming round reset ──────────────────────────
    const resetForNewRound = useCallback((room: Room) => {
        roundRef.current = room.round ?? 0;
        const roomGrid   = JSON.parse(room.grid) as number[][];
        const d          = room.difficulty;
        const initRevealed = room.mode === 'coop' && room.shared
            ? JSON.parse(room.shared.revealed) as number[][]
            : blankRevealed(d);
        const initFlagCount = room.mode === 'coop' && room.shared
            ? room.shared.flagCount
            : MINE_COUNTS[d];
        gameSetters.setGrid(roomGrid);
        gameSetters.setRevealed(initRevealed);
        gameSetters.setFlagCount(initFlagCount);
        gameSetters.setTimer(0);
        gameSetters.setLostCell(null);
        lostCellRef.current = null;
        gameSetters.setWon(false);
        gameSetters.setGameStarted(true);
        setOpponentStats(null);
    }, [gameSetters]);

    // ── Firebase subscription handler ──────────────────────────────────────────
    const handleRoomUpdate = useCallback((room: Room) => {
        const newRound = room.round ?? 0;
        if (newRound > roundRef.current) {
            resetForNewRound(room);
            return;
        }

        // Host: detect guest joining
        if (playerRoleRef.current === 'host' && room.status === 'playing' && roomStatusRef.current === 'waiting') {
            roomStatusRef.current = 'playing';
            setRoomStatus('playing');
            setShowStartModal(false);
            gameSetters.setGameStarted(true);
        }

        if (modeRef.current === 'coop') {
            if (room.shared) {
                const sharedRevealed = JSON.parse(room.shared.revealed) as number[][];
                gameSetters.setRevealed(sharedRevealed);
                gameSetters.setFlagCount(room.shared.flagCount);
                if (room.shared.result === 'won') gameSetters.setWon(true);
                if (room.shared.result === 'lost' && room.shared.lostCell && !lostCellRef.current) {
                    const cell = JSON.parse(room.shared.lostCell) as { x: number; y: number };
                    lostCellRef.current = cell;
                    gameSetters.setLostCell(cell);
                }
            }
        } else {
            const opRole  = playerRoleRef.current === 'host' ? 'guest' : 'host';
            const opState = room[opRole];
            if (opState) {
                setOpponentStats({
                    timer: opState.timer, flagCount: opState.flagCount,
                    result: opState.result, revealed: opState.revealed,
                });
            }
        }
    }, [resetForNewRound, gameSetters]);

    // ── Start Room (host) ──────────────────────────────────────────────────────
    const startRoom = useCallback(async () => {
        setStartingRoom(true);
        try {
            const id           = generateRoomId();
            const { grid }     = generateGrid(difficulty);
            const initRevealed = blankRevealed(difficulty);
            const hostState    = buildPlayerState(initRevealed, MINE_COUNTS[difficulty], 0);
            const sharedState  = modeRef.current === 'coop' ? { ...hostState } : undefined;

            await createRoom(id, difficulty, modeRef.current, grid, hostState, sharedState);

            gameSetters.setGrid(grid);
            gameSetters.setRevealed(initRevealed);
            gameSetters.setFlagCount(MINE_COUNTS[difficulty]);
            gameSetters.setTimer(0);
            gameSetters.setLostCell(null);
            gameSetters.setWon(false);
            gameSetters.setGameStarted(false);
            lostCellRef.current   = null;
            roundRef.current      = 0;
            playerRoleRef.current = 'host';
            roomStatusRef.current = 'waiting';
            setRoomId(id);
            setPlayerRole('host');
            setRoomStatus('waiting');
            setShowStartModal(true);

            unsubRef.current = subscribeToRoom(id, handleRoomUpdate);
            onRoomSizeChange(difficulty);
        } finally {
            setStartingRoom(false);
        }
    }, [difficulty, gameSetters, handleRoomUpdate, onRoomSizeChange]);

    // ── Join Room (guest) ──────────────────────────────────────────────────────
    const joinRoom = useCallback(async () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length !== 6) { setJoinError('Enter a valid 6-character room code.'); return; }
        setJoiningRoom(true);
        setJoinError('');
        try {
            const placeholder = buildPlayerState(blankRevealed('beginner'), 0, 0);
            const room        = await joinRoomFirebase(code, placeholder);
            if (!room) { setJoinError('Room not found or already in progress.'); return; }

            const d        = room.difficulty;
            const roomGrid = JSON.parse(room.grid) as number[][];
            const roomMode = room.mode ?? 'versus';
            const initRevealed = roomMode === 'coop' && room.shared
                ? JSON.parse(room.shared.revealed) as number[][]
                : blankRevealed(d);
            const initFlagCount = roomMode === 'coop' && room.shared
                ? room.shared.flagCount
                : MINE_COUNTS[d];

            if (roomMode === 'versus') {
                await syncPlayerState(code, 'guest', buildPlayerState(initRevealed, initFlagCount, 0));
            }

            gameSetters.setDifficulty(d);
            gameSetters.setGrid(roomGrid);
            gameSetters.setRevealed(initRevealed);
            gameSetters.setFlagCount(initFlagCount);
            gameSetters.setTimer(0);
            gameSetters.setLostCell(null);
            gameSetters.setWon(false);
            gameSetters.setGameStarted(true);
            lostCellRef.current   = null;
            roundRef.current      = room.round ?? 0;
            modeRef.current       = roomMode;
            playerRoleRef.current = 'guest';
            roomStatusRef.current = 'playing';
            setMode(roomMode);
            setRoomId(code);
            setPlayerRole('guest');
            setRoomStatus('playing');
            setShowJoinModal(false);
            setJoinCode('');

            unsubRef.current = subscribeToRoom(code, handleRoomUpdate);
            onRoomSizeChange(d);
        } finally {
            setJoiningRoom(false);
        }
    }, [joinCode, gameSetters, handleRoomUpdate, onRoomSizeChange]);

    // ── Restart Room (host only) ───────────────────────────────────────────────
    const restartRoom = useCallback(async () => {
        const id = roomIdRef.current;
        if (!id) return;
        const { grid }     = generateGrid(difficulty);
        const initRevealed = blankRevealed(difficulty);
        const hostState    = buildPlayerState(initRevealed, MINE_COUNTS[difficulty], 0);
        const sharedState  = modeRef.current === 'coop' ? { ...hostState } : undefined;
        await restartRoomFirebase(id, grid, difficulty, hostState, sharedState);
    }, [difficulty]);

    // ── Board sync helpers (coop vs. versus routing) ───────────────────────────
    const syncReveal = useCallback(async (rev: number[][], fc: number, t: number) => {
        const id = roomIdRef.current; const role = playerRoleRef.current;
        if (!id || !role) return;
        const revStr = JSON.stringify(rev);
        if (modeRef.current === 'coop') await syncSharedState(id, { revealed: revStr, flagCount: fc, timer: t });
        else                            await syncPlayerState(id, role, { revealed: revStr });
    }, []);

    const syncLoss = useCallback(async (
        rev: number[][], fc: number, t: number, cell: { x: number; y: number },
    ) => {
        const id = roomIdRef.current; const role = playerRoleRef.current;
        if (!id || !role) return;
        lostCellRef.current = cell;
        const revStr = JSON.stringify(rev);
        if (modeRef.current === 'coop') await syncSharedState(id, { revealed: revStr, result: 'lost', flagCount: fc, timer: t, lostCell: JSON.stringify(cell) });
        else                            await syncPlayerState(id, role, { revealed: revStr, result: 'lost' });
    }, []);

    const syncWin = useCallback(async (rev: number[][], fc: number, t: number) => {
        const id = roomIdRef.current; const role = playerRoleRef.current;
        if (!id || !role) return;
        const revStr = JSON.stringify(rev);
        if (modeRef.current === 'coop') await syncSharedState(id, { revealed: revStr, result: 'won', flagCount: fc, timer: t });
        else                            await syncPlayerState(id, role, { revealed: revStr, result: 'won', timer: t });
    }, []);

    const syncFlag = useCallback(async (rev: number[][], fc: number, t: number) => {
        const id = roomIdRef.current; const role = playerRoleRef.current;
        if (!id || !role) return;
        const revStr = JSON.stringify(rev);
        if (modeRef.current === 'coop') await syncSharedState(id, { revealed: revStr, flagCount: fc, timer: t });
        else                            await syncPlayerState(id, role, { revealed: revStr, flagCount: fc });
    }, []);

    return {
        roomId, playerRole, roomStatus, mode, opponentStats,
        isCoop: mode === 'coop',
        isMultiplayer: !!roomId,
        showModeModal, showStartModal, showJoinModal,
        joinCode, joinError, startingRoom, joiningRoom,
        setMode, setShowModeModal, setShowJoinModal, setJoinCode,
        startRoom, joinRoom, restartRoom, leaveRoom,
        syncReveal, syncLoss, syncWin, syncFlag,
    };
}
