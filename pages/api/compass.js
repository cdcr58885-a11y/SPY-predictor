// pages/api/compass.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { raw, currentPrice, ticker } = req.body;
  if (!raw) return res.status(400).json({ error: "No data provided" });

  const prompt = `You are an expert market structure analyst. Analyze the following market data and identify key levels, inflection points, and directional bias.

Current ${ticker || "SPX"} price: ${currentPrice}

Market structure data:
${raw}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "currentPrice": ${currentPrice},
  "nearestExpiry": "<closest date in the data>",
  "bias": "BULLISH" | "LEAN BULLISH" | "NEUTRAL" | "LEAN BEARISH" | "BEARISH",
  "trigger": <key acceleration level number>,
  "bounceTargets": [<first target number>, <second target number>],
  "pivotZones": [
    {"level": <number>, "type": "support|resistance", "strength": "strong|moderate"},
    {"level": <number>, "type": "support|resistance", "strength": "strong|moderate"},
    {"level": <number>, "type": "support|resistance", "strength": "strong|moderate"},
    {"level": <number>, "type": "support|resistance", "strength": "strong|moderate"},
    {"level": <number>, "type": "support|resistance", "strength": "strong|moderate"}
  ],
  "keyDates": [
    {"date": "<short date>", "reason": "<neutral technical description, no options terminology>"},
    {"date": "<short date>", "reason": "<neutral technical description, no options terminology>"},
    {"date": "<short date>", "reason": "<neutral technical description, no options terminology>"}
  ],
  "summary": "<3 sentences using only technical analysis language, no options terminology like put wall, call wall, gamma, GEX, opex, 0DTE, dealer, max pain>"
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1000,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim().replace(/```json|```/g, "");
    const result = JSON.parse(text);
    return res.status(200).json(result);
  } catch (err) {
    console.error("compass error:", err);
    return res.status(500).json({ error: err.message });
  }
}
