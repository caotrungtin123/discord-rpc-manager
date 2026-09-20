import re
import time
import random as _random
from datetime import datetime

import psutil
import requests

WMO = {
    (0,): ("☀️", "Trời quang"),
    (1, 2): ("⛅", "Ít mây"),
    (3,): ("☁️", "Nhiều mây"),
    (45, 48): ("🌫️", "Sương mù"),
    (51, 52, 53, 55, 56, 57): ("🌦️", "Mưa phùn"),
    (61, 63, 65, 66, 67): ("🌧️", "Mưa"),
    (71, 73, 75, 77): ("❄️", "Tuyết rơi"),
    (80, 81, 82): ("🌦️", "Mưa rào"),
    (85, 86): ("🌨️", "Mưa tuyết"),
    (95, 96, 99): ("⛈️", "Giông bão"),
}

COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
ARROWS = ["⬆️", "↗️", "↗️", "➡️", "➡️", "↘️", "↘️", "⬇️", "⬇️", "↙️", "↙️", "⬅️", "⬅️", "↖️", "↖️", "⬆️"]
CLOCKS = ["🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚"]


def _default_geo_fetcher():
    r = requests.get("https://ipwho.is/", timeout=5)
    r.raise_for_status()
    d = r.json()
    return {
        "city": d.get("city") or "",
        "region": d.get("region") or "",
        "country": d.get("country") or "",
        "latitude": d.get("latitude"),
        "longitude": d.get("longitude"),
    }


def _default_weather_fetcher(lat, lon):
    if lat is None or lon is None:
        return None
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code",
        "timezone": "auto",
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=5)
    r.raise_for_status()
    return r.json().get("current") or {}


class PlaceholderEngine:
    def __init__(self, start_time=None, ping=0.0, geo_fetcher=None, weather_fetcher=None,
                 cpu_fetcher=None, ram_fetcher=None):
        self.start_time = start_time or time.time()
        self.ping = float(ping)
        self._geo_fetcher = geo_fetcher or _default_geo_fetcher
        self._weather_fetcher = weather_fetcher or _default_weather_fetcher
        self._cpu_fetcher = cpu_fetcher or (lambda: psutil.cpu_percent(interval=None))
        self._ram_fetcher = ram_fetcher or (lambda: psutil.virtual_memory().percent)
        self._geo = None
        self._geo_at = 0.0
        self._weather = None
        self._weather_at = 0.0

    def resolve(self, text, now=None):
        if text is None:
            return ""
        text = str(text)
        text = re.sub(r"\{random\(([^)]*)\)\}", self._random_replace, text)
        text = re.sub(r"\{(\w+)(?::([\w%]+))?\}", lambda m: self._placeholder(m.group(1), m.group(2), now), text)
        return text

    def _random_replace(self, m):
        values = [v.strip() for v in m.group(1).split(",") if v.strip()]
        return _random.choice(values) if values else ""

    def _get_geo(self):
        now = time.time()
        if self._geo is None or now - self._geo_at > 3600:
            try:
                self._geo = self._geo_fetcher() or {}
            except Exception:
                self._geo = {}
            self._geo_at = now
        return self._geo

    def _get_weather(self):
        now = time.time()
        if self._weather is None or now - self._weather_at > 600:
            try:
                geo = self._get_geo()
                self._weather = self._weather_fetcher(geo.get("latitude"), geo.get("longitude")) or {}
            except Exception:
                self._weather = {}
            self._weather_at = now
        return self._weather

    def _placeholder(self, key, sub, now):
        now = now or datetime.now()
        if key == "ping":
            return str(int(self.ping))
        if key == "cpu":
            if sub == "usage":
                return f"{round(self._cpu_fetcher(), 1):g}"
            if sub == "speed":
                try:
                    mhz = psutil.cpu_freq().current
                except Exception:
                    mhz = 0
                return f"{mhz / 1000:.2f}"
            return ""
        if key == "ram":
            return f"{round(self._ram_fetcher(), 1):g}"
        if key == "uptime":
            total = int(time.time() - self.start_time)
            d, rem = divmod(total, 86400)
            h, rem = divmod(rem, 3600)
            m, s = divmod(rem, 60)
            if sub == "days":
                return str(d)
            if sub == "hours":
                return str(h)
            if sub == "minutes":
                return str(m)
            if sub == "seconds":
                return str(s)
            return str(total)
        if key == "hour":
            return str(now.hour % 12 or 12)
        if key == "hour24":
            return str(now.hour)
        if key == "min":
            return str(now.minute)
        if key == "date":
            return str(now.day)
        if key == "month":
            return str(now.month)
        if key == "year":
            return str(now.year)
        if key == "city":
            return str(self._get_geo().get("city", ""))
        if key == "region":
            return str(self._get_geo().get("region", ""))
        if key == "country":
            return str(self._get_geo().get("country", ""))
        if key == "temp":
            w = self._get_weather()
            c = w.get("temperature_2m")
            if c is None:
                return ""
            c = float(c)
            if sub == "f":
                return str(round(c * 9 / 5 + 32, 1))
            if sub == "apparent":
                a = w.get("apparent_temperature")
                return str(round(float(a), 1)) if a is not None else ""
            return str(round(c, 1))
        if key == "weather":
            code = self._get_weather().get("weather_code")
            if code is None:
                return ""
            try:
                code = int(code)
            except Exception:
                return ""
            for group, (emoji, desc) in WMO.items():
                if code in group:
                    return emoji if sub == "emoji" else desc
            return ""
        if key == "wind":
            w = self._get_weather()
            spd = w.get("wind_speed_10m")
            if spd is None:
                return ""
            spd = float(spd)
            if sub == "mph":
                return str(round(spd * 0.621371, 1))
            if sub in ("dir", "dir_emoji"):
                deg = w.get("wind_direction_10m")
                if deg is None:
                    return ""
                idx = round(float(deg) / 22.5) % 16
                return COMPASS[idx] if sub == "dir" else ARROWS[idx]
            return str(round(spd, 1))
        if key == "pressure":
            v = self._get_weather().get("surface_pressure")
            return str(round(float(v), 1)) if v is not None else ""
        if key == "humidity":
            v = self._get_weather().get("relative_humidity_2m")
            return str(round(float(v))) if v is not None else ""
        if key == "cloud":
            v = self._get_weather().get("cloud_cover")
            return str(round(float(v))) if v is not None else ""
        if key == "emoji":
            if sub == "time":
                return "☀️" if 6 <= now.hour < 18 else "🌙"
            if sub == "clock":
                return CLOCKS[now.hour % 12]
            return ""
        return f"{{{key}:{sub}}}" if sub else f"{{{key}}}"
