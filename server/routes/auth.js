import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = express.Router();
const SECRET_KEY = 'supersecretkey'; // In prod, use env var

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.status(201).json({ id: result.lastID, username });
  } catch (error) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, username: user.username, height_ft: user.height_ft, height_in: user.height_in, weight_lbs: user.weight_lbs, goals: user.goals, equipment: user.equipment } });
});

router.put('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { height_ft, height_in, weight_lbs, goals, equipment } = req.body;
    const db = await getDb();
    
    await db.run(
      'UPDATE users SET height_ft = ?, height_in = ?, weight_lbs = ?, goals = ?, equipment = ? WHERE id = ?',
      [height_ft, height_in, weight_lbs, goals, equipment, decoded.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;