import React, { useState } from 'react'

export default function AddDeviceModal({ rooms, types, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState(types[0] || 'ac')
  const [room, setRoom] = useState(rooms[0] || 'Living Room')
  const [brand, setBrand] = useState('Daikin')
  const [model, setModel] = useState('')
  const [connectionType, setConnectionType] = useState('simulator')
  const [ipAddress, setIpAddress] = useState('192.168.1.50')
  const [mqttTopic, setMqttTopic] = useState('')
  const [rtspUrl, setRtspUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const brandDefaults = {
    ac: ['Daikin', 'Mitsubishi', 'Panasonic', 'LG', 'Voltas', 'Sensibo', 'Gree', 'Generic'],
    tv: ['LG WebOS', 'Samsung Tizen', 'Sony Bravia', 'Android TV', 'TCL Roku', 'Generic'],
    camera: ['Domi Cam Pro', 'Hikvision', 'Dahua', 'TP-Link Tapo', 'Reolink', 'Wyze', 'Generic RTSP'],
    light: ['Philips Hue', 'Yeelight', 'Wiz', 'LIFX', 'Tuya Smart', 'Generic'],
    fan: ['Atomberg', 'Orient Smart', 'Havells', 'Generic'],
    plug: ['TP-Link Kasa', 'Sonoff', 'Wipro', 'Tuya', 'Generic'],
    lock: ['August', 'Yale Smart', 'Aqara', 'Generic'],
    curtain: ['Tuya Zigbee', 'Somfy', 'SwitchBot', 'Generic'],
  }

  const handleTypeChange = (newType) => {
    setType(newType)
    const availableBrands = brandDefaults[newType] || ['Generic']
    setBrand(availableBrands[0])
    if (newType === 'ac') {
      setName('Living Room AC')
      setModel('Inverter Series')
    } else if (newType === 'tv') {
      setName('Living Room TV')
      setModel('OLED 4K')
    } else if (newType === 'camera') {
      setName('Security Camera')
      setModel('1080p Dome')
    } else {
      setName(`${newType.charAt(0).toUpperCase() + newType.slice(1)} Device`)
      setModel('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Device name is required')
      return
    }
    setSaving(true)
    setError(null)

    const config = {
      driver: connectionType,
    }
    if (ipAddress) config.ip = ipAddress.trim()
    if (mqttTopic) config.mqtt_topic = mqttTopic.trim()
    if (rtspUrl) config.rtsp_url = rtspUrl.trim()

    try {
      await onAdd({
        name: name.trim(),
        type,
        room,
        brand,
        model: model.trim(),
        config,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal add-device-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>+ Add Smart Device</h2>
          <button className="icon-btn close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Device Type
            <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()} ({t === 'ac' ? '❄️ Climate' : t === 'tv' ? '📺 Entertainment' : t === 'camera' ? '📹 Security' : '⚡ Smart IoT'})
                </option>
              ))}
            </select>
          </label>

          <div className="form-row">
            <label>
              Device Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Bedroom AC"
                required
              />
            </label>

            <label>
              Room
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Brand
              <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                {(brandDefaults[type] || ['Generic']).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>

            <label>
              Model
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. BRP069 / C2 OLED"
              />
            </label>
          </div>

          <fieldset className="form-fieldset">
            <legend>Hardware Protocol & Connection</legend>
            <label>
              Connection Mode
              <select value={connectionType} onChange={(e) => setConnectionType(e.target.value)}>
                <option value="simulator">Virtual Hardware Simulator (Testing)</option>
                {type === 'ac' && <option value="daikin_http">Daikin LAN WiFi Adapter (BRP HTTP API)</option>}
                {type === 'tv' && <option value="lg_webos">LG webOS WebSocket (SSAP)</option>}
                {type === 'tv' && <option value="samsung_tizen">Samsung Tizen Smart TV (WS)</option>}
                {type === 'tv' && <option value="android_tv">Android TV Remote / ADB</option>}
                {type === 'camera' && <option value="rtsp">RTSP / ONVIF IP Camera Stream</option>}
                <option value="mqtt">MQTT IoT Broker (ESP32 / Tasmota / HomeAssistant)</option>
                <option value="tuya_cloud">Tuya Smart Cloud API</option>
              </select>
            </label>

            {(connectionType === 'daikin_http' || connectionType === 'lg_webos' || connectionType === 'samsung_tizen' || connectionType === 'android_tv') && (
              <label>
                Local Device IP Address
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.50"
                  required
                />
              </label>
            )}

            {connectionType === 'mqtt' && (
              <label>
                MQTT Topic
                <input
                  type="text"
                  value={mqttTopic}
                  onChange={(e) => setMqttTopic(e.target.value)}
                  placeholder="smart-home/living-room/ac/command"
                />
              </label>
            )}

            {connectionType === 'rtsp' && (
              <label>
                RTSP Stream URL (Stored securely server-side)
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                />
              </label>
            )}
          </fieldset>

          {error && <div className="alert error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding Device...' : '+ Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
