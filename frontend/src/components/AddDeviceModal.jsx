import React, { useState } from 'react'

export default function AddDeviceModal({ rooms, types, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState(types[0] || 'light')
  const [room, setRoom] = useState(rooms[0] || 'Living Room')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Device name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onAdd({ name: name.trim(), type, room })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Device</h2>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Device name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bedroom Light" />
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </label>
          <label>
            Room
            <select value={room} onChange={(e) => setRoom(e.target.value)}>
              {rooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Adding…' : 'Add Device'}
          </button>
        </form>
      </div>
    </div>
  )
}
