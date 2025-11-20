import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const SECRET_KEY = 'supersecretkey';

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/analyze', authenticate, async (req, res) => {
  const { food_item } = req.body;
  
  if (!openai) {
    return res.json({ 
      success: false, 
      message: "AI not configured",
      data: { calories: 0, protein: 0, carbs: 0, fats: 0 } 
    });
  }

  try {
    const prompt = `
      Estimate the nutritional values for: "${food_item}". 
      Return ONLY a JSON object with the following keys: calories (number), protein (number, grams), carbs (number, grams), fats (number, grams).
      Example: {"calories": 150, "protein": 20, "carbs": 0, "fats": 5}
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a nutritionist." }, { role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const content = completion.choices[0].message.content;
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error("AI Analysis failed:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { food_item, calories, protein, carbs, fats } = req.body;
  const db = await getDb();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  await db.run(
    'INSERT INTO nutrition (user_id, date, food_item, calories, protein, carbs, fats) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, date, food_item, calories, protein, carbs, fats]
  );
  
  res.json({ success: true });
});

router.get('/', authenticate, async (req, res) => {
  const db = await getDb();
  const date = new Date().toISOString().split('T')[0];
  const logs = await db.all('SELECT * FROM nutrition WHERE user_id = ? AND date = ?', [req.user.id, date]);
  
  // Calculate totals
  const totals = logs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fats: acc.fats + (log.fats || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  res.json({ logs, totals });
});

export default router;