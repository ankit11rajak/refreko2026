import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      // Enable request timeout
      global: {
        fetch: (url, options) => {
          // Create abort controller for timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

          return fetch(url, {
            ...options,
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId))
        }
      },
      // Retry configuration
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null

export default supabase
