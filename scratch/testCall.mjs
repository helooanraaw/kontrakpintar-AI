import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
if (!match) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}
const apiKey = match[1].trim().replace(/['"]/g, '');

const genAI = new GoogleGenerativeAI(apiKey);

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    greeting: {
      type: SchemaType.STRING,
      description: "A friendly greeting."
    },
    language: {
      type: SchemaType.STRING,
      description: "Language of the greeting."
    }
  },
  required: ["greeting", "language"]
};

async function testStructured(modelName) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });
  console.log(`\nTesting structured output on ${modelName}...`);
  try {
    const result = await model.generateContent("Say hello in Indonesian");
    console.log(`Success ${modelName}:`, result.response.text().trim());
    return true;
  } catch (err) {
    console.error(`Error calling ${modelName}:`, err.message);
    return false;
  }
}

async function run() {
  await testStructured("gemini-3.5-flash");
  await testStructured("gemini-3.1-flash-lite");
  await testStructured("gemini-2.5-flash-lite");
}

run();
