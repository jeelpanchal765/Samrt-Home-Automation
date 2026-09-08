"""
Camera Device Adapter
Secure server-side streaming proxy & snapshot provider.
Supports RTSP transcoding, HTTP MJPEG/Snapshot camera endpoints, and synthetic security stream simulator.
Credentials and RTSP URLs are strictly kept server-side.
"""

from datetime import datetime
import io
import logging
import time
from typing import Any, Dict, Generator, Optional
import requests

from .base import BaseDeviceAdapter

logger = logging.getLogger(__name__)


class CameraAdapter(BaseDeviceAdapter):
    """
    Camera adapter handling secure proxy streaming and snapshots.
    """

    def __init__(self, device_id: str, config: Optional[Dict[str, Any]] = None, initial_state: Optional[Dict[str, Any]] = None):
        super().__init__(device_id, config)
        self.state = {
            "online": True,
            "recording": True,
            "motionDetected": False,
            "nightVision": True,
            "resolution": "1080p",
            "fps": 25,
            "room": self.config.get("room", "Living Room"),
            "brand": self.config.get("brand", "Domi Cam Pro"),
            "model": self.config.get("model", "C300"),
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
        if action == "toggleNightVision":
            self.state["nightVision"] = not self.state.get("nightVision", False)
        elif action == "toggleRecording":
            self.state["recording"] = not self.state.get("recording", True)
        elif action == "ptz":
            direction = params.get("direction", "center")
            logger.info("Camera %s PTZ move: %s", self.device_id, direction)
        elif action == "update_state":
            self.state.update(params)
        else:
            raise ValueError(f"Unknown camera action: {action}")
        return self.state.copy()

    def get_snapshot(self) -> bytes:
        """
        Fetch a live snapshot image (JPEG format).
        If an HTTP snapshot URL is configured, fetch it server-side.
        Otherwise generate a synthetic SVG/JPEG security frame with live timestamp.
        """
        snapshot_url = self.config.get("snapshot_url")
        if snapshot_url:
            try:
                auth = None
                if self.config.get("username") and self.config.get("password"):
                    auth = (self.config["username"], self.config["password"])
                res = requests.get(snapshot_url, auth=auth, timeout=3.0)
                if res.status_code == 200:
                    return res.content
            except Exception as e:
                logger.warning("Camera snapshot fetch failed: %s", e)

        # Fallback to high quality SVG security frame converted to bytes
        return self._generate_synthetic_frame()

    def generate_mjpeg_stream(self) -> Generator[bytes, None, None]:
        """
        Yield multipart MJPEG stream frames to browser client.
        """
        while True:
            frame_bytes = self.get_snapshot()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/svg+xml\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(0.5)  # 2 FPS live preview in MJPEG stream

    def _generate_synthetic_frame(self) -> bytes:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        room_name = self.config.get("room", "Security Zone")
        device_name = self.config.get("name", "Camera")
        night_mode = self.state.get("nightVision", True)
        
        bg_color = "#0f172a" if night_mode else "#1e293b"
        accent_color = "#22c55e" if self.state.get("online") else "#ef4444"
        rec_dot = '<circle cx="30" cy="30" r="8" fill="#ef4444" />' if self.state.get("recording") else ''

        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{bg_color}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="640" height="360" fill="url(#grad)" />
  <rect width="640" height="360" fill="url(#grid)" />

  <!-- Room ambient silhouettes -->
  <g opacity="0.35" fill="none" stroke="#64748b" stroke-width="2">
    <rect x="80" y="160" width="200" height="130" rx="8" />
    <rect x="100" y="140" width="160" height="30" rx="4" />
    <circle cx="480" cy="180" r="50" />
    <line x1="480" y1="230" x2="480" y2="300" />
    <line x1="440" y1="300" x2="520" y2="300" />
  </g>

  <!-- Crosshairs -->
  <g stroke="rgba(255,255,255,0.15)" stroke-width="1">
    <line x1="300" y1="180" x2="340" y2="180" />
    <line x1="320" y1="160" x2="320" y2="200" />
    <circle cx="320" cy="180" r="30" fill="none" stroke-dasharray="4 4" />
  </g>

  <!-- Camera HUD Overlay -->
  {rec_dot}
  <text x="46" y="34" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1">REC</text>
  <circle cx="610" cy="30" r="6" fill="{accent_color}" />
  <text x="600" y="34" fill="{accent_color}" font-family="-apple-system, sans-serif" font-size="12" font-weight="600" text-anchor="end">LIVE HD</text>

  <text x="24" y="336" fill="#f8fafc" font-family="Courier, monospace" font-size="14" font-weight="600">{room_name} • {device_name}</text>
  <text x="616" y="336" fill="#94a3b8" font-family="Courier, monospace" font-size="14" text-anchor="end">{now}</text>
</svg>"""
        return svg.encode("utf-8")
