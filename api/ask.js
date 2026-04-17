import OpenAI from "openai";
import Parser from "rss-parser";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parser = new Parser();

// 🔴 PUT YOUR RSS FEED HERE
const RSS_URL = "https://your-rss-feed.com/rss.xml";

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
        source: "error",
        reply: "No message provided",
        button: { type: "searching" }
      });
    }

    const query = message.toLowerCase().trim();

    // =========================
    // 1️⃣ RSS FIRST (STRICT)
    // =========================
    try {
      const feed = await parser.parseURL(RSS_URL);

      const match = feed.items.find(item => {
        const title = (item.title || "").toLowerCase();
        const content = (item.content || "").toLowerCase();

        return title.includes(query) || content.includes(query);
      });

      if (match) {
        return res.status(200).json({
          source: "rss",
          reply: match.title || "Result found",
          link: match.link || "#",
          button: {
            type: "book",
            url: match.link || "#"
          }
        });
      }
    } catch (rssError) {
      console.log("RSS error:", rssError.message);
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
You are a travel assistant.

- Help users find flights and travel availability
- Be clear and concise
- Do not mention marketing events or promotions
- If no data is available, suggest checking availability
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
    return res.status(500).json({
      source: "error",
      reply: "Server error",
      button: { type: "searching" },
      details: err.message
    });
  }
}
