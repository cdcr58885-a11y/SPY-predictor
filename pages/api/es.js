// pages/api/es.js
// Fetches ES=F (S&P 500 futures) price - 23H trading, covers overnight

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/ES%3DF?range=1d&interval=5m&includePrePost=true";
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!r.ok) throw new Error(`Yahoo error: ${r.status}`);
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No ES data");

    const closes = (result.indicators.quote[0].close || []).filter(v => v != null);
    const price = closes[closes.length - 1];
    // Use previousClose from meta for accurate daily change
    const prevClose = result.meta?.chartPreviousClose || result.meta?.previousClose || closes[0];
    const change = parseFloat((price - prevClose).toFixed(2));
    const changePct = parseFloat(((change / prevClose) * 100).toFixed(2));

    return res.status(200).json({
      price: parseFloat(price.toFixed(2)),
      change,
      changePct,
      prevClose: parseFloat(prevClose.toFixed(2)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
