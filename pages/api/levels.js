// pages/api/levels.js
// AI-calculated support and resistance levels based on technical data

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ticker = (req.query.ticker || "SPY").toUpperCase().trim();

  try {
    // Fetch price data from Yahoo Finance
    const symbol = ticker === "SPX" ? "%5EGSPC" : ticker;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!r.ok) throw new Error(`Yahoo error: ${r.status}`);
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");

    const closes = (result.indicators.quote[0].close || []).filter(v => v != null);
    const highs  = (result.indicators.quote[0].high  || []).filter(v => v != null);
    const lows   = (result.indicators.quote[0].low   || []).filter(v => v != null);

    const last = arr => arr[arr.length - 1];
    const price = parseFloat(last(closes).toFixed(2));

    // Calculate key technical levels
    const sma20 = parseFloat((closes.slice(-20).reduce((a, b) => a + b, 0) / 20).toFixed(2));
    const sma50 = parseFloat((closes.slice(-50).reduce((a, b) => a + b, 0) / 50).toFixed(2));
    const sma200 = closes.length >= 200
      ? parseFloat((closes.slice(-200).reduce((a, b) => a + b, 0) / 200).toFixed(2))
      : null;

    const high52w = parseFloat(Math.max(...highs.slice(-252)).toFixed(2));
    const low52w  = parseFloat(Math.min(...lows.slice(-252)).toFixed(2));
    const high1m  = parseFloat(Math.max(...highs.slice(-20)).toFixed(2));
    const low1m   = parseFloat(Math.min(...lows.slice(-20)).toFixed(2));

    // Ask AI to identify key levels
    const prompt = `You are a technical analyst. Given this data for ${ticker}:
Current price: ${price}
20-day SMA: ${sma20}
50-day SMA: ${sma50}
200-day SMA: ${sma200 || "N/A"}
52-week high: ${high52w}
52-week low: ${low52w}
1-month high: ${high1m}
1-month low: ${low1m}
Recent closes (last 10): ${closes.slice(-10).map(p => p.toFixed(2)).join(", ")}

Identify the 3 most important resistance levels ABOVE current price and 3 most important support levels BELOW current price.

Respond ONLY with valid JSON, no markdown:
{
  "price": ${price},
  "resistance": [
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"},
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"},
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"}
  ],
  "support": [
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"},
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"},
    {"level": <number>, "strength": "STRONG|MODERATE|WEAK", "note": "<brief reason 5 words max>"}
  ],
  "summary": "<2 sentences technical outlook>"
}`;

    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    let levelsData = null;

    for (const model of models) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, max_tokens: 600, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
        });
        if (!groqRes.ok) { if (groqRes.status === 429) continue; throw new Error(`Groq error: ${groqRes.status}`); }
        const groqData = await groqRes.json();
        const text = groqData.choices[0].message.content.trim().replace(/```json|```/g, "");
        levelsData = JSON.parse(text);
        break;
      } catch (e) { if (e.message?.includes("429")) continue; throw e; }
    }

    if (!levelsData) throw new Error("All models failed");

    return res.status(200).json({ ticker, ...levelsData, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("levels error:", err);
    return res.status(500).json({ error: err.message });
  }
}
