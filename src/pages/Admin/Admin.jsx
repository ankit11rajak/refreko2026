import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import CustomCursor from '../../components/CustomCursor/CustomCursor'
import PaymentManagement from '../../components/Admin/PaymentManagement'
import Analytics from '../../components/Admin/Analytics'
import './Admin.css'

const Admin = () => {
  const [activeTab, setActiveTab] = useState('payments')
  const navigate = useNavigate()

  useEffect(() => {
    const isAdminAuthenticated = localStorage.getItem('adminAuthenticated')
    if (isAdminAuthenticated !== 'true') {
      navigate('/login/admin')
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminLoginEmail')
    navigate('/')
  }

  return (
    <div className="admin-dashboard">
      <CustomCursor />
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
          <motion.button
            className={`nav-tab interactive ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>PAYMENT MANAGEMENT</span>
          </motion.button>

          <motion.button
            className={`nav-tab interactive ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            <span>ANALYTICS</span>
          </motion.button>
        </div>
      </nav>

      {/* Content */}
      <main className="admin-content">
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
        </AnimatePresence>
      </main>
    </div>
  )
}

export default Admin
