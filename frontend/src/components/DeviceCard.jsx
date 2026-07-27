import React from 'react'

const ICONS = {
  light: '💡',
  ac: '❄️',
  fan: '🌀',
  tv: '📺',
  plug: '🔌',
  lock: '🔒',
  curtain: '🪟',
}

function isOn(device) {
  const s = device.state
  if ('power' in s) return s.power
  if ('locked' in s) return !s.locked
  if ('open' in s) return s.open > 0
  return false
}

function statusText(device) {
  const s = device.state
  switch (device.type) {
    case 'light':
      return s.power ? `${s.brightness}%` : 'Off'
    case 'ac':
      return s.power ? `${s.temp}°C · ${s.mode}` : 'Off'
    case 'fan':
      return s.power ? `Speed ${s.speed}` : 'Off'
    case 'tv':
      return s.power ? `Vol ${s.volume}` : 'Off'
    case 'plug':
      return s.power ? 'On' : 'Off'
    case 'lock':
      return s.locked ? 'Locked' : 'Unlocked'
    case 'curtain':
      return s.open === 0 ? 'Closed' : `${s.open}% open`
    default:
      return ''
  }
}

export default function DeviceCard({ device, onToggle, onControl, onDelete }) {
  const active = isOn(device)

  return (
    <div className={`device-card ${active ? 'active' : ''}`}>
      <div className="device-top">
        <div className="device-icon">{ICONS[device.type] || '📦'}</div>
        <button className="icon-btn delete" onClick={() => onDelete(device.id)} title="Remove">×</button>
      </div>
      <div className="device-name">{device.name}</div>
      <div className="device-room">{device.room}</div>
      <div className="device-status">{statusText(device)}</div>

      <div className="device-actions">
        <button
          className={`toggle-btn ${active ? 'on' : ''}`}
          onClick={() => onToggle(device.id)}
        >
          {device.type === 'lock'
            ? (device.state.locked ? 'Unlock' : 'Lock')
            : (active ? 'Turn Off' : 'Turn On')}
        </button>

        {device.type === 'light' && device.state.power && (
          <input
            type="range"
            min="10"
            max="100"
            value={device.state.brightness}
            onChange={(e) => onControl(device.id, { brightness: Number(e.target.value) })}
            className="slider"
          />
        )}

        {device.type === 'ac' && device.state.power && (
          <div className="ac-controls">
            <button onClick={() => onControl(device.id, { temp: Math.max(16, device.state.temp - 1) })}>−</button>
            <span>{device.state.temp}°C</span>
            <button onClick={() => onControl(device.id, { temp: Math.min(30, device.state.temp + 1) })}>+</button>
          </div>
        )}

        {device.type === 'fan' && device.state.power && (
          <div className="fan-controls">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                className={device.state.speed === s ? 'active' : ''}
                onClick={() => onControl(device.id, { speed: s })}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {device.type === 'curtain' && (
          <input
            type="range"
            min="0"
            max="100"
            value={device.state.open}
            onChange={(e) => onControl(device.id, { open: Number(e.target.value) })}
            className="slider"
          />
        )}
      </div>
    </div>
  )
}
