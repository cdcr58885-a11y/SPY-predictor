// pages/index.js
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

/* ─── Sparkline ─── */
function Spark({ prices = [] }) {
  const W = 110, H = 48;
  if (prices.length < 2) return <svg width={W} height={H} />;
  const mn = Math.min(...prices), mx = Math.max(...prices), rng = mx - mn || 1;
  const xs = prices.map((_, i) => (i / (prices.length - 1)) * W);
  const ys = prices.map(v => H - ((v - mn) / rng) * (H - 8) - 4);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = line + ` L${W},${H} L0,${H} Z`;
  const isDown = prices[prices.length - 1] < prices[0];
  const clr = isDown ? "#f87171" : "#4ade80";
  return (
    <svg width={W} height={H} overflow="visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={clr} stopOpacity=".3" />
          <stop offset="100%" stopColor={clr} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={line} fill="none" stroke={clr} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Gauge ─── */
function Gauge({ pct = 0.42, bullish = false }) {
  const R = 105, cx = 130, cy = 130;
  const toXY = (a, r) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const tS = toXY(Math.PI, R), tE = toXY(0, R);
  const track = `M${tS.x},${tS.y} A${R},${R} 0 0,1 ${tE.x},${tE.y}`;
  const activeAngle = Math.PI * Math.min(Math.max(pct, 0.05), 0.95);
  const aE = toXY(activeAngle, R);
  const active = `M${tE.x},${tE.y} A${R},${R} 0 0,0 ${aE.x},${aE.y}`;
  const c1 = bullish ? "#4ade80" : "#f87171";
  const c2 = bullish ? "#34d399" : "#f472b6";
  return (
    <svg width="260" height="135" style={{ position: "absolute", top: 0 }}>
      <defs>
        <linearGradient id="gg" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <path d={track} fill="none" stroke="#052e16" strokeWidth="13" strokeLinecap="round" />
      <path d={active} fill="none" stroke="url(#gg)" strokeWidth="13" strokeLinecap="round" />
    </svg>
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
  if (!t) return <div style={{ width: 160 }} />;
  const p = n => String(n).padStart(2, "0");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const h = t.getHours();
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#166534", letterSpacing: ".06em" }}>
        {days[t.getDay()]}, {months[t.getMonth()]} {t.getDate()}, {t.getFullYear()}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 21, color: "#db2777", letterSpacing: ".05em" }}>
        {p(h)}:{p(t.getMinutes())}:{p(t.getSeconds())} {h < 12 ? "AM" : "PM"}
      </div>
    </div>
  );
}

/* ─── Signal Badge ─── */
function SigBadge({ value }) {
  const v = (value || "").toUpperCase();
  const color = v.includes("BULL") || v.includes("BUY") ? "#4ade80"
    : v.includes("BEAR") || v.includes("SELL") ? "#f87171"
    : "#facc15";
  return <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color }}>{value}</span>;
}

/* ─── Bar ─── */
function Bar({ pct, color }) {
  return (
    <div style={{ background: "#052e16", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .8s" }} />
    </div>
  );
}

const card = {
  background: "#0d1610",
  border: "1px solid #1a3d22",
  borderRadius: 18,
  padding: "18px 18px 15px",
  boxShadow: "0 2px 16px rgba(34,197,94,0.05)",
};

export default function Home() {
  const [tab, setTab] = useState("Prediction");
  const [data, setData] = useState(null);
  const [ticker, setTicker] = useState("SPY");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState("LOADING DATA...");

  const load = useCallback(async (force = false, t = null) => {
    const activeTicker = t || ticker;
    setLoading(true);
    setError("");
    setStep("FETCHING MARKET DATA...");
    try {
      const params = new URLSearchParams({ ticker: activeTicker });
      if (force) params.set("force", "1");
      const res = await fetch(`/api/predict?${params}`);
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "API error");
      }
      setStep("RUNNING AI ANALYSIS...");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStep("");
    }
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const switchTicker = (t) => {
    setTicker(t);
    setData(null);
    load(false, t);
  };

  const m = data?.market;
  const p = data?.prediction;
  const isBull = p?.direction?.includes("BULL");
  const isNeutral = p?.direction === "NEUTRAL";
  const dirColor = !p ? "#22c55e" : isBull ? "#4ade80" : isNeutral ? "#facc15" : "#f87171";
  const gaugePct = p ? ((p.confidence - 50) / 40) * 0.8 + 0.1 : 0.4;
  const fmtPrice = v => v != null ? (ticker === "SPX" ? v.toLocaleString() : "$" + v.toFixed(2)) : "—";
  const fmtVol = v => v ? (v / 1e6).toFixed(1) + "M" : "—";

  return (
    <>
      <Head>
        <title>{ticker} Daily Predictor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        background: "#080d0a",
        minHeight: "100vh", fontFamily: "'Rajdhani',sans-serif",
        display: "flex", justifyContent: "center", padding: 16,
      }}>
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 11 }}>

          {/* ── TICKER TOGGLE ── */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 6,
            background: "#0d1610", border: "1px solid #1a3d22",
            borderRadius: 14, padding: 5,
          }}>
            {["SPY", "SPX"].map(t => (
              <button key={t} onClick={() => switchTicker(t)} style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
                fontFamily: "monospace", fontSize: 15, fontWeight: 700, letterSpacing: ".12em",
                transition: "all .2s",
                background: ticker === t ? "#052e16" : "transparent",
                color: ticker === t ? "#4ade80" : "#1a5c2a",
                boxShadow: ticker === t ? "0 0 12px rgba(34,197,94,0.2)" : "none",
              }}>
                {t}
                {t === "SPY" && <span style={{ fontSize: 9, marginLeft: 4, opacity: .6 }}>ETF</span>}
                {t === "SPX" && <span style={{ fontSize: 9, marginLeft: 4, opacity: .6 }}>INDEX</span>}
              </button>
            ))}
          </div>

          {/* ── TOP CARD ── */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 9, height: 9, background: "#22c55e", borderRadius: "50%",
                  boxShadow: "0 0 7px #22c55e99", display: "inline-block",
                  animation: "blink 2s ease-in-out infinite",
                }} />
                <span style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: ".13em", color: "#4ade80" }}>
                  {ticker} DAILY PREDICTOR
                </span>
              </div>
              <Clock />
            </div>

            {m ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 44, color: "#831843", lineHeight: 1 }}>
                    {fmtPrice(m.price)}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", paddingBottom: 5, lineHeight: 1.15 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 21, color: m.change >= 0 ? "#4ade80" : "#f87171" }}>
                      {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 18, color: m.change >= 0 ? "#4ade80" : "#f87171" }}>
                      ({m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%)
                    </span>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Spark prices={m.sparkPrices} />
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12.5, color: "#166534", letterSpacing: ".04em" }}>
                  O: {m.open} · H: {m.high} · L: {m.low}{m.volume ? ` · V: ${fmtVol(m.volume)}` : ""}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#166534", padding: "8px 0" }}>
                {loading ? step : "—"}
              </div>
            )}
          </div>

          {/* ── TABS ── */}
          <div style={{
            ...card, padding: 5,
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4,
          }}>
            {["Prediction","Signals","Macro","Sentiment"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "9px 0", border: "none", borderRadius: 12, cursor: "pointer",
                fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 600,
                letterSpacing: ".04em", transition: "all .18s",
                background: tab === t ? "#052e16" : "transparent",
                color: tab === t ? "#4ade80" : "#166534",
              }}>{t}</button>
            ))}
          </div>

          {/* ── MAIN ── */}
          {loading ? (
            <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 20px" }}>
              <div style={{
                width: 40, height: 40, border: "3px solid #1a3d22",
                borderTopColor: "#f87171", borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#166534", letterSpacing: ".1em", textAlign: "center", lineHeight: 1.8 }}>
                {step}<br />FETCHING REAL MARKET DATA<br />+ CLAUDE AI ANALYSIS
              </div>
            </div>
          ) : error ? (
            <div style={card}>
              <div style={{ background: "#0a0f0b", border: "1px solid #1a3d22", borderRadius: 12, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#f87171", lineHeight: 1.7 }}>
                ⚠ {error}
              </div>
              <button onClick={() => load(true)} style={{
                marginTop: 12, padding: "10px 24px", background: "#052e16", border: "1px solid #1a3d22",
                borderRadius: 10, color: "#4ade80", fontFamily: "monospace", fontSize: 12,
                letterSpacing: ".1em", cursor: "pointer",
              }}>↺ RETRY</button>
            </div>
          ) : p && (
            <>
              {tab === "Prediction" && (
                <div style={{ ...card, padding: "24px 20px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 20%,rgba(236,72,153,.07) 0%,transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>
                    NEXT SESSION FORECAST
                  </div>
                  <div style={{ position: "relative", height: 165, display: "flex", justifyContent: "center" }}>
                    <Gauge pct={gaugePct} bullish={isBull} />
                    <div style={{ position: "absolute", bottom: 0, textAlign: "center" }}>
                      {p.direction.includes(" ") ? (
                        <>
                          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 38, fontWeight: 700, color: dirColor, letterSpacing: ".07em", lineHeight: 1 }}>
                            {p.direction.split(" ")[0]}
                          </div>
                          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 38, fontWeight: 700, color: dirColor, letterSpacing: ".07em", lineHeight: 1 }}>
                            {p.direction.split(" ")[1]}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 42, fontWeight: 700, color: dirColor, letterSpacing: ".07em" }}>
                          {p.direction}
                        </div>
                      )}
                      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#166534", marginTop: 5 }}>
                        {p.confidence}% confidence
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#86efac", textAlign: "center", padding: "12px 0 0", lineHeight: 1.5 }}>
                    {p.summary}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 22, borderTop: "1px solid #1a3d22", paddingTop: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, borderRight: "1px solid #1a3d22" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10.5, letterSpacing: ".15em", color: "#166534" }}>TARGET RANGE</span>
                      <span style={{ fontFamily: "monospace", fontSize: 15, color: "#831843", textAlign: "center" }}>
                        ${p.targetLow?.toFixed(2)} – ${p.targetHigh?.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10.5, letterSpacing: ".15em", color: "#166534" }}>EXPECTED MOVE</span>
                      <span style={{ fontFamily: "monospace", fontSize: 15, color: "#f87171", textAlign: "center" }}>
                        {p.expectedMoveMin > 0 ? "+" : ""}{p.expectedMoveMin}% to {p.expectedMoveMax > 0 ? "+" : ""}{p.expectedMoveMax}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tab === "Signals" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>
                    TECHNICAL SIGNALS
                  </div>
                  {p.signals?.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: i < p.signals.length - 1 ? "1px solid #1a3d22" : "none" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#4ade80", letterSpacing: ".08em" }}>{s.name}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#166534" }}>{s.value}</span>
                      <SigBadge value={s.signal} />
                    </div>
                  ))}
                </div>
              )}

              {tab === "Macro" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>
                    MACRO ENVIRONMENT
                  </div>
                  {p.macroNotes?.map((n, i) => (
                    <div key={i} style={{ padding: "10px 4px", borderBottom: i < p.macroNotes.length - 1 ? "1px solid #1a3d22" : "none" }}>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#166534", letterSpacing: ".12em", marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: "#86efac", lineHeight: 1.4 }}>{n.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "Sentiment" && (
                <div style={{ ...card, padding: "24px 20px 20px" }}>
                  <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11.5, letterSpacing: ".2em", color: "#166534", marginBottom: 20 }}>
                    MARKET SENTIMENT
                  </div>
                  {[
                    { label: "BULLISH", pct: p.sentiment?.bullPct, color: "#4ade80" },
                    { label: "BEARISH", pct: p.sentiment?.bearPct, color: "#f87171" },
                    { label: "NEUTRAL", pct: p.sentiment?.neutralPct, color: "#facc15" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4ade80", letterSpacing: ".1em" }}>{label}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#166534" }}>{pct}%</span>
                      </div>
                      <Bar pct={pct} color={color} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── BOTTOM METRICS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { label: "VIX", val: m?.vix?.toFixed(2), sub: m ? `${m.vixChg >= 0 ? "+" : ""}${m.vixChg}%` : "—", clr: "#f87171" },
              { label: "10Y YIELD", val: m?.tnx ? m.tnx.toFixed(2) + "%" : "—", sub: "treasury", clr: "#facc15" },
              { label: "BRENT", val: m?.brent ? "$" + m.brent.toFixed(2) : "—", sub: m ? `${m.brentChg >= 0 ? "+" : ""}${m.brentChg}%` : "—", clr: "#f87171" },
              { label: "RSI", val: m?.rsi ?? "—", sub: m?.rsi < 30 ? "oversold" : m?.rsi > 70 ? "overbought" : "neutral", clr: m?.rsi < 30 ? "#4ade80" : m?.rsi > 70 ? "#f87171" : "#facc15" },
            ].map(({ label, val, sub, clr }) => (
              <div key={label} style={{ ...card, padding: "13px 8px 11px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: ".13em", color: "#166534", textTransform: "uppercase" }}>{label}</span>
                <span style={{ fontFamily: "monospace", fontSize: 20, color: clr, lineHeight: 1.1 }}>{val ?? "—"}</span>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#166534" }}>{sub}</span>
              </div>
            ))}
          </div>

          {data?.generatedAt && (
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#166534", textAlign: "center", padding: "4px 0" }}>
              {data.cached ? "CACHED · " : "LIVE · "}
              UPDATED {new Date(data.generatedAt).toLocaleTimeString()}
            </div>
          )}

          <button onClick={() => load(true)} style={{
            alignSelf: "center", marginBottom: 8, padding: "10px 28px",
            background: "#052e16", border: "1px solid #1a3d22", borderRadius: 10,
            color: "#4ade80", fontFamily: "monospace", fontSize: 12,
            letterSpacing: ".1em", cursor: "pointer",
          }}>
            ↺ REFRESH PREDICTION
          </button>

        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { outline: none; }
      `}</style>
    </>
  );
}
