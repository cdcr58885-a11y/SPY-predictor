// pages/index.js
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const JB = "'JetBrains Mono', monospace";
const RJ = "'Rajdhani', sans-serif";

/* ─── Sparkline ─── */
function Spark({ prices = [], change = 0 }) {
  const W = 200, H = 52;
  if (prices.length < 2) return <svg width="100%" height={H} />;
  const mn = Math.min(...prices), mx = Math.max(...prices), rng = mx - mn || 1;
  const xs = prices.map((_, i) => (i / (prices.length - 1)) * W);
  const ys = prices.map(v => H - ((v - mn) / rng) * (H - 6) - 3);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = line + ` L${W},${H} L0,${H} Z`;
  const clr = change >= 0 ? "#4ade80" : "#db2777";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={clr} stopOpacity=".25" />
          <stop offset="100%" stopColor={clr} stopOpacity="0" />
        </linearGradient>
        <clipPath id="spark-clip"><rect x="0" y="0" width={W} height={H} /></clipPath>
      </defs>
      <g clipPath="url(#spark-clip)">
        <path d={area} fill="url(#sg)" />
        <path d={line} fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ─── Needle Meter ─── */
function NeedleMeter({ direction = "NEUTRAL", confidence = 50 }) {
  const dirMap = { "BEARISH": 10, "LEAN BEARISH": 30, "NEUTRAL": 50, "LEAN BULLISH": 70, "BULLISH": 90 };
  const val = dirMap[direction] ?? 50;
  const zones = [
    { from: 0,  to: 20,  activeColor: "#ef4444", dimColor: "#2d0808", label: ["EXTREME", "BEARISH"] },
    { from: 20, to: 40,  activeColor: "#f87171", dimColor: "#1a0d0d", label: ["LEAN", "BEARISH"] },
    { from: 40, to: 60,  activeColor: "#facc15", dimColor: "#1a1a05", label: ["NEUTRAL"] },
    { from: 60, to: 80,  activeColor: "#4ade80", dimColor: "#0a1a0d", label: ["LEAN", "BULLISH"] },
    { from: 80, to: 100, activeColor: "#22c55e", dimColor: "#052e10", label: ["EXTREME", "BULLISH"] },
  ];
  const cx = 160, cy = 148, Ro = 118, Ri = 72;
  const toRad = deg => deg * Math.PI / 180;
  const valToAngle = v => 180 - (v / 100) * 180;
  const arcPath = (f, t, ro, ri) => {
    const g = 1.5;
    const a1 = toRad(valToAngle(t) + g), a2 = toRad(valToAngle(f) - g);
    const x1 = cx + ro * Math.cos(a1), y1 = cy - ro * Math.sin(a1);
    const x2 = cx + ro * Math.cos(a2), y2 = cy - ro * Math.sin(a2);
    const x3 = cx + ri * Math.cos(a2), y3 = cy - ri * Math.sin(a2);
    const x4 = cx + ri * Math.cos(a1), y4 = cy - ri * Math.sin(a1);
    return `M${x1},${y1} A${ro},${ro} 0 0,0 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,1 ${x4},${y4} Z`;
  };
  const nAngle = toRad(valToAngle(val));
  const nx = cx + (Ri - 6) * Math.cos(nAngle), ny = cy - (Ri - 6) * Math.sin(nAngle);
  const activeZone = zones.find(z => val >= z.from && val < z.to) || zones[4];
  const labelPos = (f, t) => {
    const a = toRad(valToAngle((f + t) / 2));
    return { x: cx + (Ro + 20) * Math.cos(a), y: cy - (Ro + 20) * Math.sin(a) };
  };
  const dirColor = activeZone.activeColor;
  const parts = direction.split(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="320" height="175" style={{ overflow: "visible" }}>
        {zones.map((z, i) => {
          const isActive = val >= z.from && val < z.to || (val === 100 && i === 4);
          return <path key={i} d={arcPath(z.from, z.to, Ro, Ri)} fill={isActive ? z.activeColor : z.dimColor} stroke="#080d0a" strokeWidth="1.5" />;
        })}
        {zones.map((z, i) => {
          const pos = labelPos(z.from, z.to);
          const isActive = val >= z.from && val < z.to || (val === 100 && i === 4);
          return (
            <text key={i} textAnchor="middle" fontSize="8" fontFamily={JB} letterSpacing="0.04em"
              fill={isActive ? z.activeColor : "#1a3d22"} fontWeight={isActive ? "bold" : "normal"}>
              {z.label.map((line, li) => (
                <tspan key={li} x={pos.x} y={li === 0 ? (z.label.length > 1 ? pos.y - 5 : pos.y) : pos.y + 9}>{line}</tspan>
              ))}
            </text>
          );
        })}
        {[0, 25, 50, 75, 100].map(v => {
          const a = toRad(valToAngle(v));
          const x1 = cx + (Ri - 2) * Math.cos(a), y1 = cy - (Ri - 2) * Math.sin(a);
          const x2 = cx + (Ri + 4) * Math.cos(a), y2 = cy - (Ri + 4) * Math.sin(a);
          const tx = cx + (Ri - 14) * Math.cos(a), ty = cy - (Ri - 14) * Math.sin(a);
          return (
            <g key={v}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a3d22" strokeWidth="1.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#1a3d22" fontSize="7" fontFamily={JB}>{v}</text>
            </g>
          );
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#eef2f8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="8" fill="#0d1610" stroke="#1a3d22" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="3.5" fill={activeZone.activeColor} />
      </svg>
      <div style={{ textAlign: "center", marginTop: -12 }}>
        {parts.length > 1 ? (
          <>
            <div style={{ fontFamily: RJ, fontSize: 38, fontWeight: 700, color: dirColor, letterSpacing: ".07em", lineHeight: 1 }}>{parts[0]}</div>
            <div style={{ fontFamily: RJ, fontSize: 38, fontWeight: 700, color: dirColor, letterSpacing: ".07em", lineHeight: 1 }}>{parts[1]}</div>
          </>
        ) : (
          <div style={{ fontFamily: RJ, fontSize: 42, fontWeight: 700, color: dirColor, letterSpacing: ".07em" }}>{direction}</div>
        )}
        <div style={{ fontFamily: JB, fontSize: 13, color: "#166534", marginTop: 5 }}>{confidence}% confidence</div>
      </div>
    </div>
  );
}

/* ─── Clock ─── */
function Clock() {
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(new Date());
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return <div style={{ width: 170 }} />;
  const p = n => String(n).padStart(2, "0");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = t.getHours();
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: JB, fontSize: 13, color: "#166534", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
        {days[t.getDay()]}, {months[t.getMonth()]} {t.getDate()}, {t.getFullYear()}
      </div>
      <div style={{ fontFamily: JB, fontSize: 20, color: "#facc15", letterSpacing: ".02em", marginTop: 3, whiteSpace: "nowrap" }}>
        {p(h)}:{p(t.getMinutes())}:{p(t.getSeconds())} {h < 12 ? "AM" : "PM"}
      </div>
    </div>
  );
}

/* ─── Signal Badge ─── */
function SigBadge({ value }) {
  const v = (value || "").toUpperCase();
  const color = v.includes("BULL") || v.includes("BUY") ? "#4ade80"
    : v.includes("BEAR") || v.includes("SELL") ? "#f87171" : "#facc15";
  return <span style={{ fontFamily: JB, fontSize: 13, fontWeight: 700, color }}>{value}</span>;
}

/* ─── Bar ─── */
function Bar({ pct, color }) {
  return (
    <div style={{ background: "#052e16", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .8s" }} />
    </div>
  );
}

const card = { background: "#0d1610", border: "1px solid #1a3d22", borderRadius: 18, boxShadow: "0 2px 16px rgba(34,197,94,0.05)" };

export default function Home() {
  const [tab, setTab] = useState("Prediction");
  const [ticker, setTicker] = useState("SPX");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState("LOADING DATA...");

  // Compass state
  const [compassRaw, setCompassRaw] = useState(() => {
    try { return localStorage.getItem("compass_raw") || ""; } catch { return ""; }
  });
  const [compassResult, setCompassResult] = useState(() => {
    try { const s = localStorage.getItem("compass_result"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [compassLoading, setCompassLoading] = useState(false);
  const [showCompassInput, setShowCompassInput] = useState(false);
  const [compassTicker, setCompassTicker] = useState("");
  const [openSec, setOpenSec] = useState({ tech: true, pp: true, fib: true });
  const [showStocks, setShowStocks] = useState(false);

  // News and Levels state for individual stocks
  const [newsData, setNewsData] = useState(null);
  const [levelsData, setLevelsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [levelsLoading, setLevelsLoading] = useState(false);

  const [fromDropdown, setFromDropdown] = useState(false);
  const isIndex = ticker === "SPX" && !fromDropdown; // prediction UI only for direct SPX button
  const showLevels = true; // All tickers show levels

  // Load news and levels when switching ticker
  useEffect(() => {
    setNewsData(null);
    setLevelsData(null);
    if (!isIndex) {
      setNewsLoading(true);
      fetch(`/api/news?ticker=${ticker}`)
        .then(r => r.json()).then(d => setNewsData(d)).catch(() => {})
        .finally(() => setNewsLoading(false));
    }
    setLevelsLoading(true);
    fetch(`/api/levels?ticker=${ticker}`)
      .then(r => r.json()).then(d => setLevelsData(d)).catch(() => {})
      .finally(() => setLevelsLoading(false));
  }, [ticker, isIndex]);

  const load = useCallback(async (force = false, t = null) => {
    const activeTicker = t || ticker;
    setLoading(true); setError("");
    setStep("FETCHING MARKET DATA...");
    try {
      const params = new URLSearchParams({ ticker: activeTicker });
      if (force) params.set("force", "1");
      const res = await fetch(`/api/predict?${params}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "API error"); }
      setStep("RUNNING AI ANALYSIS...");
      const json = await res.json();
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setStep(""); }
  }, [ticker]);

  const analyzeCompass = async () => {
    if (!compassRaw.trim() || !compassTicker.trim()) return;
    setCompassLoading(true);
    try {
      // Fetch real price for the compass ticker
      const priceRes = await fetch(`/api/predict?ticker=${compassTicker.trim()}`);
      const priceData = await priceRes.json();
      const currentPrice = priceData?.market?.price || 0;

      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: compassRaw, currentPrice, ticker: compassTicker.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const resultWithMeta = { ...json, compassTicker: compassTicker.trim(), currentPrice };
      setCompassResult(resultWithMeta);
      try {
        localStorage.setItem("compass_result", JSON.stringify(resultWithMeta));
        localStorage.setItem("compass_raw", compassRaw);
        localStorage.setItem("compass_ticker", compassTicker.trim());
      } catch {}
      setShowCompassInput(false);
    } catch (e) { alert("Analysis failed: " + e.message); }
    finally { setCompassLoading(false); }
  };

  useEffect(() => { load(); }, [load]);

  const switchTicker = (t, fromDrop = false) => {
    setTicker(t);
    setData(null);
    setFromDropdown(fromDrop);
    setTab(t === "SPX" && !fromDrop ? "Prediction" : "News");
    load(false, t);
  };

  const [searchInput, setSearchInput] = useState("");
  const [esPrice, setEsPrice] = useState(null);
  const [esChange, setEsChange] = useState(0);

  // Fetch ES=F futures price for 24H reference
  useEffect(() => {
    const fetchES = async () => {
      try {
        const res = await fetch("/api/es");
        const json = await res.json();
        if (json?.price) { setEsPrice(json.price); setEsChange(json.change || 0); }
      } catch {}
    };
    fetchES();
    const id = setInterval(fetchES, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const handleSearch = (e) => {
    if (e.key === "Enter" && searchInput.trim()) {
      const t = searchInput.trim().toUpperCase();
      setSearchInput("");
      switchTicker(t, true);
    }
  };

  const m = data?.market;
  const p = data?.prediction;
  const fmtPrice = v => v != null ? (ticker === "SPX" ? v.toFixed(2) : "$" + v.toFixed(2)) : "—";
  const fmtVol = v => v ? (v / 1e6).toFixed(1) + "M" : "—";

  return (
    <>
      <Head>
        <title>{ticker} Daily Predictor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ background: "#080d0a", minHeight: "100vh", fontFamily: RJ, display: "flex", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 11 }}>

          {/* TOGGLE + STOCKS DROPDOWN + SEARCH */}
          <div style={{ ...card, padding: 5 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 4 }}>
              {/* SPX button with ES */}
              <button onClick={() => { switchTicker("SPX", false); setShowStocks(false); }} style={{
                padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
                fontFamily: JB, fontSize: 15, fontWeight: 700, letterSpacing: ".12em", transition: "all .2s",
                background: ticker === "SPX" ? "#052e16" : "transparent",
                color: ticker === "SPX" ? "#4ade80" : "#1a5c2a",
                boxShadow: ticker === "SPX" ? "0 0 12px rgba(34,197,94,0.2)" : "none",
              }}>
                {esPrice ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <span>SPX <span style={{ fontSize: 9, opacity: .6 }}>INDEX</span></span>
                    <span style={{ fontSize: 13, color: esChange >= 0 ? "#4ade80" : "#db2777", fontWeight: 600 }}>ES {esPrice.toFixed(0)}</span>
                  </div>
                ) : (
                  <span>SPX <span style={{ fontSize: 9, opacity: .6 }}>INDEX</span></span>
                )}
              </button>

              {/* STOCKS dropdown button */}
              <button onClick={() => setShowStocks(!showStocks)} style={{
                padding: "10px 12px", border: "none", borderRadius: 10, cursor: "pointer",
                fontFamily: JB, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", transition: "all .2s",
                background: ticker !== "SPX" ? "#052e16" : showStocks ? "#0a1f0e" : "transparent",
                color: ticker !== "SPX" ? "#4ade80" : showStocks ? "#4ade80" : "#1a5c2a",
                boxShadow: ticker !== "SPX" ? "0 0 12px rgba(34,197,94,0.2)" : "none",
                display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
              }}>
                {ticker !== "SPX" ? ticker : "STOCKS"}
                <span style={{ fontSize: 8, transform: showStocks ? "rotate(180deg)" : "none", transition: ".2s", display: "inline-block", color: "#1a5c2a" }}>▼</span>
              </button>

              {/* Search */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 8, fontFamily: JB, fontSize: 11, color: "#1a5c2a", pointerEvents: "none" }}>🔍</span>
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={handleSearch}
                  placeholder="NVDA"
                  maxLength={6}
                  style={{
                    width: 72, padding: "10px 8px 10px 24px",
                    background: "transparent", border: "none", borderRadius: 10, outline: "none",
                    fontFamily: JB, fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#1a5c2a",
                  }}
                />
              </div>
            </div>

            {/* Stocks dropdown panel */}
            {showStocks && (
              <div style={{ marginTop: 8, borderTop: "1px solid #1a3d22", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { group: "INDEX",     items: ["SPX","NDX","SPY","QQQ","DIA","IWM"] },
                  { group: "MAG 7",     items: ["AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA"] },
                  { group: "SEMIS",     items: ["AMD","AVGO","TSM","QCOM","MU","INTC","AMAT","LRCX","ASML","KLAC","WDC","SNDK"] },
                  { group: "FINANCE",   items: ["JPM","GS","MS","BAC","BRK.B","V","MA","HOOD"] },
                  { group: "ENERGY",    items: ["XOM","CVX","OXY","SLB","COP","BE","OKLO"] },
                  { group: "HEALTH",    items: ["LLY","UNH","JNJ","ABBV","MRK","PFE"] },
                  { group: "CONSUMER",  items: ["WMT","COST","HD","NKE","SBUX"] },
                  { group: "EV / AUTO", items: ["RIVN","NIO","F","GM"] },
                  { group: "CLOUD / AI",items: ["CRM","SNOW","PLTR","AI","DDOG","PATH"] },
                  { group: "CRYPTO",    items: ["COIN","MSTR","MARA","RIOT","CRCL"] },
                ].map(group => (
                  <div key={group.group}>
                    <div style={{ fontFamily: JB, fontSize: 9, color: "#166534", letterSpacing: ".2em", marginBottom: 7 }}>{group.group}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {group.items.map(t => (
                        <button key={t} onClick={() => { switchTicker(t, true); setShowStocks(false); }} style={{
                          padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                          border: ticker === t ? "1px solid #4ade80" : "1px solid #1a3d22",
                          background: ticker === t ? "#052e16" : "transparent",
                          color: ticker === t ? "#4ade80" : "#166534",
                          fontFamily: JB, fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOP CARD */}
          <div style={{ ...card, padding: "14px 18px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, background: "#22c55e", borderRadius: "50%", boxShadow: "0 0 7px #22c55e99", display: "inline-block", animation: "blink 2s ease-in-out infinite" }} />
                <span style={{ fontFamily: JB, fontSize: 13, letterSpacing: ".13em", color: "#4ade80" }}>
                  {["SPX","SPY"].includes(ticker) ? `${ticker} DAILY PREDICTOR` : ticker}
                </span>
              </div>
              <Clock />
            </div>
            {m ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: JB, fontSize: 38, color: m.change >= 0 ? "#4ade80" : "#db2777", lineHeight: 1 }}>{fmtPrice(m.price)}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontFamily: JB, fontSize: 16, color: m.change >= 0 ? "#4ade80" : "#db2777" }}>{m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}</span>
                      <span style={{ fontFamily: JB, fontSize: 16, color: m.change >= 0 ? "#4ade80" : "#db2777" }}>({m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%)</span>
                    </div>
                  </div>
                  <div style={{
                    marginLeft: "auto", flex: 1,
                    background: m.change >= 0 ? "rgba(74,222,128,0.05)" : "rgba(219,39,119,0.05)",
                    borderRadius: 8, padding: "4px 4px 0",
                    border: `1px solid ${m.change >= 0 ? "rgba(74,222,128,0.12)" : "rgba(219,39,119,0.12)"}`,
                    overflow: "hidden",
                  }}><Spark prices={m.sparkPrices} change={m.change} /></div>
                </div>
                <div style={{ fontFamily: JB, fontSize: 12.5, color: "#4b6a50", letterSpacing: ".04em" }}>
                  O: {m.open} · H: {m.high} · L: {m.low}{m.volume ? ` · V: ${fmtVol(m.volume)}` : ""}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: JB, fontSize: 13, color: "#166534", padding: "8px 0" }}>{loading ? step : "—"}</div>
            )}
          </div>

          {/* TABS */}
          {isIndex ? (
            <div style={{ ...card, padding: 5, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4 }}>
              {["Prediction", "Signals", "Macro", "Sentiment", "Levels", "Compass"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "9px 0", border: "none", borderRadius: 12, cursor: "pointer",
                  fontFamily: t === "Compass" ? JB : RJ,
                  fontSize: t === "Compass" ? 12 : t === "Levels" ? 13 : 15,
                  fontWeight: 600, letterSpacing: ".04em", transition: "all .18s",
                  background: tab === t ? "#052e16" : "transparent",
                  color: tab === t ? "#4ade80" : "#166534",
                }}>{t === "Compass" ? "🧭" : t}</button>
              ))}
            </div>
          ) : (
            <div style={{ ...card, padding: 5, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              {["News", "Levels", "Compass"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "9px 0", border: "none", borderRadius: 12, cursor: "pointer",
                  fontFamily: t === "Compass" ? JB : RJ,
                  fontSize: t === "Compass" ? 12 : 15,
                  fontWeight: 600, letterSpacing: ".04em", transition: "all .18s",
                  background: tab === t ? "#052e16" : "transparent",
                  color: tab === t ? "#4ade80" : "#166534",
                }}>{t === "Compass" ? "🧭" : t}</button>
              ))}
            </div>
          )}

          {/* CONTENT */}
          {loading ? (
            <div style={{ ...card, padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, border: "3px solid #1a3d22", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ fontFamily: JB, fontSize: 13, color: "#166534", letterSpacing: ".1em", textAlign: "center", lineHeight: 1.8 }}>
                {step}<br />FETCHING REAL MARKET DATA<br />+ AI ANALYSIS
              </div>
            </div>
          ) : error ? (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ background: "#0a0f0b", border: "1px solid #1a3d22", borderRadius: 12, padding: 16, fontFamily: JB, fontSize: 12, color: "#f87171", lineHeight: 1.7 }}>⚠ {error}</div>
              <button onClick={() => load(true)} style={{ marginTop: 12, padding: "10px 24px", background: "#052e16", border: "1px solid #1a3d22", borderRadius: 10, color: "#4ade80", fontFamily: JB, fontSize: 12, letterSpacing: ".1em", cursor: "pointer" }}>RETRY</button>
            </div>
          ) : p && (
            <>
              {tab === "Prediction" && (
                <div style={{ ...card, padding: "24px 20px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 20%,rgba(34,197,94,.07) 0%,transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ textAlign: "center", fontFamily: JB, fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 16 }}>NEXT SESSION FORECAST</div>
                  <NeedleMeter direction={p.direction} confidence={p.confidence} />
                  <div style={{ fontFamily: RJ, fontSize: 13, color: "#86efac", textAlign: "center", padding: "12px 0 0", lineHeight: 1.5 }}>{p.summary}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 22, borderTop: "1px solid #1a3d22", paddingTop: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, borderRight: "1px solid #1a3d22" }}>
                      <span style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".15em", color: "#166534" }}>TARGET RANGE</span>
                      <span style={{ fontFamily: JB, fontSize: 15, color: "#db2777", textAlign: "center" }}>
                        {ticker === "SPX" ? "" : "$"}{p.targetLow?.toFixed(2)} – {ticker === "SPX" ? "" : "$"}{p.targetHigh?.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".15em", color: "#166534" }}>EXPECTED MOVE</span>
                      <span style={{ fontFamily: JB, fontSize: 15, color: "#f87171", textAlign: "center" }}>{p.expectedMoveMin > 0 ? "+" : ""}{p.expectedMoveMin}% to {p.expectedMoveMax > 0 ? "+" : ""}{p.expectedMoveMax}%</span>
                    </div>
                  </div>
                </div>
              )}
              {tab === "Signals" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: JB, fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>TECHNICAL SIGNALS</div>
                  {p.signals?.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: i < p.signals.length - 1 ? "1px solid #1a3d22" : "none" }}>
                      <span style={{ fontFamily: JB, fontSize: 12, color: "#4ade80", letterSpacing: ".08em" }}>{s.name}</span>
                      <span style={{ fontFamily: JB, fontSize: 11, color: "#166534" }}>{s.value}</span>
                      <SigBadge value={s.signal} />
                    </div>
                  ))}
                </div>
              )}
              {tab === "Macro" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: JB, fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>MACRO ENVIRONMENT</div>
                  {p.macroNotes?.map((n, i) => (
                    <div key={i} style={{ padding: "10px 4px", borderBottom: i < p.macroNotes.length - 1 ? "1px solid #1a3d22" : "none" }}>
                      <div style={{ fontFamily: JB, fontSize: 11, color: "#166534", letterSpacing: ".12em", marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontFamily: RJ, fontSize: 14, color: "#86efac", lineHeight: 1.4 }}>{n.text}</div>
                    </div>
                  ))}
                </div>
              )}
              {tab === "Sentiment" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: JB, fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>MARKET SENTIMENT</div>
                  {[
                    { label: "BULLISH", pct: p.sentiment?.bullPct, color: "#4ade80" },
                    { label: "BEARISH", pct: p.sentiment?.bearPct, color: "#f87171" },
                    { label: "NEUTRAL", pct: p.sentiment?.neutralPct, color: "#facc15" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontFamily: JB, fontSize: 11, color: "#4ade80", letterSpacing: ".1em" }}>{label}</span>
                        <span style={{ fontFamily: JB, fontSize: 11, color: "#166534" }}>{pct}%</span>
                      </div>
                      <Bar pct={pct} color={color} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* COMPASS TAB — always available */}
          {tab === "Compass" && (
            <>
              {/* Input panel */}
              {(showCompassInput || !compassResult) && (
                <div style={{ ...card, padding: "20px 18px" }}>
                  <div style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".18em", color: "#166534", marginBottom: 12 }}>PASTE MARKET STRUCTURE DATA</div>

                  {/* Ticker input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: JB, fontSize: 10, color: "#166534", letterSpacing: ".1em", whiteSpace: "nowrap" }}>SYMBOL:</span>
                    <input
                      value={compassTicker}
                      onChange={e => setCompassTicker(e.target.value.toUpperCase())}
                      placeholder="SPY / SPX / NVDA..."
                      maxLength={6}
                      style={{
                        flex: 1, padding: "8px 12px",
                        background: "#080d0a", border: "1px solid #1a3d22",
                        borderRadius: 8, outline: "none",
                        fontFamily: JB, fontSize: 12, color: "#4ade80",
                        letterSpacing: ".08em",
                      }}
                    />
                  </div>

                  <textarea
                    value={compassRaw}
                    onChange={e => setCompassRaw(e.target.value)}
                    placeholder={"Paste your data here...\n\n| EXPIRATION | VOL TRIGGER | ... |\n|------------|-------------|-----|\n| Mar 16 ..."}
                    style={{
                      width: "100%", height: 150, resize: "none", outline: "none",
                      background: "#080d0a", border: "1px solid #1a3d22",
                      borderRadius: 10, padding: "12px 14px",
                      fontFamily: JB, fontSize: 10, color: "#4ade80",
                      lineHeight: 1.6, letterSpacing: ".03em",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {compassResult && (
                      <button onClick={() => setShowCompassInput(false)} style={{
                        padding: "8px 16px", background: "transparent", border: "1px solid #1a3d22",
                        borderRadius: 8, color: "#166534", fontFamily: JB, fontSize: 10, letterSpacing: ".08em", cursor: "pointer",
                      }}>CANCEL</button>
                    )}
                    <button onClick={analyzeCompass} disabled={!compassRaw.trim() || !compassTicker.trim() || compassLoading} style={{
                      flex: 1, padding: "10px 0",
                      background: compassRaw.trim() && compassTicker.trim() ? "#052e16" : "#0a0f0b",
                      border: "1px solid #1a3d22", borderRadius: 8,
                      color: compassRaw.trim() && compassTicker.trim() ? "#4ade80" : "#1a3d22",
                      fontFamily: JB, fontSize: 11, letterSpacing: ".1em", cursor: "pointer",
                    }}>
                      {compassLoading ? "ANALYZING..." : "ANALYZE"}
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {compassLoading && (
                <div style={{ ...card, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #1a3d22", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontFamily: JB, fontSize: 11, color: "#166534", letterSpacing: ".12em", textAlign: "center", lineHeight: 1.8 }}>
                    READING MARKET STRUCTURE<br />IDENTIFYING KEY LEVELS...
                  </div>
                </div>
              )}

              {/* Results */}
              {compassResult && !compassLoading && !showCompassInput && (() => {
                const cp = compassResult.currentPrice || compassResult.currentPrice || 0;
                const bc = compassResult.bias === "BULLISH" || compassResult.bias === "LEAN BULLISH" ? "#4ade80"
                  : compassResult.bias === "BEARISH" || compassResult.bias === "LEAN BEARISH" ? "#f87171" : "#facc15";
                return (
                  <>
                    {/* Bias + Summary */}
                    <div style={{ ...card, padding: "20px 18px", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${bc}11 0%, transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".18em", color: "#166534", marginBottom: 14 }}>🧭 MARKET COMPASS</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <div style={{ fontFamily: RJ, fontSize: 28, fontWeight: 700, color: bc, letterSpacing: ".08em" }}>{compassResult.bias}</div>
                        <div style={{ flex: 1, height: 1, background: "#1a3d22" }} />
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: JB, fontSize: 9, color: "#166534", letterSpacing: ".1em" }}>NEAREST EXPIRY</div>
                          <div style={{ fontFamily: JB, fontSize: 13, color: "#4ade80" }}>{compassResult.nearestExpiry}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: RJ, fontSize: 13, color: "#86efac", lineHeight: 1.6 }}>{compassResult.summary}</div>
                    </div>

                    {/* Key Levels */}
                    <div style={{ ...card, padding: "20px 18px" }}>
                      <div style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".18em", color: "#166534", marginBottom: 14 }}>KEY LEVELS</div>
                      {compassResult.pivotZones?.sort((a, b) => b.level - a.level).map((z, i) => {
                        const isAbove = z.level > cp;
                        const clr = isAbove ? "#f87171" : "#4ade80";
                        const pct = ((z.level - cp) / cp * 100).toFixed(1);
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #0d1a10" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: clr, flexShrink: 0, boxShadow: `0 0 6px ${clr}88` }} />
                            <div style={{ fontFamily: JB, fontSize: 17, color: clr, fontWeight: 600, minWidth: 60 }}>{z.level?.toFixed(0)}</div>
                            <div style={{ fontFamily: JB, fontSize: 10, color: "#166534" }}>{z.type?.toUpperCase()} · {z.strength?.toUpperCase()}</div>
                            <div style={{ marginLeft: "auto", fontFamily: JB, fontSize: 11, color: isAbove ? "#f87171" : "#4ade80" }}>{isAbove ? "+" : ""}{pct}%</div>
                          </div>
                        );
                      })}
                      {/* Current price */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", background: "#0a140a", margin: "4px -18px", paddingLeft: 18, paddingRight: 18 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#facc15", flexShrink: 0, boxShadow: "0 0 6px #facc1588" }} />
                        <div style={{ fontFamily: JB, fontSize: 17, color: "#facc15", fontWeight: 600, minWidth: 60 }}>{cp.toFixed(2)}</div>
                        <div style={{ fontFamily: JB, fontSize: 10, color: "#facc15", letterSpacing: ".08em" }}>NOW</div>
                      </div>
                    </div>

                    {/* Bounce Targets */}
                    <div style={{ ...card, padding: "20px 18px" }}>
                      <div style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".18em", color: "#166534", marginBottom: 14 }}>BOUNCE TARGETS</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {compassResult.bounceTargets?.map((t, i) => (
                          <div key={i} style={{ flex: 1, background: "#080d0a", border: "1px solid #1a3d22", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                            <div style={{ fontFamily: JB, fontSize: 9, color: "#166534", letterSpacing: ".12em", marginBottom: 6 }}>TARGET {i + 1}</div>
                            <div style={{ fontFamily: JB, fontSize: 24, color: "#4ade80", fontWeight: 600 }}>{t?.toFixed(0)}</div>
                            <div style={{ fontFamily: JB, fontSize: 10, color: "#4ade80", marginTop: 4 }}>+{((t - cp) / cp * 100).toFixed(1)}%</div>
                          </div>
                        ))}
                        <div style={{ flex: 1, background: "#080d0a", border: "1px solid #1a3d22", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                          <div style={{ fontFamily: JB, fontSize: 9, color: "#166534", letterSpacing: ".12em", marginBottom: 6 }}>TRIGGER</div>
                          <div style={{ fontFamily: JB, fontSize: 24, color: "#facc15", fontWeight: 600 }}>{compassResult.trigger?.toFixed(0)}</div>
                          <div style={{ fontFamily: JB, fontSize: 10, color: "#facc15", marginTop: 4 }}>+{((compassResult.trigger - cp) / cp * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Dates */}
                    <div style={{ ...card, padding: "20px 18px" }}>
                      <div style={{ fontFamily: JB, fontSize: 10.5, letterSpacing: ".18em", color: "#166534", marginBottom: 14 }}>KEY DATES & PIVOTS</div>
                      {compassResult.keyDates?.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "10px 0", borderBottom: i < compassResult.keyDates.length - 1 ? "1px solid #0d1a10" : "none" }}>
                          <div style={{ fontFamily: JB, fontSize: 13, color: "#db2777", whiteSpace: "nowrap", minWidth: 52 }}>{d.date}</div>
                          <div style={{ fontFamily: RJ, fontSize: 13, color: "#86efac", lineHeight: 1.4 }}>{d.reason}</div>
                        </div>
                      ))}
                    </div>

                    {/* Update button */}
                    <button onClick={() => setShowCompassInput(true)} style={{
                      alignSelf: "center", padding: "10px 28px", marginBottom: 8,
                      background: "transparent", border: "1px solid #1a3d22",
                      borderRadius: 10, color: "#166534", fontFamily: JB,
                      fontSize: 11, letterSpacing: ".1em", cursor: "pointer",
                    }}>UPDATE DATA</button>
                  </>
                );
              })()}
            </>
          )}

          {/* NEWS TAB — for individual stocks */}
          {!isIndex && tab === "News" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {newsLoading ? (
                <div style={{ ...card, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: "3px solid #1a3d22", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontFamily: JB, fontSize: 11, color: "#166534", letterSpacing: ".1em" }}>FETCHING LATEST NEWS...</div>
                </div>
              ) : newsData?.news?.length ? (
                newsData.news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <div style={{ ...card, padding: "14px 16px", transition: "border .2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontFamily: JB, fontSize: 9, color: "#166534", letterSpacing: ".1em" }}>{n.source?.toUpperCase()}</span>
                        <span style={{ fontFamily: JB, fontSize: 9, color: "#166534" }}>{n.time}</span>
                      </div>
                      <div style={{ fontFamily: RJ, fontSize: 14, color: "#86efac", lineHeight: 1.5, marginBottom: 6, fontWeight: 600 }}>{n.headline}</div>
                      {n.summary && <div style={{ fontFamily: RJ, fontSize: 12, color: "#4b6a50", lineHeight: 1.5 }}>{n.summary}</div>}
                    </div>
                  </a>
                ))
              ) : (
                <div style={{ ...card, padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: JB, fontSize: 11, color: "#166534" }}>NO RECENT NEWS FOR {ticker}</div>
                </div>
              )}
            </div>
          )}

          {/* LEVELS TAB — for individual stocks */}
          {!isIndex && tab === "Levels" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {levelsLoading ? (
                <div style={{ ...card, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: "3px solid #1a3d22", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontFamily: JB, fontSize: 11, color: "#166534", letterSpacing: ".1em" }}>CALCULATING KEY LEVELS...</div>
                </div>
              ) : levelsData?.stdPivots ? (() => {
                const ld = levelsData;
                const cp = ld.price;
                const toggle = k => setOpenSec(p => ({ ...p, [k]: !p[k] }));

                const NowLine = () => (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", background:"#0a140a", margin:"2px -18px", paddingLeft:18, paddingRight:18 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#facc15", boxShadow:"0 0 6px #facc1566" }} />
                    <div style={{ fontFamily:JB, fontSize:10, color:"#facc15", fontWeight:700, minWidth:36 }}>NOW</div>
                    <div style={{ fontFamily:JB, fontSize:15, color:"#facc15", fontWeight:600 }}>{cp}</div>
                  </div>
                );

                const PRow = ({ label, val, type, last }) => {
                  const isAbove = val > cp;
                  const isPP = type === "pivot";
                  const clr = isPP ? "#facc15" : isAbove ? "#f87171" : "#4ade80";
                  const pct = ((val - cp) / cp * 100).toFixed(2);
                  return (
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: last?"none":"1px solid #0d1a10" }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:clr, flexShrink:0 }} />
                      <div style={{ fontFamily:JB, fontSize:11, color:clr, fontWeight:700, minWidth:36, letterSpacing:".06em" }}>{label}</div>
                      <div style={{ fontFamily:JB, fontSize:16, color:clr, fontWeight:600, flex:1 }}>{val}</div>
                      <div style={{ fontFamily:JB, fontSize:11, color: isAbove?"#f87171":isPP?"#facc15":"#4ade80" }}>{isAbove?"+":""}{pct}%</div>
                    </div>
                  );
                };

                const PrevBar = () => (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:12 }}>
                    {[["PP",ld.pp,"#facc15"],["PREV H",ld.prevH,"#f87171"],["PREV L",ld.prevL,"#4ade80"],["PREV C",ld.prevC,"#86efac"]].map(([l,v,c]) => (
                      <div key={l} style={{ background:"#080d0a", border:"1px solid #1a3d22", borderRadius:8, padding:"7px 4px", textAlign:"center" }}>
                        <div style={{ fontFamily:JB, fontSize:8, color:"#166534", letterSpacing:".06em", marginBottom:3 }}>{l}</div>
                        <div style={{ fontFamily:JB, fontSize:12, color:c, fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                );

                return (
                  <div style={{ ...card, overflow:"hidden" }}>

                    {/* TECHNICAL ANALYSIS */}
                    <button onClick={() => toggle("tech")} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px", background:"transparent", border:"none", cursor:"pointer", borderBottom:"1px solid #1a3d22" }}>
                      <span style={{ fontFamily:JB, fontSize:9, letterSpacing:".2em", color:"#166534" }}>TECHNICAL ANALYSIS</span>
                      <span style={{ fontFamily:JB, fontSize:10, color:"#166534", transform: openSec.tech?"rotate(180deg)":"none", transition:".2s", display:"inline-block" }}>▼</span>
                    </button>
                    {openSec.tech && ld.technical && (
                      <div style={{ padding:"0 18px 14px", borderBottom:"1px solid #1a3d22" }}>
                        <div style={{ fontFamily:RJ, fontSize:13, color:"#86efac", lineHeight:1.6, margin:"12px 0", paddingBottom:12, borderBottom:"1px solid #1a3d22" }}>{ld.technical.summary}</div>
                        <div style={{ fontFamily:JB, fontSize:9, color:"#f87171", letterSpacing:".15em", marginBottom:8 }}>RESISTANCE</div>
                        {(ld.technical.resistance||[]).sort((a,b)=>b.level-a.level).map((r,i) => {
                          const pct = ((r.level-cp)/cp*100).toFixed(2);
                          const clr = r.strength==="STRONG"?"#f87171":r.strength==="MODERATE"?"#fb923c":"#fca5a5";
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid #0d1a10" }}>
                              <div style={{ width:6, height:6, borderRadius:"50%", background:clr, flexShrink:0, boxShadow:`0 0 5px ${clr}88` }} />
                              <div style={{ fontFamily:JB, fontSize:16, color:clr, fontWeight:600, flex:1 }}>{r.level}</div>
                              <div style={{ fontFamily:JB, fontSize:10, color:"#166534", flex:2 }}>{r.note}</div>
                              <div style={{ fontFamily:JB, fontSize:11, color:"#f87171" }}>+{pct}%</div>
                            </div>
                          );
                        })}
                        <NowLine />
                        <div style={{ fontFamily:JB, fontSize:9, color:"#4ade80", letterSpacing:".15em", margin:"10px 0 8px" }}>SUPPORT</div>
                        {(ld.technical.support||[]).sort((a,b)=>b.level-a.level).map((s,i,arr) => {
                          const pct = ((s.level-cp)/cp*100).toFixed(2);
                          const clr = s.strength==="STRONG"?"#4ade80":s.strength==="MODERATE"?"#86efac":"#bbf7d0";
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?"1px solid #0d1a10":"none" }}>
                              <div style={{ width:6, height:6, borderRadius:"50%", background:clr, flexShrink:0, boxShadow:`0 0 5px ${clr}88` }} />
                              <div style={{ fontFamily:JB, fontSize:16, color:clr, fontWeight:600, flex:1 }}>{s.level}</div>
                              <div style={{ fontFamily:JB, fontSize:10, color:"#166534", flex:2 }}>{s.note}</div>
                              <div style={{ fontFamily:JB, fontSize:11, color:"#4ade80" }}>{pct}%</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* PIVOT POINTS */}
                    <button onClick={() => toggle("pp")} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px", background:"transparent", border:"none", cursor:"pointer", borderBottom:"1px solid #1a3d22" }}>
                      <span style={{ fontFamily:JB, fontSize:9, letterSpacing:".2em", color:"#166534" }}>PIVOT POINTS</span>
                      <span style={{ fontFamily:JB, fontSize:10, color:"#166534", transform: openSec.pp?"rotate(180deg)":"none", transition:".2s", display:"inline-block" }}>▼</span>
                    </button>
                    {openSec.pp && (
                      <div style={{ padding:"14px 18px", borderBottom:"1px solid #1a3d22" }}>
                        <PrevBar />
                        {ld.stdPivots.map((l,i) => {
                          const showNow = i > 0 && ld.stdPivots[i-1].val > cp && l.val <= cp;
                          return <div key={i}>{showNow && <NowLine />}<PRow {...l} last={i===ld.stdPivots.length-1} /></div>;
                        })}
                      </div>
                    )}

                    {/* FIBONACCI */}
                    <button onClick={() => toggle("fib")} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px", background:"transparent", border:"none", cursor:"pointer", borderBottom: openSec.fib?"1px solid #1a3d22":"none" }}>
                      <span style={{ fontFamily:JB, fontSize:9, letterSpacing:".2em", color:"#166534" }}>FIBONACCI RETRACEMENT</span>
                      <span style={{ fontFamily:JB, fontSize:10, color:"#166534", transform: openSec.fib?"rotate(180deg)":"none", transition:".2s", display:"inline-block" }}>▼</span>
                    </button>
                    {openSec.fib && (
                      <div style={{ padding:"14px 18px" }}>
                        {/* 52W High/Low bar */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
                          {[["52W HIGH", ld.high52, "#f87171"], ["52W LOW", ld.low52, "#4ade80"]].map(([l,v,c]) => (
                            <div key={l} style={{ background:"#080d0a", border:"1px solid #1a3d22", borderRadius:8, padding:"7px 8px", textAlign:"center" }}>
                              <div style={{ fontFamily:JB, fontSize:8, color:"#166534", letterSpacing:".06em", marginBottom:3 }}>{l}</div>
                              <div style={{ fontFamily:JB, fontSize:13, color:c, fontWeight:600 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {ld.fibPivots.map((l,i) => {
                          const showNow = i > 0 && ld.fibPivots[i-1].val > cp && l.val <= cp;
                          return <div key={i}>{showNow && <NowLine />}<PRow {...l} last={i===ld.fibPivots.length-1} /></div>;
                        })}
                      </div>
                    )}

                  </div>
                );
              })() : (
                <div style={{ ...card, padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontFamily: JB, fontSize: 11, color: "#166534" }}>UNABLE TO LOAD LEVELS</div>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM METRICS — only for SPX */}
          {ticker === "SPX" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "VIX", val: m?.vix?.toFixed(2), sub: m ? `${m.vixChg >= 0 ? "+" : ""}${m.vixChg}%` : "—", clr: "#f87171" },
                  { label: "10Y YIELD", val: m?.tnx ? m.tnx.toFixed(2) + "%" : "—", sub: "treasury", clr: "#facc15" },
                  { label: "BRENT", val: m?.brent ? "$" + m.brent.toFixed(2) : "—", sub: m ? `${m.brentChg >= 0 ? "+" : ""}${m.brentChg}%` : "—", clr: "#f87171" },
                  { label: "RSI", val: m?.rsi ?? "—", sub: m?.rsi < 30 ? "oversold" : m?.rsi > 70 ? "overbought" : "neutral", clr: m?.rsi < 30 ? "#4ade80" : m?.rsi > 70 ? "#f87171" : "#facc15" },
                ].map(({ label, val, sub, clr }) => (
                  <div key={label} style={{ ...card, padding: "13px 8px 11px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: JB, fontSize: 9.5, letterSpacing: ".13em", color: "#166534", textTransform: "uppercase" }}>{label}</span>
                    <span style={{ fontFamily: JB, fontSize: 20, color: clr, lineHeight: 1.1 }}>{val ?? "—"}</span>
                    <span style={{ fontFamily: JB, fontSize: 10, color: "#166534" }}>{sub}</span>
                  </div>
                ))}
              </div>
              {data?.generatedAt && (
                <div style={{ fontFamily: JB, fontSize: 10, color: "#166534", textAlign: "center", padding: "4px 0" }}>
                  {data.cached ? "CACHED · " : "LIVE · "}UPDATED {new Date(data.generatedAt).toLocaleTimeString()}
                </div>
              )}
              <button onClick={() => load(true)} style={{
                alignSelf: "center", marginBottom: 8, padding: "10px 28px",
                background: "#052e16", border: "1px solid #1a3d22", borderRadius: 10,
                color: "#4ade80", fontFamily: JB, fontSize: 12, letterSpacing: ".1em", cursor: "pointer",
              }}>REFRESH PREDICTION</button>
            </>
          )}

        </div>
      </div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        button { outline:none; }
      `}</style>
    </>
  );
}
