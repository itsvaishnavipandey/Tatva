import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../components/Layout";

const API = "http://localhost:8000/api/ald";

const CLASS_COLORS = {
  Oxide:"#2dd4bf", Nitride:"#a78bfa", Sulfide:"#fbbf24", Chalcogenide:"#fb923c",
  "Pure Metal":"#34d399", Fluoride:"#f87171", "III-V Compound":"#60a5fa",
  Mixed:"#94a3b8", Phosphide:"#f472b6", Telluride:"#e879f9", Other:"#6b7280",
};
const PHASE_COLORS = ["#2dd4bf","#a78bfa","#f87171","#fbbf24","#60a5fa","#34d399"];

async function askClaude(question, material="", apiKey="") {
  const sys=`You are GemaMat, expert AI for Atomic Layer Deposition (ALD) and CVD thin film research.
Deep knowledge: deposition conditions, precursors, co-reactants, ALD window, crystal phases, XPS/SEM/AFM/XRD/TEM/Ellipsometry.
${material?`Focused on: ${material}.`:""}Be concise, technical, specific numbers, under 250 words.`;
  const fullQuestion = material ? `[Context: ${material}] ${question}` : question;
  const r = await fetch("http://localhost:8000/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: fullQuestion, apiKey }),
  });
  const d = await r.json();
  return d.answer || "No response.";
}

// ── SVG CHARTS ────────────────────────────────────────────────────────────────
function SvgCol({data,color,xKey="label",yKey="count",h=160,isDark}){
  if(!data?.length) return <Empty isDark={isDark}/>;
  const W=520,H=h,PL=36,PR=8,PT=8,PB=50,iW=W-PL-PR,iH=H-PT-PB;
  const max=Math.max(...data.map(d=>d[yKey]),1);
  const bW=iW/data.length,gap=Math.max(2,bW*.18);
  const gridStroke = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const tickColor  = isDark ? "#4b5563" : "#94a3b8";
  const axisStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {[0,.5,1].map((f,i)=>{const y=PT+iH*(1-f);return<g key={i}>
        <line x1={PL} x2={W-PR} y1={y} y2={y} stroke={gridStroke} strokeWidth="1" strokeDasharray="3 3"/>
        <text x={PL-4} y={y+4} fontSize="8" fill={tickColor} textAnchor="end">{Math.round(max*f)}</text>
      </g>;})}
      {data.map((d,i)=>{
        const bh=Math.max((d[yKey]/max)*iH,1),x=PL+i*bW+gap/2,y=PT+iH-bh,w=Math.max(bW-gap,1);
        const lbl=String(d[xKey]);
        return<g key={i}>
          <rect x={x} y={y} width={w} height={bh} fill={color} opacity=".85" rx="2"/>
          <text x={x+w/2} y={PT+iH+13} textAnchor="end" fontSize="7.5" fill={tickColor}
            transform={`rotate(-40,${x+w/2},${PT+iH+13})`}>
            {lbl.length>10?lbl.slice(0,9)+"…":lbl}
          </text>
        </g>;
      })}
      <line x1={PL} x2={W-PR} y1={PT+iH} y2={PT+iH} stroke={axisStroke} strokeWidth="1"/>
    </svg>
  );
}

function SvgHBar({data,color,nKey="name",vKey="count",isDark}){
  if(!data?.length) return <Empty isDark={isDark}/>;
  const RH=26,PL=110,PR=55,PT=2,W=480,H=data.length*RH+PT+2,iW=W-PL-PR;
  const max=Math.max(...data.map(d=>d[vKey]),1);
  const trackColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const labelColor = isDark ? "#9ca3af" : "#64748b";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {data.map((d,i)=>{const y=PT+i*RH,bw=Math.max((d[vKey]/max)*iW,2),lbl=String(d[nKey]);return<g key={i}>
        <text x={PL-6} y={y+RH/2+4} textAnchor="end" fontSize="10" fill={labelColor}>
          {lbl.length>14?lbl.slice(0,13)+"…":lbl}
        </text>
        <rect x={PL} y={y+5} width={iW} height={RH-10} fill={trackColor} rx="3"/>
        <rect x={PL} y={y+5} width={bw} height={RH-10} fill={color} opacity=".82" rx="3"/>
        <text x={PL+bw+5} y={y+RH/2+4} fontSize="10" fill={color} fontWeight="600">{d[vKey]}</text>
      </g>;})}
    </svg>
  );
}

function SvgDonut({data,size=120}){
  if(!data?.length) return null;
  const vals=data.map(d=>d.value||d.count||0),total=vals.reduce((a,b)=>a+b,0);
  if(!total) return null;
  const cx=size/2,cy=size/2,oR=size*.44,iR=size*.27;
  let angle=-Math.PI/2;
  return(
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {data.map((d,i)=>{
        const v=vals[i],sw=(v/total)*2*Math.PI;
        const x1=cx+oR*Math.cos(angle),y1=cy+oR*Math.sin(angle);
        const x2=cx+oR*Math.cos(angle+sw),y2=cy+oR*Math.sin(angle+sw);
        const ix1=cx+iR*Math.cos(angle+sw),iy1=cy+iR*Math.sin(angle+sw);
        const ix2=cx+iR*Math.cos(angle),iy2=cy+iR*Math.sin(angle);
        const lg=sw>Math.PI?1:0;
        const path=`M${x1},${y1} A${oR},${oR} 0 ${lg} 1 ${x2},${y2} L${ix1},${iy1} A${iR},${iR} 0 ${lg} 0 ${ix2},${iy2} Z`;
        angle+=sw;
        return<path key={i} d={path} fill={PHASE_COLORS[i%PHASE_COLORS.length]} opacity=".9" stroke="transparent" strokeWidth="1.5"/>;
      })}
    </svg>
  );
}

function RadarChart({labels,values,size=180,isDark}){
  if(!labels?.length) return null;
  const cx=size/2,cy=size/2,r=size*.38,n=labels.length;
  const max=Math.max(...values,1);
  const pts=values.map((v,i)=>{
    const a=(2*Math.PI*i/n)-Math.PI/2;
    const rv=(v/max)*r;
    return[cx+rv*Math.cos(a),cy+rv*Math.sin(a)];
  });
  const gridPts=(scale)=>labels.map((_,i)=>{
    const a=(2*Math.PI*i/n)-Math.PI/2;
    return`${cx+scale*r*Math.cos(a)},${cy+scale*r*Math.sin(a)}`;
  }).join(" ");
  const polyPts=pts.map(p=>p.join(",")).join(" ");
  const labelPts=labels.map((_,i)=>{
    const a=(2*Math.PI*i/n)-Math.PI/2;
    return{x:cx+(r+22)*Math.cos(a),y:cy+(r+22)*Math.sin(a),label:labels[i]};
  });
  const gridColor = isDark ? "rgba(45,212,191,0.12)" : "rgba(2,132,199,0.15)";
  const spokColor = isDark ? "rgba(45,212,191,0.15)" : "rgba(2,132,199,0.18)";
  const polyFill  = isDark ? "rgba(45,212,191,0.15)" : "rgba(2,132,199,0.12)";
  const polyStroke= isDark ? "#2dd4bf" : "#0284c7";
  const dotFill   = isDark ? "#2dd4bf" : "#0284c7";
  const lblColor  = isDark ? "#9ca3af" : "#64748b";
  return(
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {[.25,.5,.75,1].map((s,i)=>(
        <polygon key={i} points={gridPts(s)} fill="none" stroke={gridColor} strokeWidth=".8"/>
      ))}
      {labels.map((_,i)=>{
        const a=(2*Math.PI*i/n)-Math.PI/2;
        return<line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke={spokColor} strokeWidth=".8"/>;
      })}
      <polygon points={polyPts} fill={polyFill} stroke={polyStroke} strokeWidth="1.5"/>
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={dotFill}/>)}
      {labelPts.map((lp,i)=>(
        <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={lblColor}>{lp.label}</text>
      ))}
    </svg>
  );
}

// ── UI ATOMS ──────────────────────────────────────────────────────────────────
const Empty=({isDark})=><div style={{fontSize:11,color:isDark?"#4b5563":"#94a3b8",textAlign:"center",padding:"16px 0"}}>No data</div>;
const Spin=({isDark})=><span style={{display:"inline-block",width:14,height:14,border:`2px solid ${isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.1)"}`,borderTopColor:isDark?"#2dd4bf":"#0284c7",borderRadius:"50%",animation:"ald-spin .7s linear infinite"}}/>;

function Box({title,children,action,isDark}){
  const bg     = isDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,0.02)";
  const border = isDark ? "0.5px solid rgba(255,255,255,.08)" : "0.5px solid rgba(0,0,0,0.08)";
  const titleC = isDark ? "#6b7280" : "#94a3b8";
  return(
    <div style={{background:bg,border,borderRadius:12,padding:"16px 20px",marginBottom:16}}>
      {(title||action)&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          {title&&<div style={{fontSize:11,fontWeight:500,color:titleC,letterSpacing:1,textTransform:"uppercase"}}>{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({label,value,color,isDark}){
  const bg     = isDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,0.02)";
  const border = isDark ? "0.5px solid rgba(255,255,255,.08)" : "0.5px solid rgba(0,0,0,0.08)";
  const lblC   = isDark ? "#6b7280" : "#94a3b8";
  const valC   = color || (isDark ? "#f0f0f0" : "#0f172a");
  return(
    <div style={{background:bg,border,borderRadius:10,padding:"12px 16px"}}>
      <div style={{fontSize:10,color:lblC,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{label}</div>
      <div style={{fontSize:20,fontWeight:500,color:valC}}>{value}</div>
    </div>
  );
}

function Chip({text,color="#2dd4bf",bg}){
  return(
    <span style={{display:"inline-block",fontSize:10,padding:"3px 10px",borderRadius:20,
      background:bg||`${color}20`,color,border:`0.5px solid ${color}50`,marginRight:5,marginBottom:5}}>
      {text}
    </span>
  );
}

function SectionLabel({text,isDark}){
  const c = isDark ? "#4b5563" : "#94a3b8";
  return<div style={{fontSize:10,color:c,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8,marginTop:2}}>{text}</div>;
}

// ── SANKEY ────────────────────────────────────────────────────────────────────
function Sankey({data,isDark,BS}){
  const prec=(data.precursors||[]).slice(0,4),core=(data.coreactants||[]).slice(0,4),phase=(data.crystal_phases||[]).slice(0,3);
  if(!prec.length&&!core.length) return null;
  const mp=Math.max(...prec.map(p=>p.count),1),mc=Math.max(...core.map(c=>c.count),1);
  const svgH=Math.max(prec.length,core.length,phase.length)*60+80;
  const W=680,c1=80,c2=290,c3=500,nH=32,nW=120;
  const py=i=>60+i*(svgH-100)/Math.max(prec.length-1,1);
  const cy=i=>60+i*(svgH-100)/Math.max(core.length-1,1);
  const phy=i=>60+i*(svgH-100)/Math.max(phase.length-1,1);
  const lines=[];
  prec.forEach((p,pi)=>core.forEach((c,ci)=>{
    const s=Math.sqrt((p.count/mp)*(c.count/mc));
    lines.push({x1:c1+nW,y1:py(pi),x2:c2,y2:cy(ci),op:s*.25+.05,k:`${pi}-${ci}`});
  }));
  const lineColor = isDark ? "#2dd4bf" : "#0284c7";
  const precBg    = isDark ? "#134e4a" : "#ecfdf5";
  const precText  = isDark ? "#2dd4bf" : "#059669";
  const precVal   = isDark ? "#5eead4" : "#047857";
  const coreBg    = isDark ? "#4a1d2e" : "#fef2f2";
  const coreText  = isDark ? "#f87171" : "#dc2626";
  const coreVal   = isDark ? "#fca5a5" : "#b91c1c";
  const phaseBg   = isDark ? "#1e1b4b" : "#f5f3ff";
  const phaseText = isDark ? "#a78bfa" : "#7c3aed";
  const phaseVal  = isDark ? "#c4b5fd" : "#6d28d9";
  const lblC      = isDark ? "#4b5563"  : "#94a3b8";
  return(
    <Box title="ALD Chemistry Flow" isDark={isDark}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        {["Precursor","Coreactant","Crystal Phase"].map(l=>(
          <span key={l} style={{fontSize:11,color:lblC,width:130,textAlign:"center"}}>{l}</span>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${svgH}`} style={{overflow:"visible"}}>
        {lines.map(l=><path key={l.k} d={`M${l.x1},${l.y1} C${(l.x1+l.x2)/2},${l.y1} ${(l.x1+l.x2)/2},${l.y2} ${l.x2},${l.y2}`} fill="none" stroke={lineColor} strokeWidth="1.5" opacity={l.op}/>)}
        {prec.map((p,i)=>(<g key={p.name} transform={`translate(${c1},${py(i)-nH/2})`}><rect width={nW} height={nH} rx={6} fill={precBg}/><text x={8} y={20} fontSize={11} fill={precText} fontWeight={500}>{p.name}</text><text x={nW-6} y={20} fontSize={11} fill={precVal} textAnchor="end">{p.count}</text></g>))}
        {core.map((c,i)=>(<g key={c.name} transform={`translate(${c2},${cy(i)-nH/2})`}><rect width={nW} height={nH} rx={6} fill={coreBg}/><text x={8} y={20} fontSize={11} fill={coreText} fontWeight={500}>{c.name}</text><text x={nW-6} y={20} fontSize={11} fill={coreVal} textAnchor="end">{c.count}</text></g>))}
        {phase.map((ph,i)=>(<g key={ph.name} transform={`translate(${c3},${phy(i)-nH/2})`}><rect width={nW} height={nH} rx={6} fill={phaseBg}/><text x={8} y={20} fontSize={11} fill={phaseText} fontWeight={500}>{ph.name}</text><text x={nW-6} y={20} fontSize={11} fill={phaseVal} textAnchor="end">{ph.count}</text></g>))}
      </svg>
    </Box>
  );
}

// ── PAPER DETAIL ──────────────────────────────────────────────────────────────
function PaperDetail({paper,onBack,isDark,BS}){
  const hasDoi=paper.doi&&paper.doi.startsWith("10.");
  const hasOA=paper.is_oa&&paper.oa_url;
  const prec=paper.precursors||[];
  const core=paper.coreactants||[];
  const phases=paper.crystal_phases||[];

  const radarLabels=["Temp","Precursors","Coreactants","Char. Methods","Data Compl."];
  const radarValues=[
    paper.temp?parseInt(paper.temp)||0:0,
    prec.length*30, core.length*30,
    (paper.characterization_methods||[]).length*20,
    paper.data_completeness||0,
  ];

  const mColor={ALD:"#5b21b6",PEALD:"#7e22ce",CVD:"#065f46",Sputtering:"#1d4ed8",MBE:"#92400e",MOCVD:"#065f46"};
  const mc=mColor[paper.method_type]||"#374151";

  const cardBg   = isDark ? "rgba(255,255,255,.03)"  : "rgba(0,0,0,0.02)";
  const cardBdr  = isDark ? "0.5px solid rgba(255,255,255,.08)" : "0.5px solid rgba(0,0,0,0.08)";
  const metaLbl  = isDark ? "#4b5563" : "#94a3b8";
  const mainText = isDark ? "#f0f0f0" : "#0f172a";
  const subText  = isDark ? "#9ca3af" : "#64748b";
  const dimText  = isDark ? "#4b5563" : "#94a3b8";
  const backColor= isDark ? "#2dd4bf" : "#0284c7";
  const accentC  = isDark ? "#2dd4bf" : "#0284c7";
  const radarVal = isDark ? "#2dd4bf" : "#0284c7";

  return(
    <div style={{maxWidth:800,margin:"0 auto",paddingBottom:60}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:backColor,fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:20,padding:0}}>
        ← Back to {paper.formula}
      </button>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:20}}>
        {[
          {lbl:"Target Material",  val:paper.formula,             color:accentC},
          {lbl:"Process Type",     val:paper.method_type||"ALD",  color:mc},
          {lbl:"Temperature Range",val:paper.temp||"—",           color:"#fbbf24"},
          {lbl:"Characterization", val:`${paper.methods||1} methods`, color:"#a78bfa"},
        ].map(({lbl,val,color})=>(
          <div key={lbl} style={{background:cardBg,border:cardBdr,borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:9,color:metaLbl,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{lbl}</div>
            <div style={{fontSize:15,fontWeight:600,color}}>{val}</div>
          </div>
        ))}
      </div>

      <Box title="Paper Summary" isDark={isDark}>
        <div style={{fontSize:17,fontWeight:500,color:mainText,marginBottom:12,lineHeight:1.4}}>{paper.title}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {paper.publication&&<Chip text={paper.publication} color="#60a5fa"/>}
          {paper.date&&<Chip text={paper.date} color="#6b7280"/>}
          {paper.is_oa&&<Chip text="Open Access" color="#34d399"/>}
          {paper.oa_status&&<Chip text={paper.oa_status} color="#34d399"/>}
        </div>
        {paper.abstract
          ?<div style={{fontSize:12,color:subText,lineHeight:1.8}}>{paper.abstract}</div>
          :<div style={{fontSize:12,color:dimText,lineHeight:1.8,fontStyle:"italic"}}>
            Abstract not available. {hasDoi&&"View the full paper via the DOI link below."}
          </div>
        }
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
          {hasDoi&&(
            <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:"#60a5fa",textDecoration:"none",padding:"5px 12px",border:"0.5px solid #1d4ed8",borderRadius:6,background:"rgba(96,165,250,.08)"}}>
              📎 DOI: {paper.doi} ↗
            </a>
          )}
          {hasOA&&(
            <a href={paper.oa_url} target="_blank" rel="noreferrer"
              style={{fontSize:11,color:"#34d399",textDecoration:"none",padding:"5px 12px",border:"0.5px solid #34d39960",borderRadius:6,background:"rgba(52,211,153,.08)"}}>
              📄 Free PDF ↗
            </a>
          )}
        </div>
      </Box>

      <Box title="Target Material" isDark={isDark}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:32,fontWeight:700,color:accentC,marginBottom:8}}>{paper.formula}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Chip text={paper.material_class||"Oxide"} color={CLASS_COLORS[paper.material_class]||accentC}/>
              <Chip text={paper.material_name||paper.formula} color="#9ca3af"/>
              {paper.thickness_nm&&<Chip text={`${paper.thickness_nm} nm`} color="#fbbf24"/>}
            </div>
            {paper.substrate&&(
              <div style={{marginTop:12}}>
                <SectionLabel text="Substrate Information" isDark={isDark}/>
                <Chip text={paper.substrate} color="#a78bfa"/>
              </div>
            )}
          </div>
        </div>
      </Box>

      <Box title="Deposition Conditions" isDark={isDark}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {lbl:"Temperature (°C)",    val:paper.temp||"—",              bg:"rgba(251,191,36,.08)",  bdr:"rgba(251,191,36,.3)",  c:"#fbbf24"},
            {lbl:"Reactor Type",        val:paper.process_type||"batch",  bg:"rgba(167,139,250,.08)", bdr:"rgba(167,139,250,.3)", c:"#a78bfa"},
            {lbl:"Precursor Pulse (s)", val:paper.pulse_time_prec||"0.1", bg:"rgba(45,212,191,.08)",  bdr:"rgba(45,212,191,.3)",  c:accentC},
            {lbl:"Coreactant Pulse (s)",val:paper.pulse_time_core||"0.1", bg:"rgba(248,113,113,.08)", bdr:"rgba(248,113,113,.3)", c:"#f87171"},
          ].map(({lbl,val,bg,bdr,c})=>(
            <div key={lbl} style={{background:bg,border:`0.5px solid ${bdr}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <div style={{fontSize:9,color:metaLbl,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:18,fontWeight:600,color:c}}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <RadarChart labels={radarLabels} values={radarValues} size={180} isDark={isDark}/>
          <div style={{flex:1}}>
            <SectionLabel text="Process Overview Radar" isDark={isDark}/>
            <div style={{fontSize:11,color:dimText,lineHeight:1.8}}>
              {radarLabels.map((l,i)=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",borderBottom:`0.5px solid ${isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)"}`,padding:"3px 0"}}>
                  <span style={{color:subText}}>{l}</span>
                  <span style={{color:radarVal,fontWeight:500}}>{radarValues[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Box>

      <Box title="Precursors & Coreactants" isDark={isDark}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <SectionLabel text="Precursors" isDark={isDark}/>
            {prec.length?prec.map(p=><Chip key={p} text={p} color={accentC}/>):<div style={{fontSize:11,color:dimText}}>None recorded</div>}
          </div>
          <div>
            <SectionLabel text="Coreactants / Oxidants" isDark={isDark}/>
            {core.length?core.map(c=><Chip key={c} text={c} color="#f87171"/>):<div style={{fontSize:11,color:dimText}}>None recorded</div>}
          </div>
        </div>
      </Box>

      <Box title="Reaction Conditions" isDark={isDark}>
        {paper.surface_mechanism
          ?<div>
            <SectionLabel text="Surface Mechanism" isDark={isDark}/>
            <div style={{fontSize:12,color:subText,lineHeight:1.8,marginBottom:12}}>{paper.surface_mechanism}</div>
          </div>
          :<div style={{fontSize:12,color:dimText,marginBottom:12}}>Surface mechanism details not extracted from this paper.</div>
        }
        {paper.intermediate_species?.length>0&&(
          <div>
            <SectionLabel text="Intermediate Species" isDark={isDark}/>
            {paper.intermediate_species.map(s=><Chip key={s} text={s} color="#fbbf24"/>)}
          </div>
        )}
      </Box>

      <Box title="Film Properties" isDark={isDark}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[
            {lbl:"Thickness (nm)", val:paper.thickness_nm||"—", c:accentC},
            {lbl:"Crystal Phase",  val:phases[0]||"Amorphous",  c:"#a78bfa"},
          ].map(({lbl,val,c})=>(
            <div key={lbl} style={{background:cardBg,border:cardBdr,borderRadius:10,padding:"14px"}}>
              <div style={{fontSize:9,color:metaLbl,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{lbl}</div>
              <div style={{fontSize:lbl.includes("Thickness")?22:15,fontWeight:500,color:c}}>{val}</div>
            </div>
          ))}
          <div style={{background:cardBg,border:cardBdr,borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:9,color:metaLbl,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Data Completeness</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <SvgDonut data={[{value:paper.data_completeness||25},{value:100-(paper.data_completeness||25)}]} size={50}/>
              <div style={{fontSize:14,fontWeight:500,color:accentC}}>{paper.data_completeness||25}%</div>
            </div>
          </div>
        </div>
      </Box>

      <Box title="Characterization Methods" isDark={isDark}>
        {(paper.characterization_methods||[]).length>0
          ?<div>{paper.characterization_methods.map(m=><Chip key={m} text={m} color="#60a5fa"/>)}</div>
          :<div style={{fontSize:12,color:dimText}}>Characterization methods not extracted.</div>
        }
        {paper.publication&&(
          <div style={{marginTop:16,padding:"10px 14px",background:"rgba(96,165,250,.08)",border:"0.5px solid rgba(96,165,250,.2)",borderRadius:8}}>
            <div style={{fontSize:10,color:dimText,marginBottom:4}}>Published in</div>
            <div style={{fontSize:13,color:"#60a5fa",fontWeight:500}}>{paper.publication}</div>
            {paper.date&&<div style={{fontSize:11,color:dimText,marginTop:2}}>{paper.date}</div>}
          </div>
        )}
      </Box>
    </div>
  );
}

// ── PAPER CARD ────────────────────────────────────────────────────────────────
function PaperCard({paper,onClick,isDark}){
  const mC={ALD:"#5b21b6",PEALD:"#7e22ce",CVD:"#065f46",Sputtering:"#1d4ed8",MBE:"#92400e"};
  const c=mC[paper.method_type]||"#374151";
  const baseBg  = isDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,0.02)";
  const baseBdr = isDark ? "0.5px solid rgba(255,255,255,.1)"  : "0.5px solid rgba(0,0,0,0.08)";
  const hovBg   = isDark ? "rgba(45,212,191,.04)"  : "rgba(2,132,199,0.04)";
  const hovBdr  = isDark ? "0.5px solid rgba(45,212,191,.4)"  : "0.5px solid rgba(2,132,199,.4)";
  const titleC  = isDark ? "#f0f0f0" : "#0f172a";
  const accentC = isDark ? "#2dd4bf" : "#0284c7";
  const pubC    = isDark ? "#4b5563" : "#94a3b8";
  const idBg    = isDark ? "#1e1b4b" : "#f5f3ff";
  const idC     = isDark ? "#a78bfa" : "#7c3aed";
  const idBdr   = isDark ? "#4c1d95" : "#ddd6fe";

  return(
    <div onClick={()=>onClick(paper)}
      style={{background:baseBg,border:baseBdr,borderRadius:12,padding:"16px 20px",marginBottom:10,cursor:"pointer",transition:"all .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.border=hovBdr;e.currentTarget.style.background=hovBg;}}
      onMouseLeave={e=>{e.currentTarget.style.border=baseBdr;e.currentTarget.style.background=baseBg;}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:10,background:idBg,color:idC,borderRadius:20,padding:"2px 10px",border:`0.5px solid ${idBdr}`}}>{paper.id}</span>
          {paper.is_oa&&<span style={{fontSize:10,background:"rgba(52,211,153,.15)",color:"#34d399",borderRadius:4,padding:"2px 8px"}}>OA</span>}
        </div>
        <span style={{fontSize:11,color:accentC,fontWeight:500}}>{paper.methods||1} METHODS →</span>
      </div>
      <div style={{fontSize:14,fontWeight:500,color:titleC,marginBottom:6,lineHeight:1.4}}>{paper.title}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {paper.method_type&&<span style={{fontSize:10,background:`${c}33`,color:accentC,borderRadius:4,padding:"2px 8px",border:`0.5px solid ${c}`}}>{paper.method_type}</span>}
        {paper.temp&&<span style={{fontSize:10,background:isDark?"#422006":"#fef9c3",color:"#fbbf24",borderRadius:4,padding:"2px 8px"}}>{paper.temp}</span>}
        {paper.publication&&<span style={{fontSize:10,color:pubC,marginLeft:"auto"}}>{paper.publication}</span>}
      </div>
    </div>
  );
}

// ── ARCHIVE ───────────────────────────────────────────────────────────────────
function Archive({mat,onBack,onAsk,isDark,BS}){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState(null);
  const [paperPage,setPaperPage]=useState(1);
  const [selectedPaper,setSelectedPaper]=useState(null);
  const PER=10;

  useEffect(()=>{
    setLoading(true);setErr(null);setSelectedPaper(null);
    fetch(`${API}/materials/${encodeURIComponent(mat.formula)}`)
      .then(r=>{if(!r.ok)throw new Error(r.status);return r.json();})
      .then(d=>{setData(d);setLoading(false);})
      .catch(e=>{setErr(e.message);setLoading(false);});
  },[mat.formula]);

  if(loading) return<div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spin isDark={isDark}/></div>;
  if(err) return<div style={{padding:40,color:"#f87171"}}>Error: {err}<br/><button onClick={onBack} style={BS}>← Back</button></div>;
  if(selectedPaper) return<PaperDetail paper={selectedPaper} onBack={()=>setSelectedPaper(null)} isDark={isDark} BS={BS}/>;

  const s=data.stats||{};
  const phases=(data.crystal_phases||[]).map(p=>({...p,value:p.value||p.count||0}));
  const phTotal=phases.reduce((a,p)=>a+(p.value||0),0);
  const papers=data.papers||[];
  const totalPages=Math.ceil(papers.length/PER);
  const shown=papers.slice((paperPage-1)*PER,paperPage*PER);
  const oaCount=papers.filter(p=>p.is_oa).length;

  const accentC = isDark ? "#2dd4bf" : "#0284c7";
  const mainText= isDark ? "#f0f0f0" : "#0f172a";
  const subText = isDark ? "#4b5563" : "#94a3b8";
  const cardBg  = isDark ? "rgba(255,255,255,.03)" : "rgba(0,0,0,0.02)";
  const cardBdr = isDark ? "0.5px solid rgba(255,255,255,.08)" : "0.5px solid rgba(0,0,0,0.08)";
  const cntBg   = isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,0.03)";
  const cntBdr  = isDark ? "0.5px solid rgba(255,255,255,.1)" : "0.5px solid rgba(0,0,0,0.08)";
  const cntText = isDark ? "#9ca3af" : "#64748b";
  const phaseLbl= isDark ? "#9ca3af" : "#64748b";
  const phaseVal= isDark ? "#f0f0f0" : "#0f172a";
  const phasePct= isDark ? "#4b5563" : "#94a3b8";

  return(
    <div style={{maxWidth:900,margin:"0 auto",paddingBottom:40}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:accentC,fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:20,padding:0}}>
        ← Back to Materials
      </button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <h1 style={{fontSize:26,fontWeight:500,margin:0}}>
          <span style={{color:mainText}}>{mat.formula}</span>{" "}
          <span style={{color:subText,fontWeight:400}}>Archive</span>
        </h1>
        <div style={{display:"flex",gap:8}}>
          <span style={{fontSize:12,background:cntBg,border:cntBdr,borderRadius:20,padding:"5px 14px",color:cntText}}>
            <span style={{color:accentC,fontWeight:500}}>{s.methods||0}</span> contributions
          </span>
          {oaCount>0&&<span style={{fontSize:12,background:"rgba(52,211,153,.08)",border:"0.5px solid rgba(52,211,153,.3)",borderRadius:20,padding:"5px 14px",color:"#34d399"}}>{oaCount} OA</span>}
        </div>
      </div>

      <div style={{background:cardBg,border:cardBdr,borderRadius:14,padding:"18px 20px",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:500,color:accentC,borderLeft:`3px solid ${accentC}`,paddingLeft:10,marginBottom:14}}>{mat.formula} Insights</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
          <Stat label="Papers"           value={s.papers||0}            color={accentC}    isDark={isDark}/>
          <Stat label="Avg. Temperature" value={s.avg_temp?`${s.avg_temp}°C`:"—"} color="#fbbf24" isDark={isDark}/>
          <Stat label="Reported Temps"   value={s.reported_temps||0}    color={accentC}    isDark={isDark}/>
          <Stat label="Methods"          value={s.methods||0}           color="#a78bfa"    isDark={isDark}/>
          <Stat label="Precursors"       value={s.precursors_count||0}  color={accentC}    isDark={isDark}/>
          <Stat label="Coreactants"      value={s.coreactants_count||0} color="#f87171"    isDark={isDark}/>
        </div>
      </div>

      <Sankey data={data} isDark={isDark} BS={BS}/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Box title="Temperature Distribution" isDark={isDark}>
          <SvgCol data={(data.temp_labels||[]).map((l,i)=>({label:l,count:(data.temp_dist||[])[i]||0}))} color="#fbbf24" xKey="label" yKey="count" isDark={isDark}/>
        </Box>
        <Box title="Common Characterization" isDark={isDark}>
          <SvgHBar data={data.characterization||[]} color={accentC} isDark={isDark}/>
        </Box>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <Box title="Precursor Count Per Paper" isDark={isDark}><SvgHBar data={data.precursor_per_paper||[]} color={accentC} isDark={isDark}/></Box>
        <Box title="Coreactant Count Per Paper" isDark={isDark}><SvgHBar data={data.coreactant_per_paper||[]} color="#a78bfa" isDark={isDark}/></Box>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <Box title="Crystal Phases" isDark={isDark}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <SvgDonut data={phases} size={120}/>
            <div style={{flex:1}}>
              {phases.map((d,i)=>(
                <div key={d.name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <span style={{width:9,height:9,borderRadius:2,background:PHASE_COLORS[i%PHASE_COLORS.length],flexShrink:0}}/>
                  <span style={{fontSize:11,color:phaseLbl,flex:1}}>{d.name}</span>
                  <span style={{fontSize:11,color:phaseVal,fontWeight:500}}>{d.value}<span style={{color:phasePct,fontSize:9}}> ({phTotal?Math.round(d.value/phTotal*100):0}%)</span></span>
                </div>
              ))}
              {!phases.length&&<div style={{fontSize:11,color:subText}}>No phase data</div>}
            </div>
          </div>
        </Box>
        <Box title="Common Precursors" isDark={isDark}>
          <SvgHBar data={(data.precursors||[]).slice(0,6)} color={accentC} isDark={isDark}/>
        </Box>
      </div>

      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:500,color:subText,letterSpacing:1,textTransform:"uppercase"}}>
            Papers ({papers.length}) · click to view details
          </div>
          {totalPages>1&&(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button disabled={paperPage===1} onClick={()=>setPaperPage(p=>p-1)} style={{...BS,opacity:paperPage===1?.4:1}}>←</button>
              <span style={{fontSize:11,color:subText}}>{paperPage}/{totalPages}</span>
              <button disabled={paperPage>=totalPages} onClick={()=>setPaperPage(p=>p+1)} style={{...BS,opacity:paperPage>=totalPages?.4:1}}>→</button>
            </div>
          )}
        </div>
        {shown.length===0
          ?<div style={{fontSize:12,color:subText,padding:20,textAlign:"center"}}>No papers for this material.</div>
          :shown.map(p=><PaperCard key={p.id} paper={p} onClick={setSelectedPaper} isDark={isDark}/>)
        }
      </div>

      <div style={{marginTop:16,padding:"14px 18px",background:isDark?"rgba(45,212,191,.06)":"rgba(2,132,199,0.05)",border:`0.5px solid ${isDark?"rgba(45,212,191,.3)":"rgba(2,132,199,.3)"}`,borderRadius:12}}>
        <div style={{fontSize:12,color:accentC,marginBottom:8}}>💬 Ask the AI about {mat.formula}</div>
        <button onClick={()=>onAsk(`What are the deposition conditions and precursors for ${mat.formula} (${mat.name})?`)} style={BS}>
          ⚡ Ask about deposition conditions →
        </button>
      </div>
    </div>
  );
}

const SUGGESTIONS=["What are common methods to deposit NiO?","Deposition conditions for MoSe2?","Common characterization in ALD?","Precursors for HfO2?","How does substrate temperature affect ALD quality?","What is the ALD window concept?"];

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export default function GemaMat(){
  const { isDark } = useTheme();

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const pageBg    = isDark ? "#0a0a0f"  : "#f0f5ff";
  const cardBg    = isDark ? "#111118"  : "#ffffff";
  const cardBdr   = isDark ? "0.5px solid rgba(255,255,255,.08)" : "0.5px solid rgba(0,0,0,0.08)";
  const mainText  = isDark ? "#f0f0f0"  : "#0f172a";
  const subText   = isDark ? "#6b7280"  : "#94a3b8";
  const dimText   = isDark ? "#4b5563"  : "#94a3b8";
  const accentC   = isDark ? "#2dd4bf"  : "#0284c7";
  const accentDim = isDark ? "rgba(45,212,191,.06)"  : "rgba(2,132,199,0.05)";
  const accentBdr = isDark ? "rgba(45,212,191,.3)"   : "rgba(2,132,199,.3)";
  const inputBg   = isDark ? "rgba(255,255,255,.04)"  : "rgba(0,0,0,0.03)";
  const inputBdr  = isDark ? "0.5px dashed rgba(255,255,255,.12)" : "0.5px dashed rgba(0,0,0,0.12)";
  const inputText = isDark ? "#f0f0f0"  : "#0f172a";
  const cntBg     = isDark ? "rgba(255,255,255,.04)"  : "rgba(0,0,0,0.03)";
  const cntBdr    = isDark ? "0.5px solid rgba(255,255,255,.1)"  : "0.5px solid rgba(0,0,0,0.08)";
  const cntText   = isDark ? "#9ca3af"  : "#64748b";
  const selBg     = isDark ? "rgba(45,212,191,.08)"   : "rgba(2,132,199,0.06)";
  const selBdr    = isDark ? "rgba(45,212,191,.4)"    : "rgba(2,132,199,.4)";
  const selTitle  = isDark ? "#f0f0f0"  : "#0f172a";
  const userMsgBg = isDark ? "rgba(45,212,191,.12)"   : "rgba(2,132,199,0.08)";
  const userMsgBdr= isDark ? "rgba(45,212,191,.3)"    : "rgba(2,132,199,.3)";
  const userMsgC  = isDark ? "#2dd4bf"  : "#0284c7";
  const asstMsgBg = isDark ? "rgba(255,255,255,.04)"  : "rgba(0,0,0,0.02)";
  const asstMsgBdr= isDark ? "rgba(255,255,255,.08)"  : "rgba(0,0,0,0.08)";
  const asstMsgC  = isDark ? "#f0f0f0"  : "#0f172a";
  const suggBdr   = isDark ? "rgba(255,255,255,.1)"   : "rgba(0,0,0,0.08)";
  const suggText  = isDark ? "#6b7280"  : "#94a3b8";
  const footerBg  = isDark ? "#111118"  : "#ffffff";
  const heroTagBg = isDark ? "rgba(45,212,191,.08)"   : "rgba(2,132,199,0.08)";
  const heroTagBdr= isDark ? "rgba(45,212,191,.3)"    : "rgba(2,132,199,.3)";
  const heroTagC  = isDark ? "#2dd4bf"  : "#0284c7";
  const matBaseBg = isDark ? "rgba(255,255,255,.03)"  : "rgba(0,0,0,0.02)";
  const matBaseBdr= isDark ? "0.5px solid rgba(255,255,255,.07)" : "0.5px solid rgba(0,0,0,0.06)";
  const heroGrad  = "linear-gradient(135deg,#2dd4bf,#60a5fa,#a78bfa)";
  const warnBg    = isDark ? "rgba(248,113,113,.1)"  : "#fef2f2";

  // button style (theme-aware)
  const BS = {
    padding:"7px 16px",
    background: isDark
      ? "linear-gradient(135deg,#134e4a,#065f46)"
      : "linear-gradient(135deg,#0369a1,#0284c7)",
    border: `0.5px solid ${accentC}`,
    borderRadius:20, color:"#fff", fontSize:11, cursor:"pointer", letterSpacing:.5,
  };

  const [materials,setMaterials]=useState([]);
  const [globalStats,setGlobalStats]=useState({total_materials:0,total_papers:0,oa_papers:0});
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(1);
  const [totalMats,setTotalMats]=useState(0);
  const [matsLoading,setMatsLoading]=useState(true);
  const [backendOk,setBackendOk]=useState(true);
  const [selectedMat,setSelectedMat]=useState(null);
  const [view,setView]=useState("main");
  const [geminiKey,setGeminiKey]=useState("");
  const [messages,setMessages]=useState([{role:"assistant",text:"I'm the GemaMat assistant, an AI for ALD related queries. Ask for summaries, comparisons, deposition-specific insights."}]);
  const [input,setInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const chatEnd=useRef(null);

  useEffect(()=>{
    fetch(`${API}/stats`).then(r=>r.json()).then(d=>{setGlobalStats(d);setBackendOk(true);}).catch(()=>setBackendOk(false));
  },[]);

  const loadMats=useCallback(()=>{
    setMatsLoading(true);
    const q=new URLSearchParams({page:String(page),limit:"50"});
    if(search) q.set("search",search);
    fetch(`${API}/materials?${q}`).then(r=>r.json())
      .then(d=>{setMaterials(d.materials||[]);setTotalMats(d.total||0);setMatsLoading(false);})
      .catch(()=>setMatsLoading(false));
  },[search,page]);

  useEffect(()=>{loadMats();},[loadMats]);
  useEffect(()=>{setPage(1);},[search]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const sendMsg=async(text)=>{
    const q=(text??input).trim(); if(!q) return;
    if(!geminiKey.trim()){setMessages(m=>[...m,{role:"assistant",text:"Please enter your Gemini API key above to use the AI assistant."}]);return;}
    setInput("");
    setMessages(m=>[...m,{role:"user",text:q}]);
    setChatLoading(true);
    try{ const ans=await askClaude(q,selectedMat?.formula||"",geminiKey); setMessages(m=>[...m,{role:"assistant",text:ans}]); }
    catch(e){ setMessages(m=>[...m,{role:"assistant",text:`Error: ${e.message}`}]); }
    finally{ setChatLoading(false); }
  };

  const openArchive=mat=>{setSelectedMat(mat);setView("archive");};
  const handleAsk=q=>{setView("main");setTimeout(()=>sendMsg(q),100);};

  if(view==="archive"&&selectedMat){
    return(
      <div style={{minHeight:"100vh",background:pageBg,fontFamily:"'Inter',system-ui,sans-serif",color:mainText,transition:"background 0.25s ease,color 0.25s ease"}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
          <Archive mat={selectedMat} onBack={()=>setView("main")} onAsk={handleAsk} isDark={isDark} BS={BS}/>
        </div>
        <GStyles isDark={isDark}/>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:pageBg,fontFamily:"'Inter',system-ui,sans-serif",color:mainText,transition:"background 0.25s ease,color 0.25s ease"}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>

        {!backendOk&&(
          <div style={{background:warnBg,border:"0.5px solid #f87171",borderRadius:8,padding:"10px 16px",marginBottom:16,fontSize:12,color:"#f87171"}}>
            ⚠ Cannot reach FastAPI at {API}. Run: <code>uvicorn main:app --reload</code> in your backend folder.
          </div>
        )}

        {/* Hero */}
        <div style={{background:cardBg,border:cardBdr,borderRadius:14,padding:"32px 40px",textAlign:"center",marginBottom:24,transition:"background 0.25s ease"}}>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
            {["ALD ENGINE V2.0","RAG PIPELINE",`${globalStats.total_papers||"…"} PAPERS`,globalStats.oa_papers?`${globalStats.oa_papers} OPEN ACCESS`:""].filter(Boolean).map(t=>(
              <span key={t} style={{fontSize:10,padding:"4px 12px",borderRadius:4,border:`0.5px solid ${heroTagBdr}`,color:heroTagC,background:heroTagBg,letterSpacing:1}}>{t}</span>
            ))}
          </div>
          <h1 style={{fontSize:40,fontWeight:500,letterSpacing:-1,margin:"0 0 10px",background:heroGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",color:"transparent"}}>
            GemaMat — ALD Intelligence
          </h1>
          <p style={{fontSize:13,color:subText,lineHeight:1.7,maxWidth:560,margin:"0 auto 8px"}}>
            Browse {globalStats.total_materials||"…"} materials across {globalStats.total_papers||"…"} papers. Click any material → View Archive → Click any paper for full details.
          </p>
          <p style={{fontSize:12,color:dimText,margin:0}}>All data from local CSV files · AI chat via Claude</p>
        </div>

        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>

          {/* Materials Library */}
          <div style={{background:cardBg,border:cardBdr,borderRadius:14,padding:24,transition:"background 0.25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:11,letterSpacing:2,color:accentC,fontWeight:500}}>▸ MATERIALS LIBRARY</div>
              <div style={{fontSize:11,color:dimText}}>{totalMats} materials</div>
            </div>
            <input type="text" placeholder="Search formula, name, class…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{width:"100%",padding:"8px 14px",marginBottom:12,borderRadius:8,border:inputBdr,background:inputBg,color:inputText,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            <div style={{maxHeight:480,overflowY:"auto"}}>
              {matsLoading
                ?<div style={{padding:24,textAlign:"center"}}><Spin isDark={isDark}/></div>
                :materials.length===0
                  ?<div style={{fontSize:12,color:dimText,textAlign:"center",padding:24}}>{backendOk?"No results.":"Backend offline."}</div>
                  :materials.map(mat=>{
                    const color=CLASS_COLORS[mat.material_class]||"#6b7280";
                    const isSel=selectedMat?.formula===mat.formula;
                    return(
                      <div key={mat.formula} onClick={()=>setSelectedMat(isSel?null:mat)}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",marginBottom:4,borderRadius:8,cursor:"pointer",
                          background:isSel?selBg:matBaseBg,
                          border:`0.5px solid ${isSel?selBdr:(isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)")}`,
                          transition:"all .15s"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:isSel?accentC:selTitle}}>{mat.formula}</div>
                          <div style={{fontSize:10,color:dimText,marginTop:1}}>{mat.name}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:`${color}20`,color,border:`0.5px solid ${color}44`}}>{mat.material_class}</span>
                          <span style={{fontSize:11,color:accentC,fontWeight:700,minWidth:24,textAlign:"right"}}>{mat.paper_count}</span>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            {totalMats>50&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,fontSize:11,color:dimText}}>
                <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{...BS,opacity:page===1?.4:1}}>← Prev</button>
                <span>Page {page} of {Math.ceil(totalMats/50)}</span>
                <button disabled={page>=Math.ceil(totalMats/50)} onClick={()=>setPage(p=>p+1)} style={{...BS,opacity:page>=Math.ceil(totalMats/50)?.4:1}}>Next →</button>
              </div>
            )}
            {selectedMat&&(
              <div style={{marginTop:14,padding:"14px 16px",background:accentDim,border:`0.5px solid ${accentBdr}`,borderRadius:10}}>
                <div style={{fontSize:10,color:accentC,letterSpacing:1.5,marginBottom:6}}>▸ SELECTED</div>
                <div style={{fontSize:17,fontWeight:500,color:accentC,marginBottom:4}}>{selectedMat.formula}</div>
                <div style={{fontSize:11,color:dimText,lineHeight:1.6,marginBottom:10}}>{selectedMat.name} · {selectedMat.material_class} · {selectedMat.paper_count} papers</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>openArchive(selectedMat)} style={BS}>📊 VIEW ARCHIVE</button>
                  <button onClick={()=>sendMsg(`What are the deposition conditions and precursors for ${selectedMat.formula}?`)}
                    style={{...BS,background:isDark?"linear-gradient(135deg,#1e1b4b,#1a1363)":"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"0.5px solid #a78bfa"}}>⚡ ASK AI</button>
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div style={{background:cardBg,border:cardBdr,borderRadius:14,padding:24,display:"flex",flexDirection:"column",transition:"background 0.25s ease"}}>
            <div style={{fontSize:11,letterSpacing:2,color:accentC,fontWeight:500,marginBottom:10}}>▸ GEMAMAT ASSISTANT</div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:dimText,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:5}}>Gemini API Key</div>
              <div style={{position:"relative"}}>
                <input
                  type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)}
                  placeholder="Paste your Gemini API key…"
                  style={{width:"100%",padding:"7px 32px 7px 10px",borderRadius:7,border:inputBdr,background:inputBg,color:inputText,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}
                />
                <svg style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dimText} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              {!geminiKey&&<div style={{fontSize:9,color:"#f87171",marginTop:3}}>⚠ Required to use the AI assistant</div>}
              {geminiKey&&<div style={{fontSize:9,color:"#34d399",marginTop:3}}>✓ Key set — AI assistant ready</div>}
            </div>
            <div style={{flex:1,minHeight:340,maxHeight:400,overflowY:"auto",marginBottom:14}}>
              {messages.map((msg,i)=>(
                <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:10}}>
                  <div style={{maxWidth:"86%",padding:"10px 14px",fontSize:12,lineHeight:1.65,whiteSpace:"pre-wrap",
                    background:msg.role==="user"?userMsgBg:asstMsgBg,
                    border:`0.5px solid ${msg.role==="user"?userMsgBdr:asstMsgBdr}`,
                    color:msg.role==="user"?userMsgC:asstMsgC,
                    borderRadius:msg.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px"}}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading&&<div style={{display:"flex",justifyContent:"flex-start",marginBottom:10}}><div style={{padding:"10px 16px",borderRadius:"12px 12px 12px 4px",background:asstMsgBg,border:`0.5px solid ${asstMsgBdr}`}}><Spin isDark={isDark}/></div></div>}
              <div ref={chatEnd}/>
            </div>
            {messages.length<=1&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                {SUGGESTIONS.map((s,i)=><button key={i} onClick={()=>sendMsg(s)} style={{padding:"5px 10px",fontSize:10,background:"transparent",border:`0.5px solid ${suggBdr}`,borderRadius:20,color:suggText,cursor:"pointer"}}>{s}</button>)}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <input type="text" placeholder={selectedMat?`Ask about ${selectedMat.formula}…`:"Ask about ALD processes…"}
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                style={{flex:1,padding:"10px 14px",background:inputBg,border:inputBdr,borderRadius:8,color:inputText,fontSize:12,outline:"none"}}/>
              <button onClick={()=>sendMsg()} disabled={chatLoading||!input.trim()}
                style={{padding:"10px 18px",
                  background:isDark?"linear-gradient(135deg,#134e4a,#065f46)":"linear-gradient(135deg,#0369a1,#0284c7)",
                  border:`0.5px solid ${accentC}`,borderRadius:8,color:"#fff",fontSize:12,
                  cursor:chatLoading||!input.trim()?"not-allowed":"pointer",
                  opacity:chatLoading||!input.trim()?.5:1}}>▶</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:16,padding:"8px 20px",background:footerBg,border:cardBdr,borderRadius:14,display:"flex",justifyContent:"space-between",fontSize:10,color:dimText,letterSpacing:1.5,transition:"background 0.25s ease"}}>
          <div style={{display:"flex",gap:24}}>
            <span>⬡ NODE: GEMAMAT-1</span>
            <span>▣ PAPERS: {globalStats.total_papers||"…"}</span>
            <span>⬡ MATERIALS: {globalStats.total_materials||"…"}</span>
            {globalStats.oa_papers>0&&<span style={{color:"#34d399"}}>● OA: {globalStats.oa_papers}</span>}
          </div>
          <span>ALD INTELLIGENCE ACTIVE · CLAUDE AI</span>
        </div>
      </div>
      <GStyles isDark={isDark}/>
    </div>
  );
}

function GStyles({isDark}){
  const ph = isDark ? "#4b5563" : "#94a3b8";
  const sb  = isDark ? "rgba(45,212,191,.3)" : "rgba(2,132,199,.3)";
  return<style>{`
    @keyframes ald-spin{to{transform:rotate(360deg);}}
    input::placeholder{color:${ph};}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${sb};border-radius:2px;}
  `}</style>;
}