import { useState, useRef, useEffect } from "react";
import { useTheme } from "../components/Layout";

// ─── PURE SVG CHART COMPONENTS (no recharts) ──────────────────────────────────

function SvgHistogram({ data, color, isDark }) {
  if (!data || !data.counts || data.counts.length === 0) return null;

  const W = 560, H = 120, PL = 28, PR = 8, PT = 6, PB = 20;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const maxCount = Math.max(...data.counts, 1);
  const barCount = data.counts.length;
  const barW = innerW / barCount;
  const gap = Math.max(1, barW * 0.08);

  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textColor = isDark ? "#64748B" : "#94A3B8";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PT + innerH * (1 - f),
    label: Math.round(maxCount * f),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {yTicks.map((t, i) => (
        <line key={i} x1={PL} x2={W - PR} y1={t.y} y2={t.y} stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {yTicks.map((t, i) => (
        <text key={i} x={PL - 4} y={t.y + 3.5} textAnchor="end" fontSize="8" fill={textColor}>{t.label}</text>
      ))}
      {data.counts.map((count, i) => {
        const bh = (count / maxCount) * innerH;
        const x = PL + i * barW + gap / 2;
        const y = PT + innerH - bh;
        const w = barW - gap;
        return (
          <rect key={i} x={x} y={y} width={Math.max(w, 1)} height={bh}
            fill={color} opacity="0.82" rx="2" />
        );
      })}
      {[0, Math.floor(barCount / 2), barCount - 1].map(i => {
        const val = data.edges[i];
        const x = PL + i * barW + barW / 2;
        return (
          <text key={i} x={x} y={H - 3} textAnchor="middle" fontSize="8" fill={textColor}>
            {Number(val).toFixed(1)}
          </text>
        );
      })}
      <line x1={PL} x2={W - PR} y1={PT + innerH} y2={PT + innerH} stroke={gridColor} strokeWidth="1" />
    </svg>
  );
}

function SvgBarChart({ data, isDark }) {
  if (!data || data.length === 0) return null;

  const W = 560, H = 160, PL = 8, PR = 8, PT = 6, PB = 60;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const COLORS = ["#60A5FA", "#34D399", "#A78BFA", "#FBBF24", "#F87171", "#22D3EE", "#FB923C", "#4ADE80", "#818CF8", "#F472B6"];

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const barCount = data.length;
  const barW = innerW / barCount;
  const gap = Math.max(2, barW * 0.15);
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const textColor = isDark ? "#64748B" : "#94A3B8";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 0.5, 1].map((f, i) => (
        <line key={i} x1={PL} x2={W - PR} y1={PT + innerH * (1 - f)} y2={PT + innerH * (1 - f)}
          stroke={gridColor} strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {data.map((d, i) => {
        const bh = (d.count / maxCount) * innerH;
        const x = PL + i * barW + gap / 2;
        const y = PT + innerH - bh;
        const w = barW - gap;
        return (
          <g key={i}>
            <rect x={x} y={y} width={Math.max(w, 1)} height={bh}
              fill={COLORS[i % COLORS.length]} opacity="0.85" rx="3" />
            <text x={x + w / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={COLORS[i % COLORS.length]} fontWeight="700">
              {d.count}
            </text>
            <text
              x={x + w / 2} y={PT + innerH + 10}
              textAnchor="end"
              fontSize="8"
              fill={textColor}
              transform={`rotate(-35, ${x + w / 2}, ${PT + innerH + 10})`}
            >
              {d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name}
            </text>
          </g>
        );
      })}
      <line x1={PL} x2={W - PR} y1={PT + innerH} y2={PT + innerH} stroke={gridColor} strokeWidth="1" />
    </svg>
  );
}

function BoxSummary({ data, color, unit, isDark }) {
  if (!data) return null;
  const bg     = isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9";
  const border = isDark ? "rgba(255,255,255,0.08)"  : "#E2E8F0";
  const items = [
    { label: "Min",    val: data.min    },
    { label: "Q1",     val: data.q1     },
    { label: "Median", val: data.median },
    { label: "Q3",     val: data.q3     },
    { label: "Max",    val: data.max    },
  ];
  return (
    <div style={{ display: "flex", gap: 0, marginTop: 6, borderRadius: 8, overflow: "hidden", border: `1px solid ${border}` }}>
      {items.map((item, i) => (
        <div key={i} style={{ flex: 1, padding: "6px 0", background: bg, borderRight: i < 4 ? `1px solid ${border}` : "none", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: isDark ? "#64748B" : "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>
            {item.val != null ? Number(item.val).toFixed(1) : "—"}
          </div>
          <div style={{ fontSize: 9, color: isDark ? "#64748B" : "#94A3B8" }}>{unit}</div>
        </div>
      ))}
    </div>
  );
}

function HistogramChart({ data, color, title, unit, isDark }) {
  if (!data) return null;
  const textColor = isDark ? "#94A3B8" : "#475569";
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color }}>{title}</div>
        <div style={{ display: "flex", gap: 14, fontSize: 10, color: textColor }}>
          <span>Mean <b style={{ color }}>{data.mean?.toFixed(1)}</b> {unit}</span>
          <span>Median <b style={{ color }}>{data.median?.toFixed(1)}</b> {unit}</span>
          <span>Mode <b style={{ color }}>{data.mode?.toFixed(1)}</b> {unit}</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: textColor, marginBottom: 6 }}>
        Range: {data.min?.toFixed(2)} – {data.max?.toFixed(2)} {unit} · n = {data.count}
      </div>
      <SvgHistogram data={data} color={color} isDark={isDark} />
      <BoxSummary data={data} color={color} unit={unit} isDark={isDark} />
    </div>
  );
}

function SubstrateBarChart({ data, isDark }) {
  if (!data || data.length === 0) return null;
  const textColor = isDark ? "#94A3B8" : "#475569";
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#60A5FA", marginBottom: 10 }}>
        Preferred Substrates
        <span style={{ fontSize: 10, color: textColor, fontWeight: 400, marginLeft: 8 }}>count by substrate type</span>
      </div>
      <SvgBarChart data={data} isDark={isDark} />
    </div>
  );
}

// ─── DECORATIONS ──────────────────────────────────────────────────────────────

const SidebarMolecular = ({ isDark }) => (
  <svg width="220" height="130" viewBox="0 0 220 130" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", marginTop: "auto" }}>
    <circle cx="110" cy="65" r="14" fill={isDark ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.10)"} />
    <circle cx="110" cy="65" r="9"  fill={isDark ? "rgba(96,165,250,0.25)" : "rgba(37,99,235,0.20)"} />
    <circle cx="110" cy="65" r="5"  fill={isDark ? "#60A5FA" : "#2563EB"} opacity="0.9" />
    <circle cx="55"  cy="35" r="10" fill={isDark ? "rgba(139,92,246,0.15)" : "rgba(109,40,217,0.10)"} />
    <circle cx="55"  cy="35" r="6"  fill={isDark ? "rgba(139,92,246,0.3)"  : "rgba(109,40,217,0.25)"} />
    <circle cx="55"  cy="35" r="3.5" fill={isDark ? "#8B5CF6" : "#7C3AED"} opacity="0.9" />
    <circle cx="165" cy="35" r="9"  fill={isDark ? "rgba(6,182,212,0.15)"  : "rgba(8,145,178,0.10)"} />
    <circle cx="165" cy="35" r="5.5" fill={isDark ? "rgba(6,182,212,0.3)" : "rgba(8,145,178,0.25)"} />
    <circle cx="165" cy="35" r="3"  fill={isDark ? "#06B6D4" : "#0891B2"} opacity="0.9" />
    <circle cx="40"  cy="95" r="7"  fill={isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)"} />
    <circle cx="40"  cy="95" r="4"  fill={isDark ? "rgba(96,165,250,0.3)"  : "rgba(37,99,235,0.20)"} />
    <circle cx="40"  cy="95" r="2.5" fill={isDark ? "#60A5FA" : "#2563EB"} opacity="0.7" />
    <circle cx="180" cy="95" r="8"  fill={isDark ? "rgba(139,92,246,0.12)" : "rgba(109,40,217,0.08)"} />
    <circle cx="180" cy="95" r="4.5" fill={isDark ? "rgba(139,92,246,0.25)" : "rgba(109,40,217,0.18)"} />
    <circle cx="180" cy="95" r="2.5" fill={isDark ? "#A78BFA" : "#8B5CF6"} opacity="0.8" />
    <circle cx="110" cy="118" r="6"  fill={isDark ? "rgba(6,182,212,0.12)" : "rgba(8,145,178,0.08)"} />
    <circle cx="110" cy="118" r="3.5" fill={isDark ? "rgba(6,182,212,0.3)" : "rgba(8,145,178,0.22)"} />
    <circle cx="110" cy="118" r="2"  fill={isDark ? "#22D3EE" : "#0891B2"} opacity="0.8" />
    <line x1="110" y1="65" x2="55"  y2="35"  stroke={isDark ? "rgba(96,165,250,0.35)"  : "rgba(37,99,235,0.25)"}  strokeWidth="1.2" />
    <line x1="110" y1="65" x2="165" y2="35"  stroke={isDark ? "rgba(6,182,212,0.35)"   : "rgba(8,145,178,0.25)"}  strokeWidth="1.2" />
    <line x1="110" y1="65" x2="40"  y2="95"  stroke={isDark ? "rgba(96,165,250,0.25)"  : "rgba(37,99,235,0.18)"}  strokeWidth="1" />
    <line x1="110" y1="65" x2="180" y2="95"  stroke={isDark ? "rgba(139,92,246,0.25)"  : "rgba(109,40,217,0.18)"} strokeWidth="1" />
    <line x1="110" y1="65" x2="110" y2="118" stroke={isDark ? "rgba(6,182,212,0.25)"   : "rgba(8,145,178,0.18)"}  strokeWidth="1" />
    <line x1="55"  y1="35" x2="165" y2="35"  stroke={isDark ? "rgba(96,165,250,0.1)"   : "rgba(37,99,235,0.08)"}  strokeWidth="0.7" />
  </svg>
);

const BannerAtom = () => (
  <svg width="170" height="170" viewBox="0 0 170 170" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.85 }}>
    <circle cx="85" cy="85" r="22" fill="rgba(96,165,250,0.08)" />
    <circle cx="85" cy="85" r="14" fill="rgba(96,165,250,0.18)" />
    <circle cx="85" cy="85" r="8"  fill="rgba(96,165,250,0.5)" />
    <circle cx="85" cy="85" r="5"  fill="#60A5FA" />
    <ellipse cx="85" cy="85" rx="78" ry="28" stroke="rgba(96,165,250,0.55)"  strokeWidth="1.5" fill="none" />
    <ellipse cx="85" cy="85" rx="78" ry="28" stroke="rgba(139,92,246,0.45)" strokeWidth="1.2" fill="none" transform="rotate(60 85 85)" />
    <ellipse cx="85" cy="85" rx="78" ry="28" stroke="rgba(6,182,212,0.45)"  strokeWidth="1.2" fill="none" transform="rotate(120 85 85)" />
    <circle cx="163" cy="85"  r="5.5" fill="#60A5FA" opacity="0.9" />
    <circle cx="124" cy="17"  r="4.5" fill="#A78BFA" opacity="0.85" />
    <circle cx="46"  cy="17"  r="4"   fill="#22D3EE" opacity="0.8" />
    <circle cx="7"   cy="85"  r="4"   fill="#60A5FA" opacity="0.7" />
    <circle cx="46"  cy="153" r="3.5" fill="#22D3EE" opacity="0.7" />
    <circle cx="124" cy="153" r="4"   fill="#A78BFA" opacity="0.7" />
  </svg>
);

const AssistantDecoration = () => (
  <svg width="130" height="90" viewBox="0 0 130 90" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", right: 16, top: 16, pointerEvents: "none", opacity: 0.85 }}>
    <rect x="8"  y="38" width="8" height="24" rx="2" fill="rgba(96,165,250,0.25)"  stroke="rgba(96,165,250,0.5)"  strokeWidth="0.8" />
    <rect x="20" y="28" width="8" height="34" rx="2" fill="rgba(139,92,246,0.25)" stroke="rgba(139,92,246,0.5)" strokeWidth="0.8" />
    <rect x="32" y="18" width="8" height="44" rx="2" fill="rgba(96,165,250,0.3)"  stroke="rgba(96,165,250,0.6)"  strokeWidth="0.8" />
    <rect x="44" y="32" width="8" height="30" rx="2" fill="rgba(6,182,212,0.25)"  stroke="rgba(6,182,212,0.5)"  strokeWidth="0.8" />
    <line x1="4" y1="63" x2="58" y2="63" stroke="rgba(148,163,184,0.4)" strokeWidth="0.8" />
    <rect x="2" y="10" width="60" height="60" rx="8" stroke="rgba(96,165,250,0.2)" strokeWidth="1" fill="rgba(15,23,42,0.3)" />
    <circle cx="78" cy="52" r="22" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.5)"  strokeWidth="2.5" />
    <circle cx="78" cy="52" r="14" fill="rgba(96,165,250,0.08)" stroke="rgba(96,165,250,0.25)" strokeWidth="1" />
    <line x1="95" y1="69" x2="110" y2="84" stroke="rgba(96,165,250,0.7)" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="108" cy="14" r="5"   fill="rgba(96,165,250,0.2)"  stroke="#60A5FA" strokeWidth="1.2" />
    <circle cx="124" cy="6"  r="3.5" fill="rgba(6,182,212,0.2)"  stroke="#22D3EE" strokeWidth="1" />
    <circle cx="124" cy="22" r="3.5" fill="rgba(139,92,246,0.2)" stroke="#A78BFA" strokeWidth="1" />
  </svg>
);

const CrystalLattice = ({ isDark }) => {
  const color = isDark ? "#60A5FA" : "#2563EB";
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="lattice-bg" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="1.8" fill={color} opacity={isDark ? "0.18" : "0.05"} />
          <circle cx="0"  cy="0"  r="1.3" fill={color} opacity={isDark ? "0.12" : "0.03"} />
          <circle cx="60" cy="0"  r="1.3" fill={color} opacity={isDark ? "0.12" : "0.03"} />
          <circle cx="0"  cy="60" r="1.3" fill={color} opacity={isDark ? "0.12" : "0.03"} />
          <circle cx="60" cy="60" r="1.3" fill={color} opacity={isDark ? "0.12" : "0.03"} />
          <line x1="0"  y1="0"  x2="30" y2="30" stroke={color} strokeWidth="0.5" opacity={isDark ? "0.07" : "0.02"} />
          <line x1="60" y1="0"  x2="30" y2="30" stroke={color} strokeWidth="0.5" opacity={isDark ? "0.07" : "0.02"} />
          <line x1="0"  y1="60" x2="30" y2="30" stroke={color} strokeWidth="0.5" opacity={isDark ? "0.07" : "0.02"} />
          <line x1="60" y1="60" x2="30" y2="30" stroke={color} strokeWidth="0.5" opacity={isDark ? "0.07" : "0.02"} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lattice-bg)" />
    </svg>
  );
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function StatRow({ label, value, unit, color, isDark }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}` }}>
      <span style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#64748B" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || (isDark ? "#F1F5F9" : "#0F172A") }}>
        {value != null ? Number(value).toFixed(2) : "—"} {unit}
      </span>
    </div>
  );
}

function KPICard({ label, value, sub, accent, icon, isDark }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   isDark ? "#111827" : "#FFFFFF",
        border:       `1px solid ${hov ? accent : (isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0")}`,
        borderRadius: 16,
        padding:      "18px 20px",
        boxShadow:    hov
          ? "0 8px 30px rgba(0,0,0,0.10)"
          : isDark ? "0 1px 3px rgba(0,0,0,0.07)" : "0 1px 6px rgba(0,0,0,0.05)",
        transition:   "all 0.22s ease",
        transform:    hov ? "translateY(-2px)" : "none",
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)`, borderRadius: "16px 16px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + "18", border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: accent, textTransform: "uppercase", background: accent + "12", padding: "3px 8px", borderRadius: 6 }}>LIVE</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: isDark ? "#F1F5F9" : "#0F172A", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#F1F5F9" : "#0F172A", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: isDark ? "#64748B" : "#94A3B8", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function StatusPill({ label, isDark }) {
  return (
    <div style={{
      padding:      "7px 10px",
      borderRadius: 9,
      background:   isDark ? "rgba(52,211,153,0.08)"  : "rgba(16,185,129,0.08)",
      border:       `1px solid ${isDark ? "rgba(52,211,153,0.2)" : "rgba(16,185,129,0.25)"}`,
      marginBottom: 7,
      color:        isDark ? "#34D399" : "#059669",
      fontSize:     11,
      display:      "flex",
      alignItems:   "center",
      gap:          7,
      fontWeight:   500,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#34D399" : "#059669", boxShadow: isDark ? "0 0 6px #34D399" : "0 0 6px #059669", flexShrink: 0 }} />
      {label}
    </div>
  );
}

function SidebarStat({ label, value, sub, accent, icon, isDark }) {
  return (
    <div style={{
      background:   isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      border:       `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      padding:      "12px 11px",
      borderRadius: 11,
      display:      "flex",
      alignItems:   "center",
      gap:          10,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: accent + "20", border: `1px solid ${accent}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, color: isDark ? "#94A3B8" : "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#F8FAFC" : "#0F172A", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 9.5, color: isDark ? "#64748B" : "#94A3B8", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SpatteringPage() {
  const { isDark, setIsDark } = useTheme();

  const [question,        setQuestion]        = useState("");
  const [answer,          setAnswer]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [apiKey,          setApiKey]          = useState("");
  const [activeTab,       setActiveTab]       = useState("analytics");
  const [materialQuery,   setMaterialQuery]   = useState("ZnO");

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsResult,  setAnalyticsResult]  = useState(null);
  const [analyticsError,   setAnalyticsError]   = useState("");
  const [groupedMaterials, setGroupedMaterials] = useState([]);
  const [groupingStatus,   setGroupingStatus]   = useState("");

  // ── Theme tokens (light / dark) ────────────────────────────────────────────
  const primaryColor  = isDark ? "#60A5FA"  : "#2563EB";
  const primaryDim    = isDark ? "rgba(96,165,250,0.10)"  : "#EFF6FF";
  const primaryBorder = isDark ? "rgba(96,165,250,0.25)"  : "#BFDBFE";
  const accentColor   = isDark ? "#A78BFA"  : "#7C3AED";
  const successColor  = isDark ? "#34D399"  : "#059669";
  const successDim    = isDark ? "rgba(52,211,153,0.1)"   : "#ECFDF5";
  const successBorder = isDark ? "rgba(52,211,153,0.25)"  : "#A7F3D0";
  const inputBg       = isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC";
  const borderColor   = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
  const tabBarBg      = isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9";
  const shadowLg      = isDark
    ? "0 8px 30px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)"
    : "0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)";
  const heroGradient  = isDark
    ? "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)"
    : "linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%)";
  const statBarBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.20)";
  const statBarBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)";

  // Page / card backgrounds
  const pageBg       = isDark ? "#0B1120"  : "#F1F5F9";
  const cardBg       = isDark ? "#111827"  : "#FFFFFF";
  const mainTextCol  = isDark ? "#F1F5F9"  : "#0F172A";
  const subTextCol   = isDark ? "#CBD5E1"  : "#334155";
  const mutedTextCol = isDark ? "#64748B"  : "#94A3B8";

  // Sidebar tokens
  const sidebarBg      = isDark ? "#0F172A"  : "#F8FAFC";
  const sidebarBorder  = isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0";
  const sidebarText    = isDark ? "white"    : "#0F172A";
  const sidebarInputBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const sidebarInputBdr= isDark ? "rgba(255,255,255,0.10)" : "#D1D9E6";
  const sidebarLabel   = isDark ? "#94A3B8"  : "#64748B";
  const sidebarDivider = isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0";
  const sidebarMonoVal = isDark ? "white"    : "#1E293B";

  // Input styling
  const inputBorder    = isDark ? "rgba(255,255,255,0.15)" : "#D1D9E6";
  const inputTextColor = isDark ? "#F1F5F9"  : "#0F172A";

  const kpiAccents = ["#2563EB", "#0891B2", "#7C3AED", "#10B981"];

  // ── Analytics fetch ────────────────────────────────────────────────────────
  async function fetchAnalytics() {
    if (!materialQuery.trim()) return;
    setAnalyticsLoading(true);
    setAnalyticsResult(null);
    setAnalyticsError("");
    setGroupedMaterials([]);
    setGroupingStatus("");

    let groupedParam = "";

    if (apiKey.trim()) {
      setGroupingStatus("grouping");
      try {
        const gRes = await fetch(
          `http://127.0.0.1:8000/api/sputtering/group?material=${encodeURIComponent(materialQuery.trim())}&api_key=${encodeURIComponent(apiKey.trim())}`
        );
        const gData = await gRes.json();
        const grouped = gData.grouped_materials || [];
        setGroupedMaterials(grouped);
        setGroupingStatus("done");
        if (grouped.length > 0) groupedParam = grouped.join("|||");
      } catch {
        setGroupingStatus("");
      }
    }

    try {
      const url = groupedParam
        ? `http://127.0.0.1:8000/api/sputtering/analytics?material=${encodeURIComponent(materialQuery.trim())}&grouped_materials=${encodeURIComponent(groupedParam)}`
        : `http://127.0.0.1:8000/api/sputtering/analytics?material=${encodeURIComponent(materialQuery.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      setAnalyticsResult(await res.json());
    } catch (err) {
      setAnalyticsError(err.message || "Error connecting to backend. Make sure it is running on port 8000.");
    }

    setAnalyticsLoading(false);
  }

  async function askAI() {
    if (!question.trim()) return;
    if (!apiKey.trim()) { setAnswer("Please enter your Gemini API Key in the sidebar."); return; }
    setLoading(true); setAnswer("");
    try {
      const res = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, apiKey }),
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setAnswer("Error connecting to local backend. Make sure it is running on port 8000.");
    }
    setLoading(false);
  }

  const r = analyticsResult;

  const paramCharts = [
    { key: "power_W",                color: "#34D399", title: "Power Settings (Watts)",        unit: "W"       },
    { key: "temperature_C",          color: "#FBBF24", title: "Temperature Distribution (°C)", unit: "°C"     },
    { key: "pressure_Pa",            color: "#F87171", title: "Working Pressure (Pa)",          unit: "Pa"     },
    { key: "deposition_rate_nm_min", color: "#60A5FA", title: "Deposition Rate (nm/min)",       unit: "nm/min" },
  ];

  return (
    <div style={{
      minHeight:   "100vh",
      background:  pageBg,
      color:       mainTextCol,
      display:     "flex",
      flexDirection: "column",
      fontFamily:  "'IBM Plex Sans','Segoe UI',-apple-system,sans-serif",
      transition:  "background 0.25s ease, color 0.25s ease",
    }}>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{
          width:      240,
          background: sidebarBg,
          display:    "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: `1px solid ${sidebarBorder}`,
          overflowY:  "auto",
          minHeight:  "100vh",
          transition: "background 0.25s ease, border-color 0.25s ease",
        }}>
          <div style={{ padding: "20px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: isDark ? "rgba(96,165,250,0.15)" : "rgba(37,99,235,0.10)", border: `1px solid ${isDark ? "rgba(96,165,250,0.25)" : "rgba(37,99,235,0.20)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: sidebarText }}>AI Configuration</span>
            </div>

            {/* API Key */}
            <div>
              <div style={{ fontSize: 10, color: sidebarLabel, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Gemini API Key</div>
              <div style={{ position: "relative" }}>
                <input
                  type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-••••••••••••••••"
                  style={{ width: "100%", padding: "9px 32px 9px 11px", borderRadius: 8, background: sidebarInputBg, border: `1px solid ${sidebarInputBdr}`, color: sidebarText, outline: "none", fontSize: 12, boxSizing: "border-box", fontFamily: "monospace", transition: "all 0.25s ease" }}
                />
                <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sidebarLabel} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <div style={{ fontSize: 9, color: mutedTextCol, marginTop: 5, lineHeight: 1.4 }}>
                Required for AI grouping &amp; AI Assistant. Get one at aistudio.google.com
              </div>
            </div>

            {/* Model */}
            <div>
              <div style={{ fontSize: 10, color: sidebarLabel, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Gemini Model</div>
              <div style={{ padding: "9px 11px", borderRadius: 8, background: sidebarInputBg, border: `1px solid ${sidebarInputBdr}`, color: sidebarMonoVal, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "monospace", transition: "all 0.25s ease" }}>
                <span>gemini-2.5-flash</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke={sidebarLabel} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            </div>

            <div style={{ height: 1, background: sidebarDivider }} />

            {/* Status */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <span style={{ fontSize: 10, color: sidebarLabel, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>System Status</span>
              </div>
              <StatusPill label="Vector Database Online" isDark={isDark} />
              <StatusPill label="RAG Pipeline Active"    isDark={isDark} />
              <StatusPill label="Semantic Retrieval Ready" isDark={isDark} />
            </div>

            <div style={{ height: 1, background: sidebarDivider }} />

            {/* Knowledge base */}
            <div>
              <div style={{ fontSize: 10, color: sidebarLabel, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Knowledge Base</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SidebarStat label="Research Papers"   value="1,000+"  sub="Indexed & analyzed"      accent="#60A5FA" icon="📄" isDark={isDark} />
                <SidebarStat label="Material Families" value="50+"     sub="Oxide · Nitride · Metal"  accent="#22D3EE" icon="⚗️" isDark={isDark} />
                <SidebarStat label="Dataset Records"   value="12,400+" sub="Validated parameters"    accent="#A78BFA" icon="📊" isDark={isDark} />
                <SidebarStat label="Knowledge Sources" value="38"      sub="Journals & conferences"   accent="#34D399" icon="🔗" isDark={isDark} />
              </div>
            </div>
          </div>
          <SidebarMolecular isDark={isDark} />
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "24px", overflowY: "auto", minWidth: 0, position: "relative" }}>
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
            <CrystalLattice isDark={isDark} />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>

            {/* ── Hero ── */}
            <div style={{ background: heroGradient, borderRadius: 20, padding: "32px 36px", marginBottom: 22, boxShadow: shadowLg, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "32px 32px", borderRadius: 20 }} />
              <BannerAtom />
              <div style={{ position: "relative" }}>
                <h1 style={{ fontSize: 32, margin: "0 0 8px", color: "#FFFFFF", letterSpacing: "-1px", fontWeight: 900, lineHeight: 1.15, maxWidth: "60%" }}>
                  Sputtering Intelligence System
                </h1>
                <p style={{ color: "rgba(255,255,255,0.75)", margin: "0 0 22px", fontSize: 13, maxWidth: "55%", lineHeight: 1.6 }}>
                  AI-Powered Thin Film Deposition Analysis · Material Intelligence · Semantic Research Engine
                </p>
                <div style={{ display: "flex", gap: 0, background: statBarBg, borderRadius: 12, border: `1px solid ${statBarBorder}`, overflow: "hidden", width: "fit-content" }}>
                  {[
                    { icon: "📄", val: "1,000+",    label: "Research Papers"  },
                    { icon: "⚗️", val: "50+",        label: "Material Families" },
                    { icon: "📈", val: "Real-time",  label: "Analytics"        },
                    { icon: "🧠", val: "AI Semantic", label: "Retrieval"       },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "10px 20px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.15)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 1 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── KPI Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
              {[
                { label: "Research Papers",   value: "1,000+",   sub: "Indexed & semantically analyzed",       icon: "📄", accent: kpiAccents[0] },
                { label: "Material Families", value: "50+",      sub: "Across oxide, nitride & metal classes",  icon: "⚗️", accent: kpiAccents[1] },
                { label: "Dataset Records",   value: "12,400+",  sub: "Validated deposition parameters",        icon: "📊", accent: kpiAccents[2] },
                { label: "AI Models",         value: "3 Active", sub: "Gemini · RAG · Semantic search",         icon: "🧠", accent: kpiAccents[3] },
              ].map((k, i) => <KPICard key={i} {...k} isDark={isDark} />)}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: "flex", gap: 4, marginBottom: 18, background: tabBarBg, borderRadius: 12, padding: 5, width: "fit-content", border: `1px solid ${borderColor}`, transition: "background 0.25s ease" }}>
              {[
                { id: "analytics", label: "Material Analytics",    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
                { id: "assistant", label: "AI Research Assistant", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    padding:    "9px 18px",
                    borderRadius: 9,
                    border:     "none",
                    background: isActive ? "#2563EB" : "transparent",
                    color:      isActive ? "#FFFFFF"  : (isDark ? "#94A3B8" : "#475569"),
                    cursor:     "pointer",
                    fontWeight: isActive ? 700 : 500,
                    fontSize:   13,
                    display:    "flex",
                    alignItems: "center",
                    gap:        7,
                    transition: "all 0.18s ease",
                    boxShadow:  isActive ? "0 2px 8px rgba(37,99,235,0.40)" : "none",
                    fontFamily: "inherit",
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ══════════ Analytics Tab ══════════ */}
            {activeTab === "analytics" && (
              <div style={{ background: cardBg, borderRadius: 20, padding: "26px", boxShadow: shadowLg, border: `1px solid ${borderColor}`, transition: "background 0.25s ease" }}>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: primaryDim, border: `1px solid ${primaryBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: mainTextCol }}>Material Analytics</div>
                    <div style={{ fontSize: 11, color: mutedTextCol }}>Real-time sputtering insights — histograms, distributions, parameter trends</div>
                  </div>
                </div>
                <div style={{ height: 1, background: borderColor, margin: "16px 0" }} />

                {/* Search row */}
                <div style={{ display: "flex", gap: 9, marginBottom: 16, maxWidth: 660 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke={isDark ? "#CBD5E1" : "#64748B"} strokeWidth="1.5"/>
                      <path d="M9.5 9.5l2 2" stroke={isDark ? "#CBD5E1" : "#64748B"} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input
                      value={materialQuery}
                      onChange={e => setMaterialQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && fetchAnalytics()}
                      placeholder="Material formula (e.g. ZnO, TiO₂, AlN…)"
                      style={{ width: "100%", padding: "11px 12px 11px 34px", borderRadius: 10, border: `1.5px solid ${inputBorder}`, background: inputBg, color: inputTextColor, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "all 0.25s ease" }}
                    />
                  </div>
                  <button
                    onClick={fetchAnalytics}
                    disabled={analyticsLoading}
                    style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#2563EB", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(37,99,235,0.44)", opacity: analyticsLoading ? 0.7 : 1, fontFamily: "inherit" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    {analyticsLoading ? "Analyzing…" : "Analyze"}
                  </button>
                </div>

                {/* Grouping banners */}
                {groupingStatus === "grouping" && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: primaryDim, border: `1px solid ${primaryBorder}`, color: primaryColor, fontSize: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    AI grouping all chemical variants of <b style={{ marginLeft: 4 }}>{materialQuery}</b>…
                  </div>
                )}
                {groupingStatus === "done" && groupedMaterials.length > 0 && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: successDim, border: `1px solid ${successBorder}`, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: successColor, marginBottom: 6 }}>
                      ✅ AI successfully grouped these variations together:
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? "#A7F3D0" : "#065F46", lineHeight: 1.6 }}>
                      {groupedMaterials.slice(0, 20).join(", ")}
                      {groupedMaterials.length > 20 && ` … and ${groupedMaterials.length - 20} more`}
                    </div>
                  </div>
                )}

                {/* Error */}
                {analyticsError && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: isDark ? "rgba(254,242,242,0.05)" : "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <div><div style={{ fontWeight: 700, marginBottom: 2 }}>Analysis failed</div>{analyticsError}</div>
                  </div>
                )}

                {/* Empty state */}
                {!r && !analyticsLoading && !analyticsError && (
                  <div style={{ textAlign: "center", color: mutedTextCol, padding: "60px 0", fontSize: 13 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: primaryDim, border: `1px solid ${primaryBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <div style={{ color: mainTextCol, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No Material Selected</div>
                    <div style={{ fontSize: 12 }}>Enter a material formula and click Analyze to see distributions</div>
                    <div style={{ fontSize: 11, color: mutedTextCol, marginTop: 6 }}>Try: ZnO · TiO₂ · AlN · ITO · HfO₂</div>
                  </div>
                )}

                {/* Loading skeleton */}
                {analyticsLoading && (
                  <div style={{ display: "grid", gap: 16 }}>
                    {[160, 160, 160, 200].map((h, i) => (
                      <div key={i} style={{ height: h, background: inputBg, borderRadius: 12, overflow: "hidden", position: "relative" }}>
                        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,${borderColor},transparent)`, animation: "shimmer 1.5s infinite" }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {r && !analyticsLoading && (
                  <div>
                    {/* Result header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${borderColor}` }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: primaryColor }}>{r.material}</div>
                        <div style={{ fontSize: 11, color: mutedTextCol, marginTop: 2 }}>
                          Analysis based on {r.record_count} validated deposition records
                          {groupedMaterials.length > 0 && ` across ${groupedMaterials.length} chemical variants`}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, background: successDim, color: successColor, border: `1px solid ${successBorder}`, fontWeight: 700 }}>
                        {r.record_count} records
                      </span>
                    </div>

                    {/* Core Parameters */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: mainTextCol, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        🔬 Core Parameters Consensus
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                        {[
                          { label: "Target Power",     data: r.power_W,                color: "#34D399", unit: "W",      icon: "⚡" },
                          { label: "Temperature",      data: r.temperature_C,          color: "#FBBF24", unit: "°C",     icon: "🌡️" },
                          { label: "Working Pressure", data: r.pressure_Pa,            color: "#F87171", unit: "Pa",     icon: "💨" },
                          { label: "Deposition Rate",  data: r.deposition_rate_nm_min, color: "#60A5FA", unit: "nm/min", icon: "📈" },
                        ].map((p, i) => (
                          <div key={i} style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: "14px" }}>
                            <div style={{ fontSize: 10, color: p.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                              <span>{p.icon}</span> {p.label}
                            </div>
                            {p.data ? (
                              <>
                                <StatRow label="Mean"   value={p.data.mean}   unit={p.unit} color={p.color} isDark={isDark} />
                                <StatRow label="Median" value={p.data.median} unit={p.unit} color={p.color} isDark={isDark} />
                                <StatRow label="Mode"   value={p.data.mode}   unit={p.unit} color={p.color} isDark={isDark} />
                                <div style={{ fontSize: 10, color: p.color, fontWeight: 600, marginTop: 3 }}>
                                  {p.data.min?.toFixed(2)} – {p.data.max?.toFixed(2)} {p.unit}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 11, color: mutedTextCol, paddingTop: 4 }}>No data found</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Substrates pills */}
                    {r.top_substrates?.length > 0 && (
                      <div style={{ marginBottom: 24, padding: "14px 16px", background: inputBg, borderRadius: 12, border: `1px solid ${borderColor}` }}>
                        <div style={{ fontSize: 11, color: subTextCol, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                          📦 Top Substrate · Most Common: <span style={{ color: primaryColor }}>{r.top_substrates[0]}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {r.top_substrates.map((s, i) => (
                            <span key={i} style={{ padding: "4px 10px", borderRadius: 7, background: primaryDim, border: `1px solid ${primaryBorder}`, color: primaryColor, fontSize: 11, fontWeight: 600 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parameter Distributions */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: mainTextCol, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${borderColor}` }}>
                        📊 Parameter Distributions
                        <span style={{ fontSize: 11, color: mutedTextCol, fontWeight: 400, marginLeft: 8 }}>Histograms · Box plots · Statistical summaries</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {paramCharts.map(({ key, color, title, unit }) => (
                          r[key] ? (
                            <div key={key} style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "16px" }}>
                              <HistogramChart data={r[key]} color={color} title={title} unit={unit} isDark={isDark} />
                            </div>
                          ) : (
                            <div key={key} style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "16px" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 8 }}>{title}</div>
                              <div style={{ fontSize: 11, color: mutedTextCol }}>No data found in dataset for this parameter.</div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Substrate Bar Chart */}
                    {r.substrate_counts?.length > 0 && (
                      <div style={{ background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "16px", marginTop: 24 }}>
                        <SubstrateBarChart data={r.substrate_counts} isDark={isDark} />
                      </div>
                    )}

                    {/* Gases */}
                    {r.top_gases?.length > 0 && (
                      <div style={{ marginTop: 16, padding: "12px 14px", background: inputBg, borderRadius: 12, border: `1px solid ${borderColor}` }}>
                        <div style={{ fontSize: 11, color: subTextCol, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>🔵 Sputtering Gases</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {r.top_gases.map((g, i) => (
                            <span key={i} style={{ padding: "4px 10px", borderRadius: 7, background: isDark ? "rgba(6,182,212,0.1)" : "rgba(8,145,178,0.08)", border: `1px solid ${isDark ? "rgba(6,182,212,0.25)" : "rgba(8,145,178,0.20)"}`, color: isDark ? "#22D3EE" : "#0891B2", fontSize: 11, fontWeight: 600 }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${borderColor}`, fontSize: 11, color: mutedTextCol, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Showing data from {r.record_count} validated deposition records
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════ AI Assistant Tab ══════════ */}
            {activeTab === "assistant" && (
              <div style={{ background: cardBg, borderRadius: 20, padding: "30px 32px", boxShadow: shadowLg, border: `1px solid ${borderColor}`, position: "relative", overflow: "hidden", transition: "background 0.25s ease" }}>
                <AssistantDecoration />

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${primaryColor},${accentColor})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${primaryColor}40` }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: mainTextCol }}>AI Research Assistant</div>
                    <div style={{ fontSize: 11, color: mutedTextCol }}>Powered by Gemini · RAG-enhanced · 1,000+ papers indexed</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 9.5, padding: "3px 8px", borderRadius: 6, background: primaryDim, color: primaryColor, border: `1px solid ${primaryBorder}`, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>RAG</span>
                    <span style={{ fontSize: 9.5, padding: "3px 8px", borderRadius: 6, background: successDim, color: successColor, border: `1px solid ${successBorder}`, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>LIVE</span>
                  </div>
                </div>

                <div style={{ height: 1, background: borderColor, marginBottom: 18 }} />

                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && e.ctrlKey && askAI()}
                  placeholder="Ask about sputtering parameters, material properties, deposition conditions, substrate compatibility…"
                  style={{ width: "100%", minHeight: 150, borderRadius: 12, border: `1.5px solid ${inputBorder}`, background: inputBg, color: inputTextColor, padding: "14px 16px", fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.65, fontFamily: "inherit", transition: "all 0.25s ease" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 10, color: mutedTextCol, marginBottom: 14, marginTop: 4 }}>{question.length}/2000 · Ctrl+Enter to submit</div>

                <div style={{ display: "flex", gap: 9, marginBottom: 20 }}>
                  <button onClick={askAI} disabled={loading} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: loading ? "#94A3B8" : "#2563EB", color: "white", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8, boxShadow: loading ? "none" : "0 3px 12px rgba(37,99,235,0.44)", fontFamily: "inherit" }}>
                    {loading ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Querying knowledge base…</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Ask AI</>
                    )}
                  </button>
                  <button
                    onClick={() => { setQuestion(""); setAnswer(""); }}
                    style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${borderColor}`, background: "transparent", color: subTextCol, fontWeight: 600, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Clear
                  </button>
                </div>

                {/* Answer box */}
                <div style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 14, padding: "18px 20px", minHeight: 200, maxHeight: 400, overflowY: "auto", fontSize: 13.5, color: inputTextColor, lineHeight: 1.75, whiteSpace: "pre-wrap", transition: "all 0.25s ease" }}>
                  {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, color: primaryColor, fontSize: 13, fontWeight: 600 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Searching across 1,000+ research papers…
                      </div>
                      {[90, 75, 80, 60].map((w, i) => <div key={i} style={{ height: 12, borderRadius: 6, background: borderColor, width: `${w}%`, animation: "pulse 1.5s infinite", animationDelay: `${i * 0.12}s` }} />)}
                    </div>
                  ) : answer ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${borderColor}` }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${primaryColor},${accentColor})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <span style={{ fontSize: 11, color: primaryColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Response · RAG-enhanced</span>
                      </div>
                      {answer}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px 0", textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: primaryDim, border: `1px solid ${primaryBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <div style={{ color: mainTextCol, fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Ready for Research Queries</div>
                      <div style={{ color: mutedTextCol, fontSize: 12 }}>Type your question above and press Ask AI</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar       { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(100,116,139,0.3); border-radius:3px; }
        input::placeholder, textarea::placeholder { color:#94A3B8; }
      `}</style>
    </div>
  );
}