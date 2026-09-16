import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function extractCleanErrorMessage(err: any): string {
  let raw = err?.message || String(err || "Unknown error");
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error?.message) {
      raw = parsed.error.message;
    }
  } catch {}
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota") || raw.includes("429")) {
    return "Gemini API request limit temporarily reached. Please wait a moment and try again.";
  }
  if (raw.includes("GEMINI_API_KEY")) {
    return "Gemini API key is not configured. Please add the GEMINI_API_KEY environment variable in your Render dashboard (under Environment).";
  }
  return raw;
}

const CANDIDATE_MODELS = ["gemini-3.6-flash", "gemini-3.8-flash"];

async function generateWithFallback(ai: GoogleGenAI, options: any) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const result = await ai.models.generateContent({
        ...options,
        model,
      });
      return result;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      if (
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("404") ||
        msg.includes("not found")
      ) {
        console.warn(`Model ${model} unavailable or rate-limited, attempting fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();

  // Support audio base64 uploads
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Voice Chat API endpoint (accepts either audio base64 or text message)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, audio, history = [], persona = "natural" } = req.body;

      const hasAudio = audio && typeof audio.data === "string" && audio.data.length > 0;
      const hasMessage = typeof message === "string" && message.trim().length > 0;

      if (!hasAudio && !hasMessage) {
        res.status(200).json({
          userSaid: "(No voice detected)",
          text: "I didn't catch any audio. Please press the microphone and try speaking again.",
        });
        return;
      }

      const ai = getAIClient();

      let personaInstruction = "Warm, natural, and helpful companion.";
      if (persona === "concise") {
        personaInstruction = "Extremely concise, direct, and efficient. 1-2 punchy spoken sentences.";
      } else if (persona === "enthusiastic") {
        personaInstruction = "Upbeat, lively, energetic, and cheerful.";
      } else if (persona === "calm") {
        personaInstruction = "Gentle, soothing, mindful, and reassuring.";
      } else if (persona === "scholarly") {
        personaInstruction = "Insightful, articulate, thoughtful, and stimulating.";
      }

      const systemInstruction = `You are a real-time conversational voice assistant.
Your answers will be converted directly into spoken audio for the listener.
Core guidelines:
1. Speak in a natural, spoken dialogue flow.
2. Tone: ${personaInstruction}
3. Never use markdown formatting like asterisks (e.g. **bold**), headings (###), markdown bullet lists, emojis, code blocks, or URLs, because raw symbols sound strange when spoken by text-to-speech.
4. Keep answers concise (1 to 3 sentences for general questions), unless the user specifically asks for a detailed story, poem, or in-depth explanation.
5. Answer questions directly, accurately, and thoughtfully.`;

      // Build conversation turns
      const contents: Array<{ role: "user" | "model"; parts: Array<any> }> = [];

      // Append previous recent history (up to 8 turns)
      if (Array.isArray(history)) {
        for (const item of history.slice(-8)) {
          if (item.sender === "user" && item.text) {
            contents.push({ role: "user", parts: [{ text: item.text }] });
          } else if (item.sender === "assistant" && item.text) {
            contents.push({ role: "model", parts: [{ text: item.text }] });
          }
        }
      }

      if (hasAudio) {
        // Multi-modal audio input
        const cleanBase64 = audio.data.includes(",")
          ? audio.data.split(",")[1]
          : audio.data;

        contents.push({
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audio.mimeType || "audio/webm",
                data: cleanBase64,
              },
            },
            {
              text: `Listen to this user audio recording.
Provide your response in JSON format with two keys:
1. "userSaid": exact transcription of what the user said in the audio. If empty or noise, return "(unclear speech)".
2. "response": your direct, natural conversational spoken reply to the user.`,
            },
          ],
        });

        const response = await generateWithFallback(ai, {
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const rawText = response.text || "{}";
        let userSaid = "Voice command";
        let spokenText = "I heard you, but couldn't generate a response. Please try again.";

        try {
          const parsed = JSON.parse(rawText);
          if (parsed.userSaid) userSaid = parsed.userSaid;
          if (parsed.response) spokenText = parsed.response;
        } catch {
          spokenText = rawText;
        }

        // Clean up any stray markdown formatting
        spokenText = spokenText
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
          .replace(/^#+\s+/gm, "")
          .replace(/^[\*\-]\s+/gm, "")
          .trim();

        res.json({
          userSaid,
          text: spokenText,
        });
      } else {
        // Text input
        contents.push({ role: "user", parts: [{ text: message.trim() }] });

        const response = await generateWithFallback(ai, {
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const responseText = response.text || "I didn't catch that. Could you say it again?";
        const spokenText = responseText
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
          .replace(/^#+\s+/gm, "")
          .replace(/^[\*\-]\s+/gm, "")
          .trim();

        res.json({
          userSaid: message.trim(),
          text: spokenText,
        });
      }
    } catch (err: any) {
      console.error("Error generating voice chat response:", err);
      const friendlyError = extractCleanErrorMessage(err);
      const isMissingKey = friendlyError.includes("GEMINI_API_KEY");
      res.status(isMissingKey ? 401 : 500).json({
        error: friendlyError,
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
