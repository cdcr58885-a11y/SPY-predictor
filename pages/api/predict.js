// pages/api/predict.js
import { getAllMarketData } from "../../lib/marketData";
import { getClaudePrediction } from "../../lib/claudeAnalysis";

// Separate cache for SPY and SPX
const cache = { SPY: null, SPX: null };
const cacheTime = { SPY: 0, SPX: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ticker = req.query.ticker === "SPX" ? "SPX" : "SPY";
  const force  = req.query.force === "1";

  try {
    if (!force && cache[ticker] && Date.now() - cacheTime[ticker] < CACHE_TTL) {
      return res.status(200).json({ ...cache[ticker], cached: true });
    }

    const market = await getAllMarketData(ticker);
    const prediction = await getClaudePrediction(market);

    const result = { market, prediction, cached: false, generatedAt: new Date().toISOString() };
    cache[ticker] = result;
    cacheTime[ticker] = Date.now();

    return res.status(200).json(result);
  } catch (err) {
    console.error("predict error:", err);
    return res.status(500).json({ error: err.message });
  }
}
