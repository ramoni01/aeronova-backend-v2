import OpenAI from "openai";
import Parser from "rss-parser";

export const config = { runtime: "nodejs" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parser = new Parser();
const RSS_URL = "https://api.villiers.ai/feeds/empty-legs?id=UZYHLB.xml";

let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 1000;

const EVENTS = [
  { name: "Monaco Grand Prix",    keywords: ["monaco", "f1", "grand prix"] },
  { name: "Cannes Film Festival", keywords: ["cannes", "film festival"] },
  { name: "Davos (WEF)",          keywords: ["davos", "wef"] },
  { name: "World Cup",            keywords: ["world cup", "fifa", "football"] },
  { name: "Winter Olympics",      keywords: ["olympics", "cortina", "milano"] },
];

function detectEvent(message) {
  const msg = message.toLowerCase();
  return EVENTS.find(e => e.keywords.some(k => msg.includes(k))) || null;
}

function getRoutes(event) {
  if (!event) return [];
  switch (event.name) {
    case "Monaco Grand Prix":
    case "Cannes Film Festival":
      return ["London → Nice", "Paris → Nice", "Geneva → Nice"];
    case "Davos (WEF)":
      return ["London → Zurich", "Dubai → Zurich", "New York → Zurich"];
    case "World Cup":
      return ["New York → Miami", "Los Angeles → Dallas", "Toronto → Mexico City"];
    case "Winter Olympics":
      return ["London → Milan", "Paris → Venice", "Zurich → Milan"];
    default:
      return [];
  }
}

async function getRSS() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) return cache.data;
  try {
    const feed = await parser.parseURL(RSS_URL);
    cache = { data: feed.items || [], timestamp: now };
    return cache.data;
  } catch (err) {
    console.log("RSS fetch failed:", err.message);
    return cache.data || [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(200).json({
        source: "error",
        reply: "No message provided",
        button: { type: "searching" }
      });
    }

    const query = message.toLowerCase();
    const event = detectEvent(message);

    if (event) {
      const items = await getRSS();
      const match = items.find(item => {
        const title = (item.title || "").toLowerCase();
        const content = (item.content || "").toLowerCase();
        return title.includes(query) || content.includes(query);
      });

      if (match) {
        return res.status(200).json({
          source: "rss+event",
          reply: match.title || "Flight available",
          data: { title: match.title, link: match.link, description: match.contentSnippet || "" },
          button: { type: "book", url: match.link || "#" }
        });
      }

      const routes = getRoutes(event);
      return res.status(200).json({
        source: "event",
        reply: `Flights available for ${event.name}.\nPopular routes:\n- ${routes.join("\n- ")}`,
        button: { type: "searching" }
      });
    }

    const items = await getRSS();
    const match = items.find(item => {
      const title = (item.title || "").toLowerCase();
      const content = (item.content || "").toLowerCase();
      return title.includes(query) || content.includes(query);
    });

    if (match) {
      return res.status(200).json({
        source: "rss",
        reply: match.title || "Flight found",
        data: { title: match.title, link: match.link, description: match.contentSnippet || "" },
        button: { type: "book", url: match.link || "#" }
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a luxury private jet concierge. Give short, premium answers. Focus on flights, routes, availability. Max 2 sentences."
        },
        { role: "user", content: message }
      ]
    });

    return res.status(200).json({
      source: "openai",
      reply: completion.choices[0].message.content,
      button: { type: "searching" }
    });

  } catch (err) {
    console.error("FATAL ERROR:", err);
    return res.status(200).json({
      source: "error",
      reply: "Service temporarily unavailable",
      button: { type: "searching" }
    });
  }
}
 


   
 
