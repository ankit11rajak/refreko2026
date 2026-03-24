import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cpanelApi } from '../../lib/cpanelApi'
import './SystemSettings.css'

const LOCAL_GATE_PASS_VISIBILITY_KEY = 'system_settings_gate_pass_visibility_enabled'

const DEFAULT_SETTINGS = {
  gate_pass_visibility_enabled: {
    value: false,
    type: 'boolean',
    description: 'When enabled, all gate passes are visible on student dashboard regardless of payment status'
  },
  label_generation_enabled: {
    value: true,
    type: 'boolean',
    description: 'Enable or disable automatic label generation for gate entries'
  }
}

const mapSettingsToFormData = (settingsObject) => {
  const formValues = {}
  Object.keys(settingsObject).forEach((key) => {
    formValues[key] = settingsObject[key].value
  })
  return formValues
}

const persistGatePassVisibility = (settingKey, value) => {
  if (settingKey !== 'gate_pass_visibility_enabled') return
  localStorage.setItem(LOCAL_GATE_PASS_VISIBILITY_KEY, value ? '1' : '0')
}

const SystemSettings = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [settings, setSettings] = useState({})
  const [formData, setFormData] = useState({})
  const [isReadOnlyFallback, setIsReadOnlyFallback] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await cpanelApi.getSystemSettings()
      if (response?.success && response?.settings) {
        setIsReadOnlyFallback(false)
        setSettings(response.settings)
        setFormData(mapSettingsToFormData(response.settings))
        const rawValue = response.settings?.gate_pass_visibility_enabled?.value
        if (typeof rawValue !== 'undefined') {
          persistGatePassVisibility('gate_pass_visibility_enabled', Boolean(rawValue))
        }
      } else {
        setIsReadOnlyFallback(true)
        const localGatePassVisibility = localStorage.getItem(LOCAL_GATE_PASS_VISIBILITY_KEY) === '1'
        const fallbackSettings = {
          ...DEFAULT_SETTINGS,
          gate_pass_visibility_enabled: {
            ...DEFAULT_SETTINGS.gate_pass_visibility_enabled,
            value: localGatePassVisibility
          }
        }
        setSettings(fallbackSettings)
        setFormData(mapSettingsToFormData(fallbackSettings))
        setSuccessMessage('Settings backend is unavailable right now. Showing safe defaults.')
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setIsReadOnlyFallback(true)
      const localGatePassVisibility = localStorage.getItem(LOCAL_GATE_PASS_VISIBILITY_KEY) === '1'
      const fallbackSettings = {
        ...DEFAULT_SETTINGS,
        gate_pass_visibility_enabled: {
          ...DEFAULT_SETTINGS.gate_pass_visibility_enabled,
          value: localGatePassVisibility
        }
      }
      setSettings(fallbackSettings)
      setFormData(mapSettingsToFormData(fallbackSettings))
      setSuccessMessage('Settings backend is unavailable right now. Showing safe defaults.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (settingKey) => {
    if (isReadOnlyFallback) {
      const nextValue = !formData[settingKey]
      setFormData((prev) => ({ ...prev, [settingKey]: nextValue }))
      persistGatePassVisibility(settingKey, nextValue)
      setSuccessMessage('Updated locally for preview. Backend sync is unavailable.')
      return
    }

    const newValue = !formData[settingKey]
    setFormData(prev => ({ ...prev, [settingKey]: newValue }))
    
    try {
      setError('')
      setSuccessMessage('')
      const response = await cpanelApi.updateSystemSetting(settingKey, newValue ? '1' : '0')
      
      if (response?.success) {
        persistGatePassVisibility(settingKey, newValue)
        setSuccessMessage('Setting updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        // Reload settings to sync
        await loadSettings()
      } else {
        setError(response?.message || 'Failed to update setting')
        // Revert the toggle
        setFormData(prev => ({ ...prev, [settingKey]: !newValue }))
      }
    } catch (err) {
      console.error('Error updating setting:', err)
      setError(err?.message || 'Failed to update setting')
      // Revert the toggle
      setFormData(prev => ({ ...prev, [settingKey]: !newValue }))
    }
  }

  if (loading) {
    return (
      <div className="system-settings-container">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading system settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="system-settings-container">
      {error && (
        <motion.div
          className="alert alert-error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          className="alert alert-success"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
        </motion.div>
      )}

      <div className="settings-grid">
        {Object.entries(settings).map(([key, setting]) => (
          <motion.div
            key={key}
            className="setting-card interactive"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
          >
            <div className="setting-header">
              <h3 className="setting-title">
                {key.replace(/_/g, ' ').toUpperCase()}
              </h3>
              {setting.type === 'boolean' && (
                <motion.button
                  className={`toggle-switch ${formData[key] ? 'enabled' : 'disabled'}`}
                  onClick={() => handleToggle(key)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="toggle-thumb"
                    initial={false}
                    animate={{ x: formData[key] ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                </motion.button>
              )}
            </div>

            {setting.description && (
              <p className="setting-description">{setting.description}</p>
            )}

            <div className="setting-footer">
              <span className="setting-status">
                {setting.type === 'boolean' ? (
                  <span className={formData[key] ? 'status-enabled' : 'status-disabled'}>
                    {formData[key] ? '● ENABLED' : '○ DISABLED'}
                  </span>
                ) : (
                  <span className="status-value">{formData[key]}</span>
                )}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {Object.keys(settings).length === 0 && !loading && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h3>No settings available</h3>
          <p>System settings will appear here once configured</p>
        </div>
      )}
    </div>
  )
}

export default SystemSettings
