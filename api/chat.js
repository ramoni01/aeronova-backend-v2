import OpenAI from "openai";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, email, departure, destination } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 💰 Estimation prix simple
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
- Collect: departure city, destination, travel date, email
- Suggest best aircraft
- Include price estimation when available
- Encourage booking
`;

    // 🤖 OpenAI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + priceEstimate },
        ...(history || []),
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    // =========================
    // 📊 GOOGLE SHEETS SAVE
    // =========================
    await fetch("https://script.google.com/macros/s/AKfycbxavit4SMkqMPvw5EUgLYGjaqfKMjMuM5RVDxhcndM7DQRTicsUBonQNVGZJsGD6aoKfg/exec", {
      method: "POST",
      body: JSON.stringify({
        message,
        email: email || "",
        departure: departure || "",
        destination: destination || "",
        date: new Date().toISOString()
      })
    });

    // =========================
    // 📧 EMAIL AUTOMATIQUE
    // =========================
    if (email) {

      // 📩 EMAIL CLIENT
      await resend.emails.send({
        from: "AeroNova <onboarding@resend.dev>",
        to: email,
        subject: "Your Private Jet Request✈️",
        html: `
          <h2>Your request has been received</h2>
          <p>${reply}</p>
          <p><strong>Continue here:</strong></p>
          <a href="https://villiers.ai/?id=UZYHLB">
            View Aircraft Options
          </a>
          <p style="margin-top:20px;">AeroNova Concierge</p>
        `
      });

      // 📩 EMAIL TOI
      await resend.emails.send({
        from: "AeroNova <onboarding@resend.dev>",
        to: "contact@jetclassaccess.com",
        subject: "🔥 New Jet Lead",
        html: `
          <p><strong>Client:</strong> ${email}</p>
          <p><strong>Route:</strong> ${departure} → ${destination}</p>
          <p><strong>Message:</strong> ${message}</p>

          <p>
            👉 <a href="https://villiers.ai/?id=UZYHLB">
            Open via Villiers Affiliate
            </a>
          </p>
        `
      });
    }

    // ✅ Réponse finale au frontend
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API ERROR:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}
