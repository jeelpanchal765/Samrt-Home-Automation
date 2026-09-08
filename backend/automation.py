"""
Automations Engine
Manages scheduled and condition-based smart home rules.
"""

from datetime import datetime
import logging
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AutomationEngine:
    def __init__(self, store, event_hub):
        self.store = store
        self.event_hub = event_hub
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def stop(self):
        self._running = False

    def _run_loop(self):
        while self._running:
            try:
                self.evaluate_time_triggers()
            except Exception as e:
                logger.error("Error running automations: %s", e)
            time.sleep(30)  # Check every 30 seconds

    def evaluate_time_triggers(self):
        now_time = datetime.now().strftime("%H:%M")
        for user_id, automations in self.store.list_all_automations().items():
            for auto in automations:
                if not auto.get("enabled", True):
                    continue
                trigger = auto.get("trigger", {})
                if trigger.get("type") == "time" and trigger.get("time") == now_time:
                    # Check if executed recently
                    last_run = auto.get("last_run_time")
                    if last_run != now_time:
                        self.execute_automation(user_id, auto)
                        auto["last_run_time"] = now_time

    def evaluate_condition_triggers(self, user_id: str, device_id: str, new_state: Dict[str, Any]):
        automations = self.store.get_automations(user_id)
        for auto in automations:
            if not auto.get("enabled", True):
                continue
            trigger = auto.get("trigger", {})
            if trigger.get("type") == "temperature" and trigger.get("device_id") == device_id:
                target_temp = float(trigger.get("threshold", 25))
                op = trigger.get("operator", ">=")
                current_temp = float(new_state.get("temp", 0))
                
                matched = False
                if op == ">=" and current_temp >= target_temp:
                    matched = True
                elif op == "<=" and current_temp <= target_temp:
                    matched = True

                if matched:
                    self.execute_automation(user_id, auto)

    def execute_automation(self, user_id: str, auto: Dict[str, Any]):
        action = auto.get("action", {})
        device_id = action.get("device_id")
        cmd = action.get("command")
        params = action.get("params", {})

        logger.info("Executing automation '%s' for user %s -> %s %s", auto.get("name"), user_id, cmd, params)

        device = self.store.get_device(user_id, device_id)
        if not device:
            return

        if cmd == "turn_on":
            updated = self.store.update_state(user_id, device_id, {"power": True})
        elif cmd == "turn_off":
            updated = self.store.update_state(user_id, device_id, {"power": False})
        elif cmd == "set_temp":
            updated = self.store.update_state(user_id, device_id, {"temp": params.get("temp", 24)})
        elif cmd == "toggle":
            updated = self.store.toggle_power(user_id, device_id)
        else:
            updated = self.store.update_state(user_id, device_id, params)

        if updated:
            self.event_hub.publish(user_id, "device_update", updated)
            self.event_hub.publish(user_id, "automation_triggered", {
                "id": auto.get("id"),
                "name": auto.get("name"),
                "time": datetime.now().strftime("%I:%M %p"),
            })
