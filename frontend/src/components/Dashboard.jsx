import React, { useCallback, useEffect, useState } from 'react'
import {
  addDevice,
  deleteDevice,
  fetchDeviceTypes,
  fetchDevices,
  fetchRooms,
  patchDeviceState,
  toggleDevice,
} from '../api'
import { useAuth } from '../context/AuthContext'
import AddDeviceModal from './AddDeviceModal'
import DeviceCard from './DeviceCard'

export default function Dashboard() {
  const { user, token, logout } = useAuth()
  const [devices, setDevices] = useState([])
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('home')

  const load = useCallback(async () => {
    try {
      const [devs, rms, tps] = await Promise.all([
        fetchDevices(token, filter),
        fetchRooms(token),
        fetchDeviceTypes(token),
      ])
      setDevices(devs)
      setRooms(rms)
      setTypes(tps)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => {
    load()
  }, [load])

  async function handleToggle(id) {
    const updated = await toggleDevice(token, id)
    setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)))
  }

  async function handleControl(id, updates) {
    const updated = await patchDeviceState(token, id, updates)
    setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)))
  }

  async function handleDelete(id) {
    if (!confirm('Remove this device?')) return
    await deleteDevice(token, id)
    setDevices((prev) => prev.filter((d) => d.id !== id))
  }

  async function handleAdd(payload) {
    const device = await addDevice(token, payload)
    setDevices((prev) => [...prev, device])
  }

  const onCount = devices.filter((d) => {
    const s = d.state
    if ('power' in s) return s.power
    if ('locked' in s) return !s.locked
    if ('open' in s) return s.open > 0
    return false
  }).length

  const grouped = rooms.reduce((acc, room) => {
    const roomDevices = devices.filter((d) => d.room === room)
    if (roomDevices.length) acc[room] = roomDevices
    return acc
  }, {})

  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <div className="brand">Domi<span>Home</span></div>
          <div className="greeting">Hi, {user?.name?.split(' ')[0] || 'there'}</div>
        </div>
        <div className="header-right">
          {user?.picture && <img src={user.picture} alt="" className="avatar" />}
          <button className="icon-btn logout" onClick={logout} title="Sign out">⎋</button>
        </div>
      </header>

      {tab === 'home' && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-num">{devices.length}</div>
              <div className="stat-label">Devices</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-num">{onCount}</div>
              <div className="stat-label">Active now</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{Object.keys(grouped).length}</div>
              <div className="stat-label">Rooms</div>
            </div>
          </div>

          <div className="room-filter">
            {['All', ...rooms].map((r) => (
              <button
                key={r}
                className={`chip ${filter === r ? 'active' : ''}`}
                onClick={() => setFilter(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {error && <div className="alert error">{error}</div>}
          {loading && <p className="loading">Loading devices…</p>}

          {!loading && filter === 'All' ? (
            Object.entries(grouped).map(([room, roomDevices]) => (
              <section key={room} className="room-section">
                <h2 className="room-title">{room}</h2>
                <div className="device-grid">
                  {roomDevices.map((d) => (
                    <DeviceCard
                      key={d.id}
                      device={d}
                      onToggle={handleToggle}
                      onControl={handleControl}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            !loading && (
              <div className="device-grid">
                {devices.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    onToggle={handleToggle}
                    onControl={handleControl}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )
          )}

          {!loading && devices.length === 0 && (
            <div className="empty">
              <p>No devices yet. Tap + to add your first smart device.</p>
            </div>
          )}
        </>
      )}

      {tab === 'profile' && (
        <div className="profile-tab">
          <img src={user?.picture} alt="" className="profile-avatar" />
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <button className="btn outline" onClick={logout}>Sign out</button>
        </div>
      )}

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
          <span>🏠</span> Home
        </button>
        <button className="fab" onClick={() => setShowAdd(true)} title="Add device">+</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          <span>👤</span> Profile
        </button>
      </nav>

      {showAdd && (
        <AddDeviceModal
          rooms={rooms}
          types={types}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
