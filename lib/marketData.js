// lib/marketData.js
// Fetches real market data from Yahoo Finance (no API key needed)

export async function fetchYahoo(symbol, range = "1mo", interval = "1d", prePost = false) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=${prePost}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
    next: { revalidate: 300 }, // cache 5 mins for pre/post market
  });
  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}: ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);
  return result;
}

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgG = gains / period, avgL = losses / period;
  if (avgL === 0) return 100;
  return parseFloat((100 - 100 / (1 + avgG / avgL)).toFixed(2));
}

export function calcSMA(arr, n) {
  const slice = arr.slice(-Math.min(n, arr.length));
  return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
}

export function calcEMA(arr, n) {
  const k = 2 / (n + 1);
  let ema = arr[0];
  for (let i = 1; i < arr.length; i++) ema = arr[i] * k + ema * (1 - k);
  return parseFloat(ema.toFixed(2));
}

export function calcMACD(closes) {
  if (closes.length < 26) return null;
  const ema12 = calcEMA(closes.slice(-26), 12);
  const ema26 = calcEMA(closes.slice(-26), 26);
  return parseFloat((ema12 - ema26).toFixed(3));
}

export function calcBollingerBands(closes, n = 20) {
  if (closes.length < n) return null;
  const slice = closes.slice(-n);
  const sma = slice.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / n);
  return {
    upper: parseFloat((sma + 2 * std).toFixed(2)),
    middle: parseFloat(sma.toFixed(2)),
    lower: parseFloat((sma - 2 * std).toFixed(2)),
  };
}

// ticker: any valid Yahoo Finance symbol e.g. "SPY", "SPX", "NVDA", "AAPL"
export async function getAllMarketData(ticker = "SPY") {
  const isSPX = ticker === "SPX";
  const symbolMap = { "SPX": "%5EGSPC", "VIX": "%5EVIX" };
  const mainSymbol = symbolMap[ticker] || ticker;
  // Enable pre/post market for ETFs and stocks (not for indices)
  const usePrePost = !isSPX && !ticker.startsWith("%5E");

  // Fetch historical data (3mo 1d) for technicals + recent 1d 1m for latest price
  const [mainData, recentData, vixData, tnxData, brentData] = await Promise.all([
    fetchYahoo(mainSymbol, "3mo", "1d", false),
    fetchYahoo(mainSymbol, "1d", "1m", usePrePost), // latest real-time price
    fetchYahoo("%5EVIX", "5d", "1d"),
    fetchYahoo("%5ETNX", "5d", "1d"),
    fetchYahoo("BZ%3DF", "5d", "1d"),
  ]);

  const clean = arr => (arr || []).filter(v => v !== null && v !== undefined);

  // Historical data for technicals
  const close = clean(mainData.indicators.quote[0].close);
  const open  = clean(mainData.indicators.quote[0].open);
  const high  = clean(mainData.indicators.quote[0].high);
  const low   = clean(mainData.indicators.quote[0].low);
  const vol   = clean(mainData.indicators.quote[0].volume || []);

  // Real-time price from 1m data (includes pre/post for ETFs)
  const recentClose = clean(recentData.indicators.quote[0].close);
  const recentHigh  = clean(recentData.indicators.quote[0].high);
  const recentLow   = clean(recentData.indicators.quote[0].low);
  const recentVol   = clean(recentData.indicators.quote[0].volume || []);

  const last   = arr => arr[arr.length - 1];
  const prev   = arr => arr[arr.length - 2];
  const chgPct = (a, b) => parseFloat(((a - b) / b * 100).toFixed(2));

  // Use latest 1m price as current price, previous day close for change
  const price     = recentClose.length ? parseFloat(last(recentClose).toFixed(2)) : parseFloat(last(close).toFixed(2));
  const prevPrice = parseFloat(last(close).toFixed(2)); // previous day close
  const change    = parseFloat((price - prevPrice).toFixed(2));
  const changePct = chgPct(price, prevPrice);

  // Today's OHLV from 1m data
  const todayOpen = recentData.meta?.chartPreviousClose || parseFloat(last(open).toFixed(2));
  const todayHigh = recentHigh.length ? parseFloat(Math.max(...recentHigh).toFixed(2)) : parseFloat(last(high).toFixed(2));
  const todayLow  = recentLow.length ? parseFloat(Math.min(...recentLow).toFixed(2)) : parseFloat(last(low).toFixed(2));
  const todayVol  = recentVol.length ? recentVol.reduce((a, b) => a + b, 0) : (vol.length ? last(vol) : null);

  const vixClose   = clean(vixData.indicators.quote[0].close);
  const tnxClose   = clean(tnxData.indicators.quote[0].close);
  const brentClose = clean(brentData.indicators.quote[0].close);

  const vix      = parseFloat(last(vixClose).toFixed(2));
  const vixPrev  = parseFloat(prev(vixClose).toFixed(2));
  const vixChg   = chgPct(vix, vixPrev);

  const tnx       = parseFloat(last(tnxClose).toFixed(2));
  const brent     = parseFloat(last(brentClose).toFixed(2));
  const brentPrev = parseFloat(prev(brentClose).toFixed(2));
  const brentChg  = chgPct(brent, brentPrev);

  const rsi  = calcRSI(close);
  const sma20 = calcSMA(close, 20);
  const sma50 = calcSMA(close, 50);
  const macd  = calcMACD(close);
  const bb    = calcBollingerBands(close);

  return {
    ticker,
    price, prevPrice, change, changePct,
    open:   todayOpen,
    high:   todayHigh,
    low:    todayLow,
    volume: todayVol,
    vix, vixChg, tnx, brent, brentChg,
    rsi, sma20, sma50, macd, bb,
    aboveSma20: price > sma20,
    aboveSma50: price > sma50,
    // Use intraday 1m prices for sparkline (real intraday chart shape)
    sparkPrices: recentClose.length >= 5
      ? recentClose.map(p => parseFloat(p.toFixed(2)))
      : close.slice(-20).map(p => parseFloat(p.toFixed(2))),
    recentCloses: close.slice(-10).map(p => parseFloat(p.toFixed(2))),
    fetchedAt: new Date().toISOString(),
  };
}
