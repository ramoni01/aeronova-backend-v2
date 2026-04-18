export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { message } = await request.json();
      if (!message) {
        return Response.json({ reply: "No message provided", button: { type: "searching" } }, { headers: corsHeaders });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 150,
          messages: [
            { role: "system", content: "You are a luxury private jet concierge. Give short, premium answers. Focus on flights, routes, availability. Max 2 sentences." },
            { role: "user", content: message }
          ]
        })
      });

      const data = await response.json();
      const reply = data.choices[0].message.content;

      return Response.json({
        source: "openai",
        reply,
        button: { type: "searching" }
      }, { headers: corsHeaders });

    } catch(err) {
      return Response.json({
        reply: "Service temporarily unavailable",
        button: { type: "searching" }
      }, { headers: corsHeaders });
    }
  }
};
