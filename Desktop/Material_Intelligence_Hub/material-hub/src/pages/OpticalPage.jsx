import { useState, useEffect, useRef } from "react";
import { useTheme } from "../components/Layout";

const PARAM_COLS = [
  { key: "dep_temp",    label: "Deposition Temp",  unit: "°C",   default: 25     },
  { key: "anneal_temp", label: "Anneal Temp",       unit: "°C",   default: -1     },
  { key: "anneal_time", label: "Anneal Time",       unit: "hrs",  default: 0      },
  { key: "thickness",   label: "Thickness",         unit: "nm",   default: 100    },
  { key: "temp",        label: "Measurement Temp",  unit: "°C",   default: 24     },
  { key: "pressure",    label: "Pressure",          unit: "Pa",   default: 101325 },
];

const ELEMENT_COLS = [
  "C","N","H","Sn","I","B","Cr","Sb","Se","Cu","Cd","S","Ag","Al",
  "O","Si","Ti","K","Ba","Na","As","Hf","V","F","Mg","Zn","Yb","La",
  "Zr","Pr","Gd","Sc","Co","Ni","Pb","Mo","Ga","P","In","Bi","Te",
  "Er","Tm","Ge","Ir","Br","Cl","Sr","W","Nb","Ta","Tl","Cs","Li",
  "Ca","Mn","Ce","Dy","Y","Ho","Nd","Lu","Fe","Eu","Au","Hg","Sm"
];

const PRESETS = [
  { label: "TiO₂",         elements: { Ti: 0.3333, O: 0.6667 },                                      en: 2.80673,  an: 12.6662 },
  { label: "CH₃NH₃SnI₃",  elements: { C: 0.0833, N: 0.1667, H: 0.4167, Sn: 0.0833, I: 0.25 },     en: 2.464191, an: 19.4984 },
  { label: "SiO₂",         elements: { Si: 0.3333, O: 0.6667 },                                      en: 1.46,     an: 10.0   },
  { label: "ZnO",           elements: { Zn: 0.5, O: 0.5 },                                           en: 1.65,     an: 9.4    },
];

const MODELS = [
  { key: "xgboost",       label: "XGBoost",               short: "XGB", color: "#6366f1" },
  { key: "histgb",        label: "HistGradient Boosting",  short: "HGB", color: "#06b6d4" },
  { key: "neural_net",    label: "Neural Network (MLP)",   short: "MLP", color: "#10b981" },
  { key: "random_forest", label: "Random Forest",          short: "RF",  color: "#f59e0b" },
];

const API_BASE = "http://localhost:8000";

function buildFeatureDict(xVal, params, elements, en, an) {
  const feat = { x_val: xVal };
  PARAM_COLS.forEach(({ key }) => { feat[key] = params[key]; });
  ELEMENT_COLS.forEach((el) => { feat[el] = elements[el] ?? 0; });
  feat["en"] = en;
  feat["an"] = an;
  return feat;
}

// ── Simple SVG line chart component ──────────────────────────────────────────
function RangeChart({ rangeResult, isDark, models }) {
  if (!rangeResult || !rangeResult.x_values || rangeResult.x_values.length === 0) return null;

  const W = 760, H = 280, PAD = { top: 16, right: 20, bottom: 44, left: 58 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xs = rangeResult.x_values;
  const xMin = xs[0], xMax = xs[xs.length - 1];

  // Collect all y values across all models for y-axis scaling
  let allY = [];
  MODELS.forEach(({ key }) => {
    const series = rangeResult.predictions?.[key];
    if (series) allY = allY.concat(series.filter(v => v !== null && !isNaN(v)));
  });
  if (allY.length === 0) return null;
  const yMin = Math.min(...allY), yMax = Math.max(...allY);
  const yPad = (yMax - yMin) * 0.08 || 0.05;
  const yLo = yMin - yPad, yHi = yMax + yPad;

  const xScale = (v) => PAD.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const yScale = (v) => PAD.top + plotH - ((v - yLo) / (yHi - yLo || 1)) * plotH;

  // Grid lines
  const yTicks = 5;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = yLo + (i / yTicks) * (yHi - yLo);
    return { val, y: yScale(val) };
  });

  const xTicks = Math.min(8, xs.length);
  const xTickIndices = Array.from({ length: xTicks }, (_, i) =>
    Math.round((i / (xTicks - 1)) * (xs.length - 1))
  );

  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const axisColor = isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.18)";
  const textColor = isDark ? "rgba(255,255,255,0.45)" : "#64748b";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid lines */}
      {gridLines.map(({ val, y }, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={gridColor} strokeWidth={1} />
          <text x={PAD.left - 7} y={y + 4} textAnchor="end" fontSize={10} fill={textColor}>
            {val.toFixed(3)}
          </text>
        </g>
      ))}

      {/* X ticks */}
      {xTickIndices.map((idx, i) => {
        const xv = xs[idx];
        const sx = xScale(xv);
        return (
          <g key={i}>
            <line x1={sx} y1={PAD.top} x2={sx} y2={H - PAD.bottom} stroke={gridColor} strokeWidth={1} />
            <text x={sx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill={textColor}>
              {xv}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke={axisColor} strokeWidth={1.5} />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={axisColor} strokeWidth={1.5} />

      {/* Axis labels */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={11} fill={textColor}>Wavelength (nm)</text>
      <text x={14} y={H / 2} textAnchor="middle" fontSize={11} fill={textColor}
        transform={`rotate(-90, 14, ${H / 2})`}>Refractive Index (n)</text>

      {/* Model lines */}
      {MODELS.map(({ key, color }) => {
        const series = rangeResult.predictions?.[key];
        if (!series) return null;
        const points = xs.map((x, i) => {
          const y = series[i];
          if (y === null || isNaN(y)) return null;
          return `${xScale(x).toFixed(1)},${yScale(y).toFixed(1)}`;
        }).filter(Boolean);
        if (points.length < 2) return null;
        return (
          <polyline
            key={key}
            points={points.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

export default function OpticalPage() {
  const { isDark } = useTheme();

  // ── Spectral range inputs ─────────────────────────────────────────────────
  const [rangeMode,  setRangeMode]  = useState(true);   // always range now
  const [xStart,     setXStart]     = useState("500");
  const [xEnd,       setXEnd]       = useState("1000");
  const [xStep,      setXStep]      = useState("10");
  const [unit,       setUnit]       = useState("nm");

  const [params,   setParams]   = useState(
    Object.fromEntries(PARAM_COLS.map(({ key, default: d }) => [key, String(d)]))
  );
  const [elements, setElements] = useState(
    Object.fromEntries(ELEMENT_COLS.map((el) => [el, "0"]))
  );
  const [en,       setEn]       = useState("1.5");
  const [an,       setAn]       = useState("10.0");

  const [selectedModels,  setSelectedModels]  = useState(["xgboost", "histgb", "neural_net", "random_forest"]);
  const [rangeResult,     setRangeResult]     = useState(null);
  const [modelMetrics,    setModelMetrics]    = useState(null);
  const [metricsLoading,  setMetricsLoading]  = useState(true);
  const [metricsError,    setMetricsError]    = useState("");
  const [modelsTraining,  setModelsTraining]  = useState(true);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [activeTab,       setActiveTab]       = useState("params");
  const [tablePage,       setTablePage]       = useState(0);
  const TABLE_PAGE_SIZE = 50;

  // ── Poll backend until models finish training ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let pollId;
    const checkStatus = async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/optical/status`);
        const data = await res.json();
        if (cancelled) return;
        if (data.ready) {
          setModelsTraining(false);
          clearInterval(pollId);
          try {
            const mres  = await fetch(`${API_BASE}/api/optical/models`);
            const mdata = await mres.json();
            if (!mres.ok) throw new Error(mdata.detail || "Failed to load model metrics");
            if (!cancelled) setModelMetrics(mdata.metrics);
          } catch (err) {
            if (!cancelled) setMetricsError(err.message);
          } finally {
            if (!cancelled) setMetricsLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) setMetricsError(err.message);
      }
    };
    checkStatus();
    pollId = setInterval(checkStatus, 3000);
    return () => { cancelled = true; clearInterval(pollId); };
  }, []);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const pageBg          = isDark ? "#050c1a"   : "#F1F5F9";
  const cardBg          = isDark ? "#080f1e"   : "#FFFFFF";
  const cardBorder      = isDark ? "rgba(0,245,255,0.07)"    : "#E2E8F0";
  const heroBg          = "linear-gradient(135deg,#1E3A8A 0%,#2563EB 55%,#3B82F6 100%)";
  const heroBorder      = isDark ? "rgba(0,245,255,0.06)"    : "transparent";
  const heroGlowBg      = isDark
    ? "radial-gradient(circle, rgba(0,245,255,0.04), transparent 70%)"
    : "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)";
  const heroSubColor    = isDark ? "#64748b"   : "rgba(255,255,255,0.75)";

  const accentColor     = isDark ? "#7c3aed"   : "#4F46E5";
  const accentDim       = isDark ? "rgba(124,58,237,0.10)"   : "rgba(79,70,229,0.08)";
  const accentBorder    = isDark ? "#7c3aed"   : "#4F46E5";
  const accentText      = isDark ? "#c4b5fd"   : "#4F46E5";
  const accentActive    = isDark ? "rgba(124,58,237,0.10)"   : "rgba(79,70,229,0.10)";
  const unitToggleBg    = isDark ? "rgba(255,255,255,0.10)"  : "#E2E8F0";

  const inputBg         = isDark ? "#050c1a"   : "#F8FAFC";
  const inputBorder     = isDark ? "rgba(255,255,255,0.20)"  : "#D1D9E6";
  const inputColor      = isDark ? "#67e8f9"   : "#1E40AF";
  const inputSmBg       = isDark ? "#050c1a"   : "#F8FAFC";
  const inputSmBorder   = isDark ? "rgba(255,255,255,0.15)"  : "#D1D9E6";
  const inputSmColor    = isDark ? "#fff"      : "#0F172A";

  const mainTextCol     = isDark ? "#e2e8f0"   : "#0F172A";
  const labelColor      = isDark ? "rgba(255,255,255,0.40)"  : "#64748B";
  const labelUnitColor  = isDark ? "rgba(255,255,255,0.20)"  : "#94A3B8";
  const hintColor       = isDark ? "rgba(255,255,255,0.30)"  : "#94A3B8";
  const sectionLabel    = isDark ? "rgba(255,255,255,0.40)"  : "#64748B";
  const dividerColor    = isDark ? "rgba(255,255,255,0.10)"  : "#E2E8F0";
  const tabInactiveCol  = isDark ? "rgba(255,255,255,0.40)"  : "#64748B";

  const presetBg        = isDark ? "rgba(255,255,255,0.05)"  : "#F8FAFC";
  const presetBorder    = isDark ? "rgba(255,255,255,0.10)"  : "#E2E8F0";
  const presetColor     = isDark ? "#e2e8f0"   : "#1E40AF";
  const presetHoverBg   = isDark ? "rgba(124,58,237,0.10)"   : "rgba(79,70,229,0.08)";
  const presetHoverBdr  = isDark ? "#7c3aed"   : "#4F46E5";

  const elInactiveBg    = isDark ? "rgba(255,255,255,0.03)"  : "#F8FAFC";
  const elInactiveBdr   = isDark ? "rgba(255,255,255,0.10)"  : "#E2E8F0";
  const elLabelColor    = isDark ? "rgba(255,255,255,0.50)"  : "#64748B";
  const elInputColor    = isDark ? "#fff"      : "#0F172A";

  const optLabelColor   = isDark ? "rgba(255,255,255,0.50)"  : "#64748B";
  const optAccentColor  = isDark ? "#67e8f9"   : "#2563EB";
  const optInputColor   = isDark ? "#67e8f9"   : "#1E40AF";

  const errorBg         = isDark ? "rgba(239,68,68,0.10)"    : "#FEF2F2";
  const errorBorder     = isDark ? "rgba(239,68,68,0.30)"    : "#FECACA";
  const errorColor      = isDark ? "#fca5a5"   : "#DC2626";

  const btnBg           = isDark
    ? "linear-gradient(90deg, rgba(0,245,255,0.1), rgba(124,92,255,0.1))"
    : "linear-gradient(135deg,#1E3A8A,#2563EB)";
  const btnBorder       = isDark ? "rgba(0,245,255,0.25)"    : "transparent";
  const btnColor        = isDark ? "#00F5FF"   : "#ffffff";
  const btnShadow       = isDark ? "none"      : "0 4px 14px rgba(37,99,235,0.35)";

  const resultBg        = isDark ? "#080f1e"   : "#FFFFFF";
  const resultBorder    = isDark ? "rgba(0,245,255,0.07)"    : "#E2E8F0";
  const resultLabel     = isDark ? "#64748b"   : "#94A3B8";
  const resultGrad      = isDark
    ? "linear-gradient(90deg,#00F5FF,#7C5CFF)"
    : "linear-gradient(90deg,#1E3A8A,#2563EB,#6366F1)";

  const fractionOkColor  = isDark ? "rgba(16,185,129,0.20)"  : "rgba(16,185,129,0.10)";
  const fractionOkText   = isDark ? "#6ee7b7"  : "#10B981";
  const fractionWarnColor= isDark ? "rgba(245,158,11,0.20)"  : "rgba(245,158,11,0.10)";
  const fractionWarnText = isDark ? "#fcd34d"  : "#F59E0B";

  const barTrackBg      = isDark ? "rgba(255,255,255,0.06)"  : "#EEF2F7";
  const barFillGrad     = isDark
    ? "linear-gradient(90deg,#00F5FF,#7C5CFF)"
    : "linear-gradient(90deg,#1E3A8A,#2563EB)";

  const tableBorderColor = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
  const tableHeaderBg    = isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC";
  const tableRowEvenBg   = isDark ? "rgba(255,255,255,0.02)" : "#FAFBFE";
  const tableTextColor   = isDark ? "#e2e8f0" : "#0F172A";

  const cardStyle = {
    background:   cardBg,
    border:       `1px solid ${cardBorder}`,
    borderRadius: 18,
    padding:      "20px 22px",
    transition:   "background 0.25s ease, border-color 0.25s ease",
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const applyPreset = (preset) => {
    const newEls = Object.fromEntries(ELEMENT_COLS.map((el) => [el, "0"]));
    Object.entries(preset.elements).forEach(([el, v]) => { newEls[el] = String(v); });
    setElements(newEls);
    setEn(String(preset.en));
    setAn(String(preset.an));
  };

  const toggleModel = (key) => {
    setSelectedModels((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) : [...prev, key]
    );
  };

  const validateRange = () => {
    const start = parseFloat(xStart);
    const end   = parseFloat(xEnd);
    const step  = parseFloat(xStep);
    if (isNaN(start) || isNaN(end) || isNaN(step)) return "Please enter valid numbers for Start, End, and Step.";
    if (start >= end) return "Start must be less than End.";
    if (step <= 0)    return "Step must be greater than 0.";
    const numPoints = Math.floor((end - start) / step) + 1;
    if (numPoints > 2000) return `Too many points (${numPoints}). Reduce range or increase step to stay under 2000 points.`;
    if (numPoints < 2)    return "Range must produce at least 2 data points.";
    return null;
  };

  const handlePredict = async () => {
    const validationError = validateRange();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(""); setRangeResult(null); setTablePage(0);
    try {
      const sanitizedParams   = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, parseFloat(v) || 0]));
      const sanitizedElements = Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, parseFloat(v) || 0]));
      const baseFeatures = buildFeatureDict(0, sanitizedParams, sanitizedElements, parseFloat(en) || 0, parseFloat(an) || 0);

      const res  = await fetch(`${API_BASE}/api/optical/predict/range`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_features: baseFeatures,
          x_start:  parseFloat(xStart),
          x_end:    parseFloat(xEnd),
          x_step:   parseFloat(xStep),
          models:   selectedModels,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Range prediction failed");
      setRangeResult(data);
      if (data.metrics) setModelMetrics(data.metrics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!rangeResult) return;
    const { x_values, predictions } = rangeResult;
    const activeModelKeys = MODELS.filter(m => predictions[m.key]).map(m => m.key);
    const header = ["x_val (nm)", ...activeModelKeys.map(k => {
      const m = MODELS.find(m => m.key === k);
      return `n_${m.short}`;
    })].join(",");
    const rows = x_values.map((x, i) => {
      const vals = activeModelKeys.map(k => {
        const v = predictions[k]?.[i];
        return (v !== null && v !== undefined && !isNaN(v)) ? v.toFixed(6) : "";
      });
      return [x, ...vals].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `refractive_index_${xStart}-${xEnd}nm.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalFraction = ELEMENT_COLS.reduce((s, el) => s + (parseFloat(elements[el]) || 0), 0);
  const fractionOk    = Math.abs(totalFraction - 1.0) < 0.01 || totalFraction === 0;
  const maxR2         = modelMetrics
    ? Math.max(...Object.values(modelMetrics).map((m) => (m && typeof m.r2 === "number") ? m.r2 : 0), 0.0001)
    : 1;

  // Table pagination
  const tableRows     = rangeResult?.x_values ?? [];
  const totalPages    = Math.ceil(tableRows.length / TABLE_PAGE_SIZE);
  const pagedRows     = tableRows.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE);
  const activeModelKeys = rangeResult
    ? MODELS.filter(m => rangeResult.predictions?.[m.key]).map(m => m.key)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:  "100vh",
      background: pageBg,
      color:      mainTextCol,
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      padding:    "26px 28px",
      transition: "background 0.25s ease, color 0.25s ease",
    }}>

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 18, padding: "30px 34px",
        background: heroBg, border: `1px solid ${heroBorder}`,
        marginBottom: 20, position: "relative", overflow: "hidden",
        transition: "background 0.25s ease",
      }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: heroGlowBg, pointerEvents: "none" }} />
        {!isDark && (
          <div style={{ position: "absolute", top: 16, right: 28, pointerEvents: "none", opacity: 0.4 }}>
            {Array.from({ length: 7 }).map((_, ri) => (
              <div key={ri} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                {Array.from({ length: 10 }).map((_, ci) => (
                  <div key={ci} style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.2 + (ri + ci) * 0.015 }} />
                ))}
              </div>
            ))}
          </div>
        )}
        <h1 style={{
          margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1,
          color: "#FFFFFF",
          textShadow: isDark ? "0 0 12px rgba(255,255,255,0.15)" : "none",
        }}>
          OPTICAL PROPERTY<br />PREDICTOR
        </h1>
        <p style={{ color: heroSubColor, fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          ENAN Dataset · Refractive Index Prediction · 4-Model Benchmark · Spectral Range Mode
        </p>
      </div>

      <div style={{ maxWidth: 896, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Spectral Range Input ─────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
              Spectral Range (x_val)
            </h2>
            <div style={{ display: "flex", gap: 4, background: unitToggleBg, borderRadius: 8, padding: 4, fontSize: 12 }}>
              {["nm", "ev"].map((u) => (
                <button key={u} onClick={() => setUnit(u)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontWeight: 600, fontFamily: "inherit",
                  background: unit === u ? accentColor : "transparent",
                  color:      unit === u ? "#fff" : tabInactiveCol,
                  transition: "all 0.2s",
                }}>
                  {u === "nm" ? "nm (wavelength)" : "eV (energy)"}
                </button>
              ))}
            </div>
          </div>

          {/* Range inputs row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 10 }}>
            {[
              { label: "Start", val: xStart, setter: setXStart, hint: "e.g. 200" },
              { label: "End",   val: xEnd,   setter: setXEnd,   hint: "e.g. 1000" },
              { label: "Step",  val: xStep,  setter: setXStep,  hint: "e.g. 10" },
            ].map(({ label, val, setter, hint }) => (
              <div key={label}>
                <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {label} <span style={{ color: labelUnitColor }}>({unit})</span>
                </label>
                <input
                  type="number" value={val} onChange={(e) => setter(e.target.value)}
                  placeholder={hint}
                  style={{
                    width: "100%", background: inputBg, border: `1px solid ${inputBorder}`,
                    borderRadius: 10, padding: "10px 14px", fontSize: 20,
                    fontFamily: "inherit", color: inputColor, outline: "none", boxSizing: "border-box",
                    transition: "background 0.25s, border-color 0.25s, color 0.25s",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Live preview */}
          {(() => {
            const s = parseFloat(xStart), e = parseFloat(xEnd), st = parseFloat(xStep);
            if (!isNaN(s) && !isNaN(e) && !isNaN(st) && s < e && st > 0) {
              const n = Math.floor((e - s) / st) + 1;
              const pts = Math.min(4, n);
              const preview = Array.from({ length: pts }, (_, i) => (s + i * st).toFixed(1)).join(", ");
              const suffix  = n > pts ? `, … , ${e}` : "";
              return (
                <p style={{ margin: 0, fontSize: 12, color: hintColor }}>
                  → {n} points: {preview}{suffix}
                  {n > 2000 && <span style={{ color: fractionWarnText }}> ⚠ Too many points (max 2000)</span>}
                </p>
              );
            }
            return <p style={{ margin: 0, fontSize: 12, color: hintColor }}>Enter start, end, and step to preview.</p>;
          })()}
        </div>

        {/* ── Presets ──────────────────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize: 11, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, marginTop: 0 }}>
            Quick Presets
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)} style={{
                padding: "8px 16px", borderRadius: 12,
                background: presetBg, border: `1px solid ${presetBorder}`,
                color: presetColor, fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = presetHoverBdr; e.currentTarget.style.background = presetHoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = presetBorder;   e.currentTarget.style.background = presetBg; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", borderBottom: `1px solid ${dividerColor}`, marginBottom: 0, marginLeft: -22, marginRight: -22, paddingLeft: 22 }}>
            {[
              { id: "params",   label: "⚙️  Deposition Params" },
              { id: "elements", label: "🧪 Element Fractions"  },
              { id: "optical",  label: "💡 Optical Constants"  },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 500,
                fontFamily: "inherit", cursor: "pointer", border: "none",
                borderBottom:  activeTab === tab.id ? `2px solid ${accentBorder}` : "2px solid transparent",
                background:    activeTab === tab.id ? accentDim : "transparent",
                color:         activeTab === tab.id ? accentText : tabInactiveCol,
                transition:    "all 0.2s",
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ paddingTop: 20 }}>

            {/* Deposition Params */}
            {activeTab === "params" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {PARAM_COLS.map(({ key, label, unit: u }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, color: labelColor, marginBottom: 4 }}>
                      {label} <span style={{ color: labelUnitColor }}>({u})</span>
                    </label>
                    <input
                      type="number" step="any" value={params[key]}
                      onChange={(e) => setParams((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{
                        width: "100%", background: inputSmBg, border: `1px solid ${inputSmBorder}`,
                        borderRadius: 8, padding: "8px 12px", fontSize: 13,
                        fontFamily: "inherit", color: inputSmColor, outline: "none", boxSizing: "border-box",
                        transition: "background 0.25s, border-color 0.25s, color 0.25s",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Element Fractions */}
            {activeTab === "elements" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: labelColor, margin: 0 }}>
                    Enter atomic fractions (should sum to 1.0 for a real compound)
                  </p>
                  <span style={{
                    fontSize: 12, fontFamily: "inherit", padding: "4px 8px", borderRadius: 6,
                    background: fractionOk ? fractionOkColor  : fractionWarnColor,
                    color:      fractionOk ? fractionOkText   : fractionWarnText,
                  }}>
                    Σ = {totalFraction.toFixed(4)}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                  {ELEMENT_COLS.map((el) => (
                    <div key={el} style={{
                      borderRadius: 8, border: `1px solid ${elInactiveBdr}`,
                      background: elInactiveBg, padding: "6px 8px", transition: "all 0.2s",
                    }}>
                      <label style={{ display: "block", fontSize: 10, color: elLabelColor, marginBottom: 2, fontWeight: 600 }}>
                        {el}
                      </label>
                      <input
                        type="number" step="0.0001" min="0" max="1" value={elements[el]}
                        onChange={(e) => setElements((prev) => ({ ...prev, [el]: e.target.value }))}
                        style={{
                          width: "100%", background: "transparent", border: "none",
                          fontSize: 12, fontFamily: "inherit", color: elInputColor, outline: "none",
                          transition: "color 0.25s",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optical Constants */}
            {activeTab === "optical" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {[
                  { val: en, setter: setEn, name: "en", desc: "Electronegativity",    hint: "Typical range: 1.0 – 4.0 (Pauling scale weighted avg)" },
                  { val: an, setter: setAn, name: "an", desc: "Atomic Number (avg)",  hint: "Weighted average atomic number of compound" },
                ].map(({ val, setter, name, desc, hint }) => (
                  <div key={name}>
                    <label style={{ display: "block", fontSize: 14, color: optLabelColor, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: optAccentColor }}>{name}</span> — {desc}
                    </label>
                    <input
                      type="number" step="0.0001" value={val}
                      onChange={(e) => setter(e.target.value)}
                      style={{
                        width: "100%", background: inputBg, border: `1px solid ${inputBorder}`,
                        borderRadius: 12, padding: "12px 16px", fontSize: 18,
                        fontFamily: "inherit", color: optInputColor, outline: "none", boxSizing: "border-box",
                        transition: "background 0.25s, border-color 0.25s, color 0.25s",
                      }}
                    />
                    <p style={{ marginTop: 4, fontSize: 12, color: hintColor, marginBottom: 0 }}>{hint}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Model Selector (multi-select toggle) ─────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 14px" }}>
            Models to Compare
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {MODELS.map((m) => {
              const active = selectedModels.includes(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModel(m.key)}
                  title={m.label}
                  style={{
                    padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: 600, textAlign: "center",
                    border:     active ? `1px solid ${m.color}` : `1px solid ${presetBorder}`,
                    background: active ? `${m.color}22` : presetBg,
                    color:      active ? m.color : presetColor,
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ display: "block", fontSize: 15, marginBottom: 2 }}>
                    {active ? "✓" : "○"}
                  </span>
                  {m.short}
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: hintColor, marginBottom: 0 }}>
            {selectedModels.length === 4
              ? "All 4 models will be run across the full spectral range."
              : `${selectedModels.length} model(s) selected: ${selectedModels.map(k => MODELS.find(m=>m.key===k)?.short).join(", ")}`}
          </p>
        </div>

        {/* ── Training banner ───────────────────────────────────────────────── */}
        {modelsTraining && (
          <div style={{
            background: accentDim, border: `1px solid ${accentBorder}`,
            borderRadius: 12, padding: 16, color: accentText, fontSize: 14,
          }}>
            ⏳ The 4 optical models are training on the backend (10-fold CV — this can take a minute or two on first start). This page will activate automatically once they're ready.
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: errorBg, border: `1px solid ${errorBorder}`, borderRadius: 12, padding: 16, color: errorColor, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Predict Button ────────────────────────────────────────────────── */}
        <button
          onClick={handlePredict}
          disabled={loading || modelsTraining}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            border: `1px solid ${btnBorder}`, background: btnBg,
            color: btnColor, fontWeight: 700, fontSize: 14,
            cursor:    (loading || modelsTraining) ? "not-allowed" : "pointer",
            opacity:   (loading || modelsTraining) ? 0.5 : 1,
            fontFamily: "inherit", boxShadow: btnShadow, transition: "all 0.2s",
          }}
        >
          {modelsTraining
            ? "⏳ Models Training…"
            : loading
            ? "⏳ Computing Spectral Range…"
            : `⚡ Predict n(λ) from ${xStart} → ${xEnd} ${unit}`}
        </button>

        {/* ── Range Results ─────────────────────────────────────────────────── */}
        {rangeResult && (
          <>
            {/* Summary stats row */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${activeModelKeys.length}, 1fr)`, gap: 12 }}>
              {activeModelKeys.map((key) => {
                const m    = MODELS.find(m => m.key === key);
                const vals = rangeResult.predictions[key]?.filter(v => v !== null && !isNaN(v)) ?? [];
                const mn   = vals.length ? Math.min(...vals) : null;
                const mx   = vals.length ? Math.max(...vals) : null;
                const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                return (
                  <div key={key} style={{
                    background: resultBg, border: `1px solid ${m.color}33`,
                    borderRadius: 14, padding: "16px 14px", textAlign: "center",
                    transition: "background 0.25s, border-color 0.25s",
                  }}>
                    <div style={{ color: m.color, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 11, color: resultLabel, marginBottom: 4 }}>
                      {rangeResult.x_values.length} points · {xStart}–{xEnd} {unit}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 12, marginTop: 8 }}>
                      {[["min", mn], ["avg", avg], ["max", mx]].map(([lbl, v]) => (
                        <div key={lbl} style={{ textAlign: "center" }}>
                          <div style={{ color: resultLabel, fontSize: 10, marginBottom: 2 }}>{lbl}</div>
                          <div style={{ fontWeight: 700, color: m.color }}>{v !== null ? v.toFixed(4) : "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            <div style={{ ...cardStyle, padding: "20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
                  n(λ) Spectral Plot
                </h2>
                <div style={{ display: "flex", gap: 14 }}>
                  {activeModelKeys.map(key => {
                    const m = MODELS.find(m => m.key === key);
                    return (
                      <span key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: m.color }}>
                        <span style={{ display: "inline-block", width: 20, height: 2.5, background: m.color, borderRadius: 2 }} />
                        {m.short}
                      </span>
                    );
                  })}
                </div>
              </div>
              <RangeChart rangeResult={rangeResult} isDark={isDark} models={MODELS} />
            </div>

            {/* Table */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
                  Data Table · {rangeResult.x_values.length} rows
                </h2>
                <button
                  onClick={exportCSV}
                  style={{
                    padding: "6px 14px", borderRadius: 8,
                    border: `1px solid ${accentBorder}`, background: accentDim,
                    color: accentText, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ↓ Export CSV
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: tableHeaderBg }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: sectionLabel, borderBottom: `1px solid ${tableBorderColor}`, fontWeight: 600, fontSize: 11 }}>
                        λ ({unit})
                      </th>
                      {activeModelKeys.map(key => {
                        const m = MODELS.find(m => m.key === key);
                        return (
                          <th key={key} style={{ padding: "8px 12px", textAlign: "right", color: m.color, borderBottom: `1px solid ${tableBorderColor}`, fontWeight: 600, fontSize: 11 }}>
                            n · {m.short}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((x, localIdx) => {
                      const globalIdx = tablePage * TABLE_PAGE_SIZE + localIdx;
                      return (
                        <tr key={x} style={{ background: localIdx % 2 === 0 ? "transparent" : tableRowEvenBg }}>
                          <td style={{ padding: "6px 12px", color: optAccentColor, borderBottom: `1px solid ${tableBorderColor}`, fontWeight: 600 }}>
                            {x}
                          </td>
                          {activeModelKeys.map(key => {
                            const v = rangeResult.predictions[key]?.[globalIdx];
                            const valid = v !== null && v !== undefined && !isNaN(v);
                            return (
                              <td key={key} style={{ padding: "6px 12px", textAlign: "right", color: valid ? tableTextColor : errorColor, borderBottom: `1px solid ${tableBorderColor}` }}>
                                {valid ? v.toFixed(6) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12 }}>
                  <span style={{ color: hintColor }}>
                    Rows {tablePage * TABLE_PAGE_SIZE + 1}–{Math.min((tablePage + 1) * TABLE_PAGE_SIZE, tableRows.length)} of {tableRows.length}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setTablePage(0)} disabled={tablePage === 0}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${presetBorder}`, background: presetBg, color: presetColor, cursor: tablePage === 0 ? "not-allowed" : "pointer", opacity: tablePage === 0 ? 0.4 : 1, fontFamily: "inherit", fontSize: 11 }}>
                      ««
                    </button>
                    <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={tablePage === 0}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${presetBorder}`, background: presetBg, color: presetColor, cursor: tablePage === 0 ? "not-allowed" : "pointer", opacity: tablePage === 0 ? 0.4 : 1, fontFamily: "inherit", fontSize: 11 }}>
                      ‹
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = Math.max(0, Math.min(totalPages - 5, tablePage - 2)) + i;
                      return (
                        <button key={pg} onClick={() => setTablePage(pg)}
                          style={{ padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, cursor: "pointer",
                            border: pg === tablePage ? `1px solid ${accentBorder}` : `1px solid ${presetBorder}`,
                            background: pg === tablePage ? accentDim : presetBg,
                            color:      pg === tablePage ? accentText : presetColor,
                          }}>
                          {pg + 1}
                        </button>
                      );
                    })}
                    <button onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={tablePage === totalPages - 1}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${presetBorder}`, background: presetBg, color: presetColor, cursor: tablePage === totalPages - 1 ? "not-allowed" : "pointer", opacity: tablePage === totalPages - 1 ? 0.4 : 1, fontFamily: "inherit", fontSize: 11 }}>
                      ›
                    </button>
                    <button onClick={() => setTablePage(totalPages - 1)} disabled={tablePage === totalPages - 1}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${presetBorder}`, background: presetBg, color: presetColor, cursor: tablePage === totalPages - 1 ? "not-allowed" : "pointer", opacity: tablePage === totalPages - 1 ? 0.4 : 1, fontFamily: "inherit", fontSize: 11 }}>
                      »»
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Model Comparison Chart ────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 16px" }}>
            Model Performance (10-fold CV)
          </h2>

          {metricsLoading && (
            <p style={{ fontSize: 13, color: hintColor, margin: 0 }}>Loading model metrics…</p>
          )}
          {metricsError && (
            <p style={{ fontSize: 13, color: errorColor, margin: 0 }}>⚠️ {metricsError}</p>
          )}

          {modelMetrics && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {MODELS.map((m) => {
                const md      = modelMetrics[m.key];
                const r2      = md && typeof md.r2 === "number" ? md.r2 : 0;
                const widthPct= Math.max(2, Math.min(100, (r2 / maxR2) * 100));
                return (
                  <div key={m.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
                      <span style={{ color: optAccentColor }}>
                        R² {md && typeof md.r2   === "number" ? md.r2.toFixed(3)   : "—"}
                        {"  ·  "}MAE  {md && typeof md.mae  === "number" ? md.mae.toFixed(3)  : "—"}
                        {"  ·  "}RMSE {md && typeof md.rmse === "number" ? md.rmse.toFixed(3) : "—"}
                        {"  ·  "}MAPE {md && typeof md.mape === "number" ? md.mape.toFixed(3) : "—"}
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 6, background: barTrackBg, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${widthPct}%`,
                        background: `linear-gradient(90deg, ${m.color}99, ${m.color})`,
                        borderRadius: 6, transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>
    </div>
  );
}