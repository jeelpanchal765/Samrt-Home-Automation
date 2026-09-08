import React from 'react'

const ICONS = {
  light: '💡',
  ac: '❄️',
  fan: '🌀',
  tv: '📺',
  camera: '📹',
  plug: '🔌',
  lock: '🔒',
  curtain: '🪟',
}

function isOn(device) {
  const s = device.state || {}
  if ('power' in s) return s.power
  if ('locked' in s) return !s.locked
  if ('open' in s) return s.open > 0
  if (device.type === 'camera') return s.online !== false
  return false
}

function statusText(device) {
  const s = device.state || {}
  switch (device.type) {
    case 'light':
      return s.power ? `${s.brightness || 80}% Brightness` : 'Turned Off'
    case 'ac':
      return s.power ? `${s.temp || 24}°C • ${s.mode?.toUpperCase() || 'COOL'}` : 'Standby'
    case 'fan':
      return s.power ? `Speed ${s.speed || 1}` : 'Stopped'
    case 'tv':
      return s.power ? `Vol ${s.volume || 18} • ${s.input || 'HDMI 1'}` : 'Power Off'
    case 'camera':
      return s.recording ? '● Recording (1080p)' : 'Live Monitoring'
    case 'plug':
      return s.power ? 'Active' : 'Off'
    case 'lock':
      return s.locked ? 'Locked Secure' : 'Unlocked'
    case 'curtain':
      return s.open === 0 ? 'Closed' : `${s.open}% Open`
    default:
      return ''
  }
}

export default function DeviceCard({ device, onToggle, onControl, onDelete, onOpenRemote }) {
  const active = isOn(device)
  const isAc = device.type === 'ac'
  const isTv = device.type === 'tv'
  const isCam = device.type === 'camera'

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15)
    }
  }

  const handleToggleClick = (e) => {
    e.stopPropagation()
    triggerHaptic()
    onToggle(device.id)
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    onDelete(device.id)
  }

  return (
    <div
      className={`device-card ${active ? 'active' : 'inactive'} ${isAc ? 'card-ac' : ''} ${isTv ? 'card-tv' : ''} ${isCam ? 'card-camera' : ''}`}
      onClick={() => {
        if (isAc || isTv || isCam) {
          onOpenRemote(device)
        }
      }}
    >
      <div className="device-top">
        <div className="device-icon-wrap">
          <span className="device-icon">{ICONS[device.type] || '📦'}</span>
          {device.brand && <span className="device-brand-tag">{device.brand}</span>}
        </div>
        <button className="icon-btn delete-btn" onClick={handleDeleteClick} title="Remove device">
          ×
        </button>
      </div>

      <div className="device-meta">
        <div className="device-name">{device.name}</div>
        <div className="device-room">{device.room}</div>
        <div className="device-status">{statusText(device)}</div>
      </div>

      <div className="device-actions" onClick={(e) => e.stopPropagation()}>
        {/* Quick Power Toggle */}
        {!isCam && (
          <button
            className={`toggle-btn ${active ? 'on' : 'off'}`}
            onClick={handleToggleClick}
          >
            {device.type === 'lock'
              ? (device.state?.locked ? 'Unlock' : 'Lock')
              : (active ? 'Turn Off' : 'Turn On')}
          </button>
        )}

        {/* Dedicated Remote Launchers */}
        {isAc && (
          <button className="btn-remote-open ac" onClick={() => onOpenRemote(device)}>
            🎮 Full AC Remote
          </button>
        )}

        {isTv && (
          <button className="btn-remote-open tv" onClick={() => onOpenRemote(device)}>
            🎮 TV Remote Control
          </button>
        )}

        {isCam && (
          <button className="btn-remote-open camera" onClick={() => onOpenRemote(device)}>
            📹 View Live Stream
          </button>
        )}

        {/* Light Slider */}
        {device.type === 'light' && active && (
          <div className="slider-group">
            <span className="slider-label">💡 {device.state?.brightness || 80}%</span>
            <input
              type="range"
              min="10"
              max="100"
              value={device.state?.brightness || 80}
              onChange={(e) => onControl(device.id, { brightness: Number(e.target.value) })}
              className="slider"
            />
          </div>
        )}

        {/* Fan Controls */}
        {device.type === 'fan' && active && (
          <div className="fan-quick-speeds">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                className={`fan-quick-btn ${device.state?.speed === s ? 'active' : ''}`}
                onClick={() => onControl(device.id, { speed: s })}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
