
import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

const GRANULARITY_OPTIONS = [
  "Fine-grained (0.5 threshold, ~9000)",
  "Moderate (1.0 threshold, ~3000)",
  "Broad (1.5 threshold, ~1600)",
];

// ─── Chart ────────
function TrendChart({ data, type, isDark }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas || !window.Chart) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels   = data.map((d) => d.year);
    const counts   = data.map((d) => d.count);
    const maxCount = Math.max(1, ...counts);
    const ctx      = canvas.getContext("2d");

    const lineAccent = isDark ? "#00F5FF" : "#2563EB";
    const barHigh    = isDark ? "rgba(0,245,255,0.8)"   : "rgba(37,99,235,0.85)";
    const barLow     = isDark ? "rgba(124,92,255,0.6)"  : "rgba(99,102,241,0.55)";
    const barHighB   = isDark ? "#00F5FF"  : "#2563EB";
    const barLowB    = isDark ? "#7C5CFF"  : "#6366F1";
    const gridColor  = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
    const tickColor  = isDark ? "#64748b" : "#94A3B8";
    const tooltipBg  = isDark ? "#0d1b2e" : "#FFFFFF";
    const tooltipBdr = isDark ? "rgba(0,245,255,0.2)" : "rgba(37,99,235,0.25)";
    const tooltipTtl = isDark ? "#94a3b8" : "#64748B";
    const tooltipVal = isDark ? "#00F5FF"  : "#2563EB";

    const commonScales = {
      x: {
        ticks: { color: tickColor, font: { size: 11 }, autoSkip: false, maxRotation: 45 },
        grid:  { color: gridColor },
        border:{ color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" },
      },
      y: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid:  { color: gridColor },
        border:{ color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" },
      },
    };

    const tooltipOpts = {
      backgroundColor: tooltipBg,
      borderColor: tooltipBdr,
      borderWidth: 1,
      titleColor: tooltipTtl,
      bodyColor: tooltipVal,
      callbacks: { label: (ctx) => ` Papers: ${ctx.parsed.y}` },
    };

    if (type === "line") {
      const grad = ctx.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(0, isDark ? "rgba(0,245,255,0.22)" : "rgba(37,99,235,0.15)");
      grad.addColorStop(1, isDark ? "rgba(0,245,255,0)"    : "rgba(37,99,235,0)");
      chartRef.current = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            data: counts,
            borderColor: lineAccent,
            borderWidth: 2.5,
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: lineAccent,
            pointRadius: 4,
            pointHoverRadius: 7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipOpts },
          scales: commonScales,
        },
      });
    } else {
      chartRef.current = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            data: counts,
            backgroundColor: counts.map((c) => c === maxCount ? barHigh : barLow),
            borderColor:     counts.map((c) => c === maxCount ? barHighB : barLowB),
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: tooltipOpts },
          scales: commonScales,
        },
      });
    }

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, type, isDark]);

  return (
    <div style={{ position: "relative", width: "100%", height: 300 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Main ─
export default function KeywordTrendPage({ isDark, setIsDark }) {
  const [keyword,       setKeyword]       = useState("");
  const [granularity,   setGranularity]   = useState(GRANULARITY_OPTIONS[1]);
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState(null);
  const [activeTab,     setActiveTab]     = useState("line");
  const [chartReady,    setChartReady]    = useState(() => typeof window !== "undefined" && !!window.Chart);
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const s = document.createElement("script");
    s.src     = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload  = () => setChartReady(true);
    s.onerror = () => console.error("Chart.js failed to load");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND_URL}/`)
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  async function analyzeKeyword() {
    const kw = keyword.trim();
    if (!kw) return;
    setLoading(true); setErrorMsg(null); setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/keyword-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, granularity }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      if (data?.answer) setErrorMsg(data.answer);
      else              setResult(data);
    } catch (e) {
      setErrorMsg(String(e?.message || "Could not connect to backend."));
    } finally {
      setLoading(false);
    }
  }

  const chartData = (() => {
    try {
      const yc = result?.yearCounts;
      if (!yc || typeof yc !== "object") return [];
      return Object.entries(yc)
        .map(([y, c]) => ({ year: String(y), count: Math.max(0, Number(c) || 0) }))
        .sort((a, b) => a.year.localeCompare(b.year));
    } catch { return []; }
  })();

  const totalPapers  = chartData.reduce((s, d) => s + d.count, 0);
  const peakEntry    = chartData.length ? chartData.reduce((b, d) => (d.count > b.count ? d : b), chartData[0]) : null;
  const latestEntry  = chartData[chartData.length - 1] || null;
  const growthPct    = (() => {
    if (chartData.length < 2 || chartData[0].count === 0) return null;
    return Math.round(((latestEntry.count - chartData[0].count) / chartData[0].count) * 100);
  })();

  const topKws = (() => {
    try { return Array.isArray(result?.topKeywords) ? result.topKeywords.map((x) => ({ keyword: String(x?.keyword ?? ""), count: Math.max(0, Number(x?.count) || 0) })) : []; }
    catch { return []; }
  })();

  const matchedKws = (() => {
    try { return Array.isArray(result?.matchedKeywords) ? result.matchedKeywords.map(String) : []; }
    catch { return []; }
  })();

  const online = backendStatus === "online";

  // ── Theme tokens ────
  const pageBg         = isDark ? "#050c1a"   : "var(--bg)";
  const sidebarBg      = isDark ? "#070f1e"   : "linear-gradient(180deg, #1E3A8A 0%, #1e40af 60%, #2563EB 100%)";
  const sidebarBorder  = isDark ? "rgba(0,245,255,0.07)" : "rgba(37,99,235,0.0)";
  const cardBg         = isDark ? "#080f1e"   : "var(--card-bg)";
  const cardBorder     = isDark ? "rgba(0,245,255,0.07)" : "#E2E8F0";
  const primaryColor   = isDark ? "#00F5FF"   : "#2563EB";
  const accentColor    = isDark ? "#7C5CFF"   : "#6366F1";

  const labelColor     = isDark ? "#8899aa"   : "rgba(255,255,255,0.55)";
  const dividerColor   = isDark ? "rgba(0,245,255,0.06)" : "rgba(255,255,255,0.12)";
  const inputBg        = isDark ? "rgba(0,245,255,0.03)" : "rgba(255,255,255,0.15)";
  const inputBorder    = isDark ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.25)";
  const inputColor     = isDark ? "#e2e8f0"   : "#ffffff";
  const selectBg       = isDark ? "#0b1324"   : "rgba(255,255,255,0.12)";
  const selectBorder   = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.2)";
  const hintColor      = isDark ? "#4a5568"   : "rgba(255,255,255,0.45)";
  const btnBg          = isDark ? "linear-gradient(90deg, rgba(0,245,255,0.1), rgba(124,92,255,0.1))" : "rgba(255,255,255,0.18)";
  const btnBorder      = isDark ? "rgba(0,245,255,0.25)" : "rgba(255,255,255,0.45)";
  const btnColor       = isDark ? "#00F5FF"   : "#ffffff";
  const heroBg         = isDark ? "linear-gradient(160deg, #08111f 0%, #050c1a 100%)" : "linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%)";
  const heroBorder     = isDark ? "rgba(0,245,255,0.06)" : "transparent";
  const heroTag        = isDark ? "#00F5FF"   : "rgba(255,255,255,0.75)";
  const heroGrad       = isDark
    ? "linear-gradient(90deg, #2DD4FF, #7C5CFF, #E056FD)"
    : "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.85))";
  const heroSub        = isDark ? "#94a3b8"   : "rgba(255,255,255,0.72)";
  const errorBg        = isDark ? "rgba(248,113,113,0.06)" : "#FEF2F2";
  const errorBorder    = isDark ? "rgba(248,113,113,0.18)" : "#FECACA";
  const errorColor     = isDark ? "#fca5a5"   : "#DC2626";

  const chartTitleColor= isDark ? "#00F5FF"   : "#2563EB";
  const tabActiveBg    = isDark ? "rgba(0,245,255,0.08)"  : "rgba(37,99,235,0.08)";
  const tabActiveBdr   = isDark ? "rgba(0,245,255,0.35)"  : "rgba(37,99,235,0.4)";
  const tabInactiveBdr = isDark ? "rgba(255,255,255,0.07)": "#E2E8F0";
  const tabInactiveCol = isDark ? "#475569"   : "#94A3B8";
  const rankHigh       = isDark ? "#00F5FF"   : "#2563EB";
  const rankLow        = isDark ? "#4a5568"   : "#CBD5E1";
  const barTrack       = isDark ? "rgba(255,255,255,0.04)" : "#E2E8F0";
  const pillActiveBg   = isDark ? "rgba(0,245,255,0.1)"   : "rgba(37,99,235,0.1)";
  const pillActiveBdr  = isDark ? "rgba(0,245,255,0.4)"   : "rgba(37,99,235,0.4)";
  const pillInactiveBg = isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC";
  const pillInactiveBdr= isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0";
  const pillColor      = isDark ? "#94a3b8"   : "#64748B";
  const emptyColor     = isDark ? "#4a5568"   : "#94A3B8";
  const activeKwBg     = isDark ? "rgba(0,245,255,0.07)"  : "rgba(255,255,255,0.15)";
  const activeKwBdr    = isDark ? "rgba(0,245,255,0.18)"  : "rgba(255,255,255,0.35)";
  const sectionHdrSub  = isDark ? "#64748b"   : "#94A3B8";

  const onlineGreenBg  = isDark ? "rgba(74,222,128,0.05)"  : "rgba(255,255,255,0.12)";
  const onlineGreenBdr = isDark ? "rgba(74,222,128,0.12)"  : "rgba(255,255,255,0.25)";
  const offlineRedBg   = isDark ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.10)";
  const offlineRedBdr  = isDark ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.2)";
  const onlineDotColor = isDark ? "#4ADE80" : "#86efac";
  const offlineDotColor= isDark ? "#F87171" : "#fca5a5";
  const onlineTxtColor = isDark ? "#86efac" : "rgba(255,255,255,0.85)";
  const offlineTxtColor= isDark ? "#fca5a5" : "rgba(255,255,255,0.75)";

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: isDark ? "#e2e8f0" : "var(--text)", display: "flex", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", transition: "background 0.25s ease, color 0.25s ease" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 280, minWidth: 280, background: sidebarBg, borderRight: `1px solid ${sidebarBorder}`, padding: "22px 16px", display: "flex", flexDirection: "column", gap: 14, height: "100vh", position: "sticky", top: 0, overflowY: "auto", transition: "background 0.25s ease, border-color 0.25s ease" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: isDark ? "rgba(0,245,255,0.07)" : "rgba(255,255,255,0.18)", border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📡</div>
          <div>
            <div style={{ color: isDark ? primaryColor : "#ffffff", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>Trend Analytics</div>
          </div>
        </div>

        <div style={{ height: 1, background: dividerColor }} />

        {/* Keyword */}
        <div>
          <div style={{ color: labelColor, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>Search Keyword</div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyzeKeyword()}
            placeholder="e.g. zinc, nitrogen, magnetron..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: inputColor, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "background 0.25s, border-color 0.25s" }}
          />
        </div>

        {/* Granularity */}
        <div>
          <div style={{ color: labelColor, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>Specificity Level</div>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${selectBorder}`, background: selectBg, color: inputColor, fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer", transition: "background 0.25s" }}
          >
            {GRANULARITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <div style={{ color: hintColor, fontSize: 10, marginTop: 5 }}>
            {granularity.startsWith("Fine")     && "~9000 fine-grained semantic clusters"}
            {granularity.startsWith("Moderate") && "~3000 balanced topic clusters"}
            {granularity.startsWith("Broad")    && "~1600 high-level topic groupings"}
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={analyzeKeyword}
          disabled={loading || !keyword.trim()}
          style={{ padding: "12px", borderRadius: 10, border: `1px solid ${btnBorder}`, background: btnBg, color: btnColor, fontWeight: 700, fontSize: 13, cursor: loading || !keyword.trim() ? "not-allowed" : "pointer", opacity: loading || !keyword.trim() ? 0.45 : 1, fontFamily: "inherit", letterSpacing: 0.3, transition: "all 0.2s" }}
        >
          {loading ? "⏳  Analyzing..." : "⚡  Analyze Keyword"}
        </button>

        <div style={{ height: 1, background: dividerColor }} />

        {/* System status */}
        <div>
          <div style={{ color: labelColor, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>System Status</div>
          {["Trend Engine", "Semantic Search", "Cluster Database"].map((name) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: online ? onlineGreenBg : offlineRedBg, border: `1px solid ${online ? onlineGreenBdr : offlineRedBdr}`, marginBottom: 6, transition: "all 0.25s" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: online ? onlineDotColor : offlineDotColor, boxShadow: `0 0 5px ${online ? onlineDotColor : offlineDotColor}`, flexShrink: 0 }} />
              <span style={{ color: online ? onlineTxtColor : offlineTxtColor, fontSize: 11 }}>{name}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: online ? onlineDotColor : offlineDotColor }}>
                {backendStatus === "checking" ? "…" : online ? "online" : "offline"}
              </span>
            </div>
          ))}
        </div>

        {/* Active keyword pill */}
        {result?.keyword && (
          <>
            <div style={{ height: 1, background: dividerColor }} />
            <div>
              <div style={{ color: labelColor, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>Active Keyword</div>
              {/* FIXED: Font color explicitly locked to clear high-contrast white for visibility inside sidebar box */}
              <div style={{ padding: "8px 12px", borderRadius: 8, background: activeKwBg, border: `1px solid ${activeKwBdr}`, color: "#ffffff", fontSize: 12, wordBreak: "break-all", fontWeight: 600 }}>{result.keyword}</div>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, padding: "26px 28px", overflowY: "auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Hero */}
        <div style={{ borderRadius: 18, padding: "30px 34px", background: heroBg, border: `1px solid ${heroBorder}`, position: "relative", overflow: "hidden", transition: "background 0.25s ease" }}>
          {!isDark && (
            <div style={{ position: "absolute", top: 16, right: 28, pointerEvents: "none", opacity: 0.45 }}>
              {Array.from({ length: 8 }).map((_, ri) => (
                <div key={ri} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                  {Array.from({ length: 10 }).map((_, ci) => (
                    <div key={ci} style={{ width: 3, height: 3, borderRadius: "50%", background: "#ffffff", opacity: 0.18 + (ri + ci) * 0.015 }} />
                  ))}
                </div>
              ))}
            </div>
          )}
          {isDark && (
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,245,255,0.04), transparent 70%)", pointerEvents: "none" }} />
          )}
          <div style={{ fontSize: 10, letterSpacing: 3, color: heroTag, textTransform: "uppercase", marginBottom: 10, opacity: 0.7 }}>Research Intelligence Platform</div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, background: heroGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            KEYWORD TREND<br />ANALYTICS
          </h1>
          <p style={{ color: heroSub, fontSize: 13, margin: "10px 0 0", letterSpacing: 0.3 }}>Semantic trend discovery · Technology evolution · Research intelligence</p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ background: errorBg, border: `1px solid ${errorBorder}`, borderRadius: 12, padding: "13px 16px", color: errorColor, fontSize: 13 }}>
            ⚠ {errorMsg}
          </div>
        )}

        {/* Stat cards */}
        {chartData.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { label: "Matched Keyword", value: result?.keyword || "—", small: true, isYellow: true },
              { label: "Total Papers",      value: totalPapers.toLocaleString(), isYellow: true },
              { label: "Peak Year",       value: peakEntry ? peakEntry.year : "—", isYellow: true },
              { label: "Peak Count",      value: peakEntry ? peakEntry.count.toLocaleString() : "—", isYellow: true },
              { label: "Latest Year",     value: latestEntry ? latestEntry.year : "—", isYellow: true },
              {
                label: "Overall Growth",
                value: growthPct !== null ? `${growthPct > 0 ? "+" : ""}${growthPct}%` : "N/A",
                color: growthPct > 0 ? (isDark ? "#4ADE80" : "#10B981") : growthPct < 0 ? (isDark ? "#F87171" : "#EF4444") : null,
              },
            ].map(({ label, value, small, color, isYellow }) => (
              <div key={label} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "14px 16px", transition: "background 0.25s, border-color 0.25s" }}>

                <div style={{ color: isDark ? "#94A3B8" : "#64748B", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
                
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: small ? 12 : 20, 
                  color: isYellow ? "#ffca2c" : (color || (isDark ? "#FFFFFF" : "#0F172A")), 
                  wordBreak: "break-word" 
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        {chartData.length > 0 && chartReady && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "20px 22px", transition: "background 0.25s, border-color 0.25s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div style={{ color: chartTitleColor, fontSize: 15, fontWeight: 700 }}>
                Trend Over Years — <span style={{ color: accentColor }}>{result?.keyword}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["line", "📈 Line"], ["bar", "📊 Bar"]].map(([t, lbl]) => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "5px 13px", borderRadius: 8, border: `1px solid ${activeTab === t ? tabActiveBdr : tabInactiveBdr}`, background: activeTab === t ? tabActiveBg : "transparent", color: activeTab === t ? primaryColor : tabInactiveCol, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: activeTab === t ? 700 : 400, transition: "all 0.18s" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart data={chartData} type={activeTab} isDark={isDark} />
          </div>
        )}

        {/* Top Technologies */}
        {topKws.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "20px 22px", transition: "background 0.25s, border-color 0.25s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ color: chartTitleColor, fontSize: 15, fontWeight: 700 }}>🏆 Top Technologies — Latest Year</div>
              <div style={{ fontSize: 12, color: sectionHdrSub }}>Top 10 by paper count</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topKws.map((item, i) => {
                const maxC = Math.max(1, topKws[0]?.count || 1);
                const pct  = Math.min(100, Math.round((item.count / maxC) * 100));
                const isCurrent = item.keyword === result?.keyword;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ color: i < 3 ? primaryColor : rankLow, fontSize: 12, width: 22, textAlign: "right", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: isCurrent ? primaryColor : (isDark ? "#94a3b8" : "#475569"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "76%" }}>
                          {item.keyword}
                          {isCurrent && <span style={{ marginLeft: 6, fontSize: 9, color: primaryColor, border: `1px solid ${isDark ? "rgba(0,245,255,0.3)" : "rgba(37,99,235,0.35)"}`, borderRadius: 4, padding: "1px 4px" }}>current</span>}
                        </span>
                        <span style={{ fontSize: 12, color: sectionHdrSub, flexShrink: 0 }}>{item.count}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: barTrack, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: i === 0 ? primaryColor : `linear-gradient(90deg,${accentColor},${primaryColor})`, opacity: Math.max(0.3, 1 - i * 0.07), transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matched Keywords */}
        {matchedKws.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: "20px 22px", transition: "background 0.25s, border-color 0.25s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ color: chartTitleColor, fontSize: 15, fontWeight: 700 }}>🔍 Similar Matching Keywords</div>
              <div style={{ fontSize: 12, color: sectionHdrSub }}>{matchedKws.length} found · click to load</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {matchedKws.map((kw, i) => {
                const isActive = kw === result?.keyword;
                return (
                  <button key={i} onClick={() => setKeyword(kw)} style={{ padding: "7px 13px", borderRadius: 999, border: `1px solid ${isActive ? pillActiveBdr : pillInactiveBdr}`, background: isActive ? pillActiveBg : pillInactiveBg, color: isActive ? primaryColor : pillColor, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}>
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !errorMsg && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.15 }}>📊</div>
            <div style={{ fontSize: 15, color: emptyColor, marginBottom: 6 }}>No analysis yet</div>
            <div style={{ fontSize: 12, color: isDark ? "#334155" : "#CBD5E1" }}>Enter a keyword in the sidebar and press Analyze</div>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>⏳</div>
            <div style={{ fontSize: 14, color: isDark ? "#94a3b8" : "#64748B" }}>Analyzing "{keyword}"...</div>
          </div>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: ${isDark ? "#4a5568" : "rgba(255,255,255,0.45)"}; }
        select option { background: ${isDark ? "#0b1324" : "#FFFFFF"}; color: ${isDark ? "#e2e8f0" : "#0F172A"}; }
      `}</style>
    </div>
  );
}
