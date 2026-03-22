// pages/api/news.js
// Fetches real-time stock news from Finnhub

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ticker = (req.query.ticker || "SPY").toUpperCase().trim();
  const apiKey = process.env.FINNHUB_API_KEY;

  try {
    // Get date range - today and 7 days ago
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Map SPX to SPY for news (SPX is index, no direct news)
    const newsTicker = ticker === "SPX" ? "SPY" : ticker;

    const url = `https://finnhub.io/api/v1/company-news?symbol=${newsTicker}&from=${from}&to=${to}&token=${apiKey}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });

    if (!r.ok) throw new Error(`Finnhub error: ${r.status}`);

    const data = await r.json();

    // Return top 5 most recent news
    const news = data.slice(0, 5).map(item => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary?.slice(0, 120) + (item.summary?.length > 120 ? "..." : ""),
      source: item.source,
      url: item.url,
      time: new Date(item.datetime * 1000).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      }),
      image: item.image || null,
    }));

    return res.status(200).json({ ticker, news, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("news error:", err);
    return res.status(500).json({ error: err.message });
  }
}
