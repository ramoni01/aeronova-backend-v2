export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        reply: "No message provided",
        source: "error"
      });
    }

    // TEMP RESPONSE (safe first deployment test)
    return res.status(200).json({
      source: "ok",
      reply: `Received: ${message}`
    });

  } catch (err) {
    return res.status(500).json({
      source: "error",
      reply: "Server error",
      details: err.message
    });
  }
}
