const API = '/api'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

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

export async function fetchMe(token) {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error('Session expired')
  return res.json()
}

export async function fetchDevices(token, room) {
  const q = room && room !== 'All' ? `?room=${encodeURIComponent(room)}` : ''
  const res = await fetch(`${API}/devices${q}`, { headers: authHeaders(token) })
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

export async function checkHealth() {
  const res = await fetch(`${API}/health`)
  return res.json()
}
