import express from 'express';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

import { getDb } from '../db.js';

const router = express.Router();
const SECRET_KEY = 'supersecretkey';

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'http://0.0.0.0:8000/v1'
  });
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

router.post('/', authenticate, async (req, res) => {
  const { message, history } = req.body;
  
  if (!openai) {
    return res.json({ 
      success: false, 
      message: "AI not configured. Please ensure the Python agent is running and OPENAI_API_KEY is set." 
    });
  }

  try {
    // Fetch user profile for context
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    let contextMessage = message;
    if (user) {
      const profileContext = `
User Profile:
- Height: ${user.height_ft}'${user.height_in}"
- Weight: ${user.weight_lbs} lbs
- Goals: ${user.goals}
- Equipment: ${user.equipment}
- Experience: ${user.experience || 'Not specified'}

User Question: ${message}
`;
      contextMessage = profileContext;
    }

    // Construct messages array from history + current message
    const messages = history ? [...history] : [];
    messages.push({ role: "user", content: contextMessage });

    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "nutrition-expert-grok", // Model name defined in python script
    });

    const responseMessage = completion.choices[0].message;
    
    let content = responseMessage.content;
    // Clean up "Final Answer:" prefix if present (common in agent outputs)
    if (content && content.includes("Final Answer:")) {
       content = content.split("Final Answer:")[1].trim();
    } else if (content && content.includes("Final answer:")) {
       content = content.split("Final answer:")[1].trim();
    }

    res.json({ success: true, message: { role: responseMessage.role, content: content } });
  } catch (error) {
    console.error("AI Chat failed:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;
