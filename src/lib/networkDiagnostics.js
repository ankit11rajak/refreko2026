/**
 * Network Diagnostics Utility
 * Helps identify network connectivity and configuration issues
 */

/**
 * Test basic internet connectivity
 * @returns {Promise<boolean>} True if connected to internet
 */
export async function testInternetConnection() {
  try {
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store'
    })
    return true
  } catch {
    return false
  }
}

/**
 * Test API endpoint connectivity
 * @param {string} url - API endpoint URL to test
 * @returns {Promise<object>} Status and latency information
 */
export async function testApiConnectivity(url) {
  if (!url) {
    return { success: false, error: 'URL not provided', latency: null }
  }

  try {
    const startTime = performance.now()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors'
    }).finally(() => clearTimeout(timeoutId))

    const latency = Math.round(performance.now() - startTime)

    return {
      success: response.ok,
      status: response.status,
      latency,
      error: response.ok ? null : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      success: false,
      error: error.name === 'AbortError' 
        ? 'Request timeout - connection too slow or server unreachable'
        : error.message,
      latency: null
    }
  }
}

/**
 * Test Supabase connectivity
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<object>} Connection status
 */
export async function testSupabaseConnectivity(supabase) {
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured' }
  }

  try {
    const startTime = performance.now()
    
    // Simple health check by querying auth endpoint
    const { data, error } = await supabase.auth.getSession()
    
    const latency = Math.round(performance.now() - startTime)

    return {
      success: !error,
      latency,
      error: error?.message || null
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      latency: null
    }
  }
}

/**
 * Comprehensive network diagnosis
 * @param {string} apiUrl - API endpoint URL
 * @param {object} supabase - Supabase client instance
 * @returns {Promise<object>} Complete diagnostic report
 */
export async function runNetworkDiagnostics(apiUrl, supabase) {
  const results = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    tests: {}
  }

  // Test internet connection
  results.tests.internet = await testInternetConnection()

  // Test API connectivity
  if (apiUrl) {
    results.tests.api = await testApiConnectivity(apiUrl)
  }

  // Test Supabase connectivity
  if (supabase) {
    results.tests.supabase = await testSupabaseConnectivity(supabase)
  }

  // Determine overall status
  results.allGood = 
    results.tests.internet &&
    (!apiUrl || results.tests.api?.success) &&
    (!supabase || results.tests.supabase?.success)

  return results
}

/**
 * Generate user-friendly diagnostic message
 * @param {object} diagnosticResults - Results from runNetworkDiagnostics
 * @returns {string} User-friendly message
 */
export function generateDiagnosticMessage(diagnosticResults) {
  const { online, tests, allGood } = diagnosticResults

  if (!online) {
    return '❌ You are offline. Please check your internet connection.'
  }

  if (allGood) {
    return '✓ All connections working properly.'
  }

  const issues = []

  if (tests.internet === false) {
    issues.push('No internet connection detected')
  }

  if (tests.api?.success === false) {
    issues.push(
      `API unreachable (${tests.api.error}). ` +
      'Your network may be blocking this server. ' +
      'Try using a VPN or contact your network administrator.'
    )
  }

  if (tests.supabase?.success === false) {
    issues.push(
      `Database connection failed (${tests.supabase.error}). ` +
      'Your network may be blocking this server. ' +
      'Try using a VPN.'
    )
  }

  return issues.length > 0
    ? '⚠️ ' + issues.join(' ')
    : '⚠️ Connection issue detected. Please check your internet.'
}

/**
 * Check if device is likely behind a firewall/regional block
 * @returns {boolean} True if network seems restricted
 */
export function isNetworkRestricted() {
  // Check for common indicators of network restrictions
  const indicators = [
    // Private IP ranges
    /^(10\.|127\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.|192\.168\.)/,
    // Localhost
    /localhost|127\.0\.0\.1/
  ]

  if (typeof window !== 'undefined') {
    // Check WebRTC for private IPs
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      return new Promise((resolve) => {
        pc.createDataChannel('')
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(() => resolve(false))
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate) {
            resolve(false)
            pc.close()
            return
          }

          const candidate = ice.candidate.candidate
          for (const indicator of indicators) {
            if (indicator.test(candidate)) {
              resolve(true)
              pc.close()
              return
            }
          }
        }

        // Timeout after 1 second
        setTimeout(() => {
          resolve(false)
          pc.close()
        }, 1000)
      })
    } catch {
      return false
    }
  }

  return false
}

export default {
  testInternetConnection,
  testApiConnectivity,
  testSupabaseConnectivity,
  runNetworkDiagnostics,
  generateDiagnosticMessage,
  isNetworkRestricted
}
