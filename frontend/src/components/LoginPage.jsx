import React, { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { checkHealth, loginDemo } from '../api'

export default function LoginPage({ onLogin, onDemoLogin, error, setError }) {
  const [googleReady, setGoogleReady] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    checkHealth()
      .then((h) => setGoogleReady(h.google_configured && !!clientId))
      .catch(() => setGoogleReady(false))
  }, [clientId])

  async function handleGoogleSuccess(response) {
    setError(null)
    try {
      await onLogin(response.credential)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDemo() {
    setError(null)
    setLoadingDemo(true)
    try {
      await onDemoLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/icons/icon-192.svg" alt="Domi Home" className="login-app-icon" />
          <h1>DOMI HOME</h1>
          <p className="login-tagline">Mobile-First Smart Home Remote & Control Panel</p>
        </div>

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">❄️</span>
            <span>Real AC Climate & Temp Dial</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📺</span>
            <span>Tactile TV Remote & D-Pad</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📹</span>
            <span>Secure HD Camera Streams</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Smart Automation Triggers</span>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="login-auth-box">
          {googleReady ? (
            <div className="google-btn-wrap">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in was cancelled or failed')}
                theme="filled_blue"
                size="large"
                text="signin_with"
                shape="pill"
                width="300"
              />
            </div>
          ) : (
            <div className="oauth-notice">
              <span>Google Cloud OAuth not configured</span>
            </div>
          )}

          <div className="login-divider">
            <span>OR INSTANT ACCESS</span>
          </div>

          <button
            className="btn btn-primary btn-demo-access"
            onClick={handleDemo}
            disabled={loadingDemo}
          >
            {loadingDemo ? 'Signing In...' : '🚀 Enter Smart Home Dashboard'}
          </button>
        </div>

        {!googleReady && (
          <details className="setup-details">
            <summary>⚙️ How to configure Google Login</summary>
            <ol>
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a></li>
              <li>Create an OAuth 2.0 Web Client ID</li>
              <li>Add your domain / localhost to Authorized JavaScript origins</li>
              <li>Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code></li>
            </ol>
          </details>
        )}

        <div className="pwa-install-tip">
          <span>📱 Installable on Android & iOS as a Home Screen App</span>
        </div>
      </div>
    </div>
  )
}
