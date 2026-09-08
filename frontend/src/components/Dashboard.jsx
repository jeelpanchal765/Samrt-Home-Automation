import React, { useCallback, useEffect, useState } from 'react'
import {
  addAutomation,
  addDevice,
  deleteAutomation,
  deleteDevice,
  fetchAutomations,
  fetchDeviceTypes,
  fetchDevices,
  fetchGatewayStatus,
  fetchRooms,
  patchDeviceState,
  sendDeviceCommand,
  subscribeDeviceEvents,
  toggleAutomation,
  toggleDevice,
} from '../api'
import { useAuth } from '../context/AuthContext'
import ACRemoteModal from './ACRemoteModal'
import AddDeviceModal from './AddDeviceModal'
import AutomationsTab from './AutomationsTab'
import BottomNav from './BottomNav'
import CameraView from './CameraView'
import DeviceCard from './DeviceCard'
import GatewayModal from './GatewayModal'
import InstallPrompt from './InstallPrompt'
import TopBar from './TopBar'
import TVRemoteModal from './TVRemoteModal'

export default function Dashboard() {
  const { user, token, logout } = useAuth()
  const [devices, setDevices] = useState([])
  const [rooms, setRooms] = useState([])
  const [types, setTypes] = useState([])
  const [automations, setAutomations] = useState([])
  const [gatewayStatus, setGatewayStatus] = useState({ online: true, paired: true })
  const [filterRoom, setFilterRoom] = useState('All')
  const [currentTab, setCurrentTab] = useState('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals & Active Remotes
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [showGatewayModal, setShowGatewayModal] = useState(false)
  const [activeAcModal, setActiveAcModal] = useState(null)
  const [activeTvModal, setActiveTvModal] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [devs, rms, tps, autos, gw] = await Promise.all([
        fetchDevices(token, filterRoom),
        fetchRooms(token),
        fetchDeviceTypes(token),
        fetchAutomations(token),
        fetchGatewayStatus(token).catch(() => ({ online: true })),
      ])
      setDevices(devs)
      setRooms(rms)
      setTypes(tps)
      setAutomations(autos)
      setGatewayStatus(gw)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, filterRoom])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to Real-Time Server-Sent Events (SSE)
  useEffect(() => {
    if (!token) return

    const unsubscribe = subscribeDeviceEvents(
      token,
      (event) => {
        if (event.type === 'device_update') {
          const updated = event.data
          setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          // Keep active modals updated if device state changed
          setActiveAcModal((prev) => (prev && prev.id === updated.id ? updated : prev))
          setActiveTvModal((prev) => (prev && prev.id === updated.id ? updated : prev))
        } else if (event.type === 'device_added') {
          setDevices((prev) => [...prev, event.data])
        } else if (event.type === 'device_deleted') {
          setDevices((prev) => prev.filter((d) => d.id !== event.data.id))
        }
      },
      (err) => {
        // SSE error or disconnect
      }
    )

    return () => unsubscribe()
  }, [token])

  // Device actions
  async function handleToggle(id) {
    try {
      const updated = await toggleDevice(token, id)
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleControl(id, updates) {
    try {
      const updated = await patchDeviceState(token, id, updates)
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCommand(id, action, params = {}) {
    try {
      const updated = await sendDeviceCommand(token, id, action, params)
      setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)))
      if (activeAcModal?.id === id) setActiveAcModal(updated)
      if (activeTvModal?.id === id) setActiveTvModal(updated)
      return updated
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function handleDeleteDevice(id) {
    if (!confirm('Remove this smart device?')) return
    try {
      await deleteDevice(token, id)
      setDevices((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddDevice(payload) {
    const device = await addDevice(token, payload)
    setDevices((prev) => [...prev, device])
  }

  // Quick Scene automation execution
  async function handleQuickScene(sceneName) {
    if (sceneName === 'all_off') {
      for (const d of devices) {
        if (d.state?.power) {
          handleToggle(d.id)
        }
      }
    } else if (sceneName === 'cooling_boost') {
      const acs = devices.filter((d) => d.type === 'ac')
      for (const ac of acs) {
        handleCommand(ac.id, 'setTemperature', { temp: 22 })
        if (!ac.state?.power) handleToggle(ac.id)
      }
    } else if (sceneName === 'movie_night') {
      const tv = devices.find((d) => d.type === 'tv')
      if (tv && !tv.state?.power) handleToggle(tv.id)
      const lights = devices.filter((d) => d.type === 'light')
      for (const l of lights) {
        handleControl(l.id, { brightness: 25 })
      }
    }
  }

  // Automations actions
  async function handleAddAutomation(payload) {
    const auto = await addAutomation(token, payload)
    setAutomations((prev) => [...prev, auto])
  }

  async function handleDeleteAutomation(id) {
    await deleteAutomation(token, id)
    setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleToggleAutomation(id) {
    const updated = await toggleAutomation(token, id)
    setAutomations((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }

  // Open modal handler from card
  function handleOpenRemote(device) {
    if (device.type === 'ac') {
      setActiveAcModal(device)
    } else if (device.type === 'tv') {
      setActiveTvModal(device)
    } else if (device.type === 'camera') {
      setCurrentTab('cameras')
    }
  }

  // Computed metrics
  const activeCount = devices.filter((d) => {
    const s = d.state || {}
    if ('power' in s) return s.power
    if ('locked' in s) return !s.locked
    if ('open' in s) return s.open > 0
    return false
  }).length

  const cameras = devices.filter((d) => d.type === 'camera')
  const acList = devices.filter((d) => d.type === 'ac')
  const tvList = devices.filter((d) => d.type === 'tv')

  const grouped = rooms.reduce((acc, room) => {
    const roomDevices = devices.filter((d) => d.room === room)
    if (roomDevices.length) acc[room] = roomDevices
    return acc
  }, {})

  return (
    <div className="app-container">
      {/* Top Mobile Status Header */}
      <TopBar
        user={user}
        gatewayOnline={gatewayStatus.online}
        onOpenGateway={() => setShowGatewayModal(true)}
        onLogout={logout}
      />

      {/* PWA Android / iOS Install Banner */}
      <InstallPrompt />

      {/* Main Content Area based on Tab */}
      <main className="main-content">
        {error && (
          <div className="alert error alert-dismissible">
            <span>{error}</span>
            <button className="icon-btn-sm" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* TAB 1: HOME DASHBOARD */}
        {currentTab === 'home' && (
          <div className="tab-home">
            {/* Quick Metrics Carousel */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-num">{activeCount}</div>
                <div className="stat-label">Active Devices</div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-icon">❄️</div>
                <div className="stat-num">
                  {acList.length > 0 && acList[0].state?.temp ? `${acList[0].state.temp}°C` : '24°C'}
                </div>
                <div className="stat-label">Climate Target</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📹</div>
                <div className="stat-num">{cameras.length}</div>
                <div className="stat-label">Security Feeds</div>
              </div>
            </div>

            {/* Quick Scenes */}
            <div className="quick-scenes-row">
              <span className="scenes-title">QUICK ACTIONS</span>
              <div className="scenes-scroll">
                <button className="scene-chip" onClick={() => handleQuickScene('cooling_boost')}>
                  ❄️ AC Cool 22°C
                </button>
                <button className="scene-chip" onClick={() => handleQuickScene('movie_night')}>
                  🎬 Movie Cinema
                </button>
                <button className="scene-chip" onClick={() => handleQuickScene('all_off')}>
                  🌙 Turn All Off
                </button>
              </div>
            </div>

            {/* Room Filter Chips */}
            <div className="room-filter">
              {['All', ...rooms].map((r) => (
                <button
                  key={r}
                  className={`chip ${filterRoom === r ? 'active' : ''}`}
                  onClick={() => setFilterRoom(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            {loading && <p className="loading-spinner">Connecting to smart devices...</p>}

            {/* Device Grid by Room */}
            {!loading && filterRoom === 'All' ? (
              Object.entries(grouped).map(([room, roomDevices]) => (
                <section key={room} className="room-section">
                  <div className="room-section-header">
                    <h2 className="room-title">{room}</h2>
                    <span className="room-count">{roomDevices.length} devices</span>
                  </div>
                  <div className="device-grid">
                    {roomDevices.map((d) => (
                      <DeviceCard
                        key={d.id}
                        device={d}
                        onToggle={handleToggle}
                        onControl={handleControl}
                        onDelete={handleDeleteDevice}
                        onOpenRemote={handleOpenRemote}
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
                      onDelete={handleDeleteDevice}
                      onOpenRemote={handleOpenRemote}
                    />
                  ))}
                </div>
              )
            )}

            {!loading && devices.length === 0 && (
              <div className="empty-state-view">
                <div className="empty-icon">🏠</div>
                <h3>No smart devices configured</h3>
                <p>Tap the <b>+</b> button below to add your AC, TV, or Cameras.</p>
                <button className="btn btn-primary" onClick={() => setShowAddDevice(true)}>
                  + Add First Device
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REMOTES (AC & TV CONTROLLERS) */}
        {currentTab === 'remotes' && (
          <div className="tab-remotes">
            <div className="section-header-row">
              <div>
                <h2>Smart Remote Controls</h2>
                <span className="section-subtitle">Dedicated physical-feel controllers</span>
              </div>
            </div>

            <div className="remotes-section">
              <h3 className="subheading">❄️ AIR CONDITIONERS</h3>
              <div className="device-grid">
                {acList.map((ac) => (
                  <DeviceCard
                    key={ac.id}
                    device={ac}
                    onToggle={handleToggle}
                    onControl={handleControl}
                    onDelete={handleDeleteDevice}
                    onOpenRemote={handleOpenRemote}
                  />
                ))}
                {acList.length === 0 && (
                  <p className="no-items-text">No AC connected. Tap + to add an AC.</p>
                )}
              </div>
            </div>

            <div className="remotes-section mt-4">
              <h3 className="subheading">📺 SMART TVS</h3>
              <div className="device-grid">
                {tvList.map((tv) => (
                  <DeviceCard
                    key={tv.id}
                    device={tv}
                    onToggle={handleToggle}
                    onControl={handleControl}
                    onDelete={handleDeleteDevice}
                    onOpenRemote={handleOpenRemote}
                  />
                ))}
                {tvList.length === 0 && (
                  <p className="no-items-text">No TV connected. Tap + to add a TV.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAMERAS & SECURITY */}
        {currentTab === 'cameras' && (
          <CameraView
            cameras={cameras}
            token={token}
            onCommand={handleCommand}
            onAddCamera={() => setShowAddDevice(true)}
          />
        )}

        {/* TAB 4: AUTOMATIONS */}
        {currentTab === 'automations' && (
          <AutomationsTab
            automations={automations}
            devices={devices}
            onAddAutomation={handleAddAutomation}
            onDeleteAutomation={handleDeleteAutomation}
            onToggleAutomation={handleToggleAutomation}
          />
        )}
      </main>

      {/* Tactile Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onAddDevice={() => setShowAddDevice(true)}
      />

      {/* Add Device Modal */}
      {showAddDevice && (
        <AddDeviceModal
          rooms={rooms}
          types={types}
          onAdd={handleAddDevice}
          onClose={() => setShowAddDevice(false)}
        />
      )}

      {/* AC Remote Modal Sheet */}
      {activeAcModal && (
        <ACRemoteModal
          device={activeAcModal}
          onCommand={handleCommand}
          onClose={() => setActiveAcModal(null)}
        />
      )}

      {/* TV Remote Modal Sheet */}
      {activeTvModal && (
        <TVRemoteModal
          device={activeTvModal}
          onCommand={handleCommand}
          onClose={() => setActiveTvModal(null)}
        />
      )}

      {/* Gateway & Remote Access Modal */}
      {showGatewayModal && (
        <GatewayModal
          gatewayStatus={gatewayStatus}
          onClose={() => setShowGatewayModal(false)}
        />
      )}
    </div>
  )
}
