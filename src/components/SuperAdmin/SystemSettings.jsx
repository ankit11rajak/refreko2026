import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cpanelApi } from '../../lib/cpanelApi'
import './SystemSettings.css'

const LOCAL_GATE_PASS_VISIBILITY_KEY = 'system_settings_gate_pass_visibility_enabled'
const LOCAL_PAYMENT_ACCEPTANCE_KEY = 'system_settings_payment_acceptance_enabled'

const DEFAULT_SETTINGS = {
  payment_acceptance_enabled: {
    value: true,
    type: 'boolean',
    description: 'Enable or disable student payment submissions and Make Payment access'
  },
  gate_pass_visibility_enabled: {
    value: false,
    type: 'boolean',
    description: 'When enabled, all gate passes are visible on student dashboard regardless of payment status'
  },
  label_generation_enabled: {
    value: true,
    type: 'boolean',
    description: 'Enable or disable automatic label generation for gate entries'
  },
  gate_scanner_auto_grant_enabled: {
    value: true,
    type: 'boolean',
    description: 'When enabled, scanned students are auto-granted entry if valid'
  },
  allow_manual_student_code_entry: {
    value: true,
    type: 'boolean',
    description: 'Allow volunteers to grant entry by manually entering student code'
  },
  gate_entry_duplicate_check_enabled: {
    value: true,
    type: 'boolean',
    description: 'Prevent duplicate entry for the same student on the same day'
  },
  gate_pass_unpaid_terms_required_enabled: {
    value: true,
    type: 'boolean',
    description: 'Require unpaid students to accept terms before they can use gate pass when visibility override is enabled'
  },
  max_gate_entries_export_limit: {
    value: 50000,
    type: 'integer',
    description: 'Maximum records allowed in gate entry exports'
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

const persistPaymentAcceptance = (settingKey, value) => {
  if (settingKey !== 'payment_acceptance_enabled') return
  localStorage.setItem(LOCAL_PAYMENT_ACCEPTANCE_KEY, value ? '1' : '0')
}

const SystemSettings = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [settings, setSettings] = useState({})
  const [formData, setFormData] = useState({})
  const [isReadOnlyFallback, setIsReadOnlyFallback] = useState(false)
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false)
  const [deletingGalleryName, setDeletingGalleryName] = useState('')

  useEffect(() => {
    loadSettings()
    loadGalleryImages()
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
        const paymentAcceptanceRaw = response.settings?.payment_acceptance_enabled?.value
        if (typeof paymentAcceptanceRaw !== 'undefined') {
          persistPaymentAcceptance('payment_acceptance_enabled', Boolean(paymentAcceptanceRaw))
        }
      } else {
        setIsReadOnlyFallback(true)
        const localGatePassVisibility = localStorage.getItem(LOCAL_GATE_PASS_VISIBILITY_KEY) === '1'
        const localPaymentAcceptanceRaw = localStorage.getItem(LOCAL_PAYMENT_ACCEPTANCE_KEY)
        const localPaymentAcceptance = localPaymentAcceptanceRaw === null ? true : localPaymentAcceptanceRaw === '1'
        const fallbackSettings = {
          ...DEFAULT_SETTINGS,
          payment_acceptance_enabled: {
            ...DEFAULT_SETTINGS.payment_acceptance_enabled,
            value: localPaymentAcceptance
          },
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
      const localPaymentAcceptanceRaw = localStorage.getItem(LOCAL_PAYMENT_ACCEPTANCE_KEY)
      const localPaymentAcceptance = localPaymentAcceptanceRaw === null ? true : localPaymentAcceptanceRaw === '1'
      const fallbackSettings = {
        ...DEFAULT_SETTINGS,
        payment_acceptance_enabled: {
          ...DEFAULT_SETTINGS.payment_acceptance_enabled,
          value: localPaymentAcceptance
        },
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
      persistPaymentAcceptance(settingKey, nextValue)
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
        persistPaymentAcceptance(settingKey, newValue)
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

  const loadGalleryImages = async () => {
    setGalleryLoading(true)
    setGalleryError('')

    try {
      const response = await cpanelApi.listGalleryImages()
      if (response?.success) {
        setGalleryImages(Array.isArray(response.files) ? response.files : [])
      } else {
        setGalleryError(response?.message || 'Unable to load gallery images')
      }
    } catch (err) {
      setGalleryError(err?.message || 'Unable to load gallery images')
    } finally {
      setGalleryLoading(false)
    }
  }

  const handleUploadGalleryImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setUploadingGalleryImage(true)
    setGalleryError('')
    try {
      const response = await cpanelApi.uploadGalleryImage(file)
      if (response?.success) {
        setSuccessMessage('Gallery image uploaded successfully')
        await loadGalleryImages()
      } else {
        setGalleryError(response?.message || 'Unable to upload gallery image')
      }
    } catch (err) {
      setGalleryError(err?.message || 'Unable to upload gallery image')
    } finally {
      setUploadingGalleryImage(false)
    }
  }

  const handleDeleteGalleryImage = async (imageName) => {
    const confirmed = window.confirm(`Delete gallery image "${imageName}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingGalleryName(imageName)
    setGalleryError('')
    try {
      const response = await cpanelApi.deleteGalleryImage(imageName)
      if (response?.success) {
        setSuccessMessage('Gallery image deleted successfully')
        await loadGalleryImages()
      } else {
        setGalleryError(response?.message || 'Unable to delete gallery image')
      }
    } catch (err) {
      setGalleryError(err?.message || 'Unable to delete gallery image')
    } finally {
      setDeletingGalleryName('')
    }
  }

  const handleValueChange = (settingKey, rawValue) => {
    setFormData((prev) => ({ ...prev, [settingKey]: rawValue }))
  }

  const handleSaveValue = async (settingKey) => {
    const settingMeta = settings[settingKey]
    if (!settingMeta || settingMeta.type === 'boolean') {
      return
    }

    const nextValue = String(formData[settingKey] ?? '').trim()
    if (nextValue === '') {
      setError('Value cannot be empty')
      return
    }

    try {
      setError('')
      setSuccessMessage('')
      const response = await cpanelApi.updateSystemSetting(settingKey, nextValue)
      if (response?.success) {
        setSuccessMessage('Setting updated successfully')
      } else {
        setError(response?.message || 'Failed to update setting')
      }
    } catch (err) {
      setError(err?.message || 'Failed to update setting')
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

            {setting.type !== 'boolean' && (
              <div className="setting-input-row">
                <input
                  type={setting.type === 'integer' ? 'number' : 'text'}
                  value={formData[key] ?? ''}
                  onChange={(e) => handleValueChange(key, e.target.value)}
                  className="setting-value-input"
                />
                <button
                  type="button"
                  className="setting-save-btn"
                  onClick={() => handleSaveValue(key)}
                >
                  Save
                </button>
              </div>
            )}

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

      <div className="gallery-manager-card">
        <div className="gallery-manager-header">
          <div>
            <h3>Gallery Images Manager</h3>
            <p>Upload, review, and remove images shown in the public gallery.</p>
          </div>
          <div className="gallery-manager-actions">
            <label className={`gallery-upload-btn ${uploadingGalleryImage ? 'is-disabled' : ''}`}>
              {uploadingGalleryImage ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUploadGalleryImage}
                disabled={uploadingGalleryImage}
              />
            </label>
            <button
              type="button"
              className="gallery-refresh-btn"
              onClick={loadGalleryImages}
              disabled={galleryLoading || uploadingGalleryImage}
            >
              {galleryLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {galleryError ? <div className="alert alert-error">{galleryError}</div> : null}

        <div className="gallery-table-wrap">
          {galleryLoading && galleryImages.length === 0 ? (
            <div className="gallery-empty">Loading gallery images...</div>
          ) : galleryImages.length === 0 ? (
            <div className="gallery-empty">No gallery images found.</div>
          ) : (
            <table className="gallery-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {galleryImages.map((file) => (
                  <tr key={file.name}>
                    <td>
                      <img className="gallery-thumb" src={file.public_url} alt={file.name} />
                    </td>
                    <td>{file.name}</td>
                    <td>{file.size_label || '-'}</td>
                    <td>{file.modified_at ? new Date(file.modified_at).toLocaleString() : '-'}</td>
                    <td className="gallery-actions-cell">
                      <a className="gallery-open-link" href={file.public_url} target="_blank" rel="noreferrer">Open</a>
                      <button
                        type="button"
                        className="gallery-delete-btn"
                        onClick={() => handleDeleteGalleryImage(file.name)}
                        disabled={deletingGalleryName === file.name}
                      >
                        {deletingGalleryName === file.name ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
