import { signToken } from '@/lib/scoreAuth';

const MINESWEEPER_DIFFICULTIES = ['beginner', 'intermediate', 'expert'];

export async function POST(request: Request) {
  const body = await request.json();
  const { game } = body as { game?: string };

  switch (game) {
    case 'minesweeper': {
      const { time, difficulty } = body as { time?: number; difficulty?: string };
      if (
        typeof time !== 'number' || time < 1 || time > 999 ||
        !difficulty || !MINESWEEPER_DIFFICULTIES.includes(difficulty)
      ) {
        return Response.json({ error: 'Invalid' }, { status: 400 });
      }
      return Response.json({ token: signToken(`${time}:${difficulty}`) });
    }

    case 'solitaire':
    case 'sudoku':
    case 'freecell':
    case 'wordle':
      return Response.json({ token: signToken(game) });

    default:
      return Response.json({ error: 'Invalid game' }, { status: 400 });
  }
}
