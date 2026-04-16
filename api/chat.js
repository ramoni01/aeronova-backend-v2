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
Speak in a premium, concise tone.
`;

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
    // 📊 GOOGLE SHEETS (SAFE)
    // =========================
    try {
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
    } catch (err) {
      console.log("Sheets error:", err.message);
    }

    // =========================
    // 📧 EMAIL (SAFE)
    // =========================
    if (email) {
      try {
        await resend.emails.send({
          from: "AeroNova <onboarding@resend.dev>",
          to: email,
          subject: "Your Private Jet Request ✈️",
          html: `<p>${reply}</p>
                 <a href="https://villiers.ai/?id=UZYHLB">View Aircraft</a>`
        });

        await resend.emails.send({
          from: "AeroNova <onboarding@resend.dev>",
          to: "ton@email.com",
          subject: "New Lead",
          html: `<p>${email} - ${departure} → ${destination}</p>`
        });

      } catch (err) {
        console.log("Email error:", err.message);
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("GLOBAL ERROR:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}
