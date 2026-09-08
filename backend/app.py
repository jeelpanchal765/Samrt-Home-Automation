"""
Domi — Smart Home Automation Backend API
Flask REST + SSE Streaming + Device Adapter Manager
"""

import json
import logging
import os
import queue
import time
from typing import Any

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from auth import create_session_token, decode_session_token, verify_google_token
from adapters import adapter_manager
from automation import AutomationEngine
from events import event_hub
from store import DEVICE_TYPES, ROOMS, DeviceStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("DomiAPI")

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["*"])

store = DeviceStore()
automation_engine = AutomationEngine(store, event_hub)
automation_engine.start()


def _current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        # Fallback for query param in streaming endpoints like <img src="...">
        token = request.args.get("token")
        if token:
            return decode_session_token(token)
        return None
    return decode_session_token(auth[7:])


def _require_auth():
    user = _current_user()
    if not user:
        return None, (jsonify({"error": "unauthorized"}), 401)
    return user, None


# ----------------------------------------------------------------------
# HEALTH & AUTH
# ----------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "google_configured": bool(os.environ.get("GOOGLE_CLIENT_ID")),
        "time": time.time(),
        "version": "2.1.0",
    })


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


@app.post("/api/auth/demo")
def auth_demo():
    """Fallback demo login for development or when Google OAuth is not yet configured."""
    demo_user = {
        "id": "demo-user-12345",
        "email": "demo@domihome.local",
        "name": "Smart Home Owner",
        "picture": "",
    }
    token = create_session_token(demo_user)
    return jsonify({
        "token": token,
        "user": demo_user,
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


# ----------------------------------------------------------------------
# METADATA & SYSTEM
# ----------------------------------------------------------------------

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


# ----------------------------------------------------------------------
# REALTIME SERVER-SENT EVENTS (SSE)
# ----------------------------------------------------------------------

@app.get("/api/events")
def sse_events():
    user, err = _require_auth()
    if err:
        return err

    user_id = user["sub"]
    q = event_hub.subscribe(user_id)

    def event_stream():
        yield "data: {\"type\": \"connected\"}\n\n"
        try:
            while True:
                try:
                    msg = q.get(timeout=20)
                    yield f"data: {msg}\n\n"
                except queue.Empty:
                    # Keep-alive heartbeat
                    yield ": ping\n\n"
        except GeneratorExit:
            event_hub.unsubscribe(user_id, q)

    return Response(event_stream(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    })


# ----------------------------------------------------------------------
# DEVICES API
# ----------------------------------------------------------------------

@app.get("/api/devices")
def list_devices():
    user, err = _require_auth()
    if err:
        return err
    room = request.args.get("room")
    device_type = request.args.get("type")
    devices = store.list_devices(user["sub"], room or None, device_type or None)
    return jsonify({"devices": devices})


@app.post("/api/devices")
def add_device():
    user, err = _require_auth()
    if err:
        return err
    body = request.json or {}
    try:
        device = store.add_device(user["sub"], body)
        event_hub.publish(user["sub"], "device_added", device)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(device), 201


@app.get("/api/devices/<device_id>")
def get_device(device_id):
    user, err = _require_auth()
    if err:
        return err
    device = store.get_device(user["sub"], device_id)
    if not device:
        return jsonify({"error": "not found"}), 404
    return jsonify(device)


@app.delete("/api/devices/<device_id>")
def delete_device(device_id):
    user, err = _require_auth()
    if err:
        return err
    if not store.delete_device(user["sub"], device_id):
        return jsonify({"error": "not found"}), 404
    event_hub.publish(user["sub"], "device_deleted", {"id": device_id})
    return jsonify({"ok": True})


@app.post("/api/devices/<device_id>/toggle")
def toggle_device(device_id):
    user, err = _require_auth()
    if err:
        return err
    device = store.toggle_power(user["sub"], device_id)
    if not device:
        return jsonify({"error": "not found"}), 404
    event_hub.publish(user["sub"], "device_update", device)
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
    event_hub.publish(user["sub"], "device_update", device)
    automation_engine.evaluate_condition_triggers(user["sub"], device_id, device["state"])
    return jsonify(device)


@app.post("/api/devices/<device_id>/command")
def execute_device_command(device_id):
    user, err = _require_auth()
    if err:
        return err
    body = request.json or {}
    action = body.get("action")
    params = body.get("params", {})
    if not action:
        return jsonify({"error": "action required"}), 400

    try:
        device = store.execute_command(user["sub"], device_id, action, params)
        if not device:
            return jsonify({"error": "device not found"}), 404
        event_hub.publish(user["sub"], "device_update", device)
        automation_engine.evaluate_condition_triggers(user["sub"], device_id, device["state"])
        return jsonify(device)
    except Exception as e:
        logger.error("Command execution failed on %s: %s", device_id, e)
        return jsonify({"error": f"Unable to control device: {str(e)}"}), 500


# ----------------------------------------------------------------------
# CAMERAS API & SECURE PROXY
# ----------------------------------------------------------------------

@app.get("/api/cameras/<device_id>/snapshot")
def get_camera_snapshot(device_id):
    user, err = _require_auth()
    if err:
        return err
    device = store.get_device(user["sub"], device_id)
    if not device or device.get("type") != "camera":
        return jsonify({"error": "camera not found"}), 404

    adapter = adapter_manager.get_or_create(device)
    try:
        snapshot_bytes = adapter.get_snapshot()
        return Response(snapshot_bytes, mimetype="image/svg+xml")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/cameras/<device_id>/stream")
def get_camera_stream(device_id):
    user, err = _require_auth()
    if err:
        return err
    device = store.get_device(user["sub"], device_id)
    if not device or device.get("type") != "camera":
        return jsonify({"error": "camera not found"}), 404

    adapter = adapter_manager.get_or_create(device)
    return Response(
        adapter.generate_mjpeg_stream(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


# ----------------------------------------------------------------------
# AUTOMATIONS API
# ----------------------------------------------------------------------

@app.get("/api/automations")
def list_automations():
    user, err = _require_auth()
    if err:
        return err
    return jsonify({"automations": store.get_automations(user["sub"])})


@app.post("/api/automations")
def create_automation():
    user, err = _require_auth()
    if err:
        return err
    body = request.json or {}
    auto = store.add_automation(user["sub"], body)
    return jsonify(auto), 201


@app.delete("/api/automations/<auto_id>")
def delete_automation(auto_id):
    user, err = _require_auth()
    if err:
        return err
    if not store.delete_automation(user["sub"], auto_id):
        return jsonify({"error": "not found"}), 404
    return jsonify({"ok": True})


@app.post("/api/automations/<auto_id>/toggle")
def toggle_automation(auto_id):
    user, err = _require_auth()
    if err:
        return err
    auto = store.toggle_automation(user["sub"], auto_id)
    if not auto:
        return jsonify({"error": "not found"}), 404
    return jsonify(auto)


# ----------------------------------------------------------------------
# GATEWAY & REMOTE ACCESS API
# ----------------------------------------------------------------------

@app.get("/api/gateway/status")
def gateway_status():
    user, err = _require_auth()
    if err:
        return err
    return jsonify(store.get_gateway_status(user["sub"]))


@app.post("/api/gateway/heartbeat")
def gateway_heartbeat():
    user, err = _require_auth()
    if err:
        return err
    data = request.json or {}
    store.update_gateway_heartbeat(user["sub"], data)
    return jsonify({"ok": True})


@app.get("/api/gateway/commands")
def gateway_commands():
    user, err = _require_auth()
    if err:
        return err
    return jsonify({"commands": []})


@app.post("/api/gateway/commands/<cmd_id>/result")
def gateway_cmd_result(cmd_id):
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
