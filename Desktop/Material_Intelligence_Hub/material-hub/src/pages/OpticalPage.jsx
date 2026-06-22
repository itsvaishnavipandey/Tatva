import { useState, useEffect } from "react";

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
  { label: "TiO₂",         elements: { Ti: 0.3333, O: 0.6667 },                                      en: 2.80673,   an: 12.6662 },
  { label: "CH₃NH₃SnI₃",  elements: { C: 0.0833, N: 0.1667, H: 0.4167, Sn: 0.0833, I: 0.25 },     en: 2.464191,  an: 19.4984 },
  { label: "SiO₂",         elements: { Si: 0.3333, O: 0.6667 },                                      en: 1.46,      an: 10.0    },
  { label: "ZnO",           elements: { Zn: 0.5, O: 0.5 },                                           en: 1.65,      an: 9.4     },
];

// ── The 4 models trained
const MODELS = [
  { key: "xgboost",       label: "XGBoost",                short: "XGB" },
  { key: "histgb",        label: "HistGradient Boosting",  short: "HGB" },
  { key: "neural_net",    label: "Neural Network (MLP)",   short: "MLP" },
  { key: "random_forest", label: "Random Forest",          short: "RF"  },
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

export default function OpticalPage({ isDark, setIsDark }) {
  const [xVal,      setXVal]      = useState("550");
  const [unit,      setUnit]      = useState("nm");
  const [params,    setParams]    = useState(
    Object.fromEntries(PARAM_COLS.map(({ key, default: d }) => [key, String(d)]))
  );
  const [elements,  setElements]  = useState(
    Object.fromEntries(ELEMENT_COLS.map((el) => [el, "0"]))
  );
  const [en,        setEn]        = useState("1.5");
  const [an,        setAn]        = useState("10.0");

  // single-model result OR multi-model result, depending on selectedModel
  const [selectedModel, setSelectedModel] = useState("all"); // "all" | xgboost | histgb | neural_net | random_forest
  const [result,        setResult]        = useState(null);  // number, when one model chosen
  const [allResult,     setAllResult]     = useState(null);  // {predictions:{key:y}, metrics:{...}}, when "all" chosen

  // model comparison metrics — loaded once the backend reports models are ready
  const [modelMetrics, setModelMetrics]   = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError]   = useState("");
  const [modelsTraining, setModelsTraining] = useState(true);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState("params");

  // ── Poll backend until the 4 models finish training, then fetch metrics ──
  useEffect(() => {
    let cancelled = false;
    let pollId;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/optical/status`);
        const data = await res.json();
        if (cancelled) return;

        if (data.ready) {
          setModelsTraining(false);
          clearInterval(pollId);
          try {
            const mres = await fetch(`${API_BASE}/api/optical/models`);
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
        // backend not reachable yet — keep polling, don't show a scary error immediately
        if (!cancelled) setMetricsError(err.message);
      }
    };

    checkStatus();
    pollId = setInterval(checkStatus, 3000);
    return () => { cancelled = true; clearInterval(pollId); };
  }, []);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const pageBg         = isDark ? "#050c1a"  : "var(--bg)";
  const cardBg         = isDark ? "#080f1e"  : "var(--card-bg)";
  const cardBorder     = isDark ? "rgba(0,245,255,0.07)" : "#E2E8F0";
  const heroBg         = isDark ? "linear-gradient(160deg,#08111f 0%,#050c1a 100%)" : "linear-gradient(135deg,#1E3A8A 0%,#2563EB 55%,#3B82F6 100%)";
  const heroBorder     = isDark ? "rgba(0,245,255,0.06)" : "transparent";
  const heroGlowBg     = isDark ? "radial-gradient(circle, rgba(0,245,255,0.04), transparent 70%)" : "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)";
  const heroTitleGrad  = isDark ? "linear-gradient(90deg,#2DD4FF,#7C5CFF,#E056FD)" : "linear-gradient(90deg,#ffffff,rgba(255,255,255,0.85))";
  const heroSubColor   = isDark ? "#64748b"  : "rgba(255,255,255,0.7)";

  const accentColor    = isDark ? "#7c3aed"  : "#4F46E5";
  const accentDim      = isDark ? "rgba(124,58,237,0.1)"  : "rgba(79,70,229,0.08)";
  const accentBorder   = isDark ? "#7c3aed"  : "#4F46E5";
  const accentText     = isDark ? "#c4b5fd"  : "#4F46E5";
  const accentActive   = isDark ? "rgba(124,58,237,0.1)"  : "rgba(79,70,229,0.1)";
  const unitToggleBg   = isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9";

  const inputBg        = isDark ? "#050c1a"  : "#F8FAFC";
  const inputBorder    = isDark ? "rgba(255,255,255,0.2)" : "#D1D9E6";
  const inputColor     = isDark ? "#67e8f9"  : "#1E40AF";
  const inputSmBg      = isDark ? "#050c1a"  : "#F8FAFC";
  const inputSmBorder  = isDark ? "rgba(255,255,255,0.15)" : "#D1D9E6";
  const inputSmColor   = isDark ? "#fff"     : "#0F172A";

  const labelColor     = isDark ? "rgba(255,255,255,0.4)"  : "#64748B";
  const labelUnitColor = isDark ? "rgba(255,255,255,0.2)"  : "#94A3B8";
  const hintColor      = isDark ? "rgba(255,255,255,0.3)"  : "#94A3B8";
  const sectionLabel   = isDark ? "rgba(255,255,255,0.4)"  : "#64748B";
  const dividerColor   = isDark ? "rgba(255,255,255,0.1)"  : "#E2E8F0";
  const tabInactiveCol = isDark ? "rgba(255,255,255,0.4)"  : "#94A3B8";

  const presetBg       = isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC";
  const presetBorder   = isDark ? "rgba(255,255,255,0.1)"  : "#E2E8F0";
  const presetColor    = isDark ? "#e2e8f0"  : "#1E40AF";
  const presetHoverBg  = isDark ? "rgba(124,58,237,0.1)"   : "rgba(79,70,229,0.08)";
  const presetHoverBdr = isDark ? "#7c3aed"  : "#4F46E5";

  const elInactiveBg   = isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC";
  const elInactiveBdr  = isDark ? "rgba(255,255,255,0.1)"  : "#E2E8F0";
  const elLabelColor   = isDark ? "rgba(255,255,255,0.5)"  : "#64748B";
  const elInputColor   = isDark ? "#fff"     : "#0F172A";

  const optLabelColor  = isDark ? "rgba(255,255,255,0.5)"  : "#64748B";
  const optAccentColor = isDark ? "#67e8f9"  : "#2563EB";
  const optInputColor  = isDark ? "#67e8f9"  : "#1E40AF";

  const errorBg        = isDark ? "rgba(239,68,68,0.1)"    : "#FEF2F2";
  const errorBorder    = isDark ? "rgba(239,68,68,0.3)"    : "#FECACA";
  const errorColor     = isDark ? "#fca5a5"  : "#DC2626";

  const btnBg          = isDark ? "linear-gradient(90deg, rgba(0,245,255,0.1), rgba(124,92,255,0.1))" : "linear-gradient(135deg,#1E3A8A,#2563EB)";
  const btnBorder      = isDark ? "rgba(0,245,255,0.25)"   : "transparent";
  const btnColor       = isDark ? "#00F5FF"  : "#ffffff";
  const btnShadow      = isDark ? "none"     : "0 4px 14px rgba(37,99,235,0.35)";

  const resultBg       = isDark ? "#080f1e"  : "var(--card-bg)";
  const resultBorder   = isDark ? "rgba(0,245,255,0.07)" : "#E2E8F0";
  const resultLabel    = isDark ? "#64748b"  : "#94A3B8";
  const resultGrad     = isDark ? "linear-gradient(90deg,#00F5FF,#7C5CFF)" : "linear-gradient(90deg,#1E3A8A,#2563EB,#6366F1)";

  const fractionOkColor   = isDark ? "rgba(16,185,129,0.2)"  : "rgba(16,185,129,0.1)";
  const fractionOkText    = isDark ? "#6ee7b7" : "#10B981";
  const fractionWarnColor = isDark ? "rgba(245,158,11,0.2)"  : "rgba(245,158,11,0.1)";
  const fractionWarnText  = isDark ? "#fcd34d" : "#F59E0B";

  const barTrackBg     = isDark ? "rgba(255,255,255,0.06)" : "#EEF2F7";
  const barFillGrad     = isDark ? "linear-gradient(90deg,#00F5FF,#7C5CFF)" : "linear-gradient(90deg,#1E3A8A,#2563EB)";

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 18,
    padding: "20px 22px",
    transition: "background 0.25s ease, border-color 0.25s ease",
  };

  const applyPreset = (preset) => {
    const newEls = Object.fromEntries(ELEMENT_COLS.map((el) => [el, "0"]));
    Object.entries(preset.elements).forEach(([el, v]) => { newEls[el] = String(v); });
    setElements(newEls);
    setEn(String(preset.en));
    setAn(String(preset.an));
  };

  const handlePredict = async () => {
    setLoading(true); setError(""); setResult(null); setAllResult(null);
    try {
      const sanitizedParams   = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, parseFloat(v) || 0]));
      const sanitizedElements = Object.fromEntries(Object.entries(elements).map(([k, v]) => [k, parseFloat(v) || 0]));
      const features = buildFeatureDict(
        parseFloat(xVal) || 0, sanitizedParams, sanitizedElements,
        parseFloat(en) || 0, parseFloat(an) || 0
      );
      const res  = await fetch(`${API_BASE}/api/optical/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, model: selectedModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Prediction failed");

      if (selectedModel === "all") {
        setAllResult(data); // { predictions: {key: y}, metrics: {key: {...}} }
        if (data.metrics) setModelMetrics(data.metrics); // keep comparison panel in sync
      } else {
        setResult(data.predicted_y);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalFraction = ELEMENT_COLS.reduce((s, el) => s + (parseFloat(elements[el]) || 0), 0);
  const fractionOk    = Math.abs(totalFraction - 1.0) < 0.01 || totalFraction === 0;

  // best R2 among loaded metrics, used to scale the comparison bars
  const maxR2 = modelMetrics
    ? Math.max(...Object.values(modelMetrics).map((m) => (m && typeof m.r2 === "number") ? m.r2 : 0), 0.0001)
    : 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: pageBg,
      color: isDark ? "#e2e8f0" : "var(--text)",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      padding: "26px 28px",
      transition: "background 0.25s ease, color 0.25s ease",
    }}>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
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
          background: heroTitleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          OPTICAL PROPERTY<br />PREDICTOR
        </h1>
        <p style={{ color: heroSubColor, fontSize: 13, marginTop: 10 }}>
          ENAN Dataset · Refractive Index Prediction · 4-Model Benchmark
        </p>
      </div>

      <div style={{ maxWidth: 896, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── X Value ──────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
              Spectral Input (x_val)
            </h2>
            <div style={{ display: "flex", gap: 4, background: unitToggleBg, borderRadius: 8, padding: 4, fontSize: 12 }}>
              {["nm", "ev"].map((u) => (
                <button key={u} onClick={() => setUnit(u)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontWeight: 600, fontFamily: "inherit",
                  background: unit === u ? accentColor : "transparent",
                  color: unit === u ? "#fff" : tabInactiveCol,
                  transition: "all 0.2s",
                }}>
                  {u === "nm" ? "nm (wavelength)" : "eV (energy)"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <input
              type="number" value={xVal} onChange={(e) => setXVal(e.target.value)}
              style={{
                flex: 1, background: inputBg, border: `1px solid ${inputBorder}`,
                borderRadius: 12, padding: "12px 16px", fontSize: 24,
                fontFamily: "inherit", color: inputColor, outline: "none",
                transition: "background 0.25s, border-color 0.25s",
              }}
            />
            <span style={{ color: tabInactiveCol, fontSize: 14 }}>{unit}</span>
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: hintColor }}>
            Typical range: 200–1000 nm · or 1–6 eV. Enter raw numeric value (e.g. 550 nm = 550.0).
          </p>
        </div>

        {/* ── Presets ─────── */}
        <div>
          <p style={{ fontSize: 11, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>
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

        {/* ── Tabs────── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", borderBottom: `1px solid ${dividerColor}`, marginBottom: 0, marginLeft: -22, marginRight: -22, paddingLeft: 22 }}>
            {[
              { id: "params",   label: "⚙️  Deposition Params" },
              { id: "elements", label: "🧪 Element Fractions" },
              { id: "optical",  label: "💡 Optical Constants" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 500,
                fontFamily: "inherit", cursor: "pointer", border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${accentBorder}` : "2px solid transparent",
                background: activeTab === tab.id ? accentDim : "transparent",
                color: activeTab === tab.id ? accentText : tabInactiveCol,
                transition: "all 0.2s",
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
                        transition: "background 0.25s, border-color 0.25s",
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
                    background: fractionOk ? fractionOkColor : fractionWarnColor,
                    color: fractionOk ? fractionOkText : fractionWarnText,
                  }}>
                    Σ = {totalFraction.toFixed(4)}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                  {ELEMENT_COLS.map((el) => (
                    <div key={el} style={{
                      borderRadius: 8,
                      border: `1px solid ${elInactiveBdr}`,
                      background: elInactiveBg,
                      padding: "6px 8px",
                      transition: "all 0.2s",
                    }}>
                      <label style={{
                        display: "block",
                        fontSize: 10,
                        color: elLabelColor,
                        marginBottom: 2,
                        fontWeight: 600
                      }}>
                        {el}
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        value={elements[el]}
                        onChange={(e) => setElements((prev) => ({ ...prev, [el]: e.target.value }))}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          fontSize: 12,
                          fontFamily: "inherit",
                          color: elInputColor,
                          outline: "none"
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
                  { val: en, setter: setEn, name: "en", desc: "Electronegativity", hint: "Typical range: 1.0 – 4.0 (Pauling scale weighted avg)" },
                  { val: an, setter: setAn, name: "an", desc: "Atomic Number (avg)", hint: "Weighted average atomic number of compound" },
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
                        transition: "background 0.25s, border-color 0.25s",
                      }}
                    />
                    <p style={{ marginTop: 4, fontSize: 12, color: hintColor }}>{hint}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ── Model Selector ───────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 14px" }}>
            Model
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[{ key: "all", label: "Compare All", short: "ALL" }, ...MODELS].map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedModel(m.key)}
                title={m.label}
                style={{
                  padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 600, textAlign: "center",
                  border: selectedModel === m.key ? `1px solid ${accentBorder}` : `1px solid ${presetBorder}`,
                  background: selectedModel === m.key ? accentActive : presetBg,
                  color: selectedModel === m.key ? accentText : presetColor,
                  transition: "all 0.2s",
                }}
              >
                {m.short}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: hintColor }}>
            {selectedModel === "all"
              ? "Runs all 4 models and shows every prediction side by side."
              : `Predicting with ${MODELS.find((m) => m.key === selectedModel)?.label}.`}
          </p>
        </div>

        {/* ── Training banner ─────────────────────────────────────────────── */}
        {modelsTraining && (
          <div style={{
            background: accentDim, border: `1px solid ${accentBorder}`,
            borderRadius: 12, padding: 16, color: accentText, fontSize: 14,
          }}>
            ⏳ The 4 optical models are training on the backend (10-fold CV — this can take a minute or two
            on first start). This page will activate automatically once they're ready.
          </div>
        )}

        {/* ── Error ──────── */}
        {error && (
          <div style={{ background: errorBg, border: `1px solid ${errorBorder}`, borderRadius: 12, padding: 16, color: errorColor, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Predict Button ───────── */}
        <button
          onClick={handlePredict} disabled={loading || modelsTraining}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            border: `1px solid ${btnBorder}`, background: btnBg,
            color: btnColor, fontWeight: 700, fontSize: 14,
            cursor: (loading || modelsTraining) ? "not-allowed" : "pointer",
            opacity: (loading || modelsTraining) ? 0.5 : 1, fontFamily: "inherit",
            boxShadow: btnShadow, transition: "all 0.2s",
          }}
        >
          {modelsTraining ? "⏳ Models Training…" : loading ? "⏳ Running Model..." : "⚡ Predict Optical Property"}
        </button>

        {/* ── Single-Model Result ─────────────────────────────────────────── */}
        {result !== null && selectedModel !== "all" && (
          <div style={{
            background: resultBg, border: `1px solid ${resultBorder}`,
            borderRadius: 18, padding: 30, textAlign: "center", marginTop: 4,
            transition: "background 0.25s, border-color 0.25s",
          }}>
            <div style={{ color: resultLabel, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
              Predicted Refractive Index · {MODELS.find((m) => m.key === selectedModel)?.label}
            </div>
            <div style={{
              fontSize: 64, fontWeight: 900,
              background: resultGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {result.toFixed(5)}
            </div>
          </div>
        )}

        {/* ── All-Models Result ───*/}
        {allResult && allResult.predictions && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 4 }}>
            {MODELS.map((m) => (
              <div key={m.key} style={{
                background: resultBg, border: `1px solid ${resultBorder}`,
                borderRadius: 14, padding: "18px 14px", textAlign: "center",
              }}>
                <div style={{ color: resultLabel, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                  {m.label}
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 800,
                  background: resultGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  {typeof allResult.predictions[m.key] === "number"
                    ? allResult.predictions[m.key].toFixed(5)
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Model Comparison Chart (CV metrics, always visible) ─────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: sectionLabel, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 16px" }}>
            Model Performance (10-fold CV)
          </h2>

          {metricsLoading && (
            <p style={{ fontSize: 13, color: hintColor }}>Loading model metrics…</p>
          )}
          {metricsError && (
            <p style={{ fontSize: 13, color: errorColor }}>⚠️ {metricsError}</p>
          )}

          {modelMetrics && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {MODELS.map((m) => {
                const md = modelMetrics[m.key];
                const r2 = md && typeof md.r2 === "number" ? md.r2 : 0;
                const widthPct = Math.max(2, Math.min(100, (r2 / maxR2) * 100));
                return (
                  <div key={m.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: labelColor, fontWeight: 600 }}>{m.label}</span>
                      <span style={{ color: optAccentColor }}>
                        R² {md && typeof md.r2 === "number" ? md.r2.toFixed(3) : "—"}
                        {"  ·  "}MAE {md && typeof md.mae === "number" ? md.mae.toFixed(3) : "—"}
                        {"  ·  "}RMSE {md && typeof md.rmse === "number" ? md.rmse.toFixed(3) : "—"}
                        {"  ·  "}MAPE {md && typeof md.mape === "number" ? md.mape.toFixed(3) : "—"}
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 6, background: barTrackBg, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${widthPct}%`,
                        background: barFillGrad, borderRadius: 6,
                        transition: "width 0.4s ease",
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