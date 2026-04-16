import OpenAI from "openai";

export default async function handler(req, res) {
  // Autoriser seulement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 🎯 Prompt optimisé pour ton business aviation
    const SYSTEM_PROMPT = `
You are a luxury private aviation concierge for AeroNova.

Rules:
- Speak in a premium, concise tone (max 2 sentences)
- Collect: departure city, destination, travel date
- Suggest best aircraft or route (Monaco, Cannes, Nice)
- Mention pricing: €8,000–€25,000+ depending on aircraft
- Mention empty legs (up to 75% savings when relevant)
- Encourage booking naturally
- Adapt language to the user (French, English, Arabic, Spanish)
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(history || []),
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: "Something went wrong"
    });
  }
}