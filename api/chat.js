
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, finalData } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 🎯 PROMPT
    const SYSTEM_PROMPT = `
You are a luxury private aviation concierge for AeroNova.

Rules:
- Speak in a premium, concise tone (max 2 sentences)
- Collect: departure city, destination, travel date
- Suggest best aircraft or route (Monaco, Cannes, Nice)
- Mention pricing: €8,000–€25,000+
- Encourage booking naturally
`;

    // 💰 PRICE ESTIMATION
    function estimatePrice(from, to) {
      const routes = {
        "Paris-Nice": "€8,000 – €12,000",
        "Paris-Monaco": "€9,000 – €14,000",
        "London-Nice": "€10,000 – €16,000"
      };

      const key = `${from}-${to}`;
      return routes[key] || "€12,000 – €25,000";
    }

    let price = null;

    // 🧠 SI FINAL DATA (fin du chat)
    if (finalData) {
      price = estimatePrice(finalData.from, finalData.to);

      // 📊 GOOGLE SHEETS
      await fetch("https://script.google.com/macros/s/AKfycbxavit4SMkqMPvw5EUgLYGjaqfKMjMuM5RVDxhcndM7DQRTicsUBonQNVGZJsGD6aoKfg/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: finalData.from,
          to: finalData.to,
          passengers: finalData.passengers,
          email: finalData.email,
          price
        })
      });

      // 💬 réponse finale client
      return res.status(200).json({
        reply: `Estimated price: ${price}. Our concierge will contact you shortly.`,
        price
      });
    }

    // 🤖 OPENAI (chat normal)
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
      error: error.message
    });
  }
}
