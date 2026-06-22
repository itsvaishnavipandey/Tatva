import { useState, useEffect } from "react";
import Papa from "papaparse";
import { useTheme } from "../components/Layout";

const CRYSTAL_COLORS_DARK = {
  Triclinic:    "#00f5ff",
  Monoclinic:   "#a78bfa",
  Tetragonal:   "#ffa500",
  Orthorhombic: "#00c96e",
  Rhombohedral: "#f472b6",
  Hexagonal:    "#38bdf8",
  Cubic:        "#fb923c",
};

const CRYSTAL_COLORS_LIGHT = {
  Triclinic:    "#0284c7",
  Monoclinic:   "#7c3aed",
  Tetragonal:   "#d97706",
  Orthorhombic: "#059669",
  Rhombohedral: "#db2777",
  Hexagonal:    "#0369a1",
  Cubic:        "#ea580c",
};

const CRYSTAL_SYSTEMS = [
  "Triclinic","Monoclinic","Tetragonal",
  "Orthorhombic","Rhombohedral","Hexagonal","Cubic"
];

const API = "http://localhost:8000";

// ── small shared components ───────

function Pill({ label, color }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:4,
      fontSize:11, fontFamily:"monospace",
      background:`${color}18`, color, border:`1px solid ${color}44`,
    }}>{label}</span>
  );
}

function StatCard({ label, value, unit="", isDark, accentColor, icon="⚡" }) {
  const sub        = isDark ? "#6a8aaa" : "#64748b";
  const val        = accentColor || (isDark ? "#00f5ff" : "#0284c7");
  const bg         = isDark ? "rgba(0,245,255,0.04)" : `${val}0d`;
  const border     = isDark ? "rgba(0,245,255,0.12)" : `${val}28`;
  const iconBg     = isDark ? `${val}22` : `${val}22`;
  const iconBorder = isDark ? `${val}44` : `${val}44`;
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
      transition: "background 0.25s ease",
    }}>
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: iconBg,
        border: `1px solid ${iconBorder}`,
        borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 17,
      }}>{icon}</div>
      <div>
        <div style={{fontSize:10,color:sub,fontFamily:"monospace",letterSpacing:1,marginBottom:4}}>{label}</div>
        <div style={{fontSize:22,fontWeight:700,color:val,lineHeight:1}}>
          {value}<span style={{fontSize:13,color:sub,marginLeft:4,fontWeight:400}}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function Label({ children, isDark }) {
  return (
    <div style={{fontSize:11,color:isDark?"#6a8aaa":"#94a3b8",fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>
      {children}
    </div>
  );
}

function FemInput({ label, isDark, ...props }) {
  const sub = isDark ? "#6a8aaa" : "#94a3b8";
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:11,color:sub,fontFamily:"monospace",letterSpacing:1,marginBottom:5}}>{label}</label>
      <input style={{
        background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
        border: `1px solid ${isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0"}`,
        borderRadius:6, padding:"7px 12px",
        color: isDark ? "#e0f0ff" : "#0d1120",
        fontFamily:"monospace", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none",
      }} {...props} />
    </div>
  );
}

function FemSelect({ label, options, isDark, ...props }) {
  const sub = isDark ? "#6a8aaa" : "#94a3b8";
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:11,color:sub,fontFamily:"monospace",letterSpacing:1,marginBottom:5}}>{label}</label>
      <select style={{
        background: isDark ? "#0d1929" : "#ffffff",
        border: `1px solid ${isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0"}`,
        borderRadius:6, padding:"7px 12px",
        color: isDark ? "#e0f0ff" : "#0d1120",
        fontFamily:"monospace", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none",
      }} {...props}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function OrangeBtn({ children, onClick, disabled, isDark }) {
  const activeColor  = isDark ? "#ffa500" : "#d97706";
  const activeBg     = isDark ? "rgba(255,165,0,0.15)" : "rgba(217,119,6,0.10)";
  const disabledColor= isDark ? "#7a6030" : "#c4a35a";
  const disabledBg   = isDark ? "rgba(255,165,0,0.05)" : "rgba(217,119,6,0.04)";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? disabledBg : activeBg,
      border: `1px solid ${disabled ? (isDark?"rgba(255,165,0,0.2)":"rgba(217,119,6,0.2)") : (isDark?"rgba(255,165,0,0.5)":"rgba(217,119,6,0.45)")}`,
      color: disabled ? disabledColor : activeColor,
      fontFamily:"monospace", fontSize:12, letterSpacing:1,
      padding:"9px 20px", borderRadius:6, cursor: disabled ? "not-allowed" : "pointer",
    }}>{children}</button>
  );
}

function BarRow({ label, value, max, color, isDark }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <div style={{fontSize:11,color:isDark?"#8aaccc":"#64748b",fontFamily:"monospace",width:32,textAlign:"right"}}>{label}</div>
      <div style={{flex:1,height:8,background:trackBg,borderRadius:4,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:4,transition:"width 0.6s ease"}} />
      </div>
      <div style={{fontSize:11,color,width:46,textAlign:"right"}}>{Number(value).toFixed(2)}</div>
    </div>
  );
}

// ── Tab 1: Database ───────────

function DatabaseTab({ csvData, isDark }) {
  const [search, setSearch]       = useState("");
  const [filterSys, setFilterSys] = useState("All");

  const crystalColors = isDark ? CRYSTAL_COLORS_DARK : CRYSTAL_COLORS_LIGHT;
  const systems = ["All", ...Array.from(new Set(csvData.map(r=>r.crystal_system).filter(Boolean))).sort()];

  const filtered = csvData.filter(row => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (row["Ferro electric thin film material"]||"").toLowerCase().includes(s) ||
      (row.crystal_system||"").toLowerCase().includes(s) ||
      (row.formula||"").toLowerCase().includes(s);
    const matchSys = filterSys === "All" || row.crystal_system === filterSys;
    return matchSearch && matchSys;
  });

  const maxPr = Math.max(...csvData.map(r=>parseFloat(r["Remnant polarization"])||0));
  const maxEc = Math.max(...csvData.map(r=>parseFloat(r["Coercive field"])||0));
  const numSys = new Set(csvData.map(r=>r.crystal_system).filter(Boolean)).size;

  const cardBorder = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const inputBg    = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder= isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0";
  const inputColor = isDark ? "#e0f0ff" : "#0d1120";
  const selectBg   = isDark ? "#0d1929" : "#ffffff";
  const subText    = isDark ? "#6a8aaa" : "#94a3b8";
  const tableBg    = isDark ? "rgba(0,245,255,0.06)" : "#f8fafc";
  const tableText  = isDark ? "#6a8aaa" : "#64748b";
  const tableBorder= isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const rowBorder  = isDark ? "rgba(0,245,255,0.05)" : "#f1f5f9";
  const matColor   = isDark ? "#c0d8ee" : "#1e3a5f";
  const prColor    = isDark ? "#00c96e" : "#059669";
  const ecColor    = isDark ? "#ffa500" : "#d97706";
  const textColor  = isDark ? "#e0f0ff" : "#0d1120";
  const mpColor    = isDark ? "#00f5ff" : "#0284c7";

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <StatCard label="TOTAL MATERIALS" value={csvData.length} isDark={isDark} icon="🗄" />
        <StatCard label="CRYSTAL SYSTEMS" value={numSys} isDark={isDark} accentColor={isDark?"#00c96e":"#059669"} icon="🔷" />
        <StatCard label="MAX Pr" value={maxPr.toFixed(1)} unit="μC/cm²" isDark={isDark} accentColor={isDark?"#a78bfa":"#7c3aed"} icon="⚡" />
        <StatCard label="MAX Ec" value={maxEc.toFixed(0)} unit="kV/cm" isDark={isDark} accentColor={isDark?"#ffa500":"#d97706"} icon="⚡" />
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search material, formula, crystal system..."
          style={{
            flex:1, background:inputBg, border:`1px solid ${inputBorder}`,
            borderRadius:6, padding:"8px 14px", color:inputColor,
            fontFamily:"monospace", fontSize:13, outline:"none",
          }}
        />
        <select value={filterSys} onChange={e=>setFilterSys(e.target.value)} style={{
          background:selectBg, border:`1px solid ${inputBorder}`,
          borderRadius:6, padding:"8px 12px", color:inputColor,
          fontFamily:"monospace", fontSize:12, outline:"none",
        }}>
          {systems.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{border:`1px solid ${cardBorder}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{overflowX:"auto",maxHeight:360,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
            <thead>
              <tr>
                {["MATERIAL","CRYSTAL SYSTEM","Pr (μC/cm²)","Ec (kV/cm)","BAND GAP (eV)","MP ID"].map(h=>(
                  <th key={h} style={{
                    background:tableBg, color:tableText, textAlign:"left",
                    padding:"10px 14px", fontFamily:"monospace", fontSize:11, letterSpacing:1,
                    borderBottom:`1px solid ${tableBorder}`, position:"sticky", top:0,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,80).map((row,i)=>{
                const sys = row.crystal_system || "—";
                const color = crystalColors[sys] || (isDark?"#6a8aaa":"#94a3b8");
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${rowBorder}`}}>
                    <td style={{padding:"8px 14px",color:matColor,fontWeight:500}}>{row["Ferro electric thin film material"]||"—"}</td>
                    <td style={{padding:"8px 14px"}}><Pill label={sys} color={color} /></td>
                    <td style={{padding:"8px 14px",color:prColor}}>{row["Remnant polarization"]||"—"}</td>
                    <td style={{padding:"8px 14px",color:ecColor}}>{row["Coercive field"]||"—"}</td>
                    <td style={{padding:"8px 14px",color:textColor}}>{parseFloat(row.band_gap)?parseFloat(row.band_gap).toFixed(2):"—"}</td>
                    <td style={{padding:"8px 14px",color:mpColor,fontFamily:"monospace",fontSize:11}}>{row.mpid||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{marginTop:8,fontSize:11,color:subText,fontFamily:"monospace"}}>
        SHOWING {Math.min(filtered.length,80)} OF {filtered.length} RESULTS
      </div>
    </div>
  );
}

// ── Tab 2: Material Profile ───────────

function ProfileTab({ csvData, isDark }) {
  const crystalColors = isDark ? CRYSTAL_COLORS_DARK : CRYSTAL_COLORS_LIGHT;
  const materials = [...new Set(csvData.map(r=>r["Ferro electric thin film material"]).filter(Boolean))].sort();
  const [selected, setSelected] = useState(materials[0]||"");
  const row = csvData.find(r=>r["Ferro electric thin film material"]===selected);
  const lMax = Math.max(parseFloat(row?.a)||0, parseFloat(row?.b)||0, parseFloat(row?.c)||0) * 1.1;

  const accent      = isDark ? "#00f5ff" : "#0284c7";
  const cardBg      = isDark ? "rgba(0,245,255,0.03)" : "#ffffff";
  const cardBorder  = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const selectBg    = isDark ? "#0d1929" : "#ffffff";
  const selectBorder= isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0";
  const subText     = isDark ? "#6a8aaa" : "#94a3b8";
  const textColor   = isDark ? "#e0f0ff" : "#0d1120";
  const innerBg     = isDark ? "rgba(0,0,0,0.2)" : "#f8fafc";
  const innerBorder = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const prColor     = isDark ? "#00c96e" : "#059669";
  const ecColor     = isDark ? "#ffa500" : "#d97706";
  const divider     = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <Label isDark={isDark}>SELECT MATERIAL</Label>
        <select value={selected} onChange={e=>setSelected(e.target.value)} style={{
          background:selectBg, border:`1px solid ${selectBorder}`,
          borderRadius:6, padding:"8px 14px",
          color: isDark ? "#e0f0ff" : "#0d1120",
          fontFamily:"monospace", fontSize:13, outline:"none", minWidth:240,
        }}>
          {materials.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {row ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:8,padding:18,
            boxShadow: isDark?"none":"0 1px 4px rgba(0,0,0,0.06)"}}>
            <Label isDark={isDark}>LATTICE PARAMETERS (Å)</Label>
            <BarRow label="a" value={parseFloat(row.a)||0} max={lMax} color={accent} isDark={isDark} />
            <BarRow label="b" value={parseFloat(row.b)||0} max={lMax} color={isDark?"#ffa500":"#d97706"} isDark={isDark} />
            <BarRow label="c" value={parseFloat(row.c)||0} max={lMax} color={isDark?"#a78bfa":"#7c3aed"} isDark={isDark} />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
              {[["SPACE GROUP",row.space_group],["CRYSTAL SYSTEM",row.crystal_system],
                ["DENSITY (g/cm³)",parseFloat(row.density)?.toFixed(3)],
                ["VOLUME (Å³)",parseFloat(row.volume)?.toFixed(2)]].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:subText,fontFamily:"monospace",letterSpacing:1}}>{k}</div>
                  <div style={{fontSize:13,color:textColor,marginTop:3}}>{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:8,padding:18,
            boxShadow: isDark?"none":"0 1px 4px rgba(0,0,0,0.06)"}}>
            <Label isDark={isDark}>FERROELECTRIC PROPERTIES</Label>
            <div style={{display:"flex",gap:16,marginBottom:16}}>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:700,color:prColor}}>{parseFloat(row["Remnant polarization"])?.toFixed(1)||"—"}</div>
                <div style={{fontSize:10,color:subText,fontFamily:"monospace",marginTop:4}}>Pr (μC/cm²)</div>
              </div>
              <div style={{width:1,background:divider}} />
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:700,color:ecColor}}>{parseFloat(row["Coercive field"])?.toFixed(0)||"—"}</div>
                <div style={{fontSize:10,color:subText,fontFamily:"monospace",marginTop:4}}>Ec (kV/cm)</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["BAND GAP (eV)",parseFloat(row.band_gap)?.toFixed(3)],
                ["FORMATION ENERGY",parseFloat(row.formation_energy)?.toFixed(3)],
                ["E ABOVE HULL",parseFloat(row.energy_above_hull)?.toFixed(4)],
                ["MP ID",row.mpid],
                ["SUBSTRATE",row["Substrate material"]],
                ["THICKNESS (nm)",row["Film thickness (nm)"]]].map(([k,v])=>(
                <div key={k} style={{background:innerBg,border:`1px solid ${innerBorder}`,borderRadius:6,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:subText,fontFamily:"monospace",letterSpacing:1}}>{k}</div>
                  <div style={{fontSize:12,color:accent,marginTop:3,fontFamily:"monospace"}}>{v||"—"}</div>
                </div>
              ))}
            </div>
            {row.DOI && (
              <div style={{marginTop:12,fontSize:11,color:subText,fontFamily:"monospace"}}>
                DOI: <a href={`https://doi.org/${row.DOI}`} target="_blank" rel="noreferrer"
                  style={{color:accent,textDecoration:"none"}}>{row.DOI}</a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{color:isDark?"#6a8aaa":"#94a3b8",fontSize:13}}>Select a material to view its profile.</div>
      )}
    </div>
  );
}

// ── Tab 3: ML Predictor ──────────────────

function MLTab({ isDark }) {
  const [form, setForm] = useState({
    a:"10.44", b:"9.99", c:"11.27",
    alpha:"91.07", beta:"95.44", gamma:"93.91",
    volume:"1166.4", density:"5.26",
    band_gap:"2.91", formation_energy:"-3.59",
    energy_above_hull:"0.22", crystal_system:"Triclinic",
  });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const predict = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k,v]) => k==="crystal_system" ? [k,v] : [k,parseFloat(v)])
      );
      const res = await fetch(`${API}/api/fem/predict`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setResult(data.predicted_coercive_field_kVcm);
    } catch(e) {
      setError(e.message||"Prediction failed. Is the backend running on port 8001?");
    } finally { setLoading(false); }
  };

  const accent      = isDark ? "#00f5ff" : "#0284c7";
  const cardBg      = isDark ? "rgba(0,201,110,0.06)" : "#f0fdf8";
  const cardBorder  = isDark ? "rgba(0,201,110,0.2)" : "#bbf7d0";
  const resultColor = result !== null ? (isDark?"#00c96e":"#059669") : (isDark?"#4a6a88":"#94a3b8");
  const featureBg   = isDark ? "rgba(0,245,255,0.03)" : "#f8fafc";
  const featureBorder= isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const subText     = isDark ? "#6a8aaa" : "#94a3b8";
  const errBg       = isDark ? "rgba(255,50,50,0.08)" : "#fef2f2";
  const errBorder   = isDark ? "rgba(255,50,50,0.3)" : "#fecaca";
  const errColor    = isDark ? "#ff6b6b" : "#dc2626";
  const trackBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const fields = [
    ["a","LATTICE a (Å)"],["b","LATTICE b (Å)"],["c","LATTICE c (Å)"],
    ["alpha","ALPHA (°)"],["beta","BETA (°)"],["gamma","GAMMA (°)"],
    ["volume","VOLUME (Å³)"],["density","DENSITY (g/cm³)"],
    ["band_gap","BAND GAP (eV)"],["formation_energy","FORMATION ENERGY"],
    ["energy_above_hull","ENERGY ABOVE HULL"],
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <div>
        <Label isDark={isDark}>INPUT PARAMETERS → XGBoost MODEL</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          {fields.map(([k,label])=>(
            <FemInput key={k} label={label} isDark={isDark} value={form[k]} onChange={e=>set(k,e.target.value)} />
          ))}
        </div>
        <FemSelect label="CRYSTAL SYSTEM" options={CRYSTAL_SYSTEMS} isDark={isDark}
          value={form.crystal_system} onChange={e=>set("crystal_system",e.target.value)} />
        <OrangeBtn onClick={predict} disabled={loading} isDark={isDark}>
          {loading ? "RUNNING..." : "▶ RUN PREDICTION"}
        </OrangeBtn>
      </div>

      <div>
        <Label isDark={isDark}>PREDICTION OUTPUT</Label>
        {error && (
          <div style={{background:errBg,border:`1px solid ${errBorder}`,
            borderRadius:8,padding:14,marginBottom:14,fontSize:13,color:errColor,fontFamily:"monospace"}}>
            ⚠ {error}
          </div>
        )}
        <div style={{background:cardBg,border:`1px solid ${cardBorder}`,
          borderRadius:8,padding:20,marginBottom:16}}>
          <Label isDark={isDark}>PREDICTED COERCIVE FIELD</Label>
          <div style={{fontSize:38,fontWeight:700,color:resultColor}}>
            {result!==null ? result.toLocaleString() : "—"}
            <span style={{fontSize:14,color:subText,marginLeft:8}}>kV/cm</span>
          </div>
          <div style={{fontSize:11,color:subText,fontFamily:"monospace",marginTop:8}}>
            MODEL: XGBoost · MEAN CV R² ≈ 0.55
          </div>
        </div>

        <div style={{background:featureBg,border:`1px solid ${featureBorder}`,borderRadius:8,padding:16}}>
          <Label isDark={isDark}>TOP FEATURES (FROM TRAINING)</Label>
          {[["band_gap",0.31,accent],
            ["formation_energy",0.25,isDark?"#ffa500":"#d97706"],
            ["crystal_system",0.19,isDark?"#a78bfa":"#7c3aed"],
            ["lattice a/b/c",0.15,isDark?"#00c96e":"#059669"]].map(([name,val,color])=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:130,fontSize:11,color:isDark?"#8aaccc":"#64748b",fontFamily:"monospace"}}>{name}</div>
              <div style={{flex:1,height:7,background:trackBg,borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${val*300}%`,height:"100%",background:color,borderRadius:4}} />
              </div>
              <div style={{fontSize:11,color,width:34}}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Abstract Extractor ───────────────────

function ExtractTab({ isDark }) {
  const [abstract, setAbstract] = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const extract = async () => {
    if (!abstract.trim()) { setError("Please paste an abstract first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/api/fem/extract`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ abstract, api_key: apiKey }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setResult(data.extracted);
    } catch(e) {
      setError(e.message||"Extraction failed. Check your API key and backend.");
    } finally { setLoading(false); }
  };

  const accent      = isDark ? "#00f5ff" : "#0284c7";
  const inputBg     = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder = isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0";
  const inputColor  = isDark ? "#e0f0ff" : "#0d1120";
  const errBg       = isDark ? "rgba(255,50,50,0.08)" : "#fef2f2";
  const errBorder   = isDark ? "rgba(255,50,50,0.3)" : "#fecaca";
  const errColor    = isDark ? "#ff6b6b" : "#dc2626";
  const cardBg      = isDark ? "rgba(0,245,255,0.04)" : "#f8fafc";
  const cardBorder  = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const foundColor  = isDark ? "#00f5ff" : "#0284c7";
  const missingColor= isDark ? "#4a6a88" : "#94a3b8";
  const subText     = isDark ? "#6a8aaa" : "#94a3b8";

  const FIELDS = [
    ["MATERIAL","material"],["SUBSTRATE","substrate"],
    ["Pr (μC/cm²)","remnant_polarization_uC_cm2"],
    ["Ec (kV/cm)","coercive_field_kV_cm"],
    ["THICKNESS (nm)","film_thickness_nm"],
    ["CRYSTAL SYSTEM","crystal_system"],
    ["SPACE GROUP","space_group"],
    ["DOI","doi"],["NOTES","notes"],
  ];

  return (
    <div>
      <Label isDark={isDark}>PASTE RESEARCH ABSTRACT · LLM EXTRACTION VIA KRUTRIM / LLAMA-3.3-70B</Label>
      <textarea
        value={abstract} onChange={e=>setAbstract(e.target.value)}
        placeholder="Paste ferroelectric thin film research abstract here..."
        style={{
          background:inputBg, border:`1px solid ${inputBorder}`,
          borderRadius:6, padding:"10px 14px", color:inputColor,
          fontFamily:"monospace", fontSize:12, width:"100%", boxSizing:"border-box",
          minHeight:120, outline:"none", resize:"vertical", marginBottom:12,
        }}
      />
      <FemInput label="KRUTRIM API KEY (required)" type="password" isDark={isDark}
        placeholder="Your Krutrim API key"
        value={apiKey} onChange={e=>setApiKey(e.target.value)} />
      <OrangeBtn onClick={extract} disabled={loading} isDark={isDark}>
        {loading ? "EXTRACTING..." : "⬡ EXTRACT MATERIAL DATA"}
      </OrangeBtn>

      {error && (
        <div style={{marginTop:14,background:errBg,border:`1px solid ${errBorder}`,
          borderRadius:8,padding:14,fontSize:13,color:errColor,fontFamily:"monospace"}}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{marginTop:16}}>
          <Label isDark={isDark}>EXTRACTED FIELDS</Label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {FIELDS.map(([label,key])=>(
              <div key={key} style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:6,padding:"10px 12px",
                boxShadow: isDark?"none":"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,color:subText,fontFamily:"monospace",letterSpacing:0.5}}>{label}</div>
                <div style={{fontSize:13,color:result[key]!=null?foundColor:missingColor,marginTop:4,fontFamily:"monospace"}}>
                  {result[key]!=null ? String(result[key]) : "— not found"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────
const TABS = [
  { id:"db",      label:"DATABASE EXPLORER" },
  { id:"profile", label:"MATERIAL PROFILE"  },
  { id:"ml",      label:"ML PREDICTOR"      },
  { id:"extract", label:"ABSTRACT EXTRACTOR"},
];

export default function FerroelectricPage() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab]   = useState("db");
  const [csvData, setCsvData]       = useState([]);
  const [csvLoading, setCsvLoading] = useState(true);

  useEffect(() => {
    Papa.parse("/ferroelectric_database.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => { setCsvData(data); setCsvLoading(false); },
      error: () => setCsvLoading(false),
    });
  }, []);

  const bg             = isDark ? "#080f1e" : "#f0f5ff";
  const textColor      = isDark ? "#e0f0ff" : "#0d1120";
  const subText        = isDark ? "#6a8aaa" : "#64748b";
  const accent         = isDark ? "#ffa500" : "#d97706";
  const iconBoxBg      = isDark ? "rgba(255,165,0,0.15)" : "rgba(217,119,6,0.10)";
  const iconBoxBorder  = isDark ? "rgba(255,165,0,0.4)" : "rgba(217,119,6,0.35)";
  const liveBg         = isDark ? "rgba(255,165,0,0.15)" : "rgba(217,119,6,0.10)";
  const liveBorder     = isDark ? "rgba(255,165,0,0.5)" : "rgba(217,119,6,0.4)";
  const tabBorder      = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const activeTabColor = isDark ? "#ffa500" : "#d97706";
  const tabBarColor    = isDark ? "#ffa500" : "#d97706";
  const inactiveTab    = isDark ? "#6a8aaa" : "#94a3b8";

  return (
    <div style={{
      background: bg, minHeight:"100vh", color: textColor,
      fontFamily:"'Rajdhani', sans-serif", padding:"28px 32px", boxSizing:"border-box",
      transition:"background 0.25s ease, color 0.25s ease",
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <div style={{
          width:44, height:44, background:iconBoxBg,
          border:`1px solid ${iconBoxBorder}`, borderRadius:10,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
        }}>⚡</div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <h1 style={{fontSize:24,fontWeight:600,color:textColor,margin:0}}>
              Ferroelectric <span style={{color:accent}}>DB</span>
            </h1>
            <span style={{
              background:liveBg, border:`1px solid ${liveBorder}`,
              color:accent, fontSize:11, padding:"2px 10px", borderRadius:4,
              fontFamily:"monospace", letterSpacing:1,
            }}>● LIVE</span>
          </div>
          <div style={{fontSize:13,color:subText,marginTop:2}}>
            Thin Film Material Explorer · XGBoost Predictor · LLM Abstract Extractor
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,borderBottom:`1px solid ${tabBorder}`,marginBottom:24}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
            padding:"8px 16px", fontFamily:"monospace", fontSize:12,
            cursor:"pointer", border:"none", background:"transparent",
            color: activeTab===tab.id ? activeTabColor : inactiveTab,
            borderBottom:`2px solid ${activeTab===tab.id ? tabBarColor : "transparent"}`,
            marginBottom:-1, letterSpacing:0.5, transition:"color 0.2s",
            fontWeight: activeTab===tab.id ? 700 : 400,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      {csvLoading ? (
        <div style={{color:subText,fontFamily:"monospace",fontSize:13}}>LOADING DATABASE...</div>
      ) : (
        <>
          {activeTab==="db"      && <DatabaseTab csvData={csvData} isDark={isDark} />}
          {activeTab==="profile" && <ProfileTab  csvData={csvData} isDark={isDark} />}
          {activeTab==="ml"      && <MLTab isDark={isDark} />}
          {activeTab==="extract" && <ExtractTab isDark={isDark} />}
        </>
      )}
    </div>
  );
}