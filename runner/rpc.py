import os
import sys
import json
import time
import asyncio
from datetime import datetime

import requests

from placeholders import PlaceholderEngine
from gateway import GatewayClient

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
TOKEN_FILE = os.path.join(BASE_DIR, "tokens.txt")
DEFAULT_APP_ID = "1504319607975051294"

PLATFORMS = {
    "1": "Meta Quest",
    "2": "Xbox",
    "3": "PlayStation",
}

ALIASES = {
    "quest": "Meta Quest",
    "meta": "Meta Quest",
    "metaquest": "Meta Quest",
    "xbox": "Xbox",
    "ps": "PlayStation",
    "ps5": "PlayStation",
    "playstation": "PlayStation",
}

MODE_PLATFORM = {
    "Meta Quest": "meta_quest",
    "Xbox": "xbox",
    "PlayStation": "ps5",
}

PLATFORM_LABEL = {
    "meta_quest": "Meta Quest",
    "xbox": "Xbox",
    "ps4": "PlayStation 4",
    "ps5": "PlayStation 5",
    "samsung": "Samsung",
    "desktop": "Desktop",
    "android": "Android",
    "ios": "iOS",
    "embedded": "Embedded",
}


class Colors:
    reset = "\033[0m"
    cyan = "\033[96m"
    yellow = "\033[93m"
    red = "\033[91m"
    green = "\033[92m"
    magenta = "\033[95m"
    white = "\033[97m"
    bold = "\033[1m"
    dim = "\033[2m"


def show_intro():
    os.system("cls" if os.name == "nt" else "clear")
    print(f"\n {Colors.magenta}╔{'═' * 30}╗{Colors.reset}")
    print(f" {Colors.magenta}║{Colors.reset} {Colors.bold}{Colors.cyan}{'DISCORD RPC'.center(28)}{Colors.reset} {Colors.magenta}║{Colors.reset}")
    print(f" {Colors.magenta}║{Colors.reset} {Colors.dim}{'console tool'.center(28)}{Colors.reset} {Colors.magenta}║{Colors.reset}")
    print(f" {Colors.magenta}╚{'═' * 30}╝{Colors.reset}\n")


def pick_mode(argv):
    args = [a.lower() for a in argv]
    if "--mode" in args:
        i = args.index("--mode")
        if i + 1 < len(args):
            val = args[i + 1].lower()
            if val in ALIASES:
                return ALIASES[val]
            for key, name in PLATFORMS.items():
                if val == key or val == name.lower():
                    return name
    show_intro()
    print(f" {Colors.cyan}Chọn mode để hiện lên Discord:{Colors.reset}")
    print(f"   {Colors.green}[1]{Colors.reset} Meta Quest")
    print(f"   {Colors.green}[2]{Colors.reset} Xbox")
    print(f"   {Colors.green}[3]{Colors.reset} PlayStation")
    while True:
        try:
            choice = input(f"\n {Colors.yellow}[?]{Colors.reset} Nhập 1, 2 hoặc 3: ").strip()
        except (KeyboardInterrupt, EOFError):
            sys.exit(0)
        if choice in PLATFORMS:
            return PLATFORMS[choice]
        print(f" {Colors.red}[!] Nhập lại, chỉ chọn được 1, 2 hoặc 3{Colors.reset}")


def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f" {Colors.red}[!] Không thấy file config.json{Colors.reset}")
        sys.exit(1)
    try:
        with open(CONFIG_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f" {Colors.red}[!] Lỗi đọc config.json: {e}{Colors.reset}")
        sys.exit(1)


def get_token(config):
    token = config.get("token") or (config.get("config") or {}).get("token") or ""
    if not token and os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    token = line
                    break
    if not token:
        print(f" {Colors.yellow}[?]{Colors.reset} Dán token vào đây rồi Enter:")
        try:
            token = input().strip()
        except (KeyboardInterrupt, EOFError):
            sys.exit(0)
    return token


def get_seconds_opt(argv):
    if "--seconds" in argv:
        i = argv.index("--seconds")
        if i + 1 < len(argv):
            try:
                return int(argv[i + 1])
            except ValueError:
                return 0
    return 0


def register_asset(token, app_id, url):
    if not url:
        return url
    try:
        headers = {"Authorization": token, "Content-Type": "application/json"}
        r = requests.post(
            f"https://discord.com/api/v9/applications/{app_id}/external-assets",
            headers=headers,
            json={"urls": [url]},
            timeout=3,
        )
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                path = data[0].get("external_asset_path", "")
                if path:
                    return f"mp:{path}"
    except Exception:
        pass
    return url


def preload_assets(token, app_id, large_url, small_url):
    cache = {}
    if large_url:
        cache["large"] = register_asset(token, app_id, large_url)
    if small_url:
        cache["small"] = register_asset(token, app_id, small_url)
    return cache


class RichActivity:
    def __init__(self, **kwargs):
        self._name = kwargs.get("name")
        self._type = kwargs.get("force_type", kwargs.get("type", 0))
        self._details = kwargs.get("details")
        self._state = kwargs.get("state")
        self._url = kwargs.get("url")
        self._assets = kwargs.get("assets")
        self._buttons = kwargs.get("buttons")
        self._timestamps = kwargs.get("timestamps")
        self._app_id = kwargs.get("application_id") or DEFAULT_APP_ID
        self._metadata = kwargs.get("metadata")
        self._platform = kwargs.get("platform")

    def to_dict(self):
        d = {"name": self._name, "type": int(self._type), "application_id": self._app_id, "flags": 1}
        if self._platform:
            d["platform"] = self._platform
        if self._details is not None:
            d["details"] = self._details
        if self._state is not None:
            d["state"] = self._state
        if self._url:
            d["url"] = self._url
        if self._assets:
            d["assets"] = self._assets
        if self._buttons:
            d["buttons"] = self._buttons
        if self._timestamps:
            d["timestamps"] = self._timestamps
        if self._metadata:
            d["metadata"] = self._metadata
        return d


class RpcClient:
    def __init__(self, config, mode, app_id, token, seconds=0):
        self.config = config
        self.mode = mode
        self.app_id = app_id
        self.token = token
        self.seconds = seconds
        self.start_time = time.time()
        self.engine = PlaceholderEngine(start_time=self.start_time)
        self.asset_cache = {}
        self.index = 0
        self.gw = None

    def pick(self, lst):
        if not lst:
            return ""
        return lst[self.index % len(lst)]

    def build_activity(self):
        now = datetime.now()
        cfg = self.config.get("config", {}) or {}
        opts = cfg.get("options", {}) or {}
        app_id = cfg.get("app_id") or self.app_id

        details = self.engine.resolve(self.pick(cfg.get("text-1")), now)
        state = self.engine.resolve(self.pick(cfg.get("text-2")), now)
        hover = self.engine.resolve(self.pick(cfg.get("text-3")), now)

        name = self.engine.resolve(self.pick(cfg.get("name")), now) or self.mode
        platform = cfg.get("platform") or MODE_PLATFORM.get(self.mode)
        if platform not in PLATFORM_LABEL:
            platform = None

        large_url = self.pick(cfg.get("bigimg"))
        small_url = self.pick(cfg.get("smallimg"))
        cache_key = f"{large_url}|{small_url}"
        if self.asset_cache.get("_key") != cache_key:
            if self.token and app_id and (large_url or small_url):
                cache = preload_assets(self.token, app_id, large_url, small_url)
                cache["_key"] = cache_key
                self.asset_cache = cache
            else:
                self.asset_cache = {"large": large_url, "small": small_url, "_key": cache_key}

        assets = {}
        for slot in ("large", "small"):
            val = self.asset_cache.get(slot)
            if val and not val.startswith(("http://", "https://")):
                assets[f"{slot}_image"] = val
        if hover:
            assets["large_text"] = hover
            assets["small_text"] = hover

        buttons = []
        button_urls = []
        for key in ("button-1", "button-2"):
            items = cfg.get(key) or []
            if not items:
                continue
            item = items[self.index % len(items)]
            if not isinstance(item, dict):
                continue
            label = self.engine.resolve(item.get("name"), now)
            url = self.engine.resolve(item.get("url"), now)
            if label:
                buttons.append(label)
                button_urls.append(url)

        timestamps = None
        duration = opts.get("duration")
        if duration:
            try:
                duration = int(duration)
                elapsed = int(opts.get("elapsed") or 0)
                start_ms = int((time.time() - elapsed) * 1000)
                end_ms = start_ms + int(duration * 1000)
                timestamps = {"start": start_ms, "end": end_ms}
            except (ValueError, TypeError):
                timestamps = None

        activity = RichActivity(
            name=name,
            type=0,
            details=details or None,
            state=state or None,
            assets=assets or None,
            buttons=buttons or None,
            timestamps=timestamps,
            application_id=app_id,
            platform=platform,
            metadata={"button_urls": button_urls} if button_urls else {},
        )
        return activity, details, state

    def delay(self):
        cfg = self.config.get("config", {}) or {}
        delay = (cfg.get("options") or {}).get("delay") or 5
        try:
            delay = float(delay)
            if delay <= 0:
                delay = 5
        except (ValueError, TypeError):
            delay = 5
        return delay

    async def run(self):
        cfg = self.config.get("config", {}) or {}
        platform = cfg.get("platform") or MODE_PLATFORM.get(self.mode)
        if platform not in PLATFORM_LABEL:
            platform = None
        spoof_device = (cfg.get("options") or {}).get("spoof_device", True)
        while True:
            gw = GatewayClient(self.token, platform=platform, spoof_device=spoof_device)
            self.gw = gw
            reader = None
            try:
                await gw.start()
                reader = asyncio.create_task(gw.read())
                ready_wait = asyncio.create_task(gw.ready.wait())
                conn_wait = asyncio.create_task(gw.conn_done.wait())
                done, pending = await asyncio.wait(
                    {ready_wait, conn_wait},
                    timeout=30,
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for t in pending:
                    t.cancel()
                if not gw.ready.is_set():
                    if gw.rejected:
                        print(f" {Colors.red}[!] Token sai hoặc hết hạn, kiểm tra lại token đi bạn{Colors.reset}")
                        return
                    print(f" {Colors.red}[!] Kết nối bị đứt trước khi nhận READY, thử lại...{Colors.reset}")
                    await asyncio.sleep(3)
                    continue
                self.engine.ping = gw.ping
                print(f"\n {Colors.green}[+] Đăng nhập thành công: {Colors.white}{gw.user_name}{Colors.reset}")
                print(f" {Colors.green}[+] Mode: {Colors.white}{self.mode}{Colors.reset}")
                if platform:
                    print(f" {Colors.green}[+] Platform: {Colors.white}{PLATFORM_LABEL[platform]}{Colors.reset}")
                if self.seconds:
                    asyncio.create_task(self._auto_stop(gw))
                while not gw.stopped:
                    self.engine.ping = gw.ping
                    activity, details, state = await asyncio.to_thread(self.build_activity)
                    await gw.set_presence(activity.to_dict())
                    suffix = f" trên {PLATFORM_LABEL[platform]}" if platform else ""
                    print(f" {Colors.cyan}[>]{Colors.reset} Đang hiện: {Colors.white}{activity.to_dict()['name']}{suffix}{Colors.reset} | {Colors.dim}{details} | {state}{Colors.reset}")
                    self.index += 1
                    await asyncio.sleep(self.delay())
                if gw.lost:
                    print(f" {Colors.red}[!] Mất kết nối, thử kết nối lại...{Colors.reset}")
                    await asyncio.sleep(3)
                    continue
                return
            except asyncio.CancelledError:
                raise
            except Exception as e:
                print(f" {Colors.red}[!] Lỗi kết nối ({e}), thử lại sau 3s...{Colors.reset}")
                await asyncio.sleep(3)
            finally:
                if reader:
                    reader.cancel()
                await gw.close()

    async def _auto_stop(self, gw):
        await asyncio.sleep(self.seconds)
        gw.stopped = True


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
    except Exception:
        pass
    config = load_config()
    mode = pick_mode(sys.argv)
    token = get_token(config)
    app_id = (config.get("config") or {}).get("app_id") or DEFAULT_APP_ID
    seconds = get_seconds_opt(sys.argv)

    if not token:
        print(f" {Colors.red}[!] Chưa có token{Colors.reset}")
        sys.exit(1)

    print(f" {Colors.cyan}[>]{Colors.reset} Đang kết nối Discord với mode {Colors.white}{mode}{Colors.reset} ...")
    client = RpcClient(config, mode, app_id, token, seconds)
    try:
        asyncio.run(client.run())
    except KeyboardInterrupt:
        print(f"\n {Colors.yellow}[!] Đã dừng{Colors.reset}")
        sys.exit(0)


if __name__ == "__main__":
    main()
