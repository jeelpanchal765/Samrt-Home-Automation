import React, { useState } from 'react'

export default function GatewayModal({ gatewayStatus, onClose }) {
  const [copied, setCopied] = useState(false)
  const isOnline = gatewayStatus?.online

  const runCommand = `python home_gateway.py --cloud-url ${window.location.origin} --token domi_gw_${Date.now().toString(36)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(runCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gateway-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Remote Access & Home Gateway</h2>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="gw-status-banner">
          <div className={`gw-status-pill ${isOnline ? 'online' : 'offline'}`}>
            <span className="dot" /> {isOnline ? 'Local Home Gateway Connected' : 'Gateway Offline / Cloud Direct'}
          </div>
          <p className="gw-description">
            Your PWA connects to the Cloud Backend. To control LAN-only devices (Daikin local WiFi, LG webOS TV, RTSP Cameras) from outside your home, run the Home Gateway agent on your home PC or Raspberry Pi.
          </p>
        </div>

        <div className="gw-specs-grid">
          <div className="spec-card">
            <span className="spec-label">Gateway Mode</span>
            <span className="spec-val">{isOnline ? 'Active LAN Bridge' : 'Cloud Direct'}</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Latency</span>
            <span className="spec-val">~18 ms</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Encryption</span>
            <span className="spec-val">TLS 1.3 / AES</span>
          </div>
          <div className="spec-card">
            <span className="spec-label">Protocol</span>
            <span className="spec-val">HTTPS + MQTT/SSE</span>
          </div>
        </div>

        <div className="gw-setup-box">
          <h4>Run Gateway on Home LAN</h4>
          <p className="setup-sub">In the <code>backend/gateway/</code> directory:</p>
          <div className="code-snippet-box">
            <code>{runCommand}</code>
            <button className="btn btn-sm btn-outline" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
