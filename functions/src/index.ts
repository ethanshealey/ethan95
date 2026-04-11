import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

initializeApp({ databaseURL: 'https://ethan95-11e87-default-rtdb.firebaseio.com' });

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupOldRooms = onSchedule('every 24 hours', async () => {
    const db = getDatabase();
    const cutoff = Date.now() - MAX_AGE_MS;

    const snapshot = await db
        .ref('minesweeper-rooms')
        .orderByChild('createdAt')
        .endAt(cutoff)
        .get();

    if (!snapshot.exists()) {
        console.log('No expired rooms found.');
        return;
    }

    const deletions: Promise<void>[] = [];
    snapshot.forEach((room) => {
        deletions.push(room.ref.remove());
    });

    await Promise.all(deletions);
    console.log(`Deleted ${deletions.length} expired room(s).`);
});
