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
- Maximum 1 sentence ONLY
- Maximum 20 words
- No extra details
- Use USD ($) only
- Give a quick price estimate ($8,000–$25,000+)
- Suggest aircraft briefly
- End with a short question
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 40,
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
