import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, departure, destination } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 💰 Estimation simple (tu peux améliorer après)
    let priceEstimate = "";

    if (departure && destination) {
      priceEstimate = `
Estimated price:
- Light jet: €8,000 – €12,000
- Midsize jet: €12,000 – €18,000
- Heavy jet: €18,000 – €25,000+

Empty legs available (up to 75% discount).
`;
    }

    const SYSTEM_PROMPT = `
You are a luxury private aviation concierge for AeroNova.

Rules:
- Speak in a premium, concise tone (max 2 sentences)
- Collect: departure city, destination, travel date
- Suggest best aircraft
- Include price estimation when available
- Encourage booking
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // 💸 moins cher (important)
      messages: [
        { role: "system", content: SYSTEM_PROMPT + priceEstimate },
        ...(history || []),
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}
