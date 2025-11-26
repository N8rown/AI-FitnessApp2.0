import express from 'express';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import dotenv from 'dotenv';

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
    // Construct messages array from history + current message
    const messages = history ? [...history] : [];
    messages.push({ role: "user", content: message });

    // Add system prompt if it's the start of conversation (optional, as the agent has its own system prompt)
    // But the agent code shows it prepends system prompt to the user message in `chat` method.
    // However, since we are using the /v1/chat/completions endpoint of the python script, 
    // we should check how `nutritionAgent.py` handles it.
    // It takes `messages` list, finds the last user message, and sends it to `agent.chat(user_message)`.
    // `agent.chat` prepends the system prompt.
    // So we just need to send the user message. 
    // But wait, if we send history, the python script currently only looks at the *last* user message:
    // `for msg in reversed(messages): if msg.get('role') == 'user': ... break`
    // So history might not be fully supported by the current python script implementation for context, 
    // but we can still send it. The python script seems to maintain its own history in `self.conversation_history` but `chat` method doesn't seem to use it effectively in the provided snippet?
    // Actually `NutritionExpertAgent` has `self.conversation_history` but `chat` method just does `self.agent.run(full_message)`.
    // The `smolagents` `ToolCallingAgent` might handle history if we passed it, but here we are just passing a string.
    // For now, we will just send the messages as is, and the python script will pick the last one.
    
    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "nutrition-expert-grok", // Model name defined in python script
    });

    const responseMessage = completion.choices[0].message;

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error("AI Chat failed:", error);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;
