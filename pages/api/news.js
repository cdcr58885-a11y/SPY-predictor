// pages/api/news.js
// Fetches real-time stock news + earnings date from Finnhub

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ticker = (req.query.ticker || "SPY").toUpperCase().trim();
  const apiKey = process.env.FINNHUB_API_KEY;

  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const newsTicker = ticker === "SPX" ? "SPY" : ticker;

    // Fetch news + earnings in parallel
    const [newsRes, earningsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${newsTicker}&from=${from}&to=${to}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${newsTicker}&token=${apiKey}`),
    ]);

    let news = [];
    if (newsRes.ok) {
      const data = await newsRes.json();
      news = data.slice(0, 5).map(item => ({
        id: item.id,
        headline: item.headline,
        summary: item.summary?.slice(0, 120) + (item.summary?.length > 120 ? "..." : ""),
        source: item.source,
        url: item.url,
        time: new Date(item.datetime * 1000).toLocaleString("en-US", {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        }),
      }));
    }

    // Next earnings date
    let nextEarnings = null;
    if (earningsRes.ok) {
      const eData = await earningsRes.json();
      const upcoming = (eData.earningsCalendar || [])
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (upcoming.length) {
        const e = upcoming[0];
        const daysUntil = Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24));
        nextEarnings = {
          date: e.date,
          daysUntil,
          epsEstimate: e.epsEstimate || null,
          quarter: e.quarter || null,
          year: e.year || null,
        };
      }
    }

    return res.status(200).json({ ticker, news, nextEarnings, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("news error:", err);
    return res.status(500).json({ error: err.message });
  }
}
