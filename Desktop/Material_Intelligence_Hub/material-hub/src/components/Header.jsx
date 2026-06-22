// Header.jsx
import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const pageTitles = {
  '/': { name: 'Tatva', sub: 'Research Platform' },
  '/ald': { name: 'ALD Simulator', sub: 'Atomic Layer Deposition' },
  '/sputtering': { name: 'Sputtering RAG', sub: 'Deposition · RAG Pipeline' },
  '/root-phenotyping': { name: 'Root Phenotyping', sub: 'Computer Vision' },
  '/keyword-trend': { name: 'Keyword Trend', sub: 'Research Analytics' },
}

const avatarColors = [
  'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  'linear-gradient(135deg, #00e5a0, #00d4ff)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #00d4ff, #3b82f6)',
]

export default function Header({ isDark, setIsDark }) {
  const location = useLocation()
  const page = pageTitles[location.pathname] || pageTitles['/']
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [avatarColor, setAvatarColor] = useState(avatarColors[0])
  const [initials, setInitials] = useState('T')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('avatarColor')
    const savedInitials = localStorage.getItem('initials')
    if (saved) setAvatarColor(saved)
    if (savedInitials) setInitials(savedInitials)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectColor = (color) => {
    setAvatarColor(color)
    localStorage.setItem('avatarColor', color)
  }

  return (
    <div style={{
      height: 48,
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border2)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 0,
      flexShrink: 0,
      position: 'relative',
      zIndex: 50
    }}>

      {/* Brand / Logo area */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flex: 1, flexShrink: 0
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinecap="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
            <line x1="12" y1="2" x2="12" y2="22"/>
            <line x1="2" y1="8.5" x2="22" y2="8.5"/>
          </svg>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800,
          color: 'var(--text)', letterSpacing: '0.1em',
          fontFamily: 'monospace'
        }}>
          {page.name}
        </span>
      </div>

      {/* Theme toggle button */}
      <button
        onClick={() => setIsDark(d => !d)}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-border)',
          borderRadius: 8,
          padding: '5px 12px',
          color: 'var(--cyan)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          marginRight: 10,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--cyan-dim)'
          e.currentTarget.style.borderColor = 'var(--cyan-border2)'
          e.currentTarget.style.boxShadow = '0 0 12px var(--cyan-glow1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = 'var(--cyan-border)'
        }}
      >
        {isDark ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
            LIGHT
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            DARK
          </>
        )}
      </button>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Avatar */}
        <div ref={dropdownRef} style={{ position: 'relative', marginLeft: 4 }}>
          <div
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'white',
              cursor: 'pointer',
              border: dropdownOpen ? '2px solid var(--cyan)' : '2px solid var(--border3)',
              transition: 'border 0.2s',
              fontFamily: 'monospace',
              letterSpacing: '0.05em'
            }}
          >
            {initials}
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 38,
              background: 'var(--dropdown-bg)',
              border: '1px solid var(--border3)',
              borderRadius: 10, padding: 14,
              width: 200, zIndex: 100,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>Researcher</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Tatva</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  Avatar Color
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {avatarColors.map((color, i) => (
                    <div
                      key={i}
                      onClick={() => selectColor(color)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: color, cursor: 'pointer',
                        border: avatarColor === color ? '2px solid var(--cyan)' : '2px solid transparent',
                        boxShadow: avatarColor === color ? '0 0 8px var(--cyan)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 10, borderTop: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace' }}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
                <div
                  onClick={() => setIsDark(d => !d)}
                  style={{
                    width: 36, height: 18, borderRadius: 9,
                    background: isDark ? 'rgba(0,212,255,0.3)' : 'rgba(0,0,0,0.1)',
                    border: '1px solid var(--border3)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: isDark ? 16 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: isDark ? 'var(--cyan)' : 'rgba(0,0,0,0.4)',
                    transition: 'left 0.2s',
                    boxShadow: isDark ? '0 0 6px var(--cyan)' : 'none'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}