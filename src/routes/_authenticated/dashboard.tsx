import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addToken, regenerateRunnerKey } from "@/lib/rpc.functions";
import { RpcPreview } from "@/components/RpcPreview";
import { PLACEHOLDER_HELP } from "@/lib/placeholders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Bảng điều khiển · RPC Studio" },
      {
        name: "description",
        content: "Quản lý mẫu RPC, token và chế độ đồng bộ cho Discord Rich Presence.",
      },
      { property: "og:title", content: "Bảng điều khiển · RPC Studio" },
      { property: "og:description", content: "Quản lý mẫu RPC và token Discord của bạn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Preset = {
  id: string;
  name: string;
  activity_name: string;
  text_1: string;
  text_2: string;
  text_3: string;
  big_img: string;
  small_img: string;
  button_1_name: string;
  button_1_url: string;
  button_2_name: string;
  button_2_url: string;
  platform: string;
  duration: number;
  elapsed: number;
  spoof_device: boolean;
  city: string;
  position: number;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  sync_mode: boolean;
  active_preset_id: string | null;
  runner_key: string;
};

type TokenRow = {
  id: string;
  label: string;
  masked: string;
  enabled: boolean;
  preset_id: string | null;
};

const PLATFORMS = [
  { value: "desktop", label: "Máy tính (mặc định)" },
  { value: "meta_quest", label: "Meta Quest" },
  { value: "xbox", label: "Xbox" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "ps4", label: "PlayStation 4" },
];

function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newToken, setNewToken] = useState({ label: "", token: "" });
  const callAddToken = useServerFn(addToken);
  const callRegen = useServerFn(regenerateRunnerKey);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, sync_mode, active_preset_id, runner_key")
      .eq("id", uid)
      .maybeSingle();

    let { data: rows } = await supabase
      .from("presets")
      .select("*")
      .eq("user_id", uid)
      .order("position", { ascending: true });

    if (!rows || rows.length === 0) {
      const { data: created } = await supabase
        .from("presets")
        .insert({
          user_id: uid,
          name: "Mẫu 1",
          activity_name: "Sleep",
          text_2: "🌡️ {temp:c} °C | 🍃 {wind:kph} km/h",
          text_3: "⏱ {uptime:days}d {uptime:hours}h {uptime:minutes}m",
          position: 0,
        })
        .select("*");
      rows = created ?? [];
    }

    const { data: tk } = await supabase
      .from("tokens")
      .select("id, label, masked, enabled, preset_id")
      .eq("user_id", uid)
      .order("position", { ascending: true });

    setProfile((prof as Profile) ?? null);
    setPresets((rows as Preset[]) ?? []);
    setTokens((tk as TokenRow[]) ?? []);
    setCurrentId((prev) => prev ?? (rows?.[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(
    () => presets.find((p) => p.id === currentId) ?? presets[0] ?? null,
    [presets, currentId],
  );

  function patchCurrent(patch: Partial<Preset>) {
    if (!current) return;
    setPresets((list) => list.map((p) => (p.id === current.id ? { ...p, ...patch } : p)));
  }

  async function savePreset() {
    if (!current) return;
    setSaving(true);
    const { id, position, ...fields } = current;
    void position;
    const { error } = await supabase.from("presets").update(fields).eq("id", id);
    setSaving(false);
    if (error) toast.error("Lưu thất bại: " + error.message);
    else toast.success("Đã lưu mẫu RPC");
  }

  async function addPreset() {
    if (!profile) return;
    if (presets.length >= 5) {
      toast.error("Tối đa 5 mẫu RPC");
      return;
    }
    const { data, error } = await supabase
      .from("presets")
      .insert({
        user_id: profile.id,
        name: `Mẫu ${presets.length + 1}`,
        position: presets.length,
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Không thêm được mẫu");
      return;
    }
    setPresets((l) => [...l, data as Preset]);
    setCurrentId((data as Preset).id);
  }

  async function deletePreset(id: string) {
    if (presets.length <= 1) {
      toast.error("Cần giữ ít nhất 1 mẫu");
      return;
    }
    const { error } = await supabase.from("presets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rest = presets.filter((p) => p.id !== id);
    setPresets(rest);
    if (currentId === id) setCurrentId(rest[0]?.id ?? null);
  }

  async function updateProfile(patch: Partial<Profile>) {
    if (!profile) return;
    setProfile({ ...profile, ...patch });
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    if (error) toast.error(error.message);
  }

  async function handleAddToken() {
    if (!newToken.label.trim() || newToken.token.trim().length < 20) {
      toast.error("Nhập tên gợi nhớ và token hợp lệ");
      return;
    }
    try {
      await callAddToken({ data: { label: newToken.label.trim(), token: newToken.token.trim() } });
      setNewToken({ label: "", token: "" });
      toast.success("Đã thêm token");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thêm được token");
    }
  }

  async function updateToken(id: string, patch: Partial<TokenRow>) {
    setTokens((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("tokens").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function deleteToken(id: string) {
    const { error } = await supabase.from("tokens").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTokens((l) => l.filter((t) => t.id !== id));
  }

  if (loading || !current || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const runnerCmd = `python runner.py --key ${profile.runner_key} --api ${typeof window !== "undefined" ? window.location.origin : ""}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"}
              alt=""
              className="h-10 w-10 rounded-full ring-2 ring-primary/30"
            />
            <div>
              <p className="text-sm font-semibold">{profile.username ?? "Bạn"}</p>
              <p className="text-xs text-muted-foreground">Bảng điều khiển RPC</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:py-8">
        <div className="space-y-5">
          {/* Mẫu RPC */}
          <section className="glass-panel animate-rise-in p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentId(p.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                    p.id === current.id
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border bg-surface-2/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {p.name}
                </button>
              ))}
              {presets.length < 5 ? (
                <Button size="sm" variant="secondary" onClick={addPreset}>
                  + Thêm mẫu
                </Button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Tên mẫu">
                <Input value={current.name} onChange={(e) => patchCurrent({ name: e.target.value })} />
              </Field>
              <Field label="Tên hoạt động">
                <Input
                  value={current.activity_name}
                  onChange={(e) => patchCurrent({ activity_name: e.target.value })}
                />
              </Field>
              <Field label="Dòng 1">
                <Input value={current.text_1} onChange={(e) => patchCurrent({ text_1: e.target.value })} />
              </Field>
              <Field label="Dòng 2">
                <Input value={current.text_2} onChange={(e) => patchCurrent({ text_2: e.target.value })} />
              </Field>
              <Field label="Dòng 3">
                <Input value={current.text_3} onChange={(e) => patchCurrent({ text_3: e.target.value })} />
              </Field>
              <Field label="Thành phố (thời tiết)">
                <Input value={current.city} onChange={(e) => patchCurrent({ city: e.target.value })} />
              </Field>
              <Field label="Ảnh lớn (URL)">
                <Input value={current.big_img} onChange={(e) => patchCurrent({ big_img: e.target.value })} />
              </Field>
              <Field label="Ảnh nhỏ (URL)">
                <Input
                  value={current.small_img}
                  onChange={(e) => patchCurrent({ small_img: e.target.value })}
                />
              </Field>
              <Field label="Nút 1 · tên">
                <Input
                  value={current.button_1_name}
                  onChange={(e) => patchCurrent({ button_1_name: e.target.value })}
                />
              </Field>
              <Field label="Nút 1 · liên kết">
                <Input
                  value={current.button_1_url}
                  onChange={(e) => patchCurrent({ button_1_url: e.target.value })}
                />
              </Field>
              <Field label="Nút 2 · tên">
                <Input
                  value={current.button_2_name}
                  onChange={(e) => patchCurrent({ button_2_name: e.target.value })}
                />
              </Field>
              <Field label="Nút 2 · liên kết">
                <Input
                  value={current.button_2_url}
                  onChange={(e) => patchCurrent({ button_2_url: e.target.value })}
                />
              </Field>
              <Field label="Thiết bị hiển thị">
                <Select
                  value={current.platform}
                  onValueChange={(v) => patchCurrent({ platform: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Thời lượng (giây)">
                <Input
                  type="number"
                  value={current.duration}
                  onChange={(e) => patchCurrent({ duration: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Đã trôi qua (giây)">
                <Input
                  type="number"
                  value={current.elapsed}
                  onChange={(e) => patchCurrent({ elapsed: Number(e.target.value) || 0 })}
                />
              </Field>
              <div className="flex items-end gap-3">
                <Switch
                  checked={current.spoof_device}
                  onCheckedChange={(v) => patchCurrent({ spoof_device: v })}
                  id="spoof"
                />
                <Label htmlFor="spoof">Giả lập thiết bị</Label>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={savePreset} disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu mẫu này"}
              </Button>
              <Button variant="ghost" onClick={() => deletePreset(current.id)}>
                Xoá mẫu
              </Button>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-background/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground">Placeholder dùng được</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLACEHOLDER_HELP.map((h) => (
                  <span key={h.key} className="rounded-md border border-border bg-background/50 px-2 py-1 text-[11px]">
                    <code>{h.key}</code> <span className="text-muted-foreground">{h.desc}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Token */}
          <section className="glass-panel animate-rise-in p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Token ({tokens.length}/5)</h2>
              <div className="flex items-center gap-3">
                <Label htmlFor="sync" className="text-sm text-muted-foreground">
                  {profile.sync_mode ? "Đồng bộ 1 mẫu" : "Mỗi token 1 mẫu"}
                </Label>
                <Switch
                  id="sync"
                  checked={profile.sync_mode}
                  onCheckedChange={(v) => updateProfile({ sync_mode: v })}
                />
              </div>
            </div>

            {profile.sync_mode ? (
              <div className="mt-4 max-w-xs">
                <Field label="Mẫu dùng chung">
                  <Select
                    value={profile.active_preset_id ?? current.id}
                    onValueChange={(v) => updateProfile({ active_preset_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/30 p-3.5 transition-colors hover:bg-surface-2"
                >
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => updateToken(t.id, { enabled: v })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{t.masked}</p>
                  </div>
                  {!profile.sync_mode ? (
                    <Select
                      value={t.preset_id ?? ""}
                      onValueChange={(v) => updateToken(t.id, { preset_id: v })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Chọn mẫu" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => deleteToken(t.id)}>
                    Xoá
                  </Button>
                </div>
              ))}
              {tokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có token nào.</p>
              ) : null}
            </div>

            {tokens.length < 5 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                <Input
                  placeholder="Tên gợi nhớ"
                  value={newToken.label}
                  onChange={(e) => setNewToken((s) => ({ ...s, label: e.target.value }))}
                />
                <Input
                  type="password"
                  placeholder="Dán token Discord"
                  value={newToken.token}
                  onChange={(e) => setNewToken((s) => ({ ...s, token: e.target.value }))}
                />
                <Button onClick={handleAddToken}>Thêm</Button>
              </div>
            ) : null}
          </section>

          {/* Runner */}
          <section className="glass-panel animate-rise-in p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Kết nối máy chạy (runner)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chạy lệnh này một lần trên host của bạn. Runner tự tải cấu hình mới mỗi 30 giây.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                {runnerCmd}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(runnerCmd);
                  toast.success("Đã sao chép");
                }}
              >
                Sao chép
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={async () => {
                try {
                  const res = await callRegen({});
                  setProfile({ ...profile, runner_key: res.runner_key });
                  toast.success("Đã tạo khoá mới");
                } catch {
                  toast.error("Không tạo được khoá mới");
                }
              }}
            >
              Tạo khoá mới
            </Button>
          </section>
        </div>

        <aside className="glass-panel animate-rise-in p-5 lg:sticky lg:top-24 lg:self-start [animation-delay:100ms]">
          <p className="mb-4 flex items-center justify-between text-sm font-semibold text-foreground">Xem trước</p>
          <RpcPreview
            preset={current}
            username={profile.username ?? "Bạn"}
            avatarUrl={profile.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"}
          />
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
