import OpenAI from "openai";
import Parser from "rss-parser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

// 🔴 YOUR RSS FEED
const RSS_URL = "https://api.villiers.ai/feeds/empty-legs?id=UZYHLB.xml";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        reply: "No message provided",
        source: "error",
        button: {
          text: "Searching availability",
          type: "searching"
        }
      });
    }

    const query = message.toLowerCase().trim();

    // ======================
    // 1️⃣ RSS SEARCH
    // ======================
    let rssMatch = null;

    try {
      const feed = await parser.parseURL(RSS_URL);

      rssMatch = feed.items.find(item => {
        const title = (item.title || "").toLowerCase();
        const content = (item.content || "").toLowerCase();

        return title.includes(query) || content.includes(query);
      });

    } catch (e) {
      console.log("RSS error:", e.message);
    }

    // ======================
    // 2️⃣ IF FOUND IN RSS
    // ======================
    if (rssMatch) {
      return res.status(200).json({
        source: "rss",
        reply: rssMatch.title || "Found in RSS",
        link: rssMatch.link || null,
        button: {
          text: "Book now",
          type: "book",
          url: rssMatch.link || "#"
        }
      });
    }

    // ======================
    // 3️⃣ FALLBACK OPENAI
    // ======================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for travel and flight queries."
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
        text: "Searching availability",
        type: "searching"
      }
    });

  } catch (err) {
    return res.status(500).json({
      source: "error",
      reply: "Server error",
      button: {
        text: "Searching availability",
        type: "searching"
      },
      details: err.message
    });
  }
}
