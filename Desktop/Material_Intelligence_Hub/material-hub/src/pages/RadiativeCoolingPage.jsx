import { useState } from "react";
import { useTheme } from "../components/Layout";

const API = "http://localhost:8000";

const MATERIALS = ["TiO2","SiO2","Al2O3","HfO2","ZrO2","Ta2O5","MgF2","SiC"];

const MAT_COLORS = {
  TiO2:"#00b4cc", SiO2:"#e07b00", Al2O3:"#7c5cd6",
  HfO2:"#d63e8a", ZrO2:"#00a85a", Ta2O5:"#1a9ed4",
  MgF2:"#d4720c", SiC:"#c9a800",
};

const MAT_COLORS_LIGHT = {
  TiO2:"#007a99", SiO2:"#b05e00", Al2O3:"#5a3ea8",
  HfO2:"#aa2266", ZrO2:"#007840", Ta2O5:"#0a72a8",
  MgF2:"#a85200", SiC:"#997a00",
};

function Pill({ mat, onRemove, isDark }) {
  const colors = isDark ? MAT_COLORS : MAT_COLORS_LIGHT;
  const c = colors[mat] || "#888";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"4px 10px", borderRadius:20, margin:"3px",
      background:`${c}18`, border:`1px solid ${c}55`,
      color:c, fontSize:12, fontFamily:"monospace",
    }}>
      {mat}
      {onRemove && (
        <span onClick={onRemove} style={{cursor:"pointer",opacity:0.7,fontSize:14}}>×</span>
      )}
    </span>
  );
}

function StatBox({ label, value, color, unit="", isDark }) {
  const defaultColor = color || (isDark ? "#00f5ff" : "#0077aa");
  const bg = isDark ? "rgba(0,245,255,0.04)" : "#ffffff";
  const border = isDark ? `${defaultColor}22` : "#e2e8f0";
  const subColor = isDark ? "#6a8aaa" : "#94a3b8";
  return (
    <div style={{
      background:bg, border:`1px solid ${border}`,
      borderRadius:10, padding:"12px 16px", flex:1,
      boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{fontSize:10,color:subColor,fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:defaultColor}}>
        {value}<span style={{fontSize:12,color:subColor,marginLeft:4}}>{unit}</span>
      </div>
    </div>
  );
}

function EmissivityChart({ wl, A, isDark }) {
  if (!wl || !A) return null;
  const W = 680, H = 220, PAD = { t:16, r:16, b:36, l:48 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const xMin = 0.3, xMax = 15;
  const toX = v => PAD.l + ((v - xMin)/(xMax - xMin)) * iW;
  const toY = v => PAD.t + (1 - v) * iH;
  const step = Math.max(1, Math.floor(wl.length / 300));
  const pts = wl.filter((_,i) => i % step === 0).map((w,i) => ({
    x: toX(w), y: toY(A[i * step] ?? 0)
  }));
  const path = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const xTicks = [0.3,2,4,6,8,10,12,14];
  const yTicks = [0,0.25,0.5,0.75,1.0];
  const lineColor = isDark ? "#00f5ff" : "#2563eb";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#6a8aaa" : "#94a3b8";
  const solarFill = isDark ? "rgba(255,165,0,0.08)" : "rgba(255,140,0,0.07)";
  const solarText = isDark ? "#ffa50088" : "#cc770088";
  const atmFill = isDark ? "rgba(0,245,255,0.07)" : "rgba(37,99,235,0.06)";
  const atmText = isDark ? "#00f5ff88" : "#2563eb88";
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      <rect x={toX(0.3)} y={PAD.t} width={toX(2.5)-toX(0.3)} height={iH} fill={solarFill} />
      <text x={(toX(0.3)+toX(2.5))/2} y={PAD.t+10} fill={solarText} fontSize={9} textAnchor="middle" fontFamily="monospace">SOLAR</text>
      <rect x={toX(8)} y={PAD.t} width={toX(13)-toX(8)} height={iH} fill={atmFill} />
      <text x={(toX(8)+toX(13))/2} y={PAD.t+10} fill={atmText} fontSize={9} textAnchor="middle" fontFamily="monospace">ATM WINDOW</text>
      {yTicks.map(v => (
        <line key={v} x1={PAD.l} x2={W-PAD.r} y1={toY(v)} y2={toY(v)} stroke={gridColor} strokeWidth={1} />
      ))}
      <path d={path} fill="none" stroke={lineColor} strokeWidth={1.8} />
      {xTicks.map(v => (
        <g key={v}>
          <line x1={toX(v)} x2={toX(v)} y1={PAD.t+iH} y2={PAD.t+iH+4} stroke={tickColor} strokeWidth={1}/>
          <text x={toX(v)} y={H-6} fill={tickColor} fontSize={8} textAnchor="middle" fontFamily="monospace">{v}</text>
        </g>
      ))}
      {yTicks.map(v => (
        <text key={v} x={PAD.l-6} y={toY(v)+3} fill={tickColor} fontSize={8} textAnchor="end" fontFamily="monospace">{v}</text>
      ))}
      <text x={W/2} y={H} fill={tickColor} fontSize={9} textAnchor="middle" fontFamily="monospace">Wavelength (µm)</text>
      <text x={10} y={H/2} fill={tickColor} fontSize={9} textAnchor="middle" fontFamily="monospace" transform={`rotate(-90,10,${H/2})`}>Emissivity</text>
    </svg>
  );
}

function ConvergenceChart({ history, thicknessesInitial, thicknessesFinal, sequence, isDark }) {
  if (!history || history.length < 2) return null;
  const W = 560, H = 200, PAD = { t:28, r:20, b:36, l:52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const yMin = Math.min(...history) - 0.02;
  const yMax = Math.max(...history) + 0.02;
  const toX = i => PAD.l + (i / (history.length - 1)) * iW;
  const toY = v => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * iH;
  const path = history.map((v, i) =>
    `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
  ).join(" ");
  const initFitness = history[0];
  const finalFitness = history[history.length - 1];
  const improvement = ((finalFitness - initFitness) / Math.abs(initFitness || 1)) * 100;
  const initX = toX(0), finalX = toX(history.length - 1);
  const initY = toY(initFitness), finalY = toY(finalFitness);
  const maxShow = 4;
  const initLabel = thicknessesInitial
    ? thicknessesInitial.slice(0, maxShow).map((t, i) =>
        `${sequence?.[i] ?? `L${i+1}`}: ${Number(t).toFixed(0)}nm`
      ).join("  ") + (thicknessesInitial.length > maxShow ? "  …" : "")
    : null;
  const finalLabel = thicknessesFinal
    ? thicknessesFinal.slice(0, maxShow).map((t, i) =>
        `${sequence?.[i] ?? `L${i+1}`}: ${Number(t).toFixed(0)}nm`
      ).join("  ") + (thicknessesFinal.length > maxShow ? "  …" : "")
    : null;
  const yTicks = 4;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    yMin + (i / yTicks) * (yMax - yMin)
  );
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const curveColor = isDark ? "#00c96e" : "#059669";
  const areaFill = isDark ? "rgba(0,201,110,0.07)" : "rgba(5,150,105,0.06)";
  const initColor = isDark ? "#ffa500" : "#d97706";
  const finalColor = isDark ? "#00f5ff" : "#2563eb";
  const badgeBg = isDark ? "rgba(0,201,110,0.15)" : "rgba(5,150,105,0.10)";
  const badgeBorder = isDark ? "rgba(0,201,110,0.4)" : "rgba(5,150,105,0.35)";
  const tickColor = isDark ? "#6a8aaa" : "#94a3b8";
  const matColors = isDark ? MAT_COLORS : MAT_COLORS_LIGHT;
  const initBoxBg = isDark ? "rgba(255,165,0,0.06)" : "rgba(251,191,36,0.06)";
  const initBoxBorder = isDark ? "rgba(255,165,0,0.2)" : "rgba(217,119,6,0.2)";
  const finalBoxBg = isDark ? "rgba(0,245,255,0.06)" : "rgba(37,99,235,0.05)";
  const finalBoxBorder = isDark ? "rgba(0,245,255,0.2)" : "rgba(37,99,235,0.2)";
  const labelColor = isDark ? "#b0c4cc" : "#475569";
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {yTickVals.map((v, i) => (
          <line key={i} x1={PAD.l} x2={W - PAD.r} y1={toY(v)} y2={toY(v)} stroke={gridColor} strokeWidth={1} />
        ))}
        <path d={path} fill="none" stroke={curveColor} strokeWidth={1.8} />
        <path d={`${path} L${toX(history.length-1).toFixed(1)},${PAD.t+iH} L${toX(0).toFixed(1)},${PAD.t+iH} Z`} fill={areaFill} />
        <circle cx={initX} cy={initY} r={4} fill={initColor} />
        <line x1={initX} x2={initX} y1={PAD.t} y2={PAD.t + iH} stroke={`${initColor}44`} strokeWidth={1} strokeDasharray="3,3" />
        <text x={initX + 6} y={initY - 6} fill={initColor} fontSize={8} fontFamily="monospace">{`INIT: ${initFitness.toFixed(4)}`}</text>
        <circle cx={finalX} cy={finalY} r={4} fill={finalColor} />
        <line x1={finalX} x2={finalX} y1={PAD.t} y2={PAD.t + iH} stroke={`${finalColor}44`} strokeWidth={1} strokeDasharray="3,3" />
        <text x={finalX - 6} y={finalY - 6} fill={finalColor} fontSize={8} fontFamily="monospace" textAnchor="end">{`BEST: ${finalFitness.toFixed(4)}`}</text>
        <rect x={W/2 - 44} y={PAD.t - 20} width={88} height={16} rx={3} fill={badgeBg} stroke={badgeBorder} strokeWidth={0.5} />
        <text x={W/2} y={PAD.t - 9} fill={curveColor} fontSize={8} fontFamily="monospace" textAnchor="middle">
          {`▲ ${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)}% improvement`}
        </text>
        {[0, Math.floor(history.length / 2), history.length - 1].map(i => (
          <g key={i}>
            <line x1={toX(i)} x2={toX(i)} y1={PAD.t + iH} y2={PAD.t + iH + 4} stroke={tickColor} strokeWidth={1} />
            <text x={toX(i)} y={H - 4} fill={tickColor} fontSize={7} textAnchor="middle" fontFamily="monospace">{i}</text>
          </g>
        ))}
        {yTickVals.map((v, i) => (
          <text key={i} x={PAD.l - 4} y={toY(v) + 3} fill={tickColor} fontSize={7} textAnchor="end" fontFamily="monospace">{v.toFixed(2)}</text>
        ))}
        <text x={W / 2} y={H} fill={tickColor} fontSize={8} textAnchor="middle" fontFamily="monospace">Generation</text>
        <text x={10} y={H / 2} fill={tickColor} fontSize={8} textAnchor="middle" fontFamily="monospace" transform={`rotate(-90,10,${H / 2})`}>Fitness</text>
      </svg>
      {(initLabel || finalLabel) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          {initLabel && (
            <div style={{ background: initBoxBg, border: `1px solid ${initBoxBorder}`, borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: initColor, fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>● INITIAL THICKNESSES</div>
              <div style={{ fontSize: 10, color: labelColor, fontFamily: "monospace", lineHeight: 1.7 }}>
                {thicknessesInitial.map((t, i) => (
                  <div key={i}>
                    <span style={{ color: matColors[sequence?.[i]] || "#aaa" }}>{sequence?.[i] ?? `L${i + 1}`}</span>
                    {`: ${Number(t).toFixed(1)} nm`}
                  </div>
                ))}
              </div>
            </div>
          )}
          {finalLabel && (
            <div style={{ background: finalBoxBg, border: `1px solid ${finalBoxBorder}`, borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: finalColor, fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>● OPTIMIZED THICKNESSES</div>
              <div style={{ fontSize: 10, color: labelColor, fontFamily: "monospace", lineHeight: 1.7 }}>
                {thicknessesFinal.map((t, i) => (
                  <div key={i}>
                    <span style={{ color: matColors[sequence?.[i]] || "#aaa" }}>{sequence?.[i] ?? `L${i + 1}`}</span>
                    {`: ${Number(t).toFixed(1)} nm`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RadiativeCoolingPage() {
  // ── Read theme from global Layout context ─────────────────────────────
  const { isDark } = useTheme();

  const [sequence, setSequence] = useState(["TiO2","SiO2","TiO2","SiO2","TiO2","SiO2","TiO2"]);
  const [thicknesses, setThicknesses] = useState([150,200,150,200,150,200,150]);
  const [apiKey, setApiKey] = useState("");
  const [generations, setGenerations] = useState(40);
  const [pop, setPop] = useState(30);
  const [result, setResult] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("design");
  const [initialThicknesses, setInitialThicknesses] = useState(null);

  const theme = isDark ? {
    bg: "#080f1e",
    text: "#e0f0ff",
    subText: "#6a8aaa",
    cardBg: "rgba(0,245,255,0.03)",
    cardBorder: "rgba(0,245,255,0.08)",
    inputBg: "rgba(255,255,255,0.04)",
    inputBorder: "rgba(0,245,255,0.2)",
    accent: "#00f5ff",
    accentDim: "rgba(0,245,255,0.10)",
    accentBorder: "rgba(0,245,255,0.3)",
    success: "#00c96e",
    warning: "#ffa500",
    purple: "#a78bfa",
    purpleDim: "rgba(167,139,250,0.06)",
    purpleBorder: "rgba(167,139,250,0.3)",
    danger: "#ff6b6b",
    dangerDim: "rgba(255,50,50,0.08)",
    dangerBorder: "rgba(255,50,50,0.3)",
    selectBg: "#0d1929",
    tabActiveBorder: "#00f5ff",
    tabActiveColor: "#00f5ff",
    tagBg: "rgba(0,245,255,0.12)",
    tagBorder: "rgba(0,245,255,0.4)",
    tagColor: "#00f5ff",
    substrateColor: "#fb923c",
    substrateBg: "rgba(251,146,60,0.06)",
    substrateBorder: "rgba(251,146,60,0.2)",
    layerBg: "rgba(0,245,255,0.03)",
    layerBorder: "rgba(0,245,255,0.08)",
    optimizeBtnBg: "rgba(0,201,110,0.15)",
    optimizeBtnBorder: "rgba(0,201,110,0.5)",
    optimizeBtnColor: "#00c96e",
    optimizeBtnDisabledBg: "rgba(0,201,110,0.05)",
    optimizeBtnDisabledColor: "#3a6a50",
    infoBoxBg: "rgba(0,201,110,0.06)",
    infoBoxBorder: "rgba(0,201,110,0.2)",
    applyBtnBg: "rgba(255,165,0,0.1)",
    applyBtnBorder: "rgba(255,165,0,0.4)",
    applyBtnColor: "#ffa500",
    emptyBg: "rgba(0,245,255,0.02)",
    emptyBorder: "rgba(0,245,255,0.1)",
    emptyColor: "#4a6a88",
    spectrumBg: "rgba(0,245,255,0.03)",
    spectrumBorder: "rgba(0,245,255,0.1)",
    numInputBorder: "rgba(0,245,255,0.2)",
    iconBoxBg: "rgba(0,245,255,0.12)",
    iconBoxBorder: "rgba(0,245,255,0.4)",
    dragHandleColor: "rgba(0,245,255,0.3)",
    rowShadow: "none",
  } : {
    bg: "#f0f5ff",
    text: "#0d1120",
    subText: "#64748b",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    inputBg: "#f8fafc",
    inputBorder: "#e2e8f0",
    accent: "#2563eb",
    accentDim: "rgba(37,99,235,0.08)",
    accentBorder: "rgba(37,99,235,0.3)",
    success: "#059669",
    warning: "#d97706",
    purple: "#7c3aed",
    purpleDim: "rgba(124,58,237,0.06)",
    purpleBorder: "rgba(124,58,237,0.25)",
    danger: "#dc2626",
    dangerDim: "rgba(220,38,38,0.06)",
    dangerBorder: "rgba(220,38,38,0.25)",
    selectBg: "#ffffff",
    tabActiveBorder: "#2563eb",
    tabActiveColor: "#1d4ed8",
    tagBg: "rgba(37,99,235,0.08)",
    tagBorder: "rgba(37,99,235,0.25)",
    tagColor: "#1d4ed8",
    substrateColor: "#92400e",
    substrateBg: "rgba(180,83,9,0.05)",
    substrateBorder: "rgba(180,83,9,0.18)",
    layerBg: "#ffffff",
    layerBorder: "#e2e8f0",
    optimizeBtnBg: "rgba(5,150,105,0.08)",
    optimizeBtnBorder: "rgba(5,150,105,0.4)",
    optimizeBtnColor: "#065f46",
    optimizeBtnDisabledBg: "rgba(5,150,105,0.03)",
    optimizeBtnDisabledColor: "#6ee7b7",
    infoBoxBg: "rgba(5,150,105,0.05)",
    infoBoxBorder: "rgba(5,150,105,0.18)",
    applyBtnBg: "rgba(217,119,6,0.08)",
    applyBtnBorder: "rgba(217,119,6,0.35)",
    applyBtnColor: "#92400e",
    emptyBg: "rgba(37,99,235,0.02)",
    emptyBorder: "#c7d5e8",
    emptyColor: "#94a3b8",
    spectrumBg: "#f8fafc",
    spectrumBorder: "#e2e8f0",
    numInputBorder: "#e2e8f0",
    iconBoxBg: "rgba(37,99,235,0.08)",
    iconBoxBorder: "rgba(37,99,235,0.25)",
    dragHandleColor: "#cbd5e1",
    rowShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };

  const matColors = isDark ? MAT_COLORS : MAT_COLORS_LIGHT;

  const addLayer = (mat) => { setSequence(s => [...s, mat]); setThicknesses(t => [...t, 150]); };
  const removeLayer = (i) => { setSequence(s => s.filter((_,j) => j !== i)); setThicknesses(t => t.filter((_,j) => j !== i)); };
  const changeLayer = (i, mat) => setSequence(s => s.map((v,j) => j===i ? mat : v));
  const changeThickness = (i, val) => setThicknesses(t => t.map((v,j) => j===i ? Number(val) : v));

  const runSimulate = async () => {
    setSimLoading(true); setError(""); setSimResult(null);
    try {
      const res = await fetch(`${API}/api/rc/simulate`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ sequence, thicknesses }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setSimResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setSimLoading(false); }
  };

  const runOptimize = async () => {
    setInitialThicknesses([...thicknesses]);
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/api/rc/optimize`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ sequence, pop, generations, api_key: apiKey }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setResult(data);
      if (data.gemini_suggestion) setSequence(data.gemini_suggestion);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const applyOptimized = () => { if (!result) return; setThicknesses(result.thicknesses_nm); };

  const s = { fontFamily:"monospace" };
  const t = theme;

  const EmptyStateIllustration = () => (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{marginBottom:16,opacity:0.85}}>
      <rect width="72" height="72" rx="36" fill={isDark ? "rgba(0,245,255,0.06)" : "#eef3ff"}/>
      <path d="M20 48 L28 36 L36 42 L44 28 L52 38" stroke={isDark ? "#00f5ff" : "#2563eb"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="52" cy="38" r="3" fill={isDark ? "#00f5ff" : "#2563eb"} opacity="0.8"/>
      <path d="M48 20 L54 26 M54 20 L60 26" stroke={isDark ? "#00c96e" : "#059669"} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M51 23 L57 23" stroke={isDark ? "#00c96e" : "#059669"} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div style={{
      background: t.bg, minHeight:"100vh", color: t.text,
      fontFamily:"'Rajdhani',sans-serif", padding:"28px 32px",
      boxSizing:"border-box", transition: "background 0.25s ease, color 0.25s ease",
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <div style={{
          width:44, height:44, background:t.iconBoxBg, border:`1px solid ${t.iconBoxBorder}`,
          borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
        }}>🌡</div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h1 style={{fontSize:24,fontWeight:600,color:t.text,margin:0}}>
              Radiative <span style={{color:t.accent}}>Cooling</span>
            </h1>
            <span style={{
              background:t.tagBg, border:`1px solid ${t.tagBorder}`,
              color:t.tagColor, fontSize:11, padding:"2px 10px",
              borderRadius:4, ...s, letterSpacing:1,
            }}>● TMM + GA</span>
          </div>
          <div style={{fontSize:13,color:t.subText,marginTop:2}}>
            Multilayer Stack Designer · Genetic Algorithm Optimizer · Gemini AI Advisor
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display:"flex", gap:4,
        borderBottom:`1px solid ${isDark ? t.cardBorder : "#e2e8f0"}`,
        marginBottom:24,
      }}>
        {[["design","STACK DESIGNER"],["optimize","GA OPTIMIZER"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"10px 18px", ...s, fontSize:12, cursor:"pointer",
            border:"none", background:"transparent",
            color: tab===id ? t.tabActiveColor : t.subText,
            borderBottom:`2px solid ${tab===id ? t.tabActiveBorder : "transparent"}`,
            marginBottom:-1, letterSpacing:0.8, fontWeight: tab===id ? 700 : 400,
            transition:"color 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {error && (
        <div style={{
          background:t.dangerDim, border:`1px solid ${t.dangerBorder}`,
          borderRadius:8, padding:14, marginBottom:16, fontSize:13, color:t.danger, ...s,
        }}>⚠ {error}</div>
      )}

      {/* STACK DESIGNER */}
      {tab==="design" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div>
            <div style={{fontSize:11,color:t.subText,...s,letterSpacing:1,marginBottom:12}}>
              LAYER STACK (top → bottom, on Ag substrate)
            </div>
            {sequence.map((mat, i) => {
              const c = matColors[mat] || "#888";
              const barPct = Math.min(thicknesses[i] / 500 * 100, 100);
              return (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:8, marginBottom:6,
                  background:t.layerBg, border:`1px solid ${t.layerBorder}`,
                  borderRadius:8, padding:"8px 12px", boxShadow:t.rowShadow,
                }}>
                  <div style={{display:"flex",flexDirection:"column",gap:2,cursor:"grab",padding:"0 2px",opacity:0.4}}>
                    {[0,1,2].map(k=>(
                      <div key={k} style={{display:"flex",gap:2}}>
                        <div style={{width:2,height:2,borderRadius:1,background:t.dragHandleColor}}/>
                        <div style={{width:2,height:2,borderRadius:1,background:t.dragHandleColor}}/>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:t.subText,...s,width:18,textAlign:"right"}}>{i+1}</div>
                  <select value={mat} onChange={e=>changeLayer(i,e.target.value)} style={{
                    background:t.selectBg, border:`1px solid ${c}55`,
                    borderRadius:6, padding:"4px 8px", color:c, ...s,
                    fontSize:12, outline:"none", fontWeight:600, cursor:"pointer", minWidth:72,
                  }}>
                    {MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="number" value={thicknesses[i]}
                    onChange={e=>changeThickness(i,e.target.value)} style={{
                      width:64, background:t.inputBg, border:`1px solid ${t.numInputBorder}`,
                      borderRadius:6, padding:"4px 8px", color:t.text, ...s,
                      fontSize:12, outline:"none", textAlign:"center",
                    }}
                  />
                  <span style={{fontSize:11,color:t.subText,flexShrink:0}}>nm</span>
                  <div style={{flex:1, height:6, borderRadius:3, background: isDark ? `${c}22` : `${c}18`, overflow:"hidden"}}>
                    <div style={{height:"100%", width:`${barPct}%`, borderRadius:3, background:c, opacity: isDark ? 0.7 : 0.6, transition:"width 0.3s ease"}}/>
                  </div>
                  <button onClick={()=>removeLayer(i)} style={{
                    background:"none", border:"none", color: isDark ? t.danger : "#dc2626",
                    cursor:"pointer", fontSize:16, lineHeight:1, padding:"0 2px", opacity:0.7, flexShrink:0,
                  }}>×</button>
                </div>
              );
            })}

            <div style={{
              display:"flex", alignItems:"center", gap:8, marginBottom:18,
              background:t.substrateBg, border:`1px solid ${t.substrateBorder}`,
              borderRadius:8, padding:"8px 12px",
            }}>
              <span style={{fontSize:13,color:t.subText,...s}}>↓</span>
              <span style={{color:t.substrateColor,...s,fontSize:12,fontWeight:700,letterSpacing:1}}>Ag SUBSTRATE</span>
            </div>

            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,color:t.subText,...s,letterSpacing:1,marginBottom:8}}>ADD LAYER</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {MATERIALS.map(m=>{
                  const c = matColors[m];
                  return (
                    <button key={m} onClick={()=>addLayer(m)} style={{
                      background:`${c}12`, border:`1px solid ${c}55`,
                      color:c, ...s, fontSize:11, padding:"5px 14px",
                      borderRadius:6, cursor:"pointer", fontWeight:600, transition:"all 0.15s",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${c}22`;e.currentTarget.style.borderColor=`${c}99`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${c}12`;e.currentTarget.style.borderColor=`${c}55`;}}
                    >{m}</button>
                  );
                })}
              </div>
            </div>

            <button onClick={runSimulate} disabled={simLoading} style={{
              background: isDark ? (simLoading ? "rgba(0,245,255,0.05)" : t.accentDim) : (simLoading ? "rgba(37,99,235,0.08)" : "#2563eb"),
              border: isDark ? `1px solid ${t.accentBorder}` : "none",
              color: isDark ? t.accent : "#ffffff",
              ...s, fontSize:12, letterSpacing:1, padding:"10px 22px", borderRadius:8,
              cursor: simLoading ? "not-allowed" : "pointer", fontWeight:700,
              boxShadow: isDark ? "none" : (simLoading ? "none" : "0 2px 8px rgba(37,99,235,0.3)"),
              transition:"all 0.2s", display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{fontSize:10}}>▶</span>
              {simLoading ? "SIMULATING..." : "QUICK SIMULATE"}
            </button>
          </div>

          <div>
            <div style={{fontSize:11,color:t.subText,...s,letterSpacing:1,marginBottom:12}}>SIMULATION OUTPUT</div>
            {simResult ? (
              <>
                <div style={{display:"flex",gap:10,marginBottom:14}}>
                  <StatBox label="SKY EMISSIVITY (8–13µm)" value={(simResult.sky_avg*100).toFixed(1)} unit="%" color={t.accent} isDark={isDark}/>
                  <StatBox label="SOLAR ABSORPTION" value={(simResult.solar_avg*100).toFixed(1)} unit="%" color={t.warning} isDark={isDark}/>
                  <StatBox label="FITNESS" value={simResult.fitness.toFixed(3)} color={t.success} isDark={isDark}/>
                </div>
                <div style={{background:t.spectrumBg,border:`1px solid ${t.spectrumBorder}`,borderRadius:10,padding:14}}>
                  <div style={{fontSize:10,color:t.subText,...s,marginBottom:8,letterSpacing:1}}>EMISSIVITY SPECTRUM</div>
                  <EmissivityChart wl={simResult.wl} A={simResult.A} isDark={isDark}/>
                </div>
              </>
            ) : (
              <div style={{
                background: isDark ? t.emptyBg : "#ffffff",
                border:`1px solid ${t.emptyBorder}`, borderRadius:12, padding:"56px 32px",
                textAlign:"center", minHeight:340,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <EmptyStateIllustration />
                <div style={{fontSize:15,fontWeight:700,color: isDark ? "#c0d4e8" : "#1e3a5f",marginBottom:8,fontFamily:"sans-serif"}}>
                  Configure your stack and click <span style={{color:t.accent}}>QUICK SIMULATE</span>
                </div>
                <div style={{fontSize:13,color:t.emptyColor,fontFamily:"sans-serif",lineHeight:1.5}}>
                  Simulation results and performance metrics<br/>will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GA OPTIMIZER */}
      {tab==="optimize" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div>
            <div style={{fontSize:11,color:t.subText,...s,letterSpacing:1,marginBottom:14}}>CURRENT STACK TO OPTIMIZE</div>
            <div style={{
              display:"flex", flexWrap:"wrap", marginBottom:16,
              background: isDark ? "rgba(0,245,255,0.02)" : "#f8fafc",
              border:`1px solid ${t.cardBorder}`, borderRadius:8, padding:10, minHeight:48,
            }}>
              {sequence.map((m,i)=><Pill key={i} mat={m} isDark={isDark}/>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[["POPULATION SIZE",pop,setPop,10,100],["GENERATIONS",generations,setGenerations,10,200]].map(([label,val,setter,mn,mx])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:t.subText,...s,letterSpacing:1,marginBottom:6}}>{label}</div>
                  <input type="number" value={val} min={mn} max={mx}
                    onChange={e=>setter(Number(e.target.value))} style={{
                      width:"100%", background:t.inputBg, border:`1px solid ${t.numInputBorder}`,
                      borderRadius:6, padding:"7px 12px", color:t.text, ...s,
                      fontSize:13, outline:"none", boxSizing:"border-box",
                    }}/>
                </div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:t.subText,...s,letterSpacing:1,marginBottom:6}}>
                GEMINI API KEY (optional — for AI sequence suggestion)
              </div>
              <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)}
                placeholder="Your Google Gemini API key" style={{
                  width:"100%", background:t.inputBg, border:`1px solid ${t.numInputBorder}`,
                  borderRadius:6, padding:"7px 12px", color:t.text, ...s,
                  fontSize:13, outline:"none", boxSizing:"border-box",
                }}/>
            </div>
            <div style={{
              background:t.infoBoxBg, border:`1px solid ${t.infoBoxBorder}`,
              borderRadius:6, padding:12, marginBottom:16, fontSize:12, color:t.subText, ...s,
            }}>
              ℹ GA will optimize layer thicknesses (50–500 nm) for maximum sky emissivity
              and minimum solar absorption. Takes ~30–60 seconds.
            </div>
            <button onClick={runOptimize} disabled={loading} style={{
              background: loading ? t.optimizeBtnDisabledBg : t.optimizeBtnBg,
              border:`1px solid ${t.optimizeBtnBorder}`,
              color: loading ? t.optimizeBtnDisabledColor : t.optimizeBtnColor,
              ...s, fontSize:12, letterSpacing:1, padding:"10px 24px", borderRadius:6,
              cursor: loading ? "not-allowed" : "pointer", fontWeight:700, transition:"all 0.2s",
            }}>
              {loading ? "⏳ OPTIMIZING..." : "⚡ RUN GA OPTIMIZATION"}
            </button>
          </div>

          <div>
            <div style={{fontSize:11,color:t.subText,...s,letterSpacing:1,marginBottom:12}}>OPTIMIZATION STATUS</div>
            {result ? (
              <>
                <div style={{display:"flex",gap:10,marginBottom:14}}>
                  <StatBox label="SKY EMISSIVITY" value={(result.sky_avg*100).toFixed(1)} unit="%" color={t.accent} isDark={isDark}/>
                  <StatBox label="SOLAR ABS" value={(result.solar_avg*100).toFixed(1)} unit="%" color={t.warning} isDark={isDark}/>
                  <StatBox label="FITNESS" value={result.fitness.toFixed(3)} color={t.success} isDark={isDark}/>
                </div>
                <div style={{background:t.spectrumBg,border:`1px solid ${t.spectrumBorder}`,borderRadius:10,padding:12,marginBottom:12}}>
                  <div style={{fontSize:10,color:t.subText,...s,marginBottom:8,letterSpacing:1}}>
                    GA CONVERGENCE — INITIAL vs OPTIMIZED THICKNESSES
                  </div>
                  <ConvergenceChart
                    history={result.history} thicknessesInitial={initialThicknesses}
                    thicknessesFinal={result.thicknesses_nm} sequence={result.optimized_sequence}
                    isDark={isDark}
                  />
                </div>
                {result.gemini_suggestion && (
                  <div style={{background:t.purpleDim,border:`1px solid ${t.purpleBorder}`,borderRadius:8,padding:12,marginBottom:12}}>
                    <div style={{fontSize:10,color:t.purple,...s,letterSpacing:1,marginBottom:8}}>🤖 GEMINI SUGGESTS NEXT SEQUENCE</div>
                    <div style={{display:"flex",flexWrap:"wrap"}}>
                      {result.gemini_suggestion.map((m,i)=><Pill key={i} mat={m} isDark={isDark}/>)}
                    </div>
                    <div style={{fontSize:11,color:t.subText,...s,marginTop:8}}>
                      Sequence applied automatically. Run optimizer again to evaluate it.
                    </div>
                  </div>
                )}
                <button onClick={()=>{applyOptimized();setTab("design");}} style={{
                  background:t.applyBtnBg, border:`1px solid ${t.applyBtnBorder}`,
                  color:t.applyBtnColor, ...s, fontSize:12, letterSpacing:1,
                  padding:"8px 18px", borderRadius:6, cursor:"pointer", fontWeight:600, transition:"all 0.2s",
                }}>
                  ← APPLY THICKNESSES TO DESIGNER
                </button>
              </>
            ) : (
              <div style={{
                background: isDark ? t.emptyBg : "#ffffff",
                border:`1px solid ${t.emptyBorder}`, borderRadius:12, padding:"56px 32px",
                textAlign:"center", minHeight:300,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{
                  width:56, height:56, borderRadius:28,
                  background: isDark ? "rgba(0,245,255,0.06)" : "#eef3ff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  marginBottom:14, fontSize:24,
                }}>⚡</div>
                <div style={{fontSize:14,fontWeight:600,color: isDark ? "#c0d4e8" : "#1e3a5f",marginBottom:6,fontFamily:"sans-serif"}}>
                  Run optimization to see results here
                </div>
                <div style={{fontSize:12,color:t.emptyColor,fontFamily:"sans-serif"}}>
                  Configure stack and click RUN GA OPTIMIZATION
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}