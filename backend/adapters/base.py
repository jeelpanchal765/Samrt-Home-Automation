"""
Base class for all smart home device adapters.
Provides a standard lifecycle (connect, disconnect, get_status, execute_command)
so any hardware brand or protocol can be plugged in seamlessly.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseDeviceAdapter(ABC):
    def __init__(self, device_id: str, config: Optional[Dict[str, Any]] = None):
        self.device_id = device_id
        self.config = config or {}
        self.connected = False

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection with physical hardware, LAN protocol, or cloud API."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Tear down connection."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Fetch current live state from the device or cache."""
        pass

    @abstractmethod
    def execute_command(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a hardware command (e.g. setTemperature, powerOn, volumeUp).
        Returns the updated state dict.
        """
        pass
