# Domi — AC Control (React + Python)

A control dashboard for your Daikin AC, styled like the original demo but now
split into a real frontend/backend so it's ready to be wired to actual hardware.

- **Frontend**: React + Vite (`frontend/`)
- **Backend**: Python + Flask (`backend/`)

Right now the backend just holds state in memory — it does **not** control a
real AC yet. It's the layer you'll swap out once you get hardware (see below).

## Run it

**1. Start the backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Runs on http://localhost:5000

**2. Start the frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173

Open http://localhost:5173 in your browser — it talks to the Flask API automatically.

## API reference (backend/app.py)

| Method | Route | Body | Description |
|---|---|---|---|
| GET | `/api/state` | — | Returns current state |
| POST | `/api/power` | — | Toggles on/off |
| POST | `/api/temp` | `{ "delta": 1 }` | Adjusts temp by ±1°C |
| POST | `/api/mode` | `{ "mode": "cool" }` | cool / heat / dry / fan |
| POST | `/api/fan` | `{ "value": 0 }` | 0 = auto, 1–3 = speed |
| POST | `/api/swing` | — | Toggles swing |

## Making this control your real Daikin AC

The backend is the only place that needs to change — the React UI won't
need to change at all. Pick one:

1. **Daikin WiFi adapter (BRP series)** — if your unit supports it, plug it
   in and call Daikin's cloud API from inside the Flask route handlers
   instead of just mutating the `state` dict.
2. **IR blaster (ESP32/Arduino + IR LED)** — capture your remote's IR codes,
   flash them to the ESP32, then have Flask send an HTTP/MQTT command to the
   ESP32 whenever a route is hit.
3. **Smart controller (Sensibo, Broadlink RM4, Cielo Breez)** — these expose
   their own APIs; call them from the Flask routes the same way.
