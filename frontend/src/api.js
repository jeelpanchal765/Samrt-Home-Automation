const API = import.meta.env.VITE_API_BASE_URL || '/api'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ----------------------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------------------

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data
}

export async function loginDemo() {
  const res = await fetch(`${API}/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Demo login failed')
  return data
}

export async function fetchMe(token) {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Session expired')
  return res.json()
}

// ----------------------------------------------------------------------
// DEVICES & CONTROLS
// ----------------------------------------------------------------------

export async function fetchDevices(token, room, type) {
  const params = new URLSearchParams()
  if (room && room !== 'All') params.append('room', room)
  if (type && type !== 'All') params.append('type', type)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const res = await fetch(`${API}/devices${qs}`, { headers: authHeaders(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load devices')
  return data.devices
}

export async function fetchRooms(token) {
  const res = await fetch(`${API}/rooms`, { headers: authHeaders(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load rooms')
  return data.rooms
}

export async function fetchDeviceTypes(token) {
  const res = await fetch(`${API}/device-types`, { headers: authHeaders(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load types')
  return data.types
}

export async function addDevice(token, payload) {
  const res = await fetch(`${API}/devices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to add device')
  return data
}

export async function deleteDevice(token, id) {
  const res = await fetch(`${API}/devices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete device')
  return true
}

export async function toggleDevice(token, id) {
  const res = await fetch(`${API}/devices/${id}/toggle`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Toggle failed')
  return data
}

export async function patchDeviceState(token, id, updates) {
  const res = await fetch(`${API}/devices/${id}/state`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Update failed')
  return data
}

export async function sendDeviceCommand(token, id, action, params = {}) {
  const res = await fetch(`${API}/devices/${id}/command`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action, params }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Command ${action} failed`)
  return data
}

// ----------------------------------------------------------------------
// CAMERAS & STREAMING
// ----------------------------------------------------------------------

export function getCameraStreamUrl(id, token) {
  return `${API}/cameras/${id}/stream?token=${encodeURIComponent(token)}`
}

export function getCameraSnapshotUrl(id, token) {
  return `${API}/cameras/${id}/snapshot?token=${encodeURIComponent(token)}&t=${Date.now()}`
}

// ----------------------------------------------------------------------
// AUTOMATIONS
// ----------------------------------------------------------------------

export async function fetchAutomations(token) {
  const res = await fetch(`${API}/automations`, { headers: authHeaders(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load automations')
  return data.automations
}

export async function addAutomation(token, payload) {
  const res = await fetch(`${API}/automations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create automation')
  return data
}

export async function deleteAutomation(token, id) {
  const res = await fetch(`${API}/automations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Failed to delete automation')
  return true
}

export async function toggleAutomation(token, id) {
  const res = await fetch(`${API}/automations/${id}/toggle`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to toggle automation')
  return data
}

// ----------------------------------------------------------------------
// GATEWAY & SYSTEM HEALTH
// ----------------------------------------------------------------------

export async function fetchGatewayStatus(token) {
  const res = await fetch(`${API}/gateway/status`, { headers: authHeaders(token) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to check gateway status')
  return data
}

export async function checkHealth() {
  const res = await fetch(`${API}/health`)
  return res.json()
}

// ----------------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE)
// ----------------------------------------------------------------------

export function subscribeDeviceEvents(token, onEvent, onError) {
  if (!token) return () => {}
  const eventSource = new EventSource(`${API}/events?token=${encodeURIComponent(token)}`)

  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data)
      if (onEvent) onEvent(parsed)
    } catch (e) {
      // heartbeats or non-json messages
    }
  }

  eventSource.onerror = (err) => {
    if (onError) onError(err)
  }

  return () => {
    eventSource.close()
  }
}
