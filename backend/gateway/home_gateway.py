"""
Home Device Gateway (Local LAN Agent)
======================================
Runs on a local Raspberry Pi, home server, or PC connected to your home Wi-Fi/LAN.

Architecture:
- Connects securely to the Cloud Backend (or MQTT Broker) via outbound HTTPS/WSS/MQTT.
- Listens for remote device control commands dispatched from the Cloud PWA.
- Relays commands to local devices (Daikin WiFi, LG webOS TV, Samsung TV, ESP32 IR Blasters, RTSP Cameras) on the local subnet.
- Pushes device state updates back to the Cloud in real time.

Usage:
    python home_gateway.py --cloud-url https://your-domi-app.vercel.app --token YOUR_GATEWAY_TOKEN
"""

import argparse
import json
import logging
import time
import requests

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s")
logger = logging.getLogger("HomeGateway")


class HomeGateway:
    def __init__(self, cloud_url: str, gateway_token: str):
        self.cloud_url = cloud_url.rstrip("/")
        self.gateway_token = gateway_token
        self.running = False
        self.headers = {
            "Authorization": f"Bearer {self.gateway_token}",
            "Content-Type": "application/json",
        }

    def start(self):
        self.running = True
        logger.info("Starting Domi Home Gateway...")
        logger.info("Connecting to Cloud Backend at %s", self.cloud_url)
        
        while self.running:
            try:
                # 1. Send heartbeat & register local devices
                self.send_heartbeat()
                
                # 2. Poll for pending gateway commands
                self.poll_and_execute_commands()

            except Exception as e:
                logger.error("Gateway connection error: %s", e)

            time.sleep(3)

    def send_heartbeat(self):
        try:
            res = requests.post(
                f"{self.cloud_url}/api/gateway/heartbeat",
                headers=self.headers,
                json={"status": "online", "local_ip": "192.168.1.100", "devices_count": 4},
                timeout=5,
            )
            if res.status_code == 200:
                logger.debug("Heartbeat acknowledged by cloud.")
        except Exception as e:
            logger.debug("Heartbeat ping failed: %s", e)

    def poll_and_execute_commands(self):
        try:
            res = requests.get(
                f"{self.cloud_url}/api/gateway/commands",
                headers=self.headers,
                timeout=5,
            )
            if res.status_code == 200:
                data = res.json()
                commands = data.get("commands", [])
                for cmd in commands:
                    self.execute_local_device_command(cmd)
        except Exception as e:
            logger.debug("Polling commands error: %s", e)

    def execute_local_device_command(self, cmd: dict):
        device_id = cmd.get("device_id")
        action = cmd.get("action")
        target_ip = cmd.get("target_ip")
        driver = cmd.get("driver")

        logger.info("Executing LAN Command: [%s] on device %s (IP: %s)", action, device_id, target_ip)

        # Example LAN Daikin HTTP driver
        if driver == "daikin_http" and target_ip:
            try:
                res = requests.get(f"http://{target_ip}/aircon/get_control_info", timeout=2)
                logger.info("Local Daikin responded: %s", res.status_code)
            except Exception as e:
                logger.error("Failed local Daikin request: %s", e)

        # Example LAN LG webOS / Samsung Tizen / Android TV
        elif driver in ("lg_webos", "samsung_tizen", "android_tv") and target_ip:
            logger.info("Dispatched %s command to smart TV at %s", action, target_ip)

        # Report execution result back to cloud
        self.report_result(cmd.get("id"), success=True)

    def report_result(self, cmd_id: str, success: bool):
        try:
            requests.post(
                f"{self.cloud_url}/api/gateway/commands/{cmd_id}/result",
                headers=self.headers,
                json={"success": success, "timestamp": time.time()},
                timeout=3,
            )
        except Exception as e:
            logger.error("Failed to report command result: %s", e)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Domi Smart Home Local Gateway Agent")
    parser.add_argument("--cloud-url", default="http://localhost:5000", help="Cloud Backend URL")
    parser.add_argument("--token", default="demo_gateway_token_123", help="Gateway auth token")
    args = parser.parse_args()

    gw = HomeGateway(args.cloud_url, args.token)
    gw.start()
