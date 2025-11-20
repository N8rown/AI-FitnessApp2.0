import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  // Simple leaderboard: Users with most completed workouts
  const leaderboard = await db.all(`
    SELECT u.username, COUNT(w.id) as score 
    FROM users u 
    JOIN workouts w ON u.id = w.user_id 
    WHERE w.is_completed = 1 
    GROUP BY u.id 
    ORDER BY score DESC 
    LIMIT 10
  `);
  
  res.json(leaderboard);
});

export default router;