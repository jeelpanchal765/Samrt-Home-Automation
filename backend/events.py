"""
Real-time Server-Sent Events (SSE) Event Hub
Allows mobile PWA clients to receive instant state changes without polling.
"""

import json
import logging
import queue
from typing import Dict, List

logger = logging.getLogger(__name__)


class EventHub:
    def __init__(self):
        # Maps user_id -> list of subscriber queues
        self._subscribers: Dict[str, List[queue.Queue]] = {}

    def subscribe(self, user_id: str) -> queue.Queue:
        q = queue.Queue(maxsize=100)
        if user_id not in self._subscribers:
            self._subscribers[user_id] = []
        self._subscribers[user_id].append(q)
        return q

    def unsubscribe(self, user_id: str, q: queue.Queue):
        if user_id in self._subscribers:
            try:
                self._subscribers[user_id].remove(q)
            except ValueError:
                pass
            if not self._subscribers[user_id]:
                del self._subscribers[user_id]

    def publish(self, user_id: str, event_type: str, data: dict):
        if user_id not in self._subscribers:
            return

        message = json.dumps({"type": event_type, "data": data})
        stale_queues = []

        for q in self._subscribers[user_id]:
            try:
                q.put_nowait(message)
            except queue.Full:
                stale_queues.append(q)

        for q in stale_queues:
            self.unsubscribe(user_id, q)


event_hub = EventHub()
