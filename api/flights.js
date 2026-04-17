export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      message: "Flights API working"
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
