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

    // 💰 estimation
    let priceEstimate = "";
    if (departure && destination) {
      priceEstimate = `
Estimated price:
€8,000 – €25,000+
Empty legs up to -75%
`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Luxury private jet concierge. Short premium answers."
        },
        ...(history || []),
        {
          role: "user",
          content: message + priceEstimate
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    // =========================
    // 📊 GOOGLE SHEETS (NON BLOQUANT)
    // =========================
    fetch("https://script.google.com/macros/s/AKfycbxavit4SMkqMPvw5EUgLYGjaqfKMjMuM5RVDxhcndM7DQRTicsUBonQNVGZJsGD6aoKfg/exec", {
      method: "POST",
      body: JSON.stringify({
        message,
        email,
        departure,
        destination,
        date: new Date().toISOString()
      })
    }).catch(err => console.log("Sheets error:", err));

    // =========================
    // 📧 EMAIL (NON BLOQUANT)
    // =========================
    if (email) {
      resend.emails.send({
        from: "AeroNova <onboarding@resend.dev>",
        to: email,
        subject: "Your Private Jet Request ✈️",
        html: `
          <h3>Your request</h3>
          <p>${reply}</p>
          <a href="https://villiers.ai/?id=UZYHLB">View options</a>
        `
      }).catch(err => console.log("Client email error:", err));

      resend.emails.send({
        from: "AeroNova <onboarding@resend.dev>",
        to: "ton@email.com",
        subject: "New Lead",
        html: `
          <p>${email}</p>
          <p>${departure} → ${destination}</p>
        `
      }).catch(err => console.log("Admin email error:", err));
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("GLOBAL ERROR:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}
