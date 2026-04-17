import OpenAI from "openai";
import Parser from "rss-parser";

export const config = {
  runtime: "nodejs"
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

const RSS_URL = "https://api.villiers.ai/feeds/empty-legs?id=UZYHLB.xml";

// simple in-memory cache (works in serverless warm instances)
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_TTL = 60 * 1000; // 1 minute

async function getRSS() {
  const now = Date.now();

  // ✅ use cache if fresh
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const feed = await parser.parseURL(RSS_URL);

    cache = {
      data: feed.items || [],
      timestamp: now
    };

    return cache.data;
  } catch (err) {
    console.log("RSS fetch failed:", err.message);
    return cache.data || [];
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const { message } = req.body || {};

    if (!message) {
      return res.status(200).json({
        source: "error",
        reply: "No message provided",
        button: { type: "searching" }
      });
    }

    const query = message.toLowerCase();

    // =========================
    // 1️⃣ RSS (FAST + CACHED)
    // =========================
    const items = await getRSS();

    const match = items.find(item => {
      const title = (item.title || "").toLowerCase();
      const content = (item.content || "").toLowerCase();
      return title.includes(query) || content.includes(query);
    });

    if (match) {
      return res.status(200).json({
        source: "rss",
        reply: match.title || "Flight found",
        data: {
          title: match.title,
          link: match.link,
          description: match.contentSnippet || ""
        },
        button: {
          type: "book",
          url: match.link || "#"
        }
      });
    }

    // =========================
    // 2️⃣ OPENAI FALLBACK
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a flight assistant.

Return short, structured, useful answers.
Do not mention marketing events.
Focus on flights, private jets, availability.
          `.trim()
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return res.status(200).json({
      source: "openai",
      reply: completion.choices[0].message.content,
      button: {
        type: "searching"
      }
    });

  } catch (err) {
    console.error("FATAL ERROR:", err);

    return res.status(200).json({
      source: "error",
      reply: "Service temporarily unavailable",
      button: { type: "searching" },
      debug: err.message
    });
  }
}
