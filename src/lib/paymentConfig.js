const STORAGE_KEY = 'paymentGatewayConfig'

export const DEFAULT_PAYMENT_CONFIG = {
  activeOptionId: 'amount-500',
  options: [
    {
      id: 'amount-500',
      amount: 500,
      upiId: 'refresko500@upi',
      payeeName: 'Refresko 2026',
      note: 'Refresko Registration ₹500',
      includeFood: false
    },
    {
      id: 'amount-600',
      amount: 600,
      upiId: 'refresko600@upi',
      payeeName: 'Refresko 2026',
      note: 'Refresko Registration ₹600',
      includeFood: true
    },
    {
      id: 'amount-700',
      amount: 700,
      upiId: 'refresko700@upi',
      payeeName: 'Refresko 2026',
      note: 'Refresko Registration ₹700',
      includeFood: true
    }
  ]
}

const sanitizeOption = (option) => {
  const amountNumber = Number(option?.amount)
  const sanitizedAmount = Number.isFinite(amountNumber) && amountNumber > 0
    ? Math.round(amountNumber)
    : 600
  const includeFoodToggle = typeof option?.includeFood === 'boolean' ? option.includeFood : sanitizedAmount >= 600
  const includeFood = sanitizedAmount === 600 ? true : includeFoodToggle

  return {
    id: String(option?.id || `amount-${sanitizedAmount}`),
    amount: sanitizedAmount,
    upiId: String(option?.upiId || `refresko${sanitizedAmount}@upi`).trim(),
    payeeName: String(option?.payeeName || 'Refresko 2026').trim(),
    note: String(option?.note || `Refresko Registration ₹${sanitizedAmount}`).trim(),
    includeFood
  }
}

const sanitizeConfig = (config) => {
  const optionList = Array.isArray(config?.options) && config.options.length > 0
    ? config.options.map(sanitizeOption)
    : DEFAULT_PAYMENT_CONFIG.options.map(sanitizeOption)

  const activeOptionId = String(config?.activeOptionId || DEFAULT_PAYMENT_CONFIG.activeOptionId)
  const hasActive = optionList.some((option) => option.id === activeOptionId)

  return {
    activeOptionId: hasActive ? activeOptionId : optionList[0].id,
    options: optionList
  }
}

export const loadPaymentConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return sanitizeConfig(DEFAULT_PAYMENT_CONFIG)
    }

    const parsed = JSON.parse(raw)
    return sanitizeConfig(parsed)
  } catch {
    return sanitizeConfig(DEFAULT_PAYMENT_CONFIG)
  }
}

// Load payment config with database sync for cross-device support
export const loadPaymentConfigWithSync = async () => {
  // Try to import dynamically to avoid circular dependency
  try {
    const { loadPaymentConfigWithApi } = await import('./paymentConfigApi')
    return await loadPaymentConfigWithApi()
  } catch (error) {
    console.warn('Failed to load config from API, using localStorage:', error)
    return loadPaymentConfig()
  }
}

export const savePaymentConfig = (config) => {
  const sanitized = sanitizeConfig(config)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized))
  window.dispatchEvent(new Event('paymentConfigUpdated'))
  return sanitized
}

export const getActivePaymentOption = (config) => {
  const safeConfig = sanitizeConfig(config)
  return safeConfig.options.find((option) => option.id === safeConfig.activeOptionId) || safeConfig.options[0]
}

export const getUpiPayload = (option) => {
  const safeOption = sanitizeOption(option)
  const upiId = encodeURIComponent(safeOption.upiId)
  const payee = encodeURIComponent(safeOption.payeeName)
  const amount = encodeURIComponent(safeOption.amount)
  const note = encodeURIComponent(safeOption.note)

  return `upi://pay?pa=${upiId}&pn=${payee}&am=${amount}&cu=INR&tn=${note}`
}
