// pages/api/levels.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const ticker = (req.query.ticker || "SPY").toUpperCase().trim();
  try {
    const symbol = ticker === "SPX" ? "%5EGSPC" : ticker === "NDX" ? "%5EIXIC" : ticker;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d&includePrePost=false`;
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!r.ok) throw new Error(`Yahoo error: ${r.status}`);
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");
    const clean = arr => (arr || []).filter(v => v != null);
    const closes = clean(result.indicators.quote[0].close);
    const highs  = clean(result.indicators.quote[0].high);
    const lows   = clean(result.indicators.quote[0].low);
    const n = closes.length;
    const price = parseFloat(closes[n-1].toFixed(2));
    const prevH = parseFloat(highs[n-2].toFixed(2));
    const prevL = parseFloat(lows[n-2].toFixed(2));
    const prevC = parseFloat(closes[n-2].toFixed(2));
    // Pivot Points
    const PP  = parseFloat(((prevH+prevL+prevC)/3).toFixed(2));
    const rng = prevH - prevL;
    const R1  = parseFloat((2*PP-prevL).toFixed(2));
    const R2  = parseFloat((PP+rng).toFixed(2));
    const R3  = parseFloat((prevH+2*(PP-prevL)).toFixed(2));
    const S1  = parseFloat((2*PP-prevH).toFixed(2));
    const S2  = parseFloat((PP-rng).toFixed(2));
    const S3  = parseFloat((prevL-2*(prevH-PP)).toFixed(2));
    // Fibonacci Retracement — from 52W Low (swing low) up to 52W High (swing high), then retracing down
    const high52 = parseFloat(Math.max(...highs.slice(-252)).toFixed(2));
    const low52  = parseFloat(Math.min(...lows.slice(-252)).toFixed(2));
    const fibRange = high52 - low52;
    const fibLevels = [
      { label: "100%",  val: high52,                                              type: "resistance" },
      { label: "78.6%", val: parseFloat((high52 - 0.786*fibRange).toFixed(2)),   type: "resistance" },
      { label: "61.8%", val: parseFloat((high52 - 0.618*fibRange).toFixed(2)),   type: "resistance" },
      { label: "50.0%", val: parseFloat((high52 - 0.500*fibRange).toFixed(2)),   type: "pivot" },
      { label: "38.2%", val: parseFloat((high52 - 0.382*fibRange).toFixed(2)),   type: "support" },
      { label: "23.6%", val: parseFloat((high52 - 0.236*fibRange).toFixed(2)),   type: "support" },
      { label: "0%",    val: low52,                                               type: "support" },
    ].sort((a,b) => b.val - a.val);
    // Technical indicators
    const sma20  = parseFloat((closes.slice(-20).reduce((a,b)=>a+b,0)/20).toFixed(2));
    const sma50  = parseFloat((closes.slice(-50).reduce((a,b)=>a+b,0)/50).toFixed(2));
    const sma200 = closes.length>=200 ? parseFloat((closes.slice(-200).reduce((a,b)=>a+b,0)/200).toFixed(2)) : null;
    const high52 = parseFloat(Math.max(...highs.slice(-252)).toFixed(2));
    const low52  = parseFloat(Math.min(...lows.slice(-252)).toFixed(2));
    const high1m = parseFloat(Math.max(...highs.slice(-20)).toFixed(2));
    const low1m  = parseFloat(Math.min(...lows.slice(-20)).toFixed(2));
    // Bollinger Bands
    const bbSlice = closes.slice(-20);
    const bbMid   = bbSlice.reduce((a,b)=>a+b,0)/20;
    const bbStd   = Math.sqrt(bbSlice.reduce((a,b)=>a+Math.pow(b-bbMid,2),0)/20);
    const bbUpper = parseFloat((bbMid+2*bbStd).toFixed(2));
    const bbLower = parseFloat((bbMid-2*bbStd).toFixed(2));
    // AI prompt for technical levels
    const prompt = `You are a technical analyst. Identify key support and resistance for ${ticker}.
Current price: ${price}
20-day SMA: ${sma20}, 50-day SMA: ${sma50}${sma200?`, 200-day SMA: ${sma200}`:""}
Bollinger Upper: ${bbUpper}, Lower: ${bbLower}
52-week High: ${high52}, Low: ${low52}
1-month High: ${high1m}, Low: ${low1m}
Recent closes: ${closes.slice(-5).map(p=>p.toFixed(2)).join(", ")}
Respond ONLY with JSON, no markdown:
{"resistance":[{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"},{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"},{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"}],"support":[{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"},{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"},{"level":<number>,"strength":"STRONG|MODERATE|WEAK","note":"<5 words>"}],"summary":"<2 sentences>"}`;
    const models = ["llama-3.3-70b-versatile","llama-3.1-8b-instant","gemma2-9b-it"];
    let aiData = null;
    for (const model of models) {
      try {
        const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.GROQ_API_KEY}`},
          body: JSON.stringify({ model, max_tokens:600, temperature:0.2, messages:[{role:"user",content:prompt}] }),
        });
        if (!gr.ok) { if (gr.status===429) continue; throw new Error(`Groq ${gr.status}`); }
        const gd = await gr.json();
        aiData = JSON.parse(gd.choices[0].message.content.trim().replace(/```json|```/g,""));
        break;
      } catch(e) { if (e.message?.includes("429")) continue; throw e; }
    }
    const stdPivots = [
      {label:"R3",val:R3,type:"resistance"},{label:"R2",val:R2,type:"resistance"},{label:"R1",val:R1,type:"resistance"},
      {label:"PP",val:PP,type:"pivot"},
      {label:"S1",val:S1,type:"support"},{label:"S2",val:S2,type:"support"},{label:"S3",val:S3,type:"support"},
    ].sort((a,b)=>b.val-a.val);
    const fibPivots = fibLevels;
    return res.status(200).json({
      ticker, price, prevH, prevL, prevC, pp: PP,
      high52: parseFloat(Math.max(...highs.slice(-252)).toFixed(2)),
      low52:  parseFloat(Math.min(...lows.slice(-252)).toFixed(2)),
      technical: aiData,
      stdPivots,
      fibPivots: fibLevels,
      fetchedAt: new Date().toISOString(),
    });
  } catch(err) {
    console.error("levels error:", err);
    return res.status(500).json({ error: err.message });
  }
}
