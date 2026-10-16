import { GoogleGenAI, Modality } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testVoice(voiceName: string) {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: "Hello" }] }],
      config: {
        responseModalities: ["AUDIO"] as any,
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    });
    console.log(voiceName, "OK");
  } catch(e) {
    console.log(voiceName, "ERROR:", e.message);
  }
}

async function run() {
  await testVoice("Aoede");
  await testVoice("Lyra");
  await testVoice("Orion");
}
run();
