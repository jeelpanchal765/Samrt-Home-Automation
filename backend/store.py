import copy
import uuid

DEVICE_TYPES = {"light", "ac", "fan", "tv", "plug", "lock", "curtain"}
ROOMS = ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Balcony", "Garage"]


def _default_state(device_type: str) -> dict:
    defaults = {
        "light": {"power": False, "brightness": 80},
        "ac": {"power": False, "temp": 24, "mode": "cool", "fan": 0},
        "fan": {"power": False, "speed": 1},
        "tv": {"power": False, "volume": 20},
        "plug": {"power": False},
        "lock": {"locked": True},
        "curtain": {"open": 0},
    }
    return copy.deepcopy(defaults.get(device_type, {"power": False}))


def _sample_devices() -> list[dict]:
    return [
        {"name": "Ceiling Light", "type": "light", "room": "Living Room", "state": {"power": True, "brightness": 70}},
        {"name": "Daikin AC", "type": "ac", "room": "Living Room", "state": {"power": False, "temp": 24, "mode": "cool", "fan": 0}},
        {"name": "Smart TV", "type": "tv", "room": "Living Room", "state": {"power": False, "volume": 25}},
        {"name": "Bedroom Light", "type": "light", "room": "Bedroom", "state": {"power": False, "brightness": 50}},
        {"name": "Ceiling Fan", "type": "fan", "room": "Bedroom", "state": {"power": False, "speed": 2}},
        {"name": "Front Door", "type": "lock", "room": "Garage", "state": {"locked": True}},
        {"name": "Coffee Maker", "type": "plug", "room": "Kitchen", "state": {"power": False}},
        {"name": "Window Curtain", "type": "curtain", "room": "Bedroom", "state": {"open": 0}},
    ]


class DeviceStore:
    def __init__(self):
        self._devices: dict[str, list[dict]] = {}

    def _ensure_user(self, user_id: str):
        if user_id not in self._devices:
            self._devices[user_id] = [
                {**d, "id": str(uuid.uuid4())} for d in _sample_devices()
            ]

    def list_devices(self, user_id: str, room: str | None = None) -> list[dict]:
        self._ensure_user(user_id)
        devices = self._devices[user_id]
        if room:
            devices = [d for d in devices if d["room"] == room]
        return [copy.deepcopy(d) for d in devices]

    def add_device(self, user_id: str, name: str, device_type: str, room: str) -> dict:
        self._ensure_user(user_id)
        if device_type not in DEVICE_TYPES:
            raise ValueError("invalid device type")
        if room not in ROOMS:
            raise ValueError("invalid room")
        device = {
            "id": str(uuid.uuid4()),
            "name": name.strip(),
            "type": device_type,
            "room": room,
            "state": _default_state(device_type),
        }
        self._devices[user_id].append(device)
        return copy.deepcopy(device)

    def delete_device(self, user_id: str, device_id: str) -> bool:
        self._ensure_user(user_id)
        before = len(self._devices[user_id])
        self._devices[user_id] = [d for d in self._devices[user_id] if d["id"] != device_id]
        return len(self._devices[user_id]) < before

    def get_device(self, user_id: str, device_id: str) -> dict | None:
        self._ensure_user(user_id)
        for d in self._devices[user_id]:
            if d["id"] == device_id:
                return copy.deepcopy(d)
        return None

    def update_state(self, user_id: str, device_id: str, updates: dict) -> dict | None:
        self._ensure_user(user_id)
        for d in self._devices[user_id]:
            if d["id"] == device_id:
                d["state"].update(updates)
                return copy.deepcopy(d)
        return None

    def toggle_power(self, user_id: str, device_id: str) -> dict | None:
        device = self.get_device(user_id, device_id)
        if not device:
            return None
        state = device["state"]
        if "power" in state:
            return self.update_state(user_id, device_id, {"power": not state["power"]})
        if "locked" in state:
            return self.update_state(user_id, device_id, {"locked": not state["locked"]})
        return None
