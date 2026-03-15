// pages/index.js
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const JB = "'JetBrains Mono', monospace";
const RJ = "'Rajdhani', sans-serif";

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
    <svg width={W} height={H} style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={clr} stopOpacity=".3" />
          <stop offset="100%" stopColor={clr} stopOpacity="0" />
        </linearGradient>
        <clipPath id="spark-clip"><rect x="0" y="0" width={W} height={H} /></clipPath>
      </defs>
      <g clipPath="url(#spark-clip)">
        <path d={area} fill="url(#sg)" />
        <path d={line} fill="none" stroke={clr} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
      <div style={{ fontFamily: JB, fontSize: 20, color: "#db2777", letterSpacing: ".02em", marginTop: 3, whiteSpace: "nowrap" }}>
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

  useEffect(() => { load(); }, [load]);

  const switchTicker = (t) => { setTicker(t); setData(null); load(false, t); };

  const m = data?.market;
  const p = data?.prediction;
  const fmtPrice = v => v != null ? (ticker === "SPX" ? v.toLocaleString() : "$" + v.toFixed(2)) : "—";
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

          {/* TOGGLE — SPX first */}
          <div style={{ ...card, padding: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[["SPX", "INDEX"], ["SPY", "ETF"]].map(([t, sub]) => (
              <button key={t} onClick={() => switchTicker(t)} style={{
                padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
                fontFamily: JB, fontSize: 15, fontWeight: 700, letterSpacing: ".12em", transition: "all .2s",
                background: ticker === t ? "#052e16" : "transparent",
                color: ticker === t ? "#4ade80" : "#1a5c2a",
                boxShadow: ticker === t ? "0 0 12px rgba(34,197,94,0.2)" : "none",
              }}>
                {t} <span style={{ fontSize: 9, opacity: .6 }}>{sub}</span>
              </button>
            ))}
          </div>

          {/* TOP CARD */}
          <div style={{ ...card, padding: "14px 18px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, background: "#22c55e", borderRadius: "50%", boxShadow: "0 0 7px #22c55e99", display: "inline-block", animation: "blink 2s ease-in-out infinite" }} />
                <span style={{ fontFamily: JB, fontSize: 13, letterSpacing: ".13em", color: "#4ade80" }}>{ticker} DAILY PREDICTOR</span>
              </div>
              <Clock />
            </div>
            {m ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontFamily: JB, fontSize: 44, color: "#db2777", lineHeight: 1 }}>{fmtPrice(m.price)}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontFamily: JB, fontSize: 20, color: m.change >= 0 ? "#4ade80" : "#f87171" }}>{m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}</span>
                    <span style={{ fontFamily: JB, fontSize: 17, color: m.change >= 0 ? "#4ade80" : "#f87171" }}>({m.changePct >= 0 ? "+" : ""}{m.changePct.toFixed(2)}%)</span>
                  </div>
                  <div style={{ marginLeft: "auto", overflow: "hidden", borderRadius: 4 }}><Spark prices={m.sparkPrices} /></div>
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
          <div style={{ ...card, padding: 5, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
            {["Prediction", "Signals", "Macro", "Sentiment"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "9px 0", border: "none", borderRadius: 12, cursor: "pointer",
                fontFamily: RJ, fontSize: 15, fontWeight: 600, letterSpacing: ".04em", transition: "all .18s",
                background: tab === t ? "#052e16" : "transparent",
                color: tab === t ? "#4ade80" : "#166534",
              }}>{t}</button>
            ))}
          </div>

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
              <button onClick={() => load(true)} style={{ marginTop: 12, padding: "10px 24px", background: "#052e16", border: "1px solid #1a3d22", borderRadius: 10, color: "#4ade80", fontFamily: JB, fontSize: 12, letterSpacing: ".1em", cursor: "pointer" }}>↺ RETRY</button>
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
                      <span style={{ fontFamily: JB, fontSize: 15, color: "#db2777", textAlign: "center" }}>${p.targetLow?.toFixed(2)} – ${p.targetHigh?.toFixed(2)}</span>
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

          {/* BOTTOM METRICS */}
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
          }}>↺ REFRESH PREDICTION</button>

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
