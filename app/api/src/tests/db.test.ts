import { describe, it, expect } from 'bun:test';
import { setupDB, db } from '../db/index.js';

describe('Database Schema & Seeding', () => {
  it('should initialize without errors', () => {
    expect(() => setupDB()).not.toThrow();
  });

  it('should seed a dummy player', () => {
    setupDB();
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get('usr_12345') as { name: string };
    expect(player).toBeDefined();
    expect(player.name).toBe('Guest Golfer');
  });

  it('should insert and retrieve a swing', () => {
    setupDB();
    const insert = db.prepare('INSERT INTO swings (id, playerId, club, videoUrl, analyzed) VALUES (?, ?, ?, ?, ?)');
    insert.run('test_swing_1', 'usr_12345', 'Driver', '/test.mp4', 0);

    const count = db.prepare('SELECT count(*) as c FROM swings WHERE id = ?').get('test_swing_1') as { c: number };
    expect(count.c).toBe(1);

    db.prepare('DELETE FROM swings WHERE id = ?').run('test_swing_1');
  });
});
