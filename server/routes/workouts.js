import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { parseAiJson, stripCodeFences } from '../utils/aiUtils.js';

dotenv.config();

const router = express.Router();
const SECRET_KEY = 'supersecretkey';

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'http://0.0.0.0:8000/v1'
  });
}

// Middleware to verify token
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

router.post('/generate', authenticate, async (req, res) => {
  const { type, focus, days_per_week } = req.body; // type: 'single' | 'weekly'
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found. Please login again.' });
  }

  const { goals, equipment } = user;
  
  // Helper to generate a single workout plan object
  const generatePlan = async (dayFocus) => {
    // AI Generation Logic
    if (openai) {
      try {
        const prompt = `
          Generate a concise workout plan for a user with the following profile:
          - Goals: ${goals}
          - Equipment: ${equipment}
          - Focus for this workout: ${dayFocus || 'General'}
          
          Return a simple, plain text list of exercises with sets and reps. 
          Do NOT use markdown formatting (no bolding, no headers).
          Format it so it is easy to read and edit in a text box.
          Example format:
          Focus: Chest
          1. Bench Press - 3 sets x 10 reps
          2. Pushups - 3 sets x 15 reps
        `;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: "You are a fitness coach." }, { role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
        });

        const content = completion.choices[0].message.content;
        return stripCodeFences(content);
      } catch (error) {
        console.error("AI Generation failed, falling back to static logic:", error);
      }
    }

    // Fallback Static Logic
    let text = `Focus: ${dayFocus || 'General'}\n`;
    const focusLower = dayFocus ? dayFocus.toLowerCase() : (goals || '').toLowerCase();
    
    if (focusLower.includes('chest') || focusLower.includes('push')) {
      text += "1. Bench Press - 3 sets x 10 reps\n2. Incline Dumbbell Press - 3 sets x 12 reps\n3. Pushups - 3 sets x 15 reps";
    } else if (focusLower.includes('back') || focusLower.includes('pull')) {
      text += "1. Pullups - 3 sets x 8 reps\n2. Barbell Rows - 3 sets x 10 reps\n3. Lat Pulldowns - 3 sets x 12 reps";
    } else if (focusLower.includes('legs')) {
      text += "1. Squats - 4 sets x 8 reps\n2. Lunges - 3 sets x 12 reps\n3. Calf Raises - 3 sets x 15 reps";
    } else {
      text += "1. Burpees - 3 sets x 15 reps\n2. Bodyweight Squats - 3 sets x 20 reps\n3. Pushups - 3 sets x 15 reps";
    }
    return text;
  };

  const workoutsToInsert = [];
  const today = new Date();

  if (type === 'weekly') {
    const days = parseInt(days_per_week) || 3;
    const splits = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i + 1); // Schedule for next few days
      const splitFocus = splits[i % splits.length];
      const plan = await generatePlan(splitFocus);
      workoutsToInsert.push({
        plan: plan,
        date: date.toISOString()
      });
    }
  } else {
    // Single day
    const plan = await generatePlan(focus);
    workoutsToInsert.push({
      plan: plan,
      date: today.toISOString()
    });
  }

  for (const w of workoutsToInsert) {
    await db.run(
      'INSERT INTO workouts (user_id, plan, scheduled_date, is_completed) VALUES (?, ?, ?, 0)',
      [req.user.id, w.plan, w.date]
    );
  }
  
  res.json({ success: true, count: workoutsToInsert.length });
});

router.get('/scheduled', authenticate, async (req, res) => {
  const db = await getDb();
  const workouts = await db.all('SELECT * FROM workouts WHERE user_id = ? AND is_completed = 0 ORDER BY scheduled_date ASC', [req.user.id]);
  res.json(workouts);
});

router.get('/history', authenticate, async (req, res) => {
  const db = await getDb();
  const workouts = await db.all('SELECT * FROM workouts WHERE user_id = ? AND is_completed = 1 ORDER BY completed_date DESC', [req.user.id]);
  res.json(workouts);
});

router.post('/complete/:id', authenticate, async (req, res) => {
  const { actual_data } = req.body; // JSON string of what was actually done
  const db = await getDb();
  const completedDate = new Date().toISOString();
  
  await db.run(
    'UPDATE workouts SET is_completed = 1, completed_date = ?, actual_data = ? WHERE id = ? AND user_id = ?',
    [completedDate, JSON.stringify(actual_data), req.params.id, req.user.id]
  );
  res.json({ success: true, completed_date: completedDate });
});

router.get('/analytics', authenticate, async (req, res) => {
  const db = await getDb();
  const total = await db.get('SELECT COUNT(*) as count FROM workouts WHERE user_id = ?', [req.user.id]);
  const completed = await db.get('SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND is_completed = 1', [req.user.id]);
  
  const adherence = total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0;
  res.json({ adherence, total: total.count, completed: completed.count });
});

router.delete('/:id', authenticate, async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

router.put('/:id', authenticate, async (req, res) => {
  const { actual_data } = req.body;
  const db = await getDb();
  await db.run(
    'UPDATE workouts SET actual_data = ? WHERE id = ? AND user_id = ?',
    [JSON.stringify(actual_data), req.params.id, req.user.id]
  );
  res.json({ success: true });
});

export default router;