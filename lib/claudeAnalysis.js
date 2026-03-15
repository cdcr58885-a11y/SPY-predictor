// lib/claudeAnalysis.js
// Uses Groq API (free) for market analysis

export async function getClaudePrediction(marketData) {
  const {
    price, change, changePct,
    open, high, low, volume,
    vix, vixChg,
    tnx,
    brent, brentChg,
    rsi, sma20, sma50, macd, bb,
    aboveSma20, aboveSma50,
    recentCloses,
    ticker,
  } = marketData;

  const prompt = `You are a senior quantitative analyst. Analyze the following real-time market data and predict ${ticker || "SPY"}'s NEXT trading session direction.

=== CURRENT ${ticker || "SPY"} DATA ===
Price:  ${price}  (${change >= 0 ? "+" : ""}${change}, ${changePct >= 0 ? "+" : ""}${changePct}%)
Open:   ${open}   High: ${high}   Low: ${low}
${volume ? `Volume: ${(volume / 1e6).toFixed(1)}M` : "Volume: N/A (index)"}

=== TECHNICAL INDICATORS ===
RSI(14):        ${rsi ?? "N/A"}  ${rsi < 30 ? "→ OVERSOLD" : rsi > 70 ? "→ OVERBOUGHT" : "→ NEUTRAL"}
SMA20:          ${sma20}  →  Price is ${aboveSma20 ? "ABOVE ✓" : "BELOW ✗"}
SMA50:          ${sma50}  →  Price is ${aboveSma50 ? "ABOVE ✓" : "BELOW ✗"}
MACD:           ${macd ?? "N/A"}  ${macd > 0 ? "→ BULLISH" : "→ BEARISH"}
Bollinger Upper: ${bb?.upper ?? "N/A"}
Bollinger Lower: ${bb?.lower ?? "N/A"}
BB Position:    ${bb ? (price > bb.upper ? "ABOVE UPPER (overbought)" : price < bb.lower ? "BELOW LOWER (oversold)" : "INSIDE BANDS") : "N/A"}

=== MACRO ENVIRONMENT ===
VIX Fear Index: ${vix}  (${vixChg >= 0 ? "+" : ""}${vixChg}% today)  ${vix > 30 ? "→ HIGH FEAR" : vix > 20 ? "→ ELEVATED" : "→ CALM"}
10Y Treasury:   ${tnx}%
Brent Crude:    ${brent}  (${brentChg >= 0 ? "+" : ""}${brentChg}% today)

=== RECENT PRICE ACTION ===
Last 10 closes (oldest→newest): ${recentCloses.join(", ")}
Trend: ${recentCloses[recentCloses.length-1] > recentCloses[0] ? "UP" : "DOWN"} over period

Respond ONLY with a valid JSON object. No markdown, no explanation, no code fences:
{
  "direction": "BULLISH" | "LEAN BULLISH" | "NEUTRAL" | "LEAN BEARISH" | "BEARISH",
  "confidence": <integer 51-89>,
  "targetLow": <number>,
  "targetHigh": <number>,
  "expectedMoveMin": <number, e.g. -1.5>,
  "expectedMoveMax": <number, e.g. 0.3>,
  "summary": "<2 crisp sentences explaining the call>",
  "signals": [
    {"name": "RSI", "value": "<e.g. 28.4 oversold>", "signal": "BULLISH|BEARISH|NEUTRAL"},
    {"name": "MACD", "value": "<e.g. -0.82 bearish>", "signal": "BULLISH|BEARISH|NEUTRAL"},
    {"name": "SMA TREND", "value": "<above/below sma20/50>", "signal": "BULLISH|BEARISH|NEUTRAL"},
    {"name": "BOLLINGER", "value": "<position>", "signal": "BULLISH|BEARISH|NEUTRAL"},
    {"name": "VIX FEAR", "value": "<e.g. 27.3 elevated>", "signal": "BULLISH|BEARISH|NEUTRAL"},
    {"name": "MOMENTUM", "value": "<price action summary>", "signal": "BULLISH|BEARISH|NEUTRAL"}
  ],
  "macroNotes": [
    {"title": "RATES", "text": "<1 sentence on yields impact>"},
    {"title": "VOLATILITY", "text": "<1 sentence on VIX context>"},
    {"title": "CRUDE OIL", "text": "<1 sentence on crude impact>"}
  ],
  "sentiment": {
    "bullPct": <0-100>,
    "bearPct": <0-100>,
    "neutralPct": <0-100>
  }
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1200,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

