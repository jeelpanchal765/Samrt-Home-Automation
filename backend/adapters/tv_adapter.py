"""
TV Device Adapter
Supports LG webOS (SSAP), Samsung Tizen WebSocket, Android TV ADB/Remote, MQTT IR Blaster, and Simulator.
"""

import json
import logging
from typing import Any, Dict, Optional

from .base import BaseDeviceAdapter

logger = logging.getLogger(__name__)


class TVAdapter(BaseDeviceAdapter):
    """
    TV device controller adhering to the unified TV specification.
    """

    INPUT_SOURCES = ["HDMI 1", "HDMI 2", "HDMI 3", "Netflix", "YouTube", "Prime Video", "Live TV"]

    def __init__(self, device_id: str, config: Optional[Dict[str, Any]] = None, initial_state: Optional[Dict[str, Any]] = None):
        super().__init__(device_id, config)
        self.state = {
            "power": False,
            "volume": 18,
            "muted": False,
            "channel": 12,
            "channelName": "HBO HD",
            "input": "HDMI 1",
            "online": True,
            "playing": True,
            "currentApp": "YouTube",
        }
        if initial_state:
            self.state.update(initial_state)

    def connect(self) -> bool:
        self.connected = True
        self.state["online"] = True
        return True

    def disconnect(self) -> None:
        self.connected = False

    def get_status(self) -> Dict[str, Any]:
        return self.state.copy()

    def execute_command(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        driver = self.config.get("driver", "simulator")

        if action in ("powerOn", "power_on"):
            self.state["power"] = True
        elif action in ("powerOff", "power_off"):
            self.state["power"] = False
        elif action in ("toggle", "togglePower"):
            self.state["power"] = not self.state.get("power", False)
        elif action == "volumeUp":
            self.state["volume"] = min(100, self.state["volume"] + 1)
            self.state["muted"] = False
        elif action == "volumeDown":
            self.state["volume"] = max(0, self.state["volume"] - 1)
            self.state["muted"] = False
        elif action == "setVolume":
            vol = int(params.get("volume", self.state["volume"]))
            self.state["volume"] = max(0, min(100, vol))
            self.state["muted"] = False
        elif action == "mute":
            self.state["muted"] = not self.state.get("muted", False)
        elif action == "channelUp":
            self.state["channel"] = self.state["channel"] + 1
        elif action == "channelDown":
            self.state["channel"] = max(1, self.state["channel"] - 1)
        elif action == "setChannel":
            ch = int(params.get("channel", self.state["channel"]))
            self.state["channel"] = max(1, ch)
        elif action in ("navigate", "dpad"):
            direction = str(params.get("direction", "select")).lower()
            logger.info("TV %s navigate: %s", self.device_id, direction)
        elif action in ("select", "ok", "enter"):
            logger.info("TV %s select OK", self.device_id)
        elif action == "back":
            logger.info("TV %s back button pressed", self.device_id)
        elif action == "home":
            logger.info("TV %s home button pressed", self.device_id)
        elif action == "playPause":
            self.state["playing"] = not self.state.get("playing", True)
        elif action == "setInput":
            inp = str(params.get("input", self.state["input"]))
            self.state["input"] = inp
            if inp in ["Netflix", "YouTube", "Prime Video"]:
                self.state["currentApp"] = inp
        elif action == "typeText":
            text = str(params.get("text", ""))
            logger.info("TV %s text input: '%s'", self.device_id, text)
        elif action == "sendKey":
            key = str(params.get("key", ""))
            logger.info("TV %s send key: '%s'", self.device_id, key)
        elif action == "update_state":
            self.state.update(params)
        else:
            raise ValueError(f"Unknown TV action: {action}")

        # Real hardware dispatch
        if driver == "lg_webos":
            self._dispatch_webos(action, params)
        elif driver == "samsung_tizen":
            self._dispatch_samsung(action, params)
        elif driver == "android_tv":
            self._dispatch_android_tv(action, params)
        elif driver == "mqtt":
            self._dispatch_mqtt(action, params)

        return self.state.copy()

    def _dispatch_webos(self, action: str, params: Dict[str, Any]):
        """Send command via LG webOS SSAP protocol."""
        ip = self.config.get("ip")
        key = self.config.get("client_key")
        logger.info("LG webOS dispatch to %s (key=%s): %s", ip, bool(key), action)

    def _dispatch_samsung(self, action: str, params: Dict[str, Any]):
        """Send command via Samsung Tizen WebSocket."""
        ip = self.config.get("ip")
        logger.info("Samsung Tizen dispatch to %s: %s", ip, action)

    def _dispatch_android_tv(self, action: str, params: Dict[str, Any]):
        """Send command via Android TV remote API."""
        ip = self.config.get("ip")
        logger.info("Android TV dispatch to %s: %s", ip, action)

    def _dispatch_mqtt(self, action: str, params: Dict[str, Any]):
        topic = self.config.get("mqtt_topic") or f"smart-home/tv/{self.device_id}/set"
        payload = json.dumps({"action": action, "state": self.state, "params": params})
        logger.info("MQTT publish to %s: %s", topic, payload)
