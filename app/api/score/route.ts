import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyToken, verifySecureToken } from '@/lib/scoreAuth';

const MINESWEEPER_DIFFICULTIES = ['beginner', 'intermediate', 'expert'];
const SUDOKU_DIFFICULTIES = ['easy', 'medium', 'hard'];
const FREECELL_TOKEN_EXPIRY = 30;

export async function PUT(request: Request) {
  const body = await request.json();
  const { game, username, token, secureToken } = body as {
    game?: string;
    username?: string;
    token?: string;
    secureToken?: string;
  };

  if (!username?.trim() || !token || !secureToken || !verifySecureToken(token, secureToken)) {
    return Response.json({ error: 'Invalid submission' }, { status: 400 });
  }
  const sanitized = username.trim().slice(0, 32);

  switch (game) {
    case 'minesweeper': {
      const { time, difficulty } = body as { time?: number; difficulty?: string };
      if (
        typeof time !== 'number' || time < 1 || time > 999 ||
        !difficulty || !MINESWEEPER_DIFFICULTIES.includes(difficulty) ||
        !verifyToken(`${time}:${difficulty}`, token, 1)
      ) {
        return Response.json({ error: 'Invalid submission' }, { status: 400 });
      }

      await adminDb.collection('minesweeper').add({
        username: sanitized,
        time,
        difficulty,
        createdAt: FieldValue.serverTimestamp(),
      });
      return Response.json({ success: true }, { status: 201 });
    }

    case 'solitaire':
    case 'freecell': {
      if (!verifyToken(game, token, game === 'freecell' ? FREECELL_TOKEN_EXPIRY : 1)) {
        return Response.json({ error: 'Invalid submission' }, { status: 400 });
      }

      const existing = await adminDb.collection(game).where('username', '==', sanitized).get();
      if (existing.empty) {
        await adminDb.collection(game).add({ username: sanitized, wins: 1 });
      } else {
        await existing.docs[0].ref.update({ wins: FieldValue.increment(1) });
      }
      return Response.json({ success: true }, { status: 200 });
    }

    case 'sudoku': {
      const { difficulty, time } = body as { difficulty?: string; time?: number };
      if (
        !difficulty || !SUDOKU_DIFFICULTIES.includes(difficulty) ||
        typeof time !== 'number' || time <= 0 ||
        !verifyToken('sudoku', token, 1)
      ) {
        return Response.json({ error: 'Invalid submission' }, { status: 400 });
      }

      const now = Date.now();
      const userDocs = await adminDb.collection('sudoku').where('username', '==', sanitized).get();
      const existing = userDocs.docs.find((d) => d.data().difficulty === difficulty);

      if (!existing) {
        await adminDb.collection('sudoku').add({ username: sanitized, difficulty, wins: 1, bestTime: time, lastWin: now });
      } else {
        const current = existing.data() as { bestTime: number };
        await existing.ref.update({
          wins: FieldValue.increment(1),
          bestTime: time < current.bestTime ? time : current.bestTime,
          lastWin: now,
        });
      }
      return Response.json({ success: true }, { status: 200 });
    }

    case 'wordle': {
      const { guesses, hardMode } = body as { guesses?: number; hardMode?: boolean };
      if (
        typeof guesses !== 'number' || guesses < 1 || guesses > 6 ||
        !verifyToken('wordle', token, 1)
      ) {
        return Response.json({ error: 'Invalid submission' }, { status: 400 });
      }

      const isHardMode = hardMode === true;
      const now = Date.now();
      const userDocs = await adminDb.collection('wordle').where('username', '==', sanitized).get();

      // Bot accounts get a single entry regardless of which mode was played.
      const botDoc = userDocs.docs.find((doc) => doc.data().isBot === true);
      // Non-bot accounts keep separate entries per mode.
      const existing = botDoc ?? userDocs.docs.find((doc) => (doc.data().isHardMode === true) === isHardMode);

      if (!existing) {
        await adminDb.collection('wordle').add({
          username: sanitized,
          wins: 1,
          bestGuesses: guesses,
          lastWin: now,
          isHardMode,
          isBot: false,
        });
      } else {
        const current = existing.data() as { bestGuesses: number };
        await existing.ref.update({
          wins: FieldValue.increment(1),
          bestGuesses: guesses < current.bestGuesses ? guesses : current.bestGuesses,
          lastWin: now,
        });
      }
      return Response.json({ success: true }, { status: 200 });
    }

    default:
      return Response.json({ error: 'Invalid game' }, { status: 400 });
  }
}
