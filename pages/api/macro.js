// pages/api/macro.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ── 1. ECONOMIC CALENDAR via Finnhub ──
    const today = new Date();
    const from = today.toISOString().split("T")[0];
    const to = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const calRes = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
      { headers: { "Accept": "application/json" } }
    );
    let calendar = [];
    if (calRes.ok) {
      const calData = await calRes.json();
      calendar = (calData.economicCalendar || [])
        .filter(e => ["United States"].includes(e.country))
        .filter(e => e.impact === "high" || e.impact === "medium")
        .slice(0, 10)
        .map(e => ({
          date: new Date(e.time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          day:  new Date(e.time * 1000).toLocaleDateString("en-US", { weekday: "short" }),
          event: e.event,
          impact: e.impact === "high" ? "HIGH" : "MEDIUM",
          forecast: e.estimate || "—",
          prev: e.prev || "—",
          actual: e.actual || null,
        }));
    }

    // ── 2. SECTOR ROTATION via Yahoo Finance ETFs ──
    const sectorETFs = [
      { name: "Technology",    symbol: "XLK" },
      { name: "Health Care",   symbol: "XLV" },
      { name: "Financials",    symbol: "XLF" },
      { name: "Industrials",   symbol: "XLI" },
      { name: "Consumer Disc", symbol: "XLY" },
      { name: "Energy",        symbol: "XLE" },
      { name: "Materials",     symbol: "XLB" },
      { name: "Utilities",     symbol: "XLU" },
      { name: "Real Estate",   symbol: "XLRE" },
      { name: "Comm Services", symbol: "XLC" },
      { name: "Staples",       symbol: "XLP" },
    ];

    const sectorData = await Promise.all(
      sectorETFs.map(async ({ name, symbol }) => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          const d = await r.json();
          const q = d?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = (q?.close || []).filter(v => v != null);
          const opens  = (q?.open  || []).filter(v => v != null);
          if (!closes.length) return { name, change: 0, changePct: 0 };
          const close = closes[closes.length - 1];
          const prev  = d?.chart?.result?.[0]?.meta?.chartPreviousClose || opens[0];
          const changePct = parseFloat(((close - prev) / prev * 100).toFixed(2));
          return { name, symbol, change: changePct, flow: changePct >= 0 ? "IN" : "OUT" };
        } catch { return { name, symbol, change: 0, flow: "—" }; }
      })
    );

    // ── 3. FED WATCH — use Groq AI to estimate probabilities ──
    const fedPrompt = `Based on current market conditions (March 2026), Fed Funds Rate at 4.25-4.50%, provide realistic Fed rate cut/hold/hike probabilities for upcoming FOMC meetings.
Respond ONLY with JSON, no markdown:
{"currentRate":"4.25-4.50%","meetings":[{"date":"May 07","cut":<0-100>,"hold":<0-100>,"hike":<0-100>},{"date":"Jun 18","cut":<0-100>,"hold":<0-100>,"hike":<0-100>},{"date":"Jul 30","cut":<0-100>,"hold":<0-100>,"hike":<0-100>},{"date":"Sep 17","cut":<0-100>,"hold":<0-100>,"hike":<0-100>}]}`;

    let fedWatch = null;
    const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"];
    for (const model of models) {
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, max_tokens: 300, temperature: 0.1, messages: [{ role: "user", content: fedPrompt }] }),
        });
        if (!gr.ok) { if (gr.status === 429) continue; break; }
        const gd = await gr.json();
        fedWatch = JSON.parse(gd.choices[0].message.content.trim().replace(/```json|```/g, ""));
        break;
      } catch(e) { if (e.message?.includes("429")) continue; break; }
    }

    return res.status(200).json({
      calendar,
      sectors: sectorData.sort((a, b) => b.change - a.change),
      fedWatch,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("macro error:", err);
    return res.status(500).json({ error: err.message });
  }
}
