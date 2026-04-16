export default async function handler(req, res) {
  try {
    return res.status(200).json({
      message: "TEST OK",
      apiKey: process.env.OPENAI_API_KEY ? "EXISTS" : "MISSING"
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
