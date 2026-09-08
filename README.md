# Domi — Mobile-First Smart Home PWA & Remote Control

A modern, mobile-first Progressive Web App (PWA) and backend architecture to control your AC, Smart TV, Security Cameras, and IoT devices from your Android phone or any browser anywhere in the world.

---

## 🚀 Key Features

### 1. 📱 Installable Mobile PWA
- **Install on Android Phone**: Open in Google Chrome and tap **"Add to Home screen"** / **"Install"** to use as a native standalone app.
- **Offline App Shell & Service Worker**: Instant loading via `sw.js` and custom app icon suite (`manifest.json`).
- **Tactile Mobile UX**: Safe-area padding, bottom navigation, touch vibrations (haptic feedback), and responsive cards.

### 2. ❄️ Real AC Remote System
- Dedicated thermostat modal with **circular temperature dial** (16°C – 30°C).
- Operating modes: **Cool (❄️), Heat (☀️), Dry (💧), Fan (🌀), Auto (⚡)**.
- Fan speed (Auto, Low, Med, High, Turbo) & Louver Swing modes (Fixed, Vertical, Horizontal, 3D).
- Live ambient room temperature and humidity readouts.
- **Hardware Drivers**:
  - `DaikinHttpDriver`: Direct local HTTP LAN control for Daikin WiFi adapters (BRP069 series).
  - `MqttClimateDriver`: MQTT protocol integration for ESP32 IR Blasters and Tasmota.
  - `TuyaCloudDriver`: Cloud API integration.
  - `SimulatorDriver`: Virtual testing mode.

### 3. 📺 Tactile TV Remote Control
- Physical-feel remote control layout with **Tactile D-Pad** (Up, Down, Left, Right, OK).
- **Volume Rocker (+/-)** with Mute toggle.
- **Channel Rocker (+/-)** with numeric keypad popup.
- Navigation keys: **Back, Home, Menu**.
- Media keys: **Play/Pause, Rewind, Fast-Forward**.
- **Input Source Switcher**: HDMI 1, HDMI 2, HDMI 3, Netflix, YouTube, Prime Video, Live TV.
- **Virtual Smart TV Keyboard**: Type text and search queries directly into TV search bars from your phone.
- **Hardware Drivers**: LG webOS SSAP WebSocket, Samsung Tizen WS, Android TV ADB/Remote, MQTT IR emitter.

### 4. 📹 Secure Camera Security System
- Multi-camera live security monitoring grid.
- **Server-Side Security**: Camera passwords, IP addresses, and RTSP URLs are strictly kept on the server and never exposed to client JavaScript.
- Live stream proxy (`/api/cameras/<id>/stream`) & instantaneous snapshot capture.
- Full-screen interactive viewer, Night Vision IR toggle, and Recording status indicators.

### 5. ⚡ Automations Engine
- Custom condition and scheduled trigger engine ("IF condition THEN action").
- Time-based triggers (e.g. *Turn AC ON at 7:00 PM*, *Turn TV OFF at midnight*).
- Sensor threshold triggers (e.g. *Turn AC ON when room temp reaches 25°C*).

### 6. 🌐 Remote Access & Home Gateway Architecture
- **Control from anywhere**: Use your phone on 4G/5G mobile data outside the home.
- **Local Home Gateway Bridge** (`backend/gateway/home_gateway.py`): Run on a Raspberry Pi or local PC inside your home network to bridge LAN-only devices (Daikin local WiFi, LG TV, RTSP cams) to the cloud without complex router port-forwarding.

---

## 🛠️ Getting Started

### 1. Start the Backend API
```bash
cd backend
python -m pip install -r requirements.txt
python app.py
```
*Backend runs on `http://localhost:5000` with REST endpoints, SSE real-time stream (`/api/events`), and camera proxies.*

### 2. Start the Frontend PWA
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📱 How to Install on Your Android Phone

1. Ensure your phone and computer are on the same Wi-Fi (or open your deployed Vercel URL on your phone).
2. Open **Google Chrome** on Android and navigate to the app URL.
3. Tap the **"Install Domi Remote"** banner at the top, or tap Chrome menu (`⋮`) -> **"Add to Home screen"** / **"Install App"**.
4. Domi Home is now installed as a full-screen standalone application on your phone!

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com), click **"Add New Project"** and import this repository.
3. Configure the **Root Directory** to `frontend/`.
4. Add environment variables:
   - `VITE_API_BASE_URL`: URL of your deployed Python backend (e.g. on Render / Railway / Fly.io / VPS).
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Web Client ID (optional, Demo Mode is available out-of-the-box).
5. Click **Deploy**!

---

## 🔒 Security Architecture
- **JWT Authentication & OAuth**: Every API request is verified with signed JWT tokens.
- **Multi-Tenant Isolation**: Devices and automations are tied strictly to each authenticated user's ID.
- **Credential Protection**: Hardware passwords, RTSP tokens, and MQTT secrets are never leaked to frontend clients.
