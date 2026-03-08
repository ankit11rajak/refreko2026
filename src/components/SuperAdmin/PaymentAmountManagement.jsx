import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import {
  getActivePaymentOption,
  getUpiPayload,
  loadPaymentConfig
} from '../../lib/paymentConfig'
import { loadPaymentConfigWithApi, savePaymentConfigWithApi } from '../../lib/paymentConfigApi'
import './PaymentAmountManagement.css'

const PaymentAmountManagement = () => {
  const [config, setConfig] = useState(() => loadPaymentConfig())
  const [draftOptions, setDraftOptions] = useState(() => loadPaymentConfig().options)
  const [activeOptionId, setActiveOptionId] = useState(() => loadPaymentConfig().activeOptionId)
  const [previewQrCodeUrl, setPreviewQrCodeUrl] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load config from database on mount (cross-device sync)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const dbConfig = await loadPaymentConfigWithApi()
        setConfig(dbConfig)
        setDraftOptions(dbConfig.options)
        setActiveOptionId(dbConfig.activeOptionId)
      } catch (error) {
        console.warn('Failed to load config from API:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    setDraftOptions(config.options)
    setActiveOptionId(config.activeOptionId)
  }, [config])


  const activeOption = useMemo(() => getActivePaymentOption({
    activeOptionId,
    options: draftOptions
  }), [activeOptionId, draftOptions])

  useEffect(() => {
    // Use uploaded QR code if available, otherwise use static QR
    const currentActiveOption = draftOptions.find(opt => opt.id === activeOptionId)
    if (currentActiveOption?.qrCodeUrl) {
      setPreviewQrCodeUrl(currentActiveOption.qrCodeUrl)
    } else {
      setPreviewQrCodeUrl('/image.png')
    }
  }, [activeOption, draftOptions, activeOptionId])

  const handleOptionChange = (optionId, field, value) => {
    setDraftOptions((previous) => previous.map((option) => {
      if (option.id !== optionId) {
        return option
      }

      if (field === 'amount') {
        const numericAmount = Math.max(0, Number(value) || 0)
        return {
          ...option,
          amount: numericAmount,
          note: `Refresko Registration ₹${numericAmount || 0}`,
          includeFood: numericAmount === 600 ? true : option.includeFood
        }
      }

      if (field === 'includeFood') {
        return {
          ...option,
          includeFood: Boolean(value)
        }
      }

      return {
        ...option,
        [field]: value
      }
    }))
  }

  const handleQrCodeUpload = (optionId, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const qrCodeDataUrl = e.target.result
      setDraftOptions((previous) => previous.map((option) => {
        if (option.id === optionId) {
          return { ...option, qrCodeUrl: qrCodeDataUrl }
        }
        return option
      }))
      
      // Update preview immediately if this is the active option
      if (optionId === activeOptionId) {
        setPreviewQrCodeUrl(qrCodeDataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSettings = async () => {
    const nextConfig = {
      activeOptionId,
      options: draftOptions
    }

    try {
      const saved = await savePaymentConfigWithApi(nextConfig)
      setConfig(saved)
      setSaveMessage('Payment settings saved. Student dashboard now uses this amount and QR.')
      window.setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage(`Save failed: ${error.message}`)
      window.setTimeout(() => setSaveMessage(''), 5000)
    }
  }

  return (
    <div className="payment-amount-management">
      <div className="section-header">
        <div className="header-content">
          <h2>Payment Amount Management</h2>
          <p>Control which amount and QR code students see in the payment gateway</p>
        </div>
      </div>

      <div className="payment-config-grid">
        <div className="amount-config-card">
          <h3>QR Options</h3>
          <p className="config-note">Select the active QR option and update amount/UPI if needed.</p>

          <div className="amount-options-list">
            {draftOptions.map((option) => (
              <motion.div
                key={option.id}
                className={`amount-option-item ${activeOptionId === option.id ? 'active' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <label className="option-select-row">
                  <input
                    type="radio"
                    name="activePaymentOption"
                    checked={activeOptionId === option.id}
                    onChange={() => setActiveOptionId(option.id)}
                  />
                  <span>Use this QR for students</span>
                </label>

                <div className="qr-upload-row">
                  <label className="qr-upload-label">
                    Upload QR Code Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleQrCodeUpload(option.id, event)}
                      className="qr-upload-input"
                    />
                  </label>
                  {option.qrCodeUrl && (
                    <div className="qr-thumbnail">
                      <img src={option.qrCodeUrl} alt="QR Preview" />
                    </div>
                  )}
                </div>

                <div className="option-inputs">
                  <label>
                    Amount (₹)
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={option.amount}
                      onChange={(event) => handleOptionChange(option.id, 'amount', event.target.value)}
                    />
                  </label>
                  <label>
                    UPI ID
                    <input
                      type="text"
                      value={option.upiId}
                      onChange={(event) => handleOptionChange(option.id, 'upiId', event.target.value)}
                      placeholder="example@upi"
                    />
                  </label>
                </div>

                <div className="food-toggle-row">
                  <span className="food-toggle-label">Include food</span>
                  <label className="food-toggle-control">
                    <input
                      type="checkbox"
                      checked={Boolean(option.includeFood)}
                      disabled={Number(option.amount) === 600}
                      onChange={(event) => handleOptionChange(option.id, 'includeFood', event.target.checked)}
                    />
                    <span>
                      {Number(option.amount) === 600
                        ? 'On (required for ₹600)'
                        : option.includeFood
                          ? 'On'
                          : 'Off'}
                    </span>
                  </label>
                </div>
              </motion.div>
            ))}
          </div>

          <button className="save-config-btn interactive" onClick={handleSaveSettings}>
            Save Payment Settings
          </button>

          {saveMessage && <p className="save-message">{saveMessage}</p>}
        </div>

        <div className="active-preview-card">
          <h3>Live Payment Preview</h3>
          <p className="config-note">Students will see this amount and QR in “Make Payment”.</p>

          <div className="active-preview-amount">₹{activeOption?.amount || 0}</div>
          <div className="active-preview-upi">{activeOption?.upiId || 'N/A'}</div>
          <div className="active-preview-food">
            Food: {activeOption?.includeFood ? 'Included' : 'Not Included'}
          </div>

          <div className="preview-qr-box">
            {previewQrCodeUrl ? (
              <img src={previewQrCodeUrl} alt="Selected payment QR" className="preview-qr-image" />
            ) : (
              <div className="preview-qr-empty">QR preview unavailable</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentAmountManagement
