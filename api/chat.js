import OpenAI from "openai";

export default async function handler(req, res) {
  // Autoriser seulement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 🔥 PROMPT OPTIMISÉ (réponses courtes + conversion)
    const SYSTEM_PROMPT = `
You are a luxury private jet concierge.

STRICT RULES:
- Maximum 2 sentences ONLY
- No lists, no explanations
- Short, premium, direct answer
- Always include a price estimate (€8,000–€25,000+)
- Suggest aircraft briefly
- End with a question to push booking
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 60,
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
