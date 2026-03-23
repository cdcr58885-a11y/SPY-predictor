// pages/api/flow.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ticker = (req.query.ticker || "SPY").toUpperCase().trim();

  try {
    const symbol = ticker === "SPX" ? "%5EGSPC" : ticker === "NDX" ? "%5ENDX" : ticker;

    // Fetch intraday 5-min data
    const url5m = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m&includePrePost=false`;
    const r = await fetch(url5m, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!r.ok) throw new Error(`Yahoo error: ${r.status}`);
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");

    const clean = arr => (arr || []).filter(v => v != null);
    const timestamps = result.timestamp || [];
    const closes  = clean(result.indicators.quote[0].close);
    const volumes  = clean(result.indicators.quote[0].volume);
    const opens    = clean(result.indicators.quote[0].open);

    // Build bars
    const bars = timestamps.map((ts, i) => {
      const t = new Date(ts * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const v = volumes[i] ? parseFloat((volumes[i] / 1e6).toFixed(2)) : 0;
      const up = closes[i] >= (opens[i] || closes[i]);
      return { t, v, up };
    }).filter(b => b.v > 0);

    // Calculate OBV
    let obv = 0;
    let buyVol = 0, sellVol = 0;
    closes.forEach((c, i) => {
      if (i === 0) return;
      const v = volumes[i] || 0;
      if (c > closes[i-1]) { obv += v; buyVol += v; }
      else if (c < closes[i-1]) { obv -= v; sellVol += v; }
    });

    const totalVol = buyVol + sellVol;
    const buyPct = totalVol ? Math.round((buyVol / totalVol) * 100) : 50;
    const sellPct = 100 - buyPct;
    const obvM = parseFloat((obv / 1e6).toFixed(1));

    // Fetch 30-day average volume
    const url30d = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2mo&interval=1d`;
    const r30 = await fetch(url30d, { headers: { "User-Agent": "Mozilla/5.0" } });
    let avgVol = 0, todayVol = 0;
    if (r30.ok) {
      const d30 = await r30.json();
      const vols = clean(d30?.chart?.result?.[0]?.indicators?.quote?.[0]?.volume || []);
      avgVol = parseFloat((vols.slice(-30).reduce((a,b)=>a+b,0) / 30 / 1e6).toFixed(1));
      todayVol = parseFloat((volumes.reduce((a,b)=>a+(b||0),0) / 1e6).toFixed(1));
    }
    const volRatio = avgVol ? parseFloat((todayVol / avgVol).toFixed(2)) : 1;

    // Early vs late flow
    const midPoint = Math.floor(bars.length / 2);
    const earlyBars = bars.slice(0, midPoint);
    const lateBars  = bars.slice(midPoint);
    const earlyUp = earlyBars.filter(b => b.up).length > earlyBars.length / 2;
    const lateUp  = lateBars.filter(b => b.up).length > lateBars.length / 2;

    // Price divergence check
    const priceUp = closes[closes.length-1] > closes[0];
    const volDecline = volumes.slice(-5).reduce((a,b)=>a+(b||0),0) < volumes.slice(0,5).reduce((a,b)=>a+(b||0),0);
    const diverge = priceUp && volDecline;

    // Smart money signal
    const smartMoney = buyPct >= 52 ? "BUYING" : "SELLING";
    const smClr = smartMoney === "BUYING" ? "#4ade80" : "#db2777";

    // AI analysis
    const prompt = `You are a volume analyst. Analyze this intraday volume data for ${ticker}:
Buy volume: ${buyPct}%, Sell volume: ${sellPct}%
OBV today: ${obvM}M (${obvM >= 0 ? "positive" : "negative"})
Volume vs avg: ${volRatio}x
Early session flow: ${earlyUp ? "buying" : "selling"}
Late session flow: ${lateUp ? "buying" : "selling"}
Price/Volume divergence: ${diverge ? "yes - price up but volume declining" : "no"}
Smart money signal: ${smartMoney}

Respond ONLY with JSON:
{
  "signals": [
    {"label":"VOL / PRICE","value":"<CONFIRM|DIVERGE>","note":"<8 words max>","bullish":<true|false>},
    {"label":"OPEN FLOW","value":"<INFLOW|OUTFLOW>","note":"<8 words max>","bullish":<true|false>},
    {"label":"CLOSE FLOW","value":"<INFLOW|OUTFLOW|ACCELERATING>","note":"<8 words max>","bullish":<true|false>},
    {"label":"VOL vs AVG","value":"${volRatio}x","note":"<8 words max>","bullish":<true|false>}
  ],
  "conclusion":"<concise 5-7 word action bias>",
  "detail":"<2 sentences actionable insight>"
}`;

    const models = ["llama-3.3-70b-versatile","llama-3.1-8b-instant","gemma2-9b-it"];
    let aiData = null;
    for (const model of models) {
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
          body: JSON.stringify({ model, max_tokens:400, temperature:0.2, messages:[{role:"user",content:prompt}] }),
        });
        if (!gr.ok) { if (gr.status===429) continue; break; }
        const gd = await gr.json();
        aiData = JSON.parse(gd.choices[0].message.content.trim().replace(/```json|```/g,""));
        break;
      } catch(e) { if (e.message?.includes("429")) continue; break; }
    }

    return res.status(200).json({
      ticker, bars, obvM, buyPct, sellPct,
      todayVol, avgVol, volRatio,
      smartMoney, analysis: aiData,
      fetchedAt: new Date().toISOString(),
    });

  } catch(err) {
    console.error("flow error:", err);
    return res.status(500).json({ error: err.message });
  }
}
