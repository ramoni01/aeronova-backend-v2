import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, email, departure, destination, date } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const SYSTEM_PROMPT = `
You are a luxury private aviation concierge for AeroNova.

Rules:
- Speak in a premium, concise tone (max 2 sentences)
- Collect: departure city, destination, travel date
- Suggest best aircraft
- Mention price estimate (€8,000–€25,000+)
- Mention empty legs when relevant
- Encourage booking via Villiers
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(history || []),
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    // 📧 EMAIL + 📊 GOOGLE SHEETS
    await fetch("https://script.google.com/macros/s/AKfycbxavit4SMkqMPvw5EUgLYGjaqfKMjMuM5RVDxhcndM7DQRTicsUBonQNVGZJsGD6aoKfg/exec", {
      method: "POST",
      body: JSON.stringify({
        email,
        departure,
        destination,
        date,
        message,
        reply,
        source: "AeroNova Landing Page",
        affiliate: "https://villiers.ai/?id=UZYHLB"
      })
    });

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
