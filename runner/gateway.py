import asyncio
import json
import time

import aiohttp

GATEWAY_URL = "wss://gateway.discord.gg/?v=9&encoding=json"

PROPERTIES = {
    "os": "Windows",
    "browser": "Discord Client",
    "device": "Discord Client",
    "system_locale": "en-US",
    "browser_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9175 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
    "browser_version": "32.2.7",
    "os_version": "10.0.26100",
    "client_version": "1.0.9175",
    "release_channel": "stable",
    "client_build_number": 268435,
    "os_arch": "x64",
    "app_arch": "x64",
}

CLIENT_STATE = {
    "guild_versions": {},
    "highest_last_message_id": "0",
    "read_state_version": 0,
    "user_guild_settings_version": -1,
    "user_settings_version": -1,
}


class GatewayClient:
    def __init__(self, token, platform=None, spoof_device=True):
        self.token = token
        self.platform = platform
        self.spoof_device = spoof_device
        self._session = None
        self._ws = None
        self._seq = 0
        self._hb_task = None
        self._hb_ack = asyncio.Event()
        self._hb_interval = 41.25
        self._last_hb = 0.0
        self.ping = 0.0
        self.ready = asyncio.Event()
        self.conn_done = asyncio.Event()
        self.stopped = False
        self.lost = False
        self.rejected = False
        self.user_name = ""

    async def start(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        self._ws = await self._session.ws_connect(GATEWAY_URL, max_msg_size=0)
        self.ready.clear()
        self.conn_done.clear()
        self.rejected = False
        self.lost = False
        self.stopped = False
        self._seq = 0
        await self._send(self._identify())
        if self._hb_task:
            self._hb_task.cancel()
        self._hb_task = asyncio.create_task(self._heartbeat())

    async def _heartbeat(self):
        while not self.stopped:
            if self._ws is None or self._ws.closed:
                await asyncio.sleep(1)
                continue
            self._last_hb = time.time()
            await self._send({"op": 1, "d": self._seq})
            try:
                await asyncio.wait_for(self._hb_ack.wait(), timeout=12)
                self.ping = (time.time() - self._last_hb) * 1000
            except asyncio.TimeoutError:
                self.ping = 0
            self._hb_ack.clear()
            await asyncio.sleep(self._hb_interval)

    async def _handle(self, data):
        op = data.get("op")
        if op == 10:
            self._hb_interval = data.get("d", {}).get("heartbeat_interval", 41250) / 1000
        elif op == 11:
            self._hb_ack.set()
        elif op == 0:
            self._seq = data.get("s", self._seq)
            if data.get("t") == "READY":
                user = data.get("d", {}).get("user", {})
                name = user.get("username") or ""
                discriminator = user.get("discriminator")
                if name:
                    self.user_name = name if discriminator in (None, "0", 0) else f"{name}#{discriminator}"
                else:
                    self.user_name = str(user.get("id", ""))
                self.ready.set()
        elif op == 9:
            self.ready.clear()
            await self._send(self._identify())
        elif op == 7:
            raise ConnectionError("gateway yêu cầu reconnect")

    async def read(self):
        try:
            async for msg in self._ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    await self._handle(json.loads(msg.data))
                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    break
        except Exception:
            pass
        self.rejected = not self.ready.is_set()
        self.lost = True
        self.stopped = True
        self.conn_done.set()

    async def set_presence(self, activity, status="online"):
        await self._send({"op": 3, "d": {"activities": [activity], "status": status, "since": 0, "afk": False}})

    async def _send(self, payload):
        if self._ws and not self._ws.closed:
            try:
                await self._ws.send_str(json.dumps(payload, ensure_ascii=False))
            except Exception:
                pass

    async def close(self):
        self.stopped = True
        if self._hb_task:
            self._hb_task.cancel()
            self._hb_task = None
        if self._ws and not self._ws.closed:
            try:
                await self._ws.close()
            except Exception:
                pass
        if self._session and not self._session.closed:
            await self._session.close()

    def _properties(self):
        properties = dict(PROPERTIES)
        if not self.spoof_device or not self.platform:
            return properties
        if self.platform in ("xbox", "ps4", "ps5", "embedded", "samsung"):
            properties["browser"] = "Discord Embedded"
            properties["device"] = "Discord Embedded"
        elif self.platform == "meta_quest":
            properties["browser"] = "Discord VR"
            properties["device"] = "Discord VR"
        return properties

    def _identify(self):
        return {
            "op": 2,
            "d": {
                "token": self.token,
                "capabilities": 16383,
                "properties": self._properties(),
                "presence": {"status": "online", "since": 0, "activities": [], "afk": False},
                "compress": False,
                "client_state": CLIENT_STATE,
            },
        }
