"""
Runner chạy trên host của bạn.

Nó không đọc config.json nữa: cứ 30 giây nó tải cấu hình mới nhất từ dashboard
web và áp dụng cho từng token. Mọi thay đổi bạn bấm trên web sẽ tự có hiệu lực.

Cách chạy:
    pip install -r requirements.txt
    python runner.py --key <RUNNER_KEY> --api https://ten-mien-cua-ban

Có thể dùng biến môi trường thay cho tham số:
    RPC_RUNNER_KEY, RPC_API_URL
"""

import os
import sys
import json
import asyncio
import argparse

import requests

from rpc import RpcClient, DEFAULT_APP_ID, PLATFORM_LABEL

POLL_SECONDS = 30


def parse_args():
    p = argparse.ArgumentParser(description="Discord RPC runner (đọc cấu hình từ web dashboard)")
    p.add_argument("--key", default=os.environ.get("RPC_RUNNER_KEY", ""), help="Khoá runner lấy trên dashboard")
    p.add_argument("--api", default=os.environ.get("RPC_API_URL", ""), help="Địa chỉ web dashboard")
    p.add_argument("--interval", type=int, default=POLL_SECONDS, help="Số giây giữa hai lần tải cấu hình")
    return p.parse_args()


def fetch_config(api_url, key):
    url = api_url.rstrip("/") + "/api/public/runner/config"
    r = requests.get(url, headers={"x-runner-key": key}, timeout=10)
    if r.status_code == 401:
        raise RuntimeError("Khoá runner không đúng. Lấy lại khoá trên dashboard.")
    r.raise_for_status()
    return r.json()


def to_rpc_config(entry_config):
    """Đổi dữ liệu từ web sang đúng định dạng mà RpcClient mong đợi."""
    cfg = {
        "name": [entry_config.get("name") or ""],
        "platform": entry_config.get("platform") or "",
        "text-1": [entry_config.get("text-1") or ""],
        "text-2": [entry_config.get("text-2") or ""],
        "text-3": [entry_config.get("text-3") or ""],
        "bigimg": [entry_config.get("bigimg") or ""],
        "smallimg": [entry_config.get("smallimg") or ""],
        "options": entry_config.get("options") or {},
        "app_id": entry_config.get("app_id") or DEFAULT_APP_ID,
    }
    for key in ("button-1", "button-2"):
        btn = entry_config.get(key)
        cfg[key] = [btn] if btn else []
    return {
        "setup": {
            "city": entry_config.get("city") or "",
            "city_enabled": bool(entry_config.get("city_enabled")),
        },
        "config": cfg,
    }


class TokenWorker:
    def __init__(self, label, token, entry_config):
        self.label = label
        self.token = token
        self.signature = json.dumps(entry_config, sort_keys=True, ensure_ascii=False)
        self.config = to_rpc_config(entry_config)
        self.task = None

    def mode_label(self):
        platform = self.config["config"].get("platform")
        return PLATFORM_LABEL.get(platform, "Desktop")

    def start(self):
        client = RpcClient(self.config, self.mode_label(), self.config["config"]["app_id"], self.token)
        self.task = asyncio.create_task(self._run(client))

    async def _run(self, client):
        try:
            await client.run()
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            print(f" [!] {self.label}: lỗi {e}")

    async def stop(self):
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
            self.task = None


async def main_async(args):
    workers = {}
    while True:
        try:
            data = fetch_config(args.api, args.key)
        except Exception as e:  # noqa: BLE001
            print(f" [!] Không tải được cấu hình: {e}")
            await asyncio.sleep(args.interval)
            continue

        is_running = bool(data.get("running"))
        entries = (data.get("tokens") or []) if is_running else []
        seen = set()
        for entry in entries:
            token = entry.get("token")
            if not token:
                continue
            label = entry.get("label") or "Token"
            seen.add(token)
            signature = json.dumps(entry.get("config") or {}, sort_keys=True, ensure_ascii=False)
            worker = workers.get(token)
            if worker and worker.signature == signature and worker.task and not worker.task.done():
                continue
            if worker:
                await worker.stop()
            worker = TokenWorker(label, token, entry.get("config") or {})
            workers[token] = worker
            worker.start()
            print(f" [+] {label}: áp dụng mẫu \"{(entry.get('config') or {}).get('label', '')}\"")

        for token in list(workers):
            if token not in seen:
                await workers[token].stop()
                print(f" [-] {workers[token].label}: đã tắt")
                del workers[token]

        if not workers:
            if is_running:
                print(" [i] Chưa có token nào đang bật trên dashboard.")
            else:
                print(" [i] RPC đang dừng theo lệnh từ dashboard.")

        await asyncio.sleep(args.interval)


def main():
    args = parse_args()
    if not args.key or not args.api:
        print(" [!] Thiếu --key hoặc --api. Xem lệnh mẫu trên dashboard.")
        sys.exit(1)
    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\n [!] Đã dừng")


if __name__ == "__main__":
    main()
