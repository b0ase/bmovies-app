'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  handle: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    handle: null,
  })

  useEffect(() => {
    // Check client-readable cookie first (fast)
    const handle = document.cookie
      .split('; ')
      .find(row => row.startsWith('npgx_user_handle='))
      ?.split('=')[1]

    if (handle) {
      setState({ isAuthenticated: true, isLoading: false, handle })
    } else {
      // Verify with server
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
          setState({
            isAuthenticated: data.authenticated,
            isLoading: false,
            handle: data.handle || null,
          })
        })
        .catch(() => {
          setState({ isAuthenticated: false, isLoading: false, handle: null })
        })
    }
  }, [])

  const login = useCallback((returnTo?: string) => {
    const params = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
    window.location.href = `/api/auth/handcash${params}`
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setState({ isAuthenticated: false, isLoading: false, handle: null })
    window.location.reload()
  }, [])

  return { ...state, login, logout }
}
