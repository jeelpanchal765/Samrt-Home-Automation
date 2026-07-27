import React, { useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import './App.css'

function AppContent() {
  const { user, loading, login } = useAuth()
  const [error, setError] = useState(null)

  if (loading) {
    return <div className="app-shell"><p className="loading">Loading…</p></div>
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={login}
        error={error}
        setError={setError}
      />
    )
  }

  return <Dashboard />
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <div className="app-shell">
          <AppContent />
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
