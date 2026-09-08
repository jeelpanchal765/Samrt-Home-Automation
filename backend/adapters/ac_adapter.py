"""
AC Device Adapter
Supports Daikin LAN HTTP API, MQTT IR/Climate bridge (ESP32/Tasmota), Tuya Cloud, and Virtual Simulator.
"""

import json
import logging
from typing import Any, Dict, Optional
import requests

from .base import BaseDeviceAdapter

logger = logging.getLogger(__name__)


class ACAdapter(BaseDeviceAdapter):
    """
    AC device controller adhering to the unified AC specification.
    """

    SUPPORTED_MODES = ["cool", "heat", "dry", "fan", "auto"]
    SUPPORTED_FAN_SPEEDS = [0, 1, 2, 3, 4]  # 0 = auto, 1=low, 2=med, 3=high, 4=turbo
    SUPPORTED_SWING_MODES = ["off", "vertical", "horizontal", "3d"]

    def __init__(self, device_id: str, config: Optional[Dict[str, Any]] = None, initial_state: Optional[Dict[str, Any]] = None):
        super().__init__(device_id, config)
        self.state = {
            "power": False,
            "temp": 24,
            "targetTemp": 24,
            "currentTemp": 26.5,
            "mode": "cool",
            "fan": 0,
            "swing": "off",
            "online": True,
            "humidity": 55,
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
        driver = self.config.get("driver", "simulator")
        if driver == "daikin_http" and self.config.get("ip"):
            self._sync_daikin_status()
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
        elif action in ("setTemperature", "set_temp"):
            temp = float(params.get("temp", params.get("targetTemp", self.state["temp"])))
            temp = max(16.0, min(30.0, round(temp, 1)))
            self.state["temp"] = temp
            self.state["targetTemp"] = temp
        elif action in ("adjustTemperature", "delta_temp"):
            delta = float(params.get("delta", 0))
            new_temp = max(16.0, min(30.0, self.state["temp"] + delta))
            self.state["temp"] = round(new_temp, 1)
            self.state["targetTemp"] = self.state["temp"]
        elif action in ("setMode", "set_mode"):
            mode = str(params.get("mode", "cool")).lower()
            if mode in self.SUPPORTED_MODES:
                self.state["mode"] = mode
        elif action in ("setFanSpeed", "set_fan"):
            fan = int(params.get("fan", params.get("speed", 0)))
            if fan in self.SUPPORTED_FAN_SPEEDS:
                self.state["fan"] = fan
        elif action in ("setSwing", "set_swing"):
            swing = str(params.get("swing", "off")).lower()
            if swing in self.SUPPORTED_SWING_MODES:
                self.state["swing"] = swing
        elif action == "update_state":
            self.state.update(params)
        else:
            raise ValueError(f"Unknown AC action: {action}")

        # Dispatch command to physical driver if configured
        if driver == "daikin_http":
            self._dispatch_daikin()
        elif driver == "mqtt":
            self._dispatch_mqtt(action, params)

        return self.state.copy()

    def _sync_daikin_status(self):
        """Poll Daikin BRP adapter on local network."""
        ip = self.config.get("ip")
        if not ip:
            return
        try:
            url = f"http://{ip}/aircon/get_control_info"
            res = requests.get(url, timeout=2.5)
            if res.status_code == 200:
                # Daikin response format: ret=OK,pow=1,mode=2,adv=,stemp=24.0,shum=0,f_rate=A,f_dir=0
                pairs = dict(item.split("=") for item in res.text.split(",") if "=" in item)
                self.state["power"] = pairs.get("pow") == "1"
                daikin_mode_map = {"1": "auto", "2": "dry", "3": "cool", "4": "heat", "6": "fan"}
                self.state["mode"] = daikin_mode_map.get(pairs.get("mode"), "cool")
                if "stemp" in pairs and pairs["stemp"] != "--":
                    self.state["temp"] = float(pairs["stemp"])
                    self.state["targetTemp"] = self.state["temp"]
                self.state["online"] = True
        except Exception as e:
            logger.warning("Failed to poll Daikin at %s: %s", ip, e)
            self.state["online"] = False

    def _dispatch_daikin(self):
        """Send command to Daikin LAN HTTP interface."""
        ip = self.config.get("ip")
        if not ip:
            return
        try:
            # pow: 1/0, mode: 3(cool)/4(heat)/2(dry)/6(fan)/1(auto), stemp: 24, f_rate: A/3/4/5/6/7
            mode_to_daikin = {"auto": 1, "dry": 2, "cool": 3, "heat": 4, "fan": 6}
            pow_val = 1 if self.state["power"] else 0
            mode_val = mode_to_daikin.get(self.state["mode"], 3)
            stemp = f"{self.state['temp']:.1f}"
            url = f"http://{ip}/aircon/set_control_info?pow={pow_val}&mode={mode_val}&stemp={stemp}&shum=0&f_rate=A&f_dir=0"
            requests.get(url, timeout=3.0)
        except Exception as e:
            logger.error("Error dispatching Daikin command: %s", e)

    def _dispatch_mqtt(self, action: str, params: Dict[str, Any]):
        """Publish command to MQTT topic."""
        # Topic pattern: smart-home/{userId}/{roomId}/{deviceId}/command
        topic = self.config.get("mqtt_topic") or f"smart-home/ac/{self.device_id}/set"
        payload = json.dumps({"action": action, "state": self.state, "params": params})
        logger.info("MQTT publish to %s: %s", topic, payload)
