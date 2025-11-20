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
  
  const { goals, equipment } = user;
  
  // Helper to generate a single workout plan object
  const generatePlan = async (dayFocus) => {
    // AI Generation Logic
    if (openai) {
      try {
        const prompt = `
          Generate a workout plan for a user with the following profile:
          - Goals: ${goals}
          - Equipment: ${equipment}
          - Focus for this workout: ${dayFocus || 'General'}
          
          Return ONLY a JSON object with the following structure (no markdown, no extra text):
          {
            "focus": "${dayFocus || 'General'}",
            "exercises": [
              { "name": "Exercise Name", "sets": 3, "reps": 10 }
            ]
          }
        `;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: "You are a fitness coach." }, { role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
        });

        const content = completion.choices[0].message.content;
        // Clean up potential markdown code blocks if the model adds them
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return jsonStr;
      } catch (error) {
        console.error("AI Generation failed, falling back to static logic:", error);
      }
    }

    // Fallback Static Logic
    let exercises = [];
    const focusLower = dayFocus ? dayFocus.toLowerCase() : (goals || '').toLowerCase();
    
    if (focusLower.includes('chest') || focusLower.includes('push')) {
      exercises = [
        { name: "Bench Press", sets: 3, reps: 10 },
        { name: "Incline Dumbbell Press", sets: 3, reps: 12 },
        { name: "Pushups", sets: 3, reps: 15 }
      ];
    } else if (focusLower.includes('back') || focusLower.includes('pull')) {
      exercises = [
        { name: "Pullups", sets: 3, reps: 8 },
        { name: "Barbell Rows", sets: 3, reps: 10 },
        { name: "Lat Pulldowns", sets: 3, reps: 12 }
      ];
    } else if (focusLower.includes('legs')) {
      exercises = [
        { name: "Squats", sets: 4, reps: 8 },
        { name: "Lunges", sets: 3, reps: 12 },
        { name: "Calf Raises", sets: 3, reps: 15 }
      ];
    } else {
      // Full Body / Cardio default
      exercises = [
        { name: "Burpees", sets: 3, reps: 15 },
        { name: "Bodyweight Squats", sets: 3, reps: 20 },
        { name: "Pushups", sets: 3, reps: 15 }
      ];
    }
    return JSON.stringify({ focus: dayFocus || 'General', exercises });
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

export default router;