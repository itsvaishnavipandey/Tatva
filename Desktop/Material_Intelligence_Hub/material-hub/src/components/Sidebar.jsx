// Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  {
    path: '/',
    tooltip: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    path: '/ald',
    tooltip: 'ALD Simulator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
    )
  },
  {
    path: '/sputtering',
    tooltip: 'Sputtering RAG',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    )
  },
  {
    path: '/root-phenotyping',
    tooltip: 'Root Phenotyping',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 22V12M12 12C12 12 8 9 8 5a4 4 0 018 0c0 4-4 7-4 7z"/>
        <path d="M12 16c-2 2-4 4-4 6"/><path d="M12 16c2 2 4 4 4 6"/>
      </svg>
    )
  },
  {
    path: '/keyword-trend',
    tooltip: 'Keyword Trends',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
  },
  {
    path: '/ferroelectric',
    tooltip: 'Ferroelectric DB',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    )
  },
  {
    path: '/radiative-cooling',
    tooltip: 'Radiative Cooling',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    )
  },
  {
    path: '/optical',
    tooltip: 'Optical Predictor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12C2 12 5 5 12 5s10 7 10 7-3 7-10 7S2 12 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      width: 56,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '14px 0',
      gap: '4px',
      flexShrink: 0,
      zIndex: 10
    }}>

      {/* Logo icon */}
      <div style={{
        width: 34, height: 34,
        background: 'var(--cyan-dim)',
        border: '1px solid var(--cyan-border3)',
        borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
          <line x1="12" y1="2" x2="12" y2="22"/>
          <line x1="2" y1="8.5" x2="22" y2="8.5"/>
          <line x1="2" y1="15.5" x2="22" y2="15.5"/>
        </svg>
      </div>

      {/* Divider */}
      <div style={{ width: 28, height: 1, background: 'var(--border2)', margin: '4px 0 8px' }} />

      {/* Nav items */}
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              width: 40, height: 40,
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              border: isActive
                ? '1px solid var(--nav-active-border)'
                : '1px solid transparent',
              background: isActive
                ? 'var(--nav-active-bg)'
                : 'transparent',
              position: 'relative',
              transition: 'all 0.18s',
              color: isActive ? 'var(--cyan)' : 'var(--nav-inactive)'
            }}
            onMouseEnter={e => {
              e.currentTarget.querySelector('.nav-tooltip').style.opacity = '1'
              e.currentTarget.querySelector('.nav-tooltip').style.transform = 'translateX(0)'
              if (!isActive) {
                e.currentTarget.style.background = 'var(--nav-hover-bg)'
                e.currentTarget.style.color = 'var(--nav-hover-color)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.querySelector('.nav-tooltip').style.opacity = '0'
              e.currentTarget.querySelector('.nav-tooltip').style.transform = 'translateX(-4px)'
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--nav-inactive)'
              }
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            >
              {item.icon.props.children}
            </svg>

            {/* Active indicator dot */}
            {isActive && (
              <div style={{
                position: 'absolute', right: -1, top: '50%',
                transform: 'translateY(-50%)',
                width: 3, height: 16, borderRadius: '2px 0 0 2px',
                background: 'var(--cyan)',
                boxShadow: '0 0 6px var(--cyan)'
              }} />
            )}

            {/* Tooltip */}
            <div
              className="nav-tooltip"
              style={{
                position: 'absolute',
                left: 'calc(100% + 10px)',
                background: 'var(--tooltip-bg)',
                border: '1px solid var(--border3)',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 11,
                whiteSpace: 'nowrap',
                color: 'var(--text2)',
                pointerEvents: 'none',
                opacity: 0,
                transform: 'translateX(-4px)',
                transition: 'opacity 0.15s, transform 0.15s',
                zIndex: 99,
                fontFamily: 'monospace',
                letterSpacing: '0.03em'
              }}
            >
              {item.tooltip}
            </div>
          </div>
        )
      })}
    </div>
  )
}