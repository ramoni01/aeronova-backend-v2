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
    // RSS SAFE BLOCK (NO CRASH)
    // =========================
    let match = null;

    try {
      const feed = await parser.parseURL(RSS_URL);

      match = feed?.items?.find(item => {
        const title = (item.title || "").toLowerCase();
        const content = (item.content || "").toLowerCase();
        return title.includes(query) || content.includes(query);
      });

    } catch (err) {
      console.log("RSS error (ignored):", err.message);
    }

    if (match) {
      return res.status(200).json({
        source: "rss",
        reply: match.title,
        link: match.link,
        button: {
          type: "book",
          url: match.link
        }
      });
    }

    // =========================
    // OPENAI FALLBACK (SAFE)
    // =========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a travel assistant. Be concise and helpful."
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
      button: { type: "searching" }
    });

  } catch (err) {
    console.error("CRASH:", err);

    return res.status(500).json({
      source: "error",
      reply: "Server error",
      details: err.message,
      button: { type: "searching" }
    });
  }
}
