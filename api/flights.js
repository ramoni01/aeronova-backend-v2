export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.villiers.ai/feeds/empty-legs?id=UZYHLB");
    const xml = await response.text();

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xml);

  } catch (error) {
    console.error("Flights API error:", error);
    res.status(500).json({ error: "Failed to fetch flights" });
  }
}
