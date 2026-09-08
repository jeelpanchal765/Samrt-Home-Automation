import React, { useState } from 'react'

export default function TVRemoteModal({ device, onCommand, onClose }) {
  const [loading, setLoading] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)

  if (!device) return null

  const s = device.state || {}
  const power = s.power
  const volume = s.volume || 18
  const muted = s.muted || false
  const channel = s.channel || 1
  const currentInput = s.input || 'HDMI 1'

  const inputs = ['HDMI 1', 'HDMI 2', 'Netflix', 'YouTube', 'Prime Video', 'Live TV']

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18)
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

  function handleSendText(e) {
    e.preventDefault()
    if (!textInput.trim()) return
    handleAction('typeText', { text: textInput.trim() })
    setTextInput('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="remote-sheet tv-remote-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="remote-header">
          <div className="remote-title-group">
            <span className="remote-type-tag">TV REMOTE</span>
            <h3>{device.name}</h3>
            <span className="remote-sub">{device.room} • {device.brand || 'Smart TV'}</span>
          </div>
          <button className="icon-btn close-btn" onClick={onClose}>×</button>
        </div>

        {/* Top Control Bar: Power, Input, Mute */}
        <div className="tv-top-row">
          <button
            className={`tv-power-btn ${power ? 'on' : 'off'}`}
            disabled={loading}
            onClick={() => handleAction('togglePower')}
            title="Power"
          >
            ⏻
          </button>

          <div className="tv-source-selector">
            <select
              value={currentInput}
              disabled={!power || loading}
              onChange={(e) => handleAction('setInput', { input: e.target.value })}
            >
              {inputs.map((inp) => (
                <option key={inp} value={inp}>{inp}</option>
              ))}
            </select>
          </div>

          <button
            className={`tv-round-btn ${muted ? 'active-mute' : ''}`}
            disabled={!power || loading}
            onClick={() => handleAction('mute')}
            title="Mute"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Status Screen Strip */}
        <div className="tv-status-strip">
          <div className="tv-status-item">
            <span className="tv-status-label">INPUT</span>
            <span className="tv-status-val">{currentInput}</span>
          </div>
          <div className="tv-status-item">
            <span className="tv-status-label">VOLUME</span>
            <span className="tv-status-val">{muted ? 'MUTED' : volume}</span>
          </div>
          <div className="tv-status-item">
            <span className="tv-status-label">CH</span>
            <span className="tv-status-val">{channel}</span>
          </div>
        </div>

        {/* Tactile D-PAD */}
        <div className="dpad-container">
          <div className="dpad-circle">
            <button
              className="dpad-btn dpad-up"
              disabled={!power || loading}
              onClick={() => handleAction('navigate', { direction: 'up' })}
              aria-label="Up"
            >
              ▲
            </button>
            <button
              className="dpad-btn dpad-left"
              disabled={!power || loading}
              onClick={() => handleAction('navigate', { direction: 'left' })}
              aria-label="Left"
            >
              ◀
            </button>
            <button
              className="dpad-btn dpad-ok"
              disabled={!power || loading}
              onClick={() => handleAction('select')}
              aria-label="OK"
            >
              OK
            </button>
            <button
              className="dpad-btn dpad-right"
              disabled={!power || loading}
              onClick={() => handleAction('navigate', { direction: 'right' })}
              aria-label="Right"
            >
              ▶
            </button>
            <button
              className="dpad-btn dpad-down"
              disabled={!power || loading}
              onClick={() => handleAction('navigate', { direction: 'down' })}
              aria-label="Down"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Navigation Action Buttons: Back, Home, Menu */}
        <div className="tv-nav-actions">
          <button
            className="tv-action-btn"
            disabled={!power || loading}
            onClick={() => handleAction('back')}
          >
            ↩ Back
          </button>
          <button
            className="tv-action-btn"
            disabled={!power || loading}
            onClick={() => handleAction('home')}
          >
            🏠 Home
          </button>
          <button
            className="tv-action-btn"
            disabled={!power || loading}
            onClick={() => setShowKeypad(!showKeypad)}
          >
            🔢 123
          </button>
        </div>

        {/* Volume & Channel Rockers */}
        <div className="rockers-row">
          <div className="rocker-group">
            <span className="rocker-title">VOL</span>
            <div className="rocker-bar">
              <button
                className="rocker-btn"
                disabled={!power || loading}
                onClick={() => handleAction('volumeUp')}
              >
                +
              </button>
              <div className="rocker-divider" />
              <button
                className="rocker-btn"
                disabled={!power || loading}
                onClick={() => handleAction('volumeDown')}
              >
                −
              </button>
            </div>
          </div>

          <div className="rocker-group">
            <span className="rocker-title">CH</span>
            <div className="rocker-bar">
              <button
                className="rocker-btn"
                disabled={!power || loading}
                onClick={() => handleAction('channelUp')}
              >
                ▲
              </button>
              <div className="rocker-divider" />
              <button
                className="rocker-btn"
                disabled={!power || loading}
                onClick={() => handleAction('channelDown')}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* Numeric Keypad if toggled */}
        {showKeypad && (
          <div className="numeric-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Prev', 0, 'Enter'].map((k) => (
              <button
                key={k}
                className="num-key"
                disabled={!power || loading}
                onClick={() => {
                  if (typeof k === 'number') {
                    handleAction('setChannel', { channel: k })
                  } else if (k === 'Enter') {
                    handleAction('select')
                  }
                }}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Media Controls */}
        <div className="media-controls-row">
          <button
            className="media-btn"
            disabled={!power || loading}
            onClick={() => handleAction('sendKey', { key: 'rewind' })}
          >
            ⏪
          </button>
          <button
            className="media-btn play-pause"
            disabled={!power || loading}
            onClick={() => handleAction('playPause')}
          >
            {s.playing ? '⏸' : '▶'}
          </button>
          <button
            className="media-btn"
            disabled={!power || loading}
            onClick={() => handleAction('sendKey', { key: 'fast_forward' })}
          >
            ⏩
          </button>
        </div>

        {/* TV Text / Search Input */}
        <form className="tv-type-form" onSubmit={handleSendText}>
          <input
            type="text"
            placeholder="Type text / search into TV..."
            value={textInput}
            disabled={!power || loading}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button type="submit" disabled={!power || !textInput.trim() || loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
