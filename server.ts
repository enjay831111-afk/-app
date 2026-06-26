import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to safely fetch Gemini Client without crashing on boot if key is missing
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. Endpoint to generate a typing practice article
app.post("/api/generate-article", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;
    const client = getGeminiClient();

    const difficultyDesc = {
      easy: "simple vocabulary, short sentences, suitable for beginners",
      intermediate: "standard daily English with moderate complexity",
      hard: "advanced vocabulary, rich collocations, academic or professional expressions"
    }[difficulty as "easy" | "intermediate" | "hard"] || "intermediate English";

    const prompt = `Generate an engaging and natural English article/paragraph for typing practice.
Topic: ${topic || "general interest"}
Difficulty Level: ${difficultyDesc}
Length constraints: strictly between 50 to 90 words.
Do not output any markdown formatting, headers, quotation marks, or explanations. Just output the pure text.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: response.text?.trim() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Endpoint to analyze user dialogue response & perform grammar/error correction
app.post("/api/analyze-response", async (req, res) => {
  try {
    const { userMessage, chatHistory, turnCount, currentErrorRanking } = req.body;
    const client = getGeminiClient();

    // Determine if this turn should trigger Friend Mode (every 3 turns)
    const isFriendTurn = turnCount % 3 === 0;

    // Build the system instruction explaining all custom rules
    const systemInstruction = `You are a highly engaging English Writing & Speaking Coach.
The user is practicing their typing and writing through real-time dialogue with you.

Analyze the user's latest response and return a structured JSON feedback conforming to the required schema.

CRITICAL RULES TO ENFORCE:

1. Personal Error Tracking & Ranking:
   - Identify writing, grammatical, phrasing, or word choice errors in the user's response.
   - Categorize each error strictly into one of these 6 categories:
     * 'Direct Translation' (中文直譯)
     * 'Missing Subject' (主詞遺漏)
     * 'Wrong Preposition' (介係詞錯誤)
     * 'Wrong Chunk' (搭配詞或語塊錯誤)
     * 'Word Choice' (用字不精確/不恰當)
     * 'Grammar' (文法時態/單複數錯誤)
   - Do NOT correct everything equally. Prioritize identifying and highlighting errors that belong to the user's most frequent error categories.
   - Here is the user's current error frequency list for reference:
     ${JSON.stringify(currentErrorRanking || [])}
   - Prioritize resolving the top 3 errors from this list. If none are found, look for others.
   - For each error found, provide the original incorrect snippet, the corrected snippet, a helpful explanation in Chinese, and a native alternative.

2. Native Speaker Upgrade:
   - Provide three upgraded versions of the user's response:
     * Understandable English (外國人聽得懂但較平鋪直敘)
     * Native Speaker Version (外國人真的會說、道地口語表達)
     * Highly Natural Version (高頻、極具母語者質感的精準表達)

3. Long Answer Training:
   - Count the words in the user's input.
   - If the input has less than 30 words, trigger Long Answer Training:
     * set 'isTooShort' to true.
     * In your 'replyText', you must politely refuse/nudge the user to expand their answer. You must actively ask engaging follow-up questions using prompts like "Why?", "How?", "What happened?", "Can you give me an example?", or "How did you feel?" to encourage them to write more.
   - If the input is 30 words or more:
     * set 'isTooShort' to false.
     * Provide a standard, engaging response continuing the conversation.

4. Friend Mode (Every 3 turns, isFriendTurn: ${isFriendTurn}):
   - If isFriendTurn is true:
     * Do NOT act like a teacher in your 'replyText'. Talk like a close foreign friend!
     * You can agree, disagree, share personal views, crack friendly jokes, tease a bit, or ask intimate details about their experience. Make it a true, relaxed, authentic social conversation.
   - If isFriendTurn is false:
     * Respond as a warm, encouraging, and structured AI English coach.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: "user", parts: [{ text: `User message to analyze: "${userMessage}"\nChat History so far: ${JSON.stringify(chatHistory || [])}` }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: { type: Type.STRING, description: "The corrected and polished version of the user's input." },
            isCorrect: { type: Type.BOOLEAN, description: "Whether the user's input is free of spelling, grammar, and word-choice errors." },
            errorsFound: {
              type: Type.ARRAY,
              description: "The list of grammatical/writing errors found, grouped into the 6 specific categories.",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { 
                    type: Type.STRING, 
                    enum: ["Direct Translation", "Missing Subject", "Wrong Preposition", "Wrong Chunk", "Word Choice", "Grammar"],
                    description: "Category of error."
                  },
                  original: { type: Type.STRING, description: "The exact incorrect word or phrase." },
                  corrected: { type: Type.STRING, description: "The corrected version." },
                  explanation: { type: Type.STRING, description: "Detailed explanation in Chinese of why it's wrong." },
                  nativeAlternative: { type: Type.STRING, description: "A highly natural native alternative." }
                },
                required: ["category", "original", "corrected", "explanation", "nativeAlternative"]
              }
            },
            understandableEnglish: { type: Type.STRING, description: "An understandable English version." },
            nativeSpeakerVersion: { type: Type.STRING, description: "A native speaker version." },
            highlyNaturalVersion: { type: Type.STRING, description: "A highly natural, idiomatic version." },
            isTooShort: { type: Type.BOOLEAN, description: "Whether the input is under 30 words." },
            wordCount: { type: Type.INTEGER, description: "Word count of user input." },
            replyText: { type: Type.STRING, description: "Your response to the user. If isTooShort is true, nudge the user with why, how, examples to get above 30 words. If isFriendTurn is true, write in a very casual, friendly, opinionated style." }
          },
          required: [
            "correctedText", 
            "isCorrect", 
            "errorsFound", 
            "understandableEnglish", 
            "nativeSpeakerVersion", 
            "highlyNaturalVersion", 
            "isTooShort", 
            "wordCount", 
            "replyText"
          ]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Endpoint to regenerate/change the coach's question
const FALLBACK_QUESTIONS: Record<string, string[]> = {
  "💻 我的職涯與科技 (Career & Tech)": [
    "What are your career goals, and how do you feel about the rise of Artificial Intelligence in your industry?",
    "How has technology changed the way you work or study in the past few years?",
    "What is one tech skill you want to learn next, and how do you think it will help your career?",
    "Do you think automation will create more jobs than it destroys, or vice versa? Why?"
  ],
  "✈️ 旅遊與冒險 (Travel Adventures)": [
    "Describe your dream travel destination. What would you do there, and why does this place appeal to you so much?",
    "Do you prefer relaxing beach vacations or active adventures in the city or mountains? Why?",
    "What is the most memorable trip you have ever taken, and what made it so special?",
    "If you could live in any country for a year, where would you go and what would you do?"
  ],
  "☕ 日常生活與習慣 (Daily Life)": [
    "Describe your perfect morning routine. How does it make you feel, and why is starting the day right important to you?",
    "How do you usually unwind after a long, stressful day? What activities help you relax?",
    "What is one healthy habit you have successfully built, and how has it changed your life?",
    "How do you balance your work or study life with your personal hobbies and free time?"
  ],
  "🎬 興趣與文化 (Hobbies & Culture)": [
    "What is a movie, book, or show that has deeply influenced you? What was it about, and what did you learn from it?",
    "What kind of music do you listen to when you need to focus, and how does it affect your mood?",
    "If you could meet any historical figure or celebrity, who would it be and what would you ask them?",
    "Do you enjoy visiting museums, art galleries, or going to concerts? Share your favorite memory."
  ],
  "default": [
    "What is your favorite hobby, and how did you first get into it?",
    "If you could have any superpower, what would it be and how would you use it?",
    "Describe a challenge you faced recently and how you overcame it.",
    "What is the best piece of advice you have ever received, and why did it stick with you?"
  ]
};

function getFallbackQuestion(topicName: string, currentQuestion: string): string {
  let list = FALLBACK_QUESTIONS[topicName];
  if (!list) {
    // Try substring matching
    const foundKey = Object.keys(FALLBACK_QUESTIONS).find(k => 
      topicName.toLowerCase().includes(k.replace(/[^\w\s\u4e00-\u9fa5]/g, '').trim().toLowerCase()) ||
      k.toLowerCase().includes(topicName.replace(/[^\w\s\u4e00-\u9fa5]/g, '').trim().toLowerCase())
    );
    list = foundKey ? FALLBACK_QUESTIONS[foundKey] : FALLBACK_QUESTIONS["default"];
  }
  
  const filtered = list.filter(q => q.trim().toLowerCase() !== (currentQuestion || "").trim().toLowerCase());
  if (filtered.length > 0) {
    return filtered[Math.floor(Math.random() * filtered.length)];
  }
  return list[Math.floor(Math.random() * list.length)] || "Could you tell me more about your background and interests?";
}

app.post("/api/generate-question", async (req, res) => {
  const { topic, currentQuestion, chatHistory } = req.body;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. Using high-quality fallback questions.");
      const fb = getFallbackQuestion(topic || "", currentQuestion || "");
      return res.json({ question: fb });
    }

    const client = getGeminiClient();

    let prompt = "";
    if (chatHistory && chatHistory.length > 0) {
      prompt = `You are an engaging English writing coach.
The user is having a conversation with you on the topic: "${topic || "general topic"}".
The user wants to skip or change the latest question you asked because they don't want to answer it.

Our conversation history is:
${JSON.stringify(chatHistory)}

Your previous question/response was: "${currentQuestion}".

Please generate an ALTERNATIVE follow-up question or coach message that is different from "${currentQuestion}".
It should:
1. Stay on the topic: "${topic}".
2. Continue the conversation flow naturally.
3. Ask a different question or focus on a different aspect of the topic so the user can easily answer it.
4. Keep it friendly, encouraging, and clear.
5. Limit to 30-50 words.

Output ONLY the raw text of your alternative response/question. Do not wrap in quotation marks, do not include markdown, explanations, or labels like "Coach:".`;
    } else {
      prompt = `You are an engaging English writing coach.
The user is starting a conversation practice on the topic: "${topic}".
The initial suggested question was: "${currentQuestion}".
The user does not want to answer this specific question.

Please generate an ALTERNATIVE opening question for this topic: "${topic}".
The new question must:
1. Be highly engaging and related to the topic.
2. Inspire the user to write a detailed answer (aiming for 30+ words).
3. Be clear and easy to understand for an English learner.
4. Limit to 30-50 words.

Output ONLY the raw text of your alternative question. Do not wrap in quotation marks, do not include markdown, explanations, or labels like "Coach:".`;
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const resultText = response.text?.trim();
    if (!resultText) {
      throw new Error("Empty response from Gemini");
    }

    res.json({ question: resultText });
  } catch (error: any) {
    console.error("Error generating question from Gemini:", error);
    try {
      const fb = getFallbackQuestion(topic || "", currentQuestion || "");
      res.json({ question: fb });
    } catch (fallbackError: any) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
