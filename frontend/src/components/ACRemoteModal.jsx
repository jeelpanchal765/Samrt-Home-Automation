import React, { useState } from 'react'

export default function ACRemoteModal({ device, onCommand, onClose }) {
  const [loading, setLoading] = useState(false)

  if (!device) return null

  const s = device.state || {}
  const power = s.power
  const temp = s.temp || 24
  const mode = s.mode || 'cool'
  const fan = s.fan !== undefined ? s.fan : 0
  const swing = s.swing || 'off'
  const currentTemp = s.currentTemp || 26.5
  const humidity = s.humidity || 52

  const modes = [
    { id: 'cool', label: 'Cool', icon: '❄️' },
    { id: 'heat', label: 'Heat', icon: '☀️' },
    { id: 'dry', label: 'Dry', icon: '💧' },
    { id: 'fan', label: 'Fan', icon: '🌀' },
    { id: 'auto', label: 'Auto', icon: '⚡' },
  ]

  const fanSpeeds = [
    { id: 0, label: 'AUTO' },
    { id: 1, label: 'LOW' },
    { id: 2, label: 'MED' },
    { id: 3, label: 'HIGH' },
    { id: 4, label: 'TURBO' },
  ]

  const swingModes = [
    { id: 'off', label: 'Fixed' },
    { id: 'vertical', label: '↕ Vert' },
    { id: 'horizontal', label: '↔ Horiz' },
    { id: '3d', label: '⤨ 3D' },
  ]

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20)
    }
  }

  async function handleAction(action, params = {}) {
    triggerHaptic()
    setLoading(true)
    try {
      await onCommand(device.id, action, params)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="remote-sheet ac-remote-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="remote-header">
          <div className="remote-title-group">
            <span className="remote-type-tag">AC REMOTE</span>
            <h3>{device.name}</h3>
            <span className="remote-sub">{device.room} • {device.brand || 'Daikin'}</span>
          </div>
          <button className="icon-btn close-btn" onClick={onClose}>×</button>
        </div>

        {/* Ambient Sensor Bar */}
        <div className="ambient-bar">
          <div className="ambient-item">
            <span className="ambient-label">Room Temp</span>
            <span className="ambient-val">{currentTemp}°C</span>
          </div>
          <div className="ambient-divider" />
          <div className="ambient-item">
            <span className="ambient-label">Humidity</span>
            <span className="ambient-val">{humidity}%</span>
          </div>
          <div className="ambient-divider" />
          <div className="ambient-item">
            <span className="ambient-label">Status</span>
            <span className={`ambient-val status-badge ${power ? 'on' : 'off'}`}>
              {power ? 'RUNNING' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Temperature Dial Section */}
        <div className={`temp-dial-card ${power ? 'powered' : 'off'}`}>
          <div className="temp-dial-inner">
            <div className="temp-target-label">TARGET TEMPERATURE</div>
            <div className="temp-display-large">
              <span className="temp-number">{temp}</span>
              <span className="temp-unit">°C</span>
            </div>
            <div className="temp-active-mode">
              {power ? `${mode.toUpperCase()} MODE` : 'AC POWER OFF'}
            </div>
          </div>

          <div className="temp-stepper-row">
            <button
              className="stepper-btn minus"
              disabled={!power || temp <= 16 || loading}
              onClick={() => handleAction('setTemperature', { temp: Math.max(16, temp - 1) })}
            >
              −
            </button>
            <span className="stepper-note">16°C – 30°C</span>
            <button
              className="stepper-btn plus"
              disabled={!power || temp >= 30 || loading}
              onClick={() => handleAction('setTemperature', { temp: Math.min(30, temp + 1) })}
            >
              +
            </button>
          </div>
        </div>

        {/* Main Power Button */}
        <div className="power-btn-wrap">
          <button
            className={`ac-power-toggle ${power ? 'is-on' : 'is-off'}`}
            disabled={loading}
            onClick={() => handleAction('togglePower')}
          >
            <span className="power-icon">⏻</span>
            <span>{power ? 'TURN OFF AC' : 'TURN ON AC'}</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="control-section">
          <label className="section-label">OPERATING MODE</label>
          <div className="modes-grid">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`mode-btn ${mode === m.id && power ? 'active' : ''}`}
                disabled={!power || loading}
                onClick={() => handleAction('setMode', { mode: m.id })}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="mode-name">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fan Speed */}
        <div className="control-section">
          <label className="section-label">FAN SPEED</label>
          <div className="fan-speed-bar">
            {fanSpeeds.map((f) => (
              <button
                key={f.id}
                className={`fan-btn ${fan === f.id && power ? 'active' : ''}`}
                disabled={!power || loading}
                onClick={() => handleAction('setFanSpeed', { fan: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Swing Mode */}
        <div className="control-section">
          <label className="section-label">LOUVER SWING</label>
          <div className="swing-grid">
            {swingModes.map((sw) => (
              <button
                key={sw.id}
                className={`swing-btn ${swing === sw.id && power ? 'active' : ''}`}
                disabled={!power || loading}
                onClick={() => handleAction('setSwing', { swing: sw.id })}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
