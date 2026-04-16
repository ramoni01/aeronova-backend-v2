import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const SYSTEM_PROMPT = `
You are a luxury private jet concierge.

STRICT RULES:
- Max 8 words
- 1 sentence only
- Use USD ($)
- No verbs like "starts at", "is", "offers"
- Format: Route + price + short question
- Example: "Paris–Nice $9,000 — fly when?"
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 20,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}
