import { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export const ThemeContext = createContext({ isDark: true, setIsDark: () => {} })
export const useTheme = () => useContext(ThemeContext)

const darkVars = `
  :root {
    --bg: #0d1120;
    --bg2: #0a0e1a;
    --bg3: #151b2e;
    --bg4: #1a2236;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.06);
    --border3: rgba(255,255,255,0.1);
    --text: #e8f4ff;
    --text2: rgba(255,255,255,0.55);
    --text3: rgba(255,255,255,0.3);
    --text4: rgba(255,255,255,0.45);
    --card-bg: rgba(255,255,255,0.03);
    --card-overlay: rgba(0,0,0,0.25);
    --cyan: #00d4ff;
    --cyan-dim: rgba(0,212,255,0.1);
    --cyan-border: rgba(0,212,255,0.25);
    --cyan-border2: rgba(0,212,255,0.4);
    --cyan-border3: rgba(0,212,255,0.35);
    --cyan-grid: rgba(0,212,255,0.04);
    --cyan-glow1: rgba(0,212,255,0.12);
    --cyan-glow2: rgba(59,130,246,0.1);
    --green: #00e5a0;
    --header-bg: #0d1120;
    --sidebar-bg: #0a0e1a;
    --hero-bg: #0a0e1a;
    --badge-text: rgba(255,255,255,0.07);
    --svg-stroke: #7fc8ff;
    --svg-fill1: #7fc8ff;
    --svg-fill2: #a78bfa;
    --svg-fill3: #8bb8e8;
    --nav-w: 56px;
    --scrollbar: rgba(255,255,255,0.1);
    --tooltip-bg: #151b2e;
    --dropdown-bg: #151b2e;
    --nominal: #00e5a0;
    --nav-active-bg: rgba(0,212,255,0.1);
    --nav-active-border: rgba(0,212,255,0.4);
    --nav-hover-bg: rgba(255,255,255,0.05);
    --nav-hover-color: rgba(255,255,255,0.7);
    --nav-inactive: rgba(255,255,255,0.3);
  }
`

const lightVars = `
  :root {
    --bg: #f0f5ff;
    --bg2: #ffffff;
    --bg3: #f7faff;
    --bg4: #e8eef8;
    --border: rgba(0,0,0,0.07);
    --border2: rgba(0,0,0,0.06);
    --border3: rgba(0,0,0,0.1);
    --text: #0d1120;
    --text2: rgba(13,17,32,0.6);
    --text3: rgba(13,17,32,0.35);
    --text4: rgba(13,17,32,0.5);
    --card-bg: rgba(255,255,255,0.8);
    --card-overlay: rgba(230,238,255,0.4);
    --cyan: #0284c7;
    --cyan-dim: rgba(2,132,199,0.08);
    --cyan-border: rgba(2,132,199,0.2);
    --cyan-border2: rgba(2,132,199,0.35);
    --cyan-border3: rgba(2,132,199,0.3);
    --cyan-grid: rgba(2,132,199,0.04);
    --cyan-glow1: rgba(2,132,199,0.08);
    --cyan-glow2: rgba(59,130,246,0.07);
    --green: #059669;
    --header-bg: #ffffff;
    --sidebar-bg: #ffffff;
    --hero-bg: #eef3ff;
    --badge-text: rgba(0,0,0,0.06);
    --svg-stroke: #4a90c4;
    --svg-fill1: #4a90c4;
    --svg-fill2: #7c5cbf;
    --svg-fill3: #5a85b8;
    --nav-w: 56px;
    --scrollbar: rgba(0,0,0,0.1);
    --tooltip-bg: #ffffff;
    --dropdown-bg: #ffffff;
    --nominal: #059669;
    --nav-active-bg: rgba(2,132,199,0.1);
    --nav-active-border: rgba(2,132,199,0.4);
    --nav-hover-bg: rgba(0,0,0,0.04);
    --nav-hover-color: rgba(13,17,32,0.7);
    --nav-inactive: rgba(13,17,32,0.35);
  }
`

export default function Layout({ children }) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    let styleEl = document.getElementById('layout-theme')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'layout-theme'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = isDark ? darkVars : lightVars
    document.documentElement.classList.toggle('light', !isDark)
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <div style={{
        display: 'flex', height: '100vh', width: '100vw',
        background: 'var(--bg)', overflow: 'hidden',
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif"
      }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header isDark={isDark} setIsDark={setIsDark} />
          <div style={{
            flex: 1, overflowY: 'auto',
            background: 'var(--bg)',
            position: 'relative',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--scrollbar) transparent'
          }}>
            {children}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  )
}