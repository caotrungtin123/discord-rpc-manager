# API Treo Voice & Auto Quest (Binix)

Tất cả API cho máy chạy (runner) đều xác thực bằng `runner_key` của user:

```
x-runner-key: <runner_key>
```
hoặc `?key=<runner_key>`.

Base URL: `https://discord-rpc-manager.lovable.app`

---

## 1. Voice — `/api/public/runner/voice`

### GET — lấy danh sách phiên voice

```json
{
  "account": "Bin",
  "sessions": [
    {
      "id": "uuid",
      "label": "Tài khoản 1",
      "token_id": "uuid",
      "token": "<token gốc, chỉ trả khi running = true>",
      "guild_id": "123",
      "channel_id": "456",
      "mic": true,
      "camera": false,
      "screen_share": false,
      "running": true,
      "status": "idle"
    }
  ]
}
```

- `mic`, `camera`, `screen_share`: trạng thái bật/tắt do user chọn trên web.
- `running`: user bấm chạy hay dừng.

### POST — runner báo trạng thái về web

```json
{
  "sessions": [
    { "id": "uuid", "status": "connected", "running": true, "mic": true, "camera": false, "screen_share": false }
  ]
}
```

Trả về: `{ "updated": ["uuid"] }`

---

## 2. Quest — `/api/public/runner/quest`

### GET — lấy các job quest

```json
{
  "account": "Bin",
  "jobs": [
    {
      "id": "uuid",
      "label": "Tài khoản 1",
      "token": "<token gốc>",
      "auto_run": false,
      "scan_requested": true,
      "run_requested": false,
      "status": "scan_queued",
      "quests": [
        { "quest_id": "q1", "name": "Play 15 minutes", "game": "Fortnite", "status": "pending", "progress": 40 }
      ],
      "pending_count": 1
    }
  ]
}
```

- `scan_requested = true` → runner quét danh sách quest chưa làm rồi POST kết quả.
- `run_requested = true` (hoặc `auto_run = true`) → runner tiến hành làm quest.

### POST — gửi kết quả quét / làm quest

```json
{
  "job_id": "uuid",
  "action": "scan",
  "status": "scanning",
  "quests": [
    {
      "quest_id": "q1",
      "name": "Play 15 minutes",
      "game": "Fortnite",
      "status": "pending",
      "progress": 40,
      "expires_at": "2026-10-01T00:00:00Z"
    }
  ]
}
```

- `action`: `"scan"` (xoá cờ quét, cập nhật `last_scan_at`) hoặc `"run"` (xoá cờ chạy, cập nhật `last_run_at`).
- Quest được ghi đè theo `quest_id` nên gửi lại nhiều lần đều an toàn.

Trả về: `{ "ok": true, "saved": 1, "pending_count": 1 }`

---

## 3. Hàm dùng trong dashboard

- Voice (`src/lib/voice.functions.ts`): `listVoiceSessions`, `createVoiceSession`, `updateVoiceSession` (bật/tắt mic, cam, share màn, chạy/dừng), `deleteVoiceSession`.
- Quest (`src/lib/quest.functions.ts`): `listQuestJobs`, `createQuestJob`, `updateQuestJob`, `requestQuestScan`, `requestQuestRun`, `deleteQuestJob`.

Giới hạn: tối đa 5 phiên voice và 5 job quest cho mỗi tài khoản.
