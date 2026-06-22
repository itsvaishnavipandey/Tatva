import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AldPage from './pages/AldPage'
import SpatteringPage from './pages/SpatteringPage'
import RootPhenotypingPage from './pages/RootPhenotypingPage'
import KeywordTrendPage from './pages/KeywordTrendPage'
import FerroelectricPage from './pages/FerroelectricPage'
import RadiativeCoolingPage from './pages/RadiativeCoolingPage'
import OpticalPage from './pages/OpticalPage'
import './index.css'

export default function App() {
  const [isDark, setIsDark] = useState(true)

  return (
    <Layout isDark={isDark} setIsDark={setIsDark}>
      <Routes>
        <Route path="/"                 element={<Dashboard />} />
        <Route path="/ald"              element={<AldPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/sputtering"       element={<SpatteringPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/root-phenotyping" element={<RootPhenotypingPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/keyword-trend"    element={<KeywordTrendPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/ferroelectric"    element={<FerroelectricPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/radiative-cooling"element={<RadiativeCoolingPage isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/optical"          element={<OpticalPage isDark={isDark} setIsDark={setIsDark} />} />
      </Routes>
    </Layout>
  )
}