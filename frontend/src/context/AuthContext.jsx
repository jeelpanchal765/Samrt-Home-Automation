import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchMe, loginDemo, loginWithGoogle } from '../api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'domi_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function login(credential) {
    const data = await loginWithGoogle(credential)
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function loginWithDemo() {
    const data = await loginDemo()
    localStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
