import React, { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { checkHealth } from '../api'

export default function LoginPage({ onLogin, error, setError }) {
  const [googleReady, setGoogleReady] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    checkHealth()
      .then((h) => setGoogleReady(h.google_configured && !!clientId))
      .catch(() => setGoogleReady(false))
  }, [clientId])

  async function handleSuccess(response) {
    setError(null)
    try {
      await onLogin(response.credential)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🏠</div>
          <h1>Domi Home</h1>
          <p>Control your entire smart home from your phone</p>
        </div>

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">💡</span>
            <span>Lights, AC, TV & more</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📱</span>
            <span>Control from anywhere</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Secure Google sign-in</span>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}

        {googleReady ? (
          <div className="google-btn-wrap">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
              width="280"
            />
          </div>
        ) : (
          <div className="alert setup">
            <b>Google login setup required</b>
            <ol>
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a></li>
              <li>Create an OAuth 2.0 Web Client ID</li>
              <li>Add <code>http://localhost:5173</code> to Authorized JavaScript origins</li>
              <li>Copy Client ID to <code>frontend/.env</code> and <code>backend/.env</code></li>
              <li>Restart both servers</li>
            </ol>
          </div>
        )}

        <p className="login-foot">Lights · AC · Fans · Locks · Plugs · Curtains</p>
      </div>
    </div>
  )
}
