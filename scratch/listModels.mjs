import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Read API Key from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
if (!match) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}
const apiKey = match[1].trim().replace(/['"]/g, '');

console.log("Using API Key:", apiKey.substring(0, 10) + "...");

// 2. Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(apiKey);

// 3. List models using ModelService
async function run() {
  try {
    // We can list models by calling the API directly
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach((m) => {
        console.log(`- Name: ${m.name}, DisplayName: ${m.displayName}, SupportedMethods: ${m.supportedGenerationMethods}`);
      });
    } else {
      console.log("No models returned. Response:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

run();
