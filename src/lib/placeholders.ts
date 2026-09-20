/** Thay các placeholder bằng số liệu mẫu để xem trước trên web. */
const SAMPLE: Record<string, string> = {
  "temp:c": "28",
  "temp:f": "82",
  "feels:c": "31",
  "humidity": "78",
  "wind:kph": "12",
  "wind:ms": "3.3",
  "wind:dir": "ĐN",
  "weather": "⛅ Ít mây",
  "city": "Hồ Chí Minh",
  "region": "Hồ Chí Minh",
  "country": "Việt Nam",
  "cpu": "24",
  "ram": "61",
  "ping": "48",
  "uptime:days": "2",
  "uptime:hours": "07",
  "uptime:minutes": "13",
  "uptime:seconds": "45",
};

export function resolvePreview(text: string, now = new Date()): string {
  if (!text) return "";
  return text.replace(/\{([^{}]+)\}/g, (full, keyRaw: string) => {
    const key = keyRaw.trim();
    if (key === "time") return now.toLocaleTimeString("vi-VN", { hour12: false });
    if (key === "date") return now.toLocaleDateString("vi-VN");
    if (key === "clock") return "🕒";
    return SAMPLE[key] ?? full;
  });
}

export const PLACEHOLDER_HELP: { key: string; desc: string }[] = [
  { key: "{temp:c}", desc: "Nhiệt độ °C" },
  { key: "{feels:c}", desc: "Cảm giác như" },
  { key: "{humidity}", desc: "Độ ẩm %" },
  { key: "{wind:kph}", desc: "Gió km/h" },
  { key: "{weather}", desc: "Thời tiết" },
  { key: "{city}", desc: "Thành phố" },
  { key: "{cpu}", desc: "CPU %" },
  { key: "{ram}", desc: "RAM %" },
  { key: "{ping}", desc: "Ping ms" },
  { key: "{time}", desc: "Giờ hiện tại" },
  { key: "{date}", desc: "Ngày hiện tại" },
  { key: "{uptime:days}", desc: "Số ngày chạy" },
  { key: "{uptime:hours}", desc: "Số giờ" },
  { key: "{uptime:minutes}", desc: "Số phút" },
  { key: "{uptime:seconds}", desc: "Số giây" },
];
