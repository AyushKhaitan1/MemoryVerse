import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'GEMINI_API_KEY_PLACEHOLDER';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function run() {
  try {
    const result = await model.generateContent('Say hello in 3 words');
    console.log('Success! Response:', result.response.text());
  } catch (err) {
    console.error('Error during generateContent:', err);
  }
}

run();
