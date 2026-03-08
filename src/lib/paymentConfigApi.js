import { DEFAULT_PAYMENT_CONFIG, loadPaymentConfig, savePaymentConfig } from './paymentConfig'
import { cpanelApi } from './cpanelApi'

const sanitizeFromFallback = (config) => {
  if (!config || !Array.isArray(config.options) || config.options.length === 0) {
    return DEFAULT_PAYMENT_CONFIG
  }

  return {
    activeOptionId: config.activeOptionId || config.options[0].id,
    options: config.options.map((option) => {
      const amount = Number(option.amount) || 600
      return {
        id: String(option.id || `amount-${amount}`),
        amount,
        upiId: String(option.upiId || `refresko${amount}@upi`),
        payeeName: String(option.payeeName || 'Refresko 2026'),
        note: String(option.note || `Refresko Registration ₹${amount}`),
        includeFood: amount === 600 ? true : Boolean(option.includeFood)
      }
    })
  }
}

export const loadPaymentConfigWithApi = async () => {
  if (cpanelApi.isConfigured()) {
    try {
      const remote = await cpanelApi.getActiveConfig()
      const normalized = sanitizeFromFallback(remote)
      savePaymentConfig(normalized)
      return normalized
    } catch {
      return sanitizeFromFallback(loadPaymentConfig())
    }
  }

  return sanitizeFromFallback(loadPaymentConfig())
}

export const savePaymentConfigWithApi = async (config) => {
  const localSaved = savePaymentConfig(config)

  if (cpanelApi.isConfigured()) {
    try {
      await cpanelApi.setPaymentConfig(localSaved)
      const refreshed = await cpanelApi.getActiveConfig()
      const normalized = sanitizeFromFallback(refreshed)
      savePaymentConfig(normalized)
      return normalized
    } catch {
      return localSaved
    }
  }

  return localSaved
}
