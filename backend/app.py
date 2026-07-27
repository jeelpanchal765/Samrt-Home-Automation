"""
Domi — Smart Home Automation backend

REST API for managing and controlling smart home devices.
Google Sign-In for authentication. In-memory store today;
swap `store.py` / `drivers/` for real hardware later.

Run:
    py -m pip install -r requirements.txt
    py app.py
"""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from auth import create_session_token, decode_session_token, verify_google_token
from store import DEVICE_TYPES, ROOMS, DeviceStore

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

store = DeviceStore()


def _current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return decode_session_token(auth[7:])


def _require_auth():
    user = _current_user()
    if not user:
        return None, (jsonify({"error": "unauthorized"}), 401)
    return user, None


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "google_configured": bool(os.environ.get("GOOGLE_CLIENT_ID"))})


@app.post("/api/auth/google")
def auth_google():
    credential = (request.json or {}).get("credential")
    if not credential:
        return jsonify({"error": "missing credential"}), 400
    user = verify_google_token(credential)
    if not user:
        return jsonify({"error": "invalid or unconfigured Google login"}), 401
    token = create_session_token(user)
    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user["picture"],
        },
    })


@app.get("/api/auth/me")
def auth_me():
    user, err = _require_auth()
    if err:
        return err
    return jsonify({
        "id": user["sub"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture", ""),
    })


@app.get("/api/rooms")
def list_rooms():
    user, err = _require_auth()
    if err:
        return err
    return jsonify({"rooms": ROOMS})


@app.get("/api/device-types")
def list_device_types():
    user, err = _require_auth()
    if err:
        return err
    return jsonify({"types": sorted(DEVICE_TYPES)})


@app.get("/api/devices")
def list_devices():
    user, err = _require_auth()
    if err:
        return err
    room = request.args.get("room")
    devices = store.list_devices(user["sub"], room or None)
    return jsonify({"devices": devices})


@app.post("/api/devices")
def add_device():
    user, err = _require_auth()
    if err:
        return err
    body = request.json or {}
    name = body.get("name", "").strip()
    device_type = body.get("type", "")
    room = body.get("room", "")
    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        device = store.add_device(user["sub"], name, device_type, room)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(device), 201


@app.delete("/api/devices/<device_id>")
def delete_device(device_id):
    user, err = _require_auth()
    if err:
        return err
    if not store.delete_device(user["sub"], device_id):
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


@app.post("/api/devices/<device_id>/toggle")
def toggle_device(device_id):
    user, err = _require_auth()
    if err:
        return err
    device = store.toggle_power(user["sub"], device_id)
    if not device:
        return jsonify({"error": "not found"}), 404
    return jsonify(device)


@app.patch("/api/devices/<device_id>/state")
def patch_device_state(device_id):
    user, err = _require_auth()
    if err:
        return err
    updates = request.json or {}
    if not updates:
        return jsonify({"error": "no updates"}), 400
    device = store.update_state(user["sub"], device_id, updates)
    if not device:
        return jsonify({"error": "not found"}), 404
    return jsonify(device)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
