import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const tools = [
  {
    path: '/ald',
    name: 'ALD Simulator',
    tag: 'Atomic Layer Deposition',
    description: 'Atomic Layer Deposition predictive modeling for thin film growth.',
    status: 'LIVE',
    color: '#00d4ff',
    accent: 'rgba(0,212,255,0.15)',
    accentLight: 'rgba(0,180,220,0.10)',
    visual: 'bars',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    path: '/keyword-trend',
    name: 'Keyword Trend',
    tag: 'Research Analytics',
    description: 'NLP analysis of recent material science publications and patents.',
    status: 'LIVE',
    color: '#a78bfa',
    accent: 'rgba(167,139,250,0.15)',
    accentLight: 'rgba(139,92,246,0.10)',
    visual: 'wave',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
  },
  {
    path: '/root-phenotyping',
    name: 'Root Phenotyping',
    tag: 'Computer Vision · Agriculture',
    description: 'AI vision system for structural analysis of biological networks.',
    status: 'LIVE',
    color: '#00e5a0',
    accent: 'rgba(0,229,160,0.15)',
    accentLight: 'rgba(0,180,120,0.10)',
    visual: 'progress',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 22V12M12 12C12 12 8 9 8 5a4 4 0 018 0c0 4-4 7-4 7z"/>
        <path d="M12 16c-2 2-4 4-4 6"/><path d="M12 16c2 2 4 4 4 6"/>
      </svg>
    )
  },
  {
    path: '/sputtering',
    name: 'Sputtering RAG',
    tag: 'Sputtering Process · RAG',
    description: 'Retrieval-Augmented Generation for deposition parameters.',
    status: 'LIVE',
    color: '#f59e0b',
    accent: 'rgba(245,158,11,0.15)',
    accentLight: 'rgba(217,119,6,0.10)',
    visual: 'dots',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    )
  },
  {
    path: '/ferroelectric',
    name: 'Ferroelectric DB',
    tag: 'Thin Film · Materials DB',
    description: 'Thin film material explorer with XGBoost coercive field predictor and LLM abstract extractor.',
    status: 'LIVE',
    color: '#ffa500',
    accent: 'rgba(255,165,0,0.15)',
    accentLight: 'rgba(234,130,0,0.10)',
    visual: 'bars',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    )
  },
  {
    path: '/radiative-cooling',
    name: 'Radiative Cooling',
    tag: 'TMM · Genetic Algorithm · Gemini AI',
    description: 'Multilayer optical stack designer with GA optimizer and Gemini AI sequence advisor.',
    status: 'LIVE',
    color: '#00f5ff',
    accent: 'rgba(0,245,255,0.15)',
    accentLight: 'rgba(0,200,220,0.10)',
    visual: 'wave',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    )
  },
  {
    path: '/optical',
    name: 'Optical Predictor',
    tag: 'MLP · ENAN · Refractive Index',
    description: 'Predict refractive index using MLP model trained on ENAN optical constants dataset.',
    status: 'LIVE',
    color: '#f472b6',
    accent: 'rgba(244,114,182,0.15)',
    accentLight: 'rgba(219,39,119,0.10)',
    visual: 'wave',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12C2 12 5 5 12 5s10 7 10 7-3 7-10 7S2 12 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  }
]


function BarsVisual({ color }) {
  const heights = [40, 60, 45, 75, 55, 80, 65]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, padding: '0 4px' }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`,
          background: i === 5 ? color : `${color}55`,
          borderRadius: '3px 3px 0 0',
          transition: 'height 0.3s'
        }} />
      ))}
    </div>
  )
}

function WaveVisual({ color }) {
  return (
    <svg height="48" width="100%" viewBox="0 0 200 48" preserveAspectRatio="none">
      <path
        d="M0 24 C30 10 50 38 80 24 C110 10 130 38 160 24 C180 14 190 30 200 24"
        fill="none" stroke={color} strokeWidth="2" opacity="0.7"
      />
      <path
        d="M0 32 C25 18 55 44 85 32 C115 18 140 44 165 32 C180 24 192 38 200 32"
        fill="none" stroke={color} strokeWidth="1.5" opacity="0.35"
      />
    </svg>
  )
}

function ProgressVisual({ color }) {
  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>SCAN ACCURACY</span>
        <span style={{ fontSize: 10, color, fontFamily: 'monospace', fontWeight: 700 }}>98.4%</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: '98.4%', background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function DotsVisual({ color }) {
  const cols = [0.7, 1, 0.4, 0.9, 0.5, 0.8, 0.3, 0.6, 1, 0.45, 0.85, 0.6]
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 4px', flexWrap: 'wrap' }}>
      {cols.map((o, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 2,
          background: color, opacity: o
        }} />
      ))}
    </div>
  )
}

function MoleculeDecor({ dark }) {
  const bond   = dark ? 'rgba(99,180,255,0.28)'  : 'rgba(99,130,240,0.35)'
  const dashed = dark ? 'rgba(167,139,250,0.20)' : 'rgba(139,92,246,0.22)'
  const back   = dark ? 'rgba(167,139,250,0.28)' : 'rgba(167,139,250,0.38)'
  const backS  = dark ? 'rgba(139,92,246,0.28)'  : 'rgba(139,92,246,0.38)'
  return (
    <svg
      width="230" height="230" viewBox="0 0 230 230"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
    >
      <line x1="115" y1="30"  x2="65"  y2="88"  stroke={bond}   strokeWidth="2"/>
      <line x1="115" y1="30"  x2="165" y2="88"  stroke={bond}   strokeWidth="2"/>
      <line x1="115" y1="30"  x2="115" y2="110" stroke={bond}   strokeWidth="2"/>
      <line x1="65"  y1="88"  x2="40"  y2="155" stroke={bond}   strokeWidth="2"/>
      <line x1="65"  y1="88"  x2="115" y2="165" stroke={bond}   strokeWidth="2"/>
      <line x1="165" y1="88"  x2="190" y2="155" stroke={bond}   strokeWidth="2"/>
      <line x1="165" y1="88"  x2="115" y2="165" stroke={bond}   strokeWidth="2"/>
      <line x1="115" y1="110" x2="65"  y2="88"  stroke={bond}   strokeWidth="1.5"/>
      <line x1="115" y1="110" x2="165" y2="88"  stroke={bond}   strokeWidth="1.5"/>
      <line x1="40"  y1="155" x2="115" y2="165" stroke={bond}   strokeWidth="2"/>
      <line x1="190" y1="155" x2="115" y2="165" stroke={bond}   strokeWidth="2"/>
      <line x1="115" y1="30"  x2="178" y2="50"  stroke={dashed} strokeWidth="1.5" strokeDasharray="3,2"/>
      <line x1="178" y1="50"  x2="190" y2="155" stroke={dashed} strokeWidth="1.5" strokeDasharray="3,2"/>
      <line x1="115" y1="30"  x2="52"  y2="50"  stroke={dashed} strokeWidth="1.5" strokeDasharray="3,2"/>
      <line x1="52"  y1="50"  x2="40"  y2="155" stroke={dashed} strokeWidth="1.5" strokeDasharray="3,2"/>
      <circle cx="178" cy="50"  r="10" fill={back} stroke={backS} strokeWidth="1"/>
      <circle cx="52"  cy="50"  r="10" fill={back} stroke={backS} strokeWidth="1"/>
      <circle cx="115" cy="30"  r="16" fill={dark ? 'rgba(96,130,245,0.45)'  : 'rgba(96,130,245,0.60)'}  stroke={dark ? 'rgba(79,70,229,0.40)'  : 'rgba(79,70,229,0.55)'}  strokeWidth="1.5"/>
      <circle cx="65"  cy="88"  r="13" fill={dark ? 'rgba(147,197,253,0.45)' : 'rgba(147,197,253,0.68)'} stroke={dark ? 'rgba(59,130,246,0.38)'  : 'rgba(59,130,246,0.52)'}  strokeWidth="1.5"/>
      <circle cx="165" cy="88"  r="13" fill={dark ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.68)'} stroke={dark ? 'rgba(139,92,246,0.38)'  : 'rgba(139,92,246,0.52)'}  strokeWidth="1.5"/>
      <circle cx="115" cy="110" r="10" fill={dark ? 'rgba(196,181,253,0.38)' : 'rgba(196,181,253,0.55)'} stroke={dark ? 'rgba(139,92,246,0.28)'  : 'rgba(139,92,246,0.40)'}  strokeWidth="1"/>
      <circle cx="40"  cy="155" r="14" fill={dark ? 'rgba(96,165,250,0.45)'  : 'rgba(96,165,250,0.68)'}  stroke={dark ? 'rgba(59,130,246,0.38)'  : 'rgba(59,130,246,0.52)'}  strokeWidth="1.5"/>
      <circle cx="190" cy="155" r="14" fill={dark ? 'rgba(129,140,248,0.45)' : 'rgba(129,140,248,0.68)'} stroke={dark ? 'rgba(99,102,241,0.38)'  : 'rgba(99,102,241,0.52)'}  strokeWidth="1.5"/>
      <circle cx="115" cy="165" r="16" fill={dark ? 'rgba(96,130,245,0.45)'  : 'rgba(96,130,245,0.62)'}  stroke={dark ? 'rgba(79,70,229,0.40)'  : 'rgba(79,70,229,0.55)'}  strokeWidth="1.5"/>
      <circle cx="111" cy="26"  r="6" fill="rgba(255,255,255,0.48)"/>
      <circle cx="111" cy="161" r="6" fill="rgba(255,255,255,0.36)"/>
      <circle cx="36"  cy="151" r="5" fill="rgba(255,255,255,0.36)"/>
      <circle cx="186" cy="151" r="5" fill="rgba(255,255,255,0.36)"/>
      <circle cx="61"  cy="84"  r="4" fill="rgba(255,255,255,0.30)"/>
      <circle cx="161" cy="84"  r="4" fill="rgba(255,255,255,0.30)"/>
    </svg>
  )
}

/* ─── Equations decoration — adapts text/lines to theme ─── */
function EquationsDecor({ dark }) {
  const textFill = dark ? 'rgba(130,180,255,0.45)' : 'rgba(55,85,180,0.52)'
  const wireFill = dark ? 'rgba(100,150,255,0.25)' : 'rgba(99,120,220,0.30)'
  const orbitFill= dark ? 'rgba(100,150,255,0.18)' : 'rgba(99,120,220,0.22)'
  return (
    <svg
      width="210" height="220" viewBox="0 0 210 220"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
      fontFamily="'JetBrains Mono', 'Courier New', monospace"
    >
      <g fill={textFill} fontSize="12.5">
        <text x="70" y="22">E = mc²</text>
        <text x="52" y="50">∇·E = ρ/ε₀</text>
        <text x="62" y="82">ψ(x, t)</text>
        <text x="98" y="110">ψ(x, t)</text>
        <text x="38" y="140">H = −Σpᵢ log pᵢ</text>
        <text x="52" y="170">V = ⁴⁄₃πr³</text>
      </g>
      <g fill="none" stroke={wireFill} strokeWidth="1">
        <polygon points="152,10 196,38 196,96 152,124 108,96 108,38"/>
        <line x1="152" y1="10"  x2="152" y2="124"/>
        <line x1="108" y1="38"  x2="196" y2="96"/>
        <line x1="196" y1="38"  x2="108" y2="96"/>
        <line x1="152" y1="67"  x2="108" y2="38" strokeDasharray="3,2"/>
        <line x1="152" y1="67"  x2="196" y2="38" strokeDasharray="3,2"/>
        <line x1="152" y1="67"  x2="108" y2="96" strokeDasharray="3,2"/>
        <line x1="152" y1="67"  x2="196" y2="96" strokeDasharray="3,2"/>
      </g>
      <g fill="none" stroke={orbitFill} strokeWidth="1">
        <ellipse cx="160" cy="185" rx="42" ry="22"/>
        <ellipse cx="160" cy="185" rx="24" ry="13" strokeDasharray="3,2"/>
        <line x1="118" y1="185" x2="202" y2="185" strokeDasharray="2,3" opacity="0.5"/>
        <line x1="160" y1="163" x2="160" y2="207" strokeDasharray="2,3" opacity="0.5"/>
        <circle cx="202" cy="185" r="4" fill="rgba(129,140,248,0.50)" stroke="none"/>
      </g>
    </svg>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)
  const [tick, setTick] = useState(0)
  const [isLight, setIsLight] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Detect dark/light mode robustly — watches class changes on <html> and <body>
  useEffect(() => {
    function detect() {
      const html = document.documentElement
      const body = document.body

      // Common dark-mode class names used by React app theme switchers
      const darkClass = html.classList.contains('dark') ||
                        body.classList.contains('dark') ||
                        html.getAttribute('data-theme') === 'dark' ||
                        body.getAttribute('data-theme') === 'dark'

      // Fallback: read computed --bg CSS variable
      const bg = getComputedStyle(html).getPropertyValue('--bg').trim()
      // Dark backgrounds are typically very low luminance hex values
      const darkByVar = bg.startsWith('#0') || bg.startsWith('#1') ||
                        bg.startsWith('rgb(0') || bg.startsWith('rgb(1') ||
                        bg.startsWith('rgb(2')

      const dark = darkClass || darkByVar
      setIsDark(dark)
      setIsLight(!dark)
    }

    detect()

    const observer = new MutationObserver(detect)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    })
    // Also watch for injected <style> tag changes
    const styleEl = document.getElementById('layout-theme')
    if (styleEl) {
      const styleObs = new MutationObserver(detect)
      styleObs.observe(styleEl, { characterData: true, childList: true, subtree: true })
    }

    return () => observer.disconnect()
  }, [])

  // ── Hero theme tokens 
  const hero = isDark
    ? {
        // Deep dark navy gradient
        bg: 'linear-gradient(120deg, #0a0f1e 0%, #0d1428 18%, #0f1535 38%, #0c1230 58%, #080e20 78%, #0b1128 100%)',
        dotColor: 'rgba(80,130,220,0.12)',
        blob1: 'radial-gradient(circle, rgba(30,70,160,0.30) 0%, transparent 65%)',
        blob2: 'radial-gradient(circle, rgba(80,40,160,0.25) 0%, transparent 65%)',
        waveFill1: 'rgba(30,60,140,0.30)',
        waveFill2: 'rgba(60,30,130,0.22)',
        badgeBg: 'rgba(15,25,50,0.80)',
        badgeBorder: 'rgba(80,130,230,0.30)',
        badgeText: '#7eb3ff',
        titleColor: '#c8d8f8',
        gradStart: '#60a5fa',
        gradEnd: '#818cf8',
        subText: '#7a9abf',
        btnBg: 'linear-gradient(90deg, #2563eb, #4338ca)',
        btnShadow: 'rgba(79,70,229,0.40)',
        btnHoverShadow: 'rgba(79,70,229,0.60)',
      }
    : {
        // Soft blue/lavender light gradient (original)
        bg: 'linear-gradient(120deg, #dbeafe 0%, #c7d9f8 18%, #d4d8f8 38%, #ddd6fe 58%, #bfdbfe 78%, #e0e7ff 100%)',
        dotColor: 'rgba(100,130,220,0.10)',
        blob1: 'radial-gradient(circle, rgba(147,197,253,0.28) 0%, transparent 65%)',
        blob2: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 65%)',
        waveFill1: 'rgba(147,197,253,0.22)',
        waveFill2: 'rgba(167,139,250,0.16)',
        badgeBg: 'rgba(255,255,255,0.62)',
        badgeBorder: 'rgba(100,130,230,0.28)',
        badgeText: '#3b5bd5',
        titleColor: '#1e2a4a',
        gradStart: '#3b82f6',
        gradEnd: '#6366f1',
        subText: '#4b6091',
        btnBg: 'linear-gradient(90deg, #3b82f6, #4f46e5)',
        btnShadow: 'rgba(79,70,229,0.30)',
        btnHoverShadow: 'rgba(79,70,229,0.42)',
      }

  const now = new Date()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

    
      <div style={{
        position: 'relative',
        background: hero.bg,
        overflow: 'hidden',
        flex: '0 0 auto',
        minHeight: 280,
        transition: 'background 0.3s ease'
      }}>

        {/* Subtle dot-grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, ${hero.dotColor} 1.2px, transparent 1.2px)`,
          backgroundSize: '22px 22px',
          pointerEvents: 'none'
        }} />

        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: -60, left: '30%',
          width: 320, height: 320,
          background: hero.blob1,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -50, right: '18%',
          width: 260, height: 260,
          background: hero.blob2,
          pointerEvents: 'none'
        }} />

        {/* Wave shapes at bottom */}
        <svg
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', pointerEvents: 'none' }}
          height="90" viewBox="0 0 1200 90" preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 55 C200 15 400 80 600 48 C800 16 1000 72 1200 38 L1200 90 L0 90 Z"
            fill={hero.waveFill1}/>
          <path d="M0 68 C180 40 360 80 550 58 C740 36 960 72 1200 50 L1200 90 L0 90 Z"
            fill={hero.waveFill2}/>
        </svg>

        {/* Decorations */}
        <MoleculeDecor dark={isDark} />
        <EquationsDecor dark={isDark} />

        {/* Center content */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 260px', textAlign: 'center',
          minHeight: 280
        }}>

          {/* Version badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: hero.badgeBg,
            border: `1px solid ${hero.badgeBorder}`,
            borderRadius: 20, padding: '4px 14px',
            fontSize: 10, color: hero.badgeText,
            marginBottom: 18, letterSpacing: '0.10em',
            fontFamily: 'monospace',
            backdropFilter: 'blur(6px)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px #22c55e'
            }} />
            SYSTEM ONLINE · V 4.2.0
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 38, fontWeight: 800, lineHeight: 1.2,
            marginBottom: 14, letterSpacing: '-0.02em',
            color: hero.titleColor,
            transition: 'color 0.3s ease'
          }}>
            Tatva{' '}
            <span style={{
              background: `linear-gradient(90deg, ${hero.gradStart}, ${hero.gradEnd})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              
            </span>
          </h1>

          <p style={{
            fontSize: 13, color: hero.subText,
            maxWidth: 400, lineHeight: 1.75,
            marginBottom: 28, fontWeight: 400,
            transition: 'color 0.3s ease'
          }}>
            Advanced AI-powered system for nanoscale material science simulations,
            structural analysis, and predictive physics modeling.
          </p>

          {/* LAUNCH LAB button */}
          <button
            onClick={() => document.getElementById('instruments')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: hero.btnBg,
              border: 'none',
              borderRadius: 10, padding: '11px 26px',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.07em',
              fontFamily: 'monospace',
              boxShadow: `0 4px 18px ${hero.btnShadow}`,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = `0 6px 24px ${hero.btnHoverShadow}`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = `0 4px 18px ${hero.btnShadow}`
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
            LAUNCH LAB
          </button>
        </div>
      </div>

      {/*   ACTIVE INSTRUMENTS SECTION */}
      <div id="instruments" style={{ flex: 1, background: 'var(--bg)', padding: 24 }}>

        {/* Section header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a14 14 0 0 0 0 17M20.5 3.5a14 14 0 0 1 0 17"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em' }}>
              Active Instruments
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>
              COORD: 45.9X / 12.4Y
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>STATUS:</span>
              <span style={{ fontSize: 10, color: 'var(--nominal)', fontFamily: 'monospace', fontWeight: 700 }}>NOMINAL</span>
            </div>
          </div>
        </div>

        {/* Tool Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12
        }}>
          {tools.map((tool) => (
            <div
              key={tool.name}
              onClick={() => navigate(tool.path)}
              onMouseEnter={() => setHovered(tool.name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === tool.name
                  ? isLight
                    ? `linear-gradient(135deg, ${tool.accentLight}, rgba(255,255,255,0.9))`
                    : `linear-gradient(135deg, ${tool.accent}, rgba(255,255,255,0.02))`
                  : 'var(--card-bg)',
                border: `1px solid ${hovered === tool.name ? tool.color + '55' : 'var(--border)'}`,
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: 10,
                boxShadow: hovered === tool.name ? `0 4px 24px ${tool.color}22` : 'none'
              }}
            >
              {/* Card top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: isLight ? tool.accentLight : tool.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: tool.color
                }}>
                  {tool.icon}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 20,
                  background: tool.status === 'LIVE' ? `${tool.color}18` : 'var(--badge-text)',
                  color: tool.status === 'LIVE' ? tool.color : 'var(--text3)',
                  border: `1px solid ${tool.status === 'LIVE' ? tool.color + '40' : 'transparent'}`,
                  fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {tool.status === 'LIVE' && (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: tool.color }} />
                  )}
                  {tool.status}
                </div>
              </div>

              {/* Name & description */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text4)', lineHeight: 1.5 }}>
                  {tool.description}
                </div>
              </div>

              {/* Visual */}
              <div style={{
                background: 'var(--card-overlay)',
                borderRadius: 6, overflow: 'hidden', padding: '4px 6px'
              }}>
                {tool.visual === 'bars'     && <BarsVisual     color={tool.color} />}
                {tool.visual === 'wave'     && <WaveVisual     color={tool.color} />}
                {tool.visual === 'progress' && <ProgressVisual color={tool.color} />}
                {tool.visual === 'dots'     && <DotsVisual     color={tool.color} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}