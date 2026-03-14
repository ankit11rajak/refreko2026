import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import PaymentManagement from '../../components/Admin/PaymentManagement'
import Analytics from '../../components/Admin/Analytics'
import GateAnalytics from '../../components/Admin/GateAnalytics'
import './Admin.css'

const ADMIN_TABS = [
  {
    id: 'payments',
    label: 'Payment Management',
    description: 'Review payment proofs and manage approvals.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    )
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Track revenue and conversion signals.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="20" x2="12" y2="10"/>
        <line x1="18" y1="20" x2="18" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="16"/>
      </svg>
    )
  },
  {
    id: 'gate-analytics',
    label: 'Gate Analytics',
    description: 'Monitor access validation and gate entries.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 8l9-5 9 5-9 5-9-5z"/>
        <path d="M21 12l-9 5-9-5"/>
        <path d="M21 16l-9 5-9-5"/>
      </svg>
    )
  }
]

const Admin = () => {
  const [activeTab, setActiveTab] = useState('payments')
  const navigate = useNavigate()
  const activeTabMeta = ADMIN_TABS.find((tab) => tab.id === activeTab) || ADMIN_TABS[0]

  useEffect(() => {
    document.body.classList.add('system-cursor')

    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated')
    if (isAdminAuthenticated !== 'true') {
      navigate('/login/admin')
    }

    return () => {
      document.body.classList.remove('system-cursor')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminLoginEmail')
    navigate('/')
  }

  return (
    <div className="admin-dashboard">
      <div className="hex-grid-overlay" />
      
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <Link to="/">
              <span className="logo-main">REFRESKO</span>
              <span className="logo-year">2026</span>
            </Link>
          </div>
          
          <div className="admin-title">
            <h1>ADMIN DASHBOARD</h1>
            <p>Supreme Knowledge Foundation</p>
          </div>

          <div className="admin-header-badge">Operations Console</div>

          <button className="admin-logout-btn interactive" onClick={handleLogout}>
            <span>LOGOUT</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <div className="admin-nav-container">
          {ADMIN_TABS.map((tab) => (
            <motion.button
              key={tab.id}
              className={`nav-tab interactive ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label.toUpperCase()}</span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="admin-content">
        <div className="admin-workspace-head">
          <div>
            <p className="workspace-kicker">Current Module</p>
            <h2>{activeTabMeta.label}</h2>
            <p>{activeTabMeta.description}</p>
          </div>
          <span className="workspace-dot">Live</span>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <PaymentManagement />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Analytics />
            </motion.div>
          )}

          {activeTab === 'gate-analytics' && (
            <motion.div
              key="gate-analytics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <GateAnalytics />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default Admin
