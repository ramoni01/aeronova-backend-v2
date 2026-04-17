import OpenAI from "openai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, history = [], system } = req.body;

    if (!message) {
      return res.status(200).json({ reply: "No message provided" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      { role: "system", content: system || "You are a luxury private jet concierge." },
      ...history.slice(-10), // last 10 messages for context
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      messages
    });

    return res.status(200).json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({ reply: "Service temporarily unavailable" });
  }
}
