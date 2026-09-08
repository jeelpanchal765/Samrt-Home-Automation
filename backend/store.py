"""
Device and Automation Store
Manages multi-tenant user devices, automations, gateway connections, and adapter dispatches.
"""

import copy
import uuid
from typing import Any, Dict, List, Optional
from adapters import adapter_manager

DEVICE_TYPES = {"light", "ac", "fan", "tv", "camera", "plug", "lock", "curtain"}
ROOMS = ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Balcony", "Garage", "Office"]


def _default_state(device_type: str) -> dict:
    defaults = {
        "light": {"power": False, "brightness": 80, "online": True},
        "ac": {
            "power": True,
            "temp": 23.0,
            "targetTemp": 23.0,
            "currentTemp": 25.5,
            "mode": "cool",
            "fan": 0,
            "swing": "vertical",
            "online": True,
            "humidity": 52,
        },
        "fan": {"power": False, "speed": 1, "online": True},
        "tv": {
            "power": True,
            "volume": 22,
            "muted": False,
            "channel": 8,
            "channelName": "Netflix",
            "input": "Netflix",
            "online": True,
            "playing": True,
        },
        "camera": {
            "online": True,
            "recording": True,
            "nightVision": True,
            "motionDetected": False,
            "resolution": "1080p",
            "fps": 30,
        },
        "plug": {"power": False, "online": True},
        "lock": {"locked": True, "online": True},
        "curtain": {"open": 0, "online": True},
    }
    return copy.deepcopy(defaults.get(device_type, {"power": False, "online": True}))


def _sample_devices() -> list[dict]:
    return [
        {
            "name": "Living Room AC",
            "type": "ac",
            "room": "Living Room",
            "brand": "Daikin",
            "model": "Inverter BRP069",
            "config": {"driver": "simulator", "ip": "192.168.1.50"},
            "state": _default_state("ac"),
        },
        {
            "name": "Living Room OLED TV",
            "type": "tv",
            "room": "Living Room",
            "brand": "LG",
            "model": "C2 OLED 55\"",
            "config": {"driver": "simulator", "ip": "192.168.1.60"},
            "state": _default_state("tv"),
        },
        {
            "name": "Front Door Security Cam",
            "type": "camera",
            "room": "Garage",
            "brand": "Domi Cam Pro",
            "model": "C300 PTZ",
            "config": {"driver": "simulator", "stream_type": "mjpeg"},
            "state": _default_state("camera"),
        },
        {
            "name": "Living Room Camera",
            "type": "camera",
            "room": "Living Room",
            "brand": "Domi Cam 2K",
            "model": "Indoor 2K",
            "config": {"driver": "simulator", "stream_type": "mjpeg"},
            "state": {**_default_state("camera"), "nightVision": False},
        },
        {
            "name": "Main Ceiling Light",
            "type": "light",
            "room": "Living Room",
            "brand": "Philips Hue",
            "model": "White & Color",
            "config": {"driver": "simulator"},
            "state": {"power": True, "brightness": 75, "online": True},
        },
        {
            "name": "Bedroom AC",
            "type": "ac",
            "room": "Bedroom",
            "brand": "Mitsubishi",
            "model": "Electric Heavy",
            "config": {"driver": "simulator"},
            "state": {
                "power": False,
                "temp": 24.0,
                "targetTemp": 24.0,
                "currentTemp": 27.0,
                "mode": "cool",
                "fan": 1,
                "swing": "off",
                "online": True,
                "humidity": 58,
            },
        },
        {
            "name": "Bedroom Fan",
            "type": "fan",
            "room": "Bedroom",
            "brand": "Atomberg",
            "model": "Renesa Smart",
            "config": {"driver": "simulator"},
            "state": {"power": True, "speed": 2, "online": True},
        },
        {
            "name": "Front Entrance Lock",
            "type": "lock",
            "room": "Garage",
            "brand": "August",
            "model": "Smart Lock Pro",
            "config": {"driver": "simulator"},
            "state": {"locked": True, "online": True},
        },
        {
            "name": "Kitchen Coffee Maker",
            "type": "plug",
            "room": "Kitchen",
            "brand": "TP-Link Kasa",
            "model": "KP115",
            "config": {"driver": "simulator"},
            "state": {"power": False, "online": True},
        },
    ]


def _sample_automations(devices: list[dict]) -> list[dict]:
    ac_id = next((d["id"] for d in devices if d["type"] == "ac"), None)
    tv_id = next((d["id"] for d in devices if d["type"] == "tv"), None)
    
    return [
        {
            "id": str(uuid.uuid4()),
            "name": "Cool Home at 7:00 PM",
            "enabled": True,
            "trigger": {"type": "time", "time": "19:00"},
            "action": {"device_id": ac_id, "command": "turn_on", "params": {"temp": 22}},
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Auto Off TV at Midnight",
            "enabled": True,
            "trigger": {"type": "time", "time": "23:59"},
            "action": {"device_id": tv_id, "command": "turn_off"},
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Eco AC limit when temp reaches 25°C",
            "enabled": False,
            "trigger": {"type": "temperature", "device_id": ac_id, "threshold": 25, "operator": ">="},
            "action": {"device_id": ac_id, "command": "set_temp", "params": {"temp": 25}},
        },
    ]


class DeviceStore:
    def __init__(self):
        self._devices: Dict[str, List[Dict[str, Any]]] = {}
        self._automations: Dict[str, List[Dict[str, Any]]] = {}
        self._gateway_status: Dict[str, Dict[str, Any]] = {}
        self._gateway_commands: Dict[str, List[Dict[str, Any]]] = {}

    def _ensure_user(self, user_id: str):
        if user_id not in self._devices:
            devs = [{**d, "id": str(uuid.uuid4())} for d in _sample_devices()]
            self._devices[user_id] = devs
            self._automations[user_id] = _sample_automations(devs)
            self._gateway_status[user_id] = {
                "online": True,
                "version": "1.0.4",
                "connectedAt": "Just now",
                "localIp": "192.168.1.100",
                "paired": True,
            }
            self._gateway_commands[user_id] = []

    def list_devices(self, user_id: str, room: Optional[str] = None, device_type: Optional[str] = None) -> List[Dict[str, Any]]:
        self._ensure_user(user_id)
        devices = self._devices[user_id]
        if room and room != "All":
            devices = [d for d in devices if d.get("room") == room]
        if device_type and device_type != "All":
            devices = [d for d in devices if d.get("type") == device_type]
        
        # Strip internal passwords/secrets before returning to client
        safe_devices = []
        for d in devices:
            d_copy = copy.deepcopy(d)
            if "config" in d_copy:
                d_copy["config"].pop("password", None)
                d_copy["config"].pop("auth_token", None)
                d_copy["config"].pop("client_secret", None)
            safe_devices.append(d_copy)
        return safe_devices

    def get_device(self, user_id: str, device_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_user(user_id)
        for d in self._devices[user_id]:
            if d["id"] == device_id:
                return copy.deepcopy(d)
        return None

    def add_device(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_user(user_id)
        name = payload.get("name", "").strip()
        device_type = payload.get("type", "")
        room = payload.get("room", "Living Room")
        brand = payload.get("brand", "Generic")
        model = payload.get("model", "")
        config = payload.get("config", {})

        if not name:
            raise ValueError("Device name is required")
        if device_type not in DEVICE_TYPES:
            raise ValueError(f"Invalid device type: {device_type}")
        if room not in ROOMS and room != "All":
            ROOMS.append(room)

        device = {
            "id": str(uuid.uuid4()),
            "name": name,
            "type": device_type,
            "room": room,
            "brand": brand,
            "model": model,
            "config": config,
            "state": _default_state(device_type),
        }
        self._devices[user_id].append(device)
        return copy.deepcopy(device)

    def delete_device(self, user_id: str, device_id: str) -> bool:
        self._ensure_user(user_id)
        before = len(self._devices[user_id])
        self._devices[user_id] = [d for d in self._devices[user_id] if d["id"] != device_id]
        adapter_manager.remove(device_id)
        return len(self._devices[user_id]) < before

    def update_state(self, user_id: str, device_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self._ensure_user(user_id)
        for d in self._devices[user_id]:
            if d["id"] == device_id:
                d["state"].update(updates)
                # Keep adapter updated
                adapter = adapter_manager.get_or_create(d)
                adapter.execute_command("update_state", updates)
                return copy.deepcopy(d)
        return None

    def toggle_power(self, user_id: str, device_id: str) -> Optional[Dict[str, Any]]:
        device = self.get_device(user_id, device_id)
        if not device:
            return None
        state = device["state"]
        if "power" in state:
            return self.update_state(user_id, device_id, {"power": not state["power"]})
        if "locked" in state:
            return self.update_state(user_id, device_id, {"locked": not state["locked"]})
        return None

    def execute_command(self, user_id: str, device_id: str, action: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        device = self.get_device(user_id, device_id)
        if not device:
            return None
        
        adapter = adapter_manager.get_or_create(device)
        new_state = adapter.execute_command(action, params)
        return self.update_state(user_id, device_id, new_state)

    # Automations
    def get_automations(self, user_id: str) -> List[Dict[str, Any]]:
        self._ensure_user(user_id)
        return copy.deepcopy(self._automations.get(user_id, []))

    def list_all_automations(self) -> Dict[str, List[Dict[str, Any]]]:
        return self._automations

    def add_automation(self, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_user(user_id)
        auto = {
            "id": str(uuid.uuid4()),
            "name": payload.get("name", "New Automation"),
            "enabled": payload.get("enabled", True),
            "trigger": payload.get("trigger", {}),
            "action": payload.get("action", {}),
        }
        self._automations[user_id].append(auto)
        return copy.deepcopy(auto)

    def delete_automation(self, user_id: str, auto_id: str) -> bool:
        self._ensure_user(user_id)
        before = len(self._automations[user_id])
        self._automations[user_id] = [a for a in self._automations[user_id] if a["id"] != auto_id]
        return len(self._automations[user_id]) < before

    def toggle_automation(self, user_id: str, auto_id: str) -> Optional[Dict[str, Any]]:
        self._ensure_user(user_id)
        for a in self._automations[user_id]:
            if a["id"] == auto_id:
                a["enabled"] = not a.get("enabled", True)
                return copy.deepcopy(a)
        return None

    # Gateway
    def get_gateway_status(self, user_id: str) -> Dict[str, Any]:
        self._ensure_user(user_id)
        return copy.deepcopy(self._gateway_status.get(user_id, {"online": False, "paired": False}))

    def update_gateway_heartbeat(self, user_id: str, data: Dict[str, Any]):
        self._ensure_user(user_id)
        self._gateway_status[user_id] = {
            "online": True,
            "lastSeen": "Just now",
            **data,
        }
