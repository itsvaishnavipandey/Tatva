import { useState, useRef } from "react";
import { useTheme } from "../components/Layout";

const FLASK_URL = "http://127.0.0.1:8000";

export default function RootPhenotypingPage() {
  const { isDark, setIsDark } = useTheme();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scaleFactor, setScaleFactor] = useState("0.066");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  // Derived theme values (mirrors SpatteringPage pattern)
  const primaryColor   = isDark ? "#00c8ff" : "#2563EB";
  const borderColor    = isDark ? "rgba(0,200,255,0.2)"  : "#D1D9E6";
  const borderDash     = isDark ? "rgba(0,200,255,0.3)"  : "#94BFF7";
  const inputBg        = isDark ? "rgba(0,150,255,0.06)" : "#F8FAFC";
  const cardBg         = isDark
    ? "linear-gradient(145deg,rgba(15,22,35,0.97),rgba(10,15,25,0.99))"
    : "#FFFFFF";
  const pageBg         = isDark ? "#0a0e14" : "#F1F5F9";
  const shadowLg       = isDark
    ? "0 0 60px rgba(0,100,255,0.08)"
    : "0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)";
  const tagBorderColor = isDark ? "rgba(0,200,255,0.4)" : "rgba(37,99,235,0.35)";
  const headingGrad    ="#FFFFFF"
  const subTextColor   = isDark ? "#7a8a9a" : "#64748B";
  const labelColor     = isDark ? "#3a6a8a" : "#64748B";
  const hintColor      = isDark ? "#2a4a6a" : "#94A3B8";
  const dropTextMain   = isDark ? "#d0dde8" : "#1E3A8A";
  const dropTextSub    = isDark ? "#4a5a6a" : "#64748B";
  const dropTextFmt    = isDark ? "#354050" : "#94A3B8";
  const cornerAccent   = isDark ? "rgba(0,200,255,0.4)" : "rgba(37,99,235,0.3)";
  const btnBg          = isDark
    ? "linear-gradient(135deg,#001a33,#001033)"
    : "linear-gradient(135deg,#1E3A8A,#2563EB)";
  const btnBorder      = isDark ? "rgba(0,200,255,0.5)" : "rgba(37,99,235,0.6)";
  const btnShadow      = isDark
    ? "0 0 20px rgba(0,120,255,0.25)"
    : "0 4px 14px rgba(37,99,235,0.35)";
  const errorBg        = isDark ? "rgba(255,60,60,0.06)"  : "#FEF2F2";
  const errorBorder    = isDark ? "rgba(255,60,60,0.2)"   : "#FECACA";
  const errorText      = isDark ? "#ff6b6b" : "#DC2626";
  const metricHdrColor = isDark ? "#00c8ff" : "#2563EB";
  const scaleNoteColor = isDark ? "#2a4a6a" : "#94A3B8";
  const maskHdrColor   = isDark ? "#3a5a7a" : "#64748B";
  const bottomBarBg    = isDark ? "#0d1117" : "#FFFFFF";
  const bottomBarBorder= isDark ? "rgba(0,200,255,0.08)" : "#E2E8F0";
  const bottomBarText  = isDark ? "#3a4a5a" : "#94A3B8";
  const mainTextColor  = isDark ? "#F1F5F9" : "#0F172A";

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResults(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null); setPreview(null);
    setResults(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true); setResults(null); setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("scale_factor", scaleFactor);

      const res = await fetch(`${FLASK_URL}/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const bodyText = doc.body?.innerText || doc.body?.textContent || "";

      const maskImg = doc.querySelector('img[src^="data:image"]');
      const maskSrc = maskImg ? maskImg.src : null;

      const extract = (pattern) => {
        const m = bodyText.match(pattern);
        return m ? m[1] : null;
      };

      const trl_mm     = extract(/Total Root Length[^\d]*([\d.]+)\s*mm/i);
      const depth_mm   = extract(/(?:Root\s*)?Depth[^\d]*([\d.]+)\s*mm/i);
      const tortuosity = extract(/Tortuosity[^\d]*([\d.]+)/i);
      const hull_mm2   = extract(/(?:Convex Hull|Hull)[^\d]*([\d.]+)\s*mm/i);

      if (!trl_mm && !depth_mm && !tortuosity) {
        throw new Error("Could not parse metrics. The backend may have returned an error — check your image format (PNG/JPG only).");
      }

      setResults({ trl_mm, depth_mm, tortuosity, hull_mm2, maskSrc, scaleFactor });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const metricColors = isDark
    ? { trl: "#00d4ff", depth: "#7b8fff", tort: "#a855f7", hull: "#00e87a" }
    : { trl: "#2563EB", depth: "#0891B2", tort: "#7C3AED", hull: "#10B981" };

  const metrics = results ? [
    { label: "TOTAL ROOT LENGTH", value: results.trl_mm     ? `${results.trl_mm} mm`     : "—", icon: "📏", color: metricColors.trl  },
    { label: "ROOT DEPTH",        value: results.depth_mm   ? `${results.depth_mm} mm`   : "—", icon: "📐", color: metricColors.depth },
    { label: "TORTUOSITY",        value: results.tortuosity ?? "—",                              icon: "〰",  color: metricColors.tort  },
    { label: "HULL AREA",         value: results.hull_mm2   ? `${results.hull_mm2} mm²`  : "—", icon: "⬡",  color: metricColors.hull  },
  ] : [];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: pageBg,
      fontFamily: "'Courier New', monospace",
      color: mainTextColor,
      transition: "background 0.25s ease, color 0.25s ease",
    }}>

      {/* ── Main ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        position: "relative",
      }}>

        {/* ambient glow — only in dark */}
        {isDark && (
          <div style={{
            position: "absolute", top: "30%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 700, height: 500,
            background: "radial-gradient(ellipse,rgba(0,80,200,0.1),transparent 70%)",
            pointerEvents: "none",
          }} />
        )}

        <div style={{
          position: "relative",
          width: 760,
          maxWidth: "100%",
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 20,
          padding: "44px 52px",
          boxShadow: shadowLg,
          textAlign: "center",
          transition: "background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
        }}>

          {/* Corner accents */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 60, borderTop: `2px solid ${cornerAccent}`, borderLeft: `2px solid ${cornerAccent}`, borderRadius: "20px 0 0 0" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 60, height: 60, borderBottom: `2px solid ${cornerAccent}`, borderRight: `2px solid ${cornerAccent}`, borderRadius: "0 0 20px 0" }} />

          {/* Tags */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
            {[
              { label: "CV ENGINE V4.2",  c: primaryColor,                  bg: isDark ? "rgba(0,200,255,0.06)"   : "rgba(37,99,235,0.06)",   b: tagBorderColor },
              { label: "MORPHOLOGY",      c: isDark ? "#9b8fff" : "#7C3AED", bg: isDark ? "rgba(155,143,255,0.06)" : "rgba(124,58,237,0.06)", b: isDark ? "rgba(155,143,255,0.4)" : "rgba(124,58,237,0.35)" },
              { label: "SKELETONIZATION", c: isDark ? "#fff"    : "#1E3A8A", bg: isDark ? "rgba(0,200,255,0.15)"  : "rgba(37,99,235,0.12)",  b: isDark ? "rgba(0,200,255,0.5)"   : "rgba(37,99,235,0.4)" },
            ].map(({ label, c, bg, b }) => (
              <div key={label} style={{ padding: "4px 12px", fontSize: 10, letterSpacing: 1.5, borderRadius: 4, border: `1px solid ${b}`, background: bg, color: c }}>{label}</div>
            ))}
          </div>

          {/* Heading */}
          <h1 style={{
  fontFamily: "sans-serif",
  fontSize: 50,
  fontWeight: 800,
  letterSpacing: -1,
  marginBottom: 14,
  color: "#373ae4",   // fixed visible color
  lineHeight: 1.1,
}}>
            Root Phenotyping Analyzer
          </h1>
          <p style={{ fontSize: 13, color: subTextColor, lineHeight: 1.7, maxWidth: 500, margin: "0 auto 28px", fontFamily: "sans-serif" }}>
            Upload biological root sample imagery for automated topological extraction, trait quantification, and architectural modeling via computer vision analysis.
          </p>

          {/* Scale Factor Input */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
            <label style={{ fontSize: 10, color: labelColor, letterSpacing: 1.5 }}>MM/PX SCALE FACTOR</label>
            <input
              type="number"
              step="0.001"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(e.target.value)}
              style={{
                width: 90, padding: "5px 10px",
                background: inputBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 6, color: primaryColor, fontSize: 12,
                fontFamily: "'Courier New', monospace", textAlign: "center",
                outline: "none",
                transition: "background 0.25s, border-color 0.25s",
              }}
            />
            <span style={{ fontSize: 9, color: hintColor, letterSpacing: 1 }}>DEFAULT: 0.066</span>
          </div>

          {/* Drop Zone */}
          <div
            style={{
              border: `1.5px dashed ${dragging ? (isDark ? "rgba(0,200,255,0.7)" : "rgba(37,99,235,0.7)") : borderDash}`,
              borderRadius: 12,
              background: dragging
                ? (isDark ? "rgba(0,150,255,0.08)" : "rgba(37,99,235,0.05)")
                : (isDark ? "rgba(0,150,255,0.03)" : "rgba(37,99,235,0.02)"),
              padding: "32px 24px", cursor: "pointer", marginBottom: 24,
              transition: "all 0.25s", position: "relative",
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <input
              ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {!file ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 10, color: primaryColor }}>🔬</div>
                <div style={{ fontSize: 15, color: dropTextMain, letterSpacing: 1, marginBottom: 6 }}>Scan Chamber Input</div>
                <div style={{ fontSize: 12, color: dropTextSub, marginBottom: 10 }}>Drop sample for analysis or click to browse</div>
                <div style={{ fontSize: 10, color: dropTextFmt, letterSpacing: 1.5 }}>FORMAT: PNG, JPG, JPEG &nbsp;|&nbsp; MAX SIZE: 10MB</div>
              </>
            ) : (
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center" }}>
                <div style={{ position: "relative" }}>
                  <img
                    src={preview} alt="preview"
                    style={{ maxHeight: 160, maxWidth: 260, borderRadius: 8, border: `1px solid ${borderColor}`, display: "block" }}
                  />
                  <button
                    onClick={clearFile}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(255,60,60,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, lineHeight: "22px" }}
                  >✕</button>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, color: primaryColor, letterSpacing: 1, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 10, color: hintColor, letterSpacing: 1 }}>{(file.size / 1024).toFixed(1)} KB</div>
                  <div style={{ fontSize: 9, color: isDark ? "#1a3a5a" : "#94A3B8", marginTop: 6, letterSpacing: 1 }}>READY FOR ANALYSIS</div>
                </div>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <button
            disabled={loading || !file}
            onClick={analyzeImage}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: 260, margin: "0 auto 0", padding: "14px 32px",
              background: btnBg,
              border: `1.5px solid ${btnBorder}`,
              borderRadius: 40, color: "#fff", fontSize: 12, letterSpacing: 2,
              cursor: loading || !file ? "not-allowed" : "pointer",
              opacity: loading || !file ? 0.5 : 1,
              boxShadow: btnShadow,
              fontFamily: "'Courier New', monospace",
              transition: "all 0.25s",
            }}
          >
            {loading
              ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              : <span style={{ color: "#ffd700", fontSize: 14 }}>⚡</span>
            }
            {loading ? "ANALYZING..." : "INITIATE ANALYSIS"}
          </button>

          {/* Error */}
          {error && (
            <div style={{ color: errorText, fontSize: 12, marginTop: 16, padding: "10px 16px", background: errorBg, border: `1px solid ${errorBorder}`, borderRadius: 8 }}>
              ⚠ {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <div style={{ marginTop: 28, textAlign: "left" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: metricHdrColor, marginBottom: 16, textAlign: "center" }}>▸ PHENOTYPING METRICS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {metrics.map(({ label, value, icon, color }) => (
                  <div key={label} style={{
                    padding: "16px 18px",
                    background: isDark ? "rgba(0,0,0,0.3)" : "rgba(37,99,235,0.03)",
                    border: `1px solid ${color}22`,
                    borderRadius: 10,
                    borderLeft: `3px solid ${color}`,
                    transition: "background 0.25s",
                  }}>
                    <div style={{ fontSize: 9, color: isDark ? "#3a5a7a" : "#94A3B8", letterSpacing: 1.5, marginBottom: 6 }}>{icon} {label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "sans-serif", letterSpacing: -0.5 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, color: scaleNoteColor, textAlign: "center", marginBottom: 16, letterSpacing: 1 }}>
                SCALE FACTOR USED: {results.scaleFactor} mm/px
              </div>

              {results.maskSrc && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: maskHdrColor, marginBottom: 10 }}>▸ BINARY MASK OUTPUT</div>
                  <img src={results.maskSrc} alt="Binary mask" style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${borderColor}` }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        padding: "8px 24px",
        background: bottomBarBg,
        borderTop: `1px solid ${bottomBarBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 10, color: bottomBarText, letterSpacing: 1.5, flexShrink: 0,
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}>
        <div style={{ display: "flex", gap: 24 }}>
          <span>⬡ NODE: ALPHA-7</span>
          <span>▣ MEM: 12.4GB/64GB</span>
        </div>
        <span>SECURE CONNECTION</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}