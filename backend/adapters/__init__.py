"""
Adapter registry and factory for all smart home devices.
"""

from typing import Any, Dict, Optional
from .base import BaseDeviceAdapter
from .ac_adapter import ACAdapter
from .tv_adapter import TVAdapter
from .camera_adapter import CameraAdapter


class GenericDeviceAdapter(BaseDeviceAdapter):
    """Fallback adapter for lights, plugs, fans, locks, curtains."""

    def __init__(self, device_id: str, device_type: str, config: Optional[Dict[str, Any]] = None, initial_state: Optional[Dict[str, Any]] = None):
        super().__init__(device_id, config)
        self.device_type = device_type
        self.state = {"online": True}
        if initial_state:
            self.state.update(initial_state)

    def connect(self) -> bool:
        self.connected = True
        return True

    def disconnect(self) -> None:
        self.connected = False

    def get_status(self) -> Dict[str, Any]:
        return self.state.copy()

    def execute_command(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        if action in ("toggle", "togglePower"):
            if "power" in self.state:
                self.state["power"] = not self.state["power"]
            elif "locked" in self.state:
                self.state["locked"] = not self.state["locked"]
        elif action == "update_state":
            self.state.update(params)
        return self.state.copy()


class AdapterManager:
    """Manages active device adapter instances across users."""

    def __init__(self):
        self._adapters: Dict[str, BaseDeviceAdapter] = {}

    def get_or_create(self, device: Dict[str, Any]) -> BaseDeviceAdapter:
        device_id = device["id"]
        if device_id in self._adapters:
            return self._adapters[device_id]

        device_type = device.get("type", "light")
        config = device.get("config", {})
        initial_state = device.get("state", {})

        if device_type == "ac":
            adapter = ACAdapter(device_id, config, initial_state)
        elif device_type == "tv":
            adapter = TVAdapter(device_id, config, initial_state)
        elif device_type in ("camera", "cctv"):
            adapter = CameraAdapter(device_id, config, initial_state)
        else:
            adapter = GenericDeviceAdapter(device_id, device_type, config, initial_state)

        adapter.connect()
        self._adapters[device_id] = adapter
        return adapter

    def remove(self, device_id: str):
        if device_id in self._adapters:
            try:
                self._adapters[device_id].disconnect()
            finally:
                del self._adapters[device_id]


adapter_manager = AdapterManager()
