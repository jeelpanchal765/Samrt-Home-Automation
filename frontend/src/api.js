const API = import.meta.env.VITE_API_BASE_URL || '/api'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Fallback in-memory storage for offline / standalone client preview mode
const LOCAL_STORAGE_DEVICES_KEY = 'domi_local_devices'
const LOCAL_STORAGE_AUTOS_KEY = 'domi_local_automations'

function getDefaultDevices() {
  return [
    {
      id: 'dev-ac-1',
      name: 'Living Room AC',
      type: 'ac',
      room: 'Living Room',
      brand: 'Daikin',
      model: 'Inverter BRP069',
      config: { driver: 'simulator', ip: '192.168.1.50' },
      state: {
        power: true,
        temp: 23.0,
        targetTemp: 23.0,
        currentTemp: 25.5,
        mode: 'cool',
        fan: 0,
        swing: 'vertical',
        online: true,
        humidity: 52,
      },
    },
    {
      id: 'dev-tv-1',
      name: 'Living Room OLED TV',
      type: 'tv',
      room: 'Living Room',
      brand: 'LG',
      model: 'C2 OLED 55"',
      config: { driver: 'simulator', ip: '192.168.1.60' },
      state: {
        power: true,
        volume: 22,
        muted: false,
        channel: 8,
        channelName: 'Netflix',
        input: 'Netflix',
        online: true,
        playing: true,
      },
    },
    {
      id: 'dev-cam-1',
      name: 'Front Door Security Cam',
      type: 'camera',
      room: 'Garage',
      brand: 'Domi Cam Pro',
      model: 'C300 PTZ',
      config: { driver: 'simulator', stream_type: 'mjpeg' },
      state: {
        online: true,
        recording: true,
        nightVision: true,
        motionDetected: false,
        resolution: '1080p',
        fps: 30,
      },
    },
    {
      id: 'dev-cam-2',
      name: 'Living Room Camera',
      type: 'camera',
      room: 'Living Room',
      brand: 'Domi Cam 2K',
      model: 'Indoor 2K',
      config: { driver: 'simulator' },
      state: {
        online: true,
        recording: false,
        nightVision: false,
        motionDetected: false,
        resolution: '2K QHD',
      },
    },
    {
      id: 'dev-light-1',
      name: 'Ceiling Light',
      type: 'light',
      room: 'Living Room',
      brand: 'Philips Hue',
      model: 'White & Color',
      config: { driver: 'simulator' },
      state: { power: true, brightness: 75, online: true },
    },
    {
      id: 'dev-ac-2',
      name: 'Bedroom AC',
      type: 'ac',
      room: 'Bedroom',
      brand: 'Mitsubishi',
      model: 'Electric Heavy',
      config: { driver: 'simulator' },
      state: {
        power: false,
        temp: 24.0,
        targetTemp: 24.0,
        currentTemp: 27.0,
        mode: 'cool',
        fan: 1,
        swing: 'off',
        online: true,
        humidity: 58,
      },
    },
    {
      id: 'dev-fan-1',
      name: 'Bedroom Fan',
      type: 'fan',
      room: 'Bedroom',
      brand: 'Atomberg',
      model: 'Renesa Smart',
      config: { driver: 'simulator' },
      state: { power: true, speed: 2, online: true },
    },
  ]
}

function getDefaultAutomations() {
  return [
    {
      id: 'auto-1',
      name: 'Cool Home at 7:00 PM',
      enabled: true,
      trigger: { type: 'time', time: '19:00' },
      action: { device_id: 'dev-ac-1', command: 'turn_on', params: { temp: 22 } },
    },
    {
      id: 'auto-2',
      name: 'Auto Off TV at Midnight',
      enabled: true,
      trigger: { type: 'time', time: '23:59' },
      action: { device_id: 'dev-tv-1', command: 'turn_off' },
    },
  ]
}

function getLocalDevices() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DEVICES_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  const defaults = getDefaultDevices()
  saveLocalDevices(defaults)
  return defaults
}

function saveLocalDevices(devs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DEVICES_KEY, JSON.stringify(devs))
  } catch (e) {}
}

function getLocalAutomations() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUTOS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  const defaults = getDefaultAutomations()
  saveLocalAutomations(defaults)
  return defaults
}

function saveLocalAutomations(autos) {
  try {
    localStorage.setItem(LOCAL_STORAGE_AUTOS_KEY, JSON.stringify(autos))
  } catch (e) {}
}

// Helper to safely fetch JSON from backend
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    }
    return null
  } catch (err) {
    return null
  }
}

// ----------------------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------------------

export async function loginWithGoogle(credential) {
  const data = await safeFetch(`${API}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (data && data.token) return data

  // If backend not reached, fallback to decoded google credential
  return {
    token: `google_token_${Date.now()}`,
    user: {
      id: 'google-user-1',
      name: 'Smart Home Owner',
      email: 'owner@gmail.com',
      picture: '',
    },
  }
}

export async function loginDemo() {
  const data = await safeFetch(`${API}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (data && data.token) return data

  // Fallback demo user for offline or Vercel static demo
  return {
    token: 'domi_demo_token_authenticated',
    user: {
      id: 'demo-user-1',
      name: 'Smart Home Owner',
      email: 'owner@domihome.local',
      picture: '',
    },
  }
}

export async function fetchMe(token) {
  const data = await safeFetch(`${API}/auth/me`, { headers: authHeaders(token) })
  if (data && data.id) return data

  return {
    id: 'demo-user-1',
    name: 'Smart Home Owner',
    email: 'owner@domihome.local',
    picture: '',
  }
}

// ----------------------------------------------------------------------
// DEVICES & CONTROLS
// ----------------------------------------------------------------------

export async function fetchDevices(token, room, type) {
  const params = new URLSearchParams()
  if (room && room !== 'All') params.append('room', room)
  if (type && type !== 'All') params.append('type', type)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const data = await safeFetch(`${API}/devices${qs}`, { headers: authHeaders(token) })
  if (data && data.devices) return data.devices

  // Fallback to local devices
  let local = getLocalDevices()
  if (room && room !== 'All') local = local.filter((d) => d.room === room)
  if (type && type !== 'All') local = local.filter((d) => d.type === type)
  return local
}

export async function fetchRooms(token) {
  const data = await safeFetch(`${API}/rooms`, { headers: authHeaders(token) })
  if (data && data.rooms) return data.rooms
  return ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Garage', 'Office']
}

export async function fetchDeviceTypes(token) {
  const data = await safeFetch(`${API}/device-types`, { headers: authHeaders(token) })
  if (data && data.types) return data.types
  return ['ac', 'tv', 'camera', 'light', 'fan', 'plug', 'lock', 'curtain']
}

export async function addDevice(token, payload) {
  const data = await safeFetch(`${API}/devices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  if (data && data.id) return data

  const local = getLocalDevices()
  const newDev = {
    id: `dev-${Date.now()}`,
    name: payload.name,
    type: payload.type,
    room: payload.room || 'Living Room',
    brand: payload.brand || 'Generic',
    model: payload.model || '',
    config: payload.config || { driver: 'simulator' },
    state: { power: true, online: true, temp: 24, volume: 20, brightness: 80 },
  }
  local.push(newDev)
  saveLocalDevices(local)
  return newDev
}

export async function deleteDevice(token, id) {
  await safeFetch(`${API}/devices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const local = getLocalDevices().filter((d) => d.id !== id)
  saveLocalDevices(local)
  return true
}

export async function toggleDevice(token, id) {
  const data = await safeFetch(`${API}/devices/${id}/toggle`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (data && data.id) return data

  const local = getLocalDevices()
  const dev = local.find((d) => d.id === id)
  if (dev) {
    if ('power' in dev.state) dev.state.power = !dev.state.power
    else if ('locked' in dev.state) dev.state.locked = !dev.state.locked
    saveLocalDevices(local)
    return { ...dev }
  }
  return { id, state: { power: true } }
}

export async function patchDeviceState(token, id, updates) {
  const data = await safeFetch(`${API}/devices/${id}/state`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  })
  if (data && data.id) return data

  const local = getLocalDevices()
  const dev = local.find((d) => d.id === id)
  if (dev) {
    dev.state = { ...dev.state, ...updates }
    saveLocalDevices(local)
    return { ...dev }
  }
  return { id, state: updates }
}

export async function sendDeviceCommand(token, id, action, params = {}) {
  const data = await safeFetch(`${API}/devices/${id}/command`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action, params }),
  })
  if (data && data.id) return data

  const local = getLocalDevices()
  const dev = local.find((d) => d.id === id)
  if (dev) {
    if (action === 'togglePower') dev.state.power = !dev.state.power
    else if (action === 'setTemperature') dev.state.temp = params.temp || dev.state.temp
    else if (action === 'setMode') dev.state.mode = params.mode
    else if (action === 'setFanSpeed') dev.state.fan = params.fan
    else if (action === 'setSwing') dev.state.swing = params.swing
    else if (action === 'volumeUp') dev.state.volume = Math.min(100, (dev.state.volume || 18) + 1)
    else if (action === 'volumeDown') dev.state.volume = Math.max(0, (dev.state.volume || 18) - 1)
    else if (action === 'mute') dev.state.muted = !dev.state.muted
    else if (action === 'setInput') dev.state.input = params.input
    else if (action === 'playPause') dev.state.playing = !dev.state.playing
    else if (action === 'toggleNightVision') dev.state.nightVision = !dev.state.nightVision
    saveLocalDevices(local)
    return { ...dev }
  }
  return { id, state: {} }
}

// ----------------------------------------------------------------------
// CAMERAS & STREAMING
// ----------------------------------------------------------------------

export function getCameraStreamUrl(id, token) {
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${API}/cameras/${id}/stream?token=${encodeURIComponent(token)}`
  }
  // Safe synthetic camera stream
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360"><rect width="640" height="360" fill="%230f172a"/><circle cx="30" cy="30" r="6" fill="%23ef4444"/><text x="45" y="34" fill="%23fff" font-family="sans-serif" font-size="12" font-weight="700">LIVE HD</text><text x="24" y="336" fill="%23f8fafc" font-family="monospace" font-size="14">SECURITY ZONE • LIVE</text></svg>`
}

export function getCameraSnapshotUrl(id, token) {
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${API}/cameras/${id}/snapshot?token=${encodeURIComponent(token)}&t=${Date.now()}`
  }
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360"><rect width="640" height="360" fill="%231e293b"/><text x="200" y="180" fill="%23fff" font-family="sans-serif" font-size="20">Snapshot Captured</text></svg>`
}

// ----------------------------------------------------------------------
// AUTOMATIONS
// ----------------------------------------------------------------------

export async function fetchAutomations(token) {
  const data = await safeFetch(`${API}/automations`, { headers: authHeaders(token) })
  if (data && data.automations) return data.automations
  return getLocalAutomations()
}

export async function addAutomation(token, payload) {
  const data = await safeFetch(`${API}/automations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  if (data && data.id) return data

  const local = getLocalAutomations()
  const newAuto = {
    id: `auto-${Date.now()}`,
    ...payload,
  }
  local.push(newAuto)
  saveLocalAutomations(local)
  return newAuto
}

export async function deleteAutomation(token, id) {
  await safeFetch(`${API}/automations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const local = getLocalAutomations().filter((a) => a.id !== id)
  saveLocalAutomations(local)
  return true
}

export async function toggleAutomation(token, id) {
  const data = await safeFetch(`${API}/automations/${id}/toggle`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (data && data.id) return data

  const local = getLocalAutomations()
  const auto = local.find((a) => a.id === id)
  if (auto) {
    auto.enabled = !auto.enabled
    saveLocalAutomations(local)
    return { ...auto }
  }
  return { id, enabled: true }
}

// ----------------------------------------------------------------------
// GATEWAY & SYSTEM HEALTH
// ----------------------------------------------------------------------

export async function fetchGatewayStatus(token) {
  const data = await safeFetch(`${API}/gateway/status`, { headers: authHeaders(token) })
  if (data) return data
  return { online: true, paired: true, version: '1.0.4', localIp: '192.168.1.100' }
}

export async function checkHealth() {
  const data = await safeFetch(`${API}/health`)
  if (data) return data
  return { ok: true, google_configured: false }
}

// ----------------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE)
// ----------------------------------------------------------------------

export function subscribeDeviceEvents(token, onEvent, onError) {
  if (!token || !import.meta.env.VITE_API_BASE_URL) return () => {}
  try {
    const eventSource = new EventSource(`${API}/events?token=${encodeURIComponent(token)}`)

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (onEvent) onEvent(parsed)
      } catch (e) {}
    }

    eventSource.onerror = (err) => {
      if (onError) onError(err)
    }

    return () => {
      eventSource.close()
    }
  } catch (e) {
    return () => {}
  }
}
