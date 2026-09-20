import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDot,
  Gamepad2,
  Headphones,
  Home,
  Layers3,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Radio,
  Square,
  X,
} from "lucide-react";
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
      { title: "Bảng điều khiển · Binix" },
      {
        name: "description",
        content: "Quản lý mẫu RPC, token và chế độ đồng bộ cho Discord Rich Presence.",
      },
      { property: "og:title", content: "Bảng điều khiển · Binix" },
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
  rpc_running: boolean;
};

type TokenRow = {
  id: string;
  label: string;
  masked: string;
  enabled: boolean;
  preset_id: string | null;
};

type DashboardView = "overview" | "rpc" | "voice" | "status" | "quest";

const PLATFORMS = [
  { value: "desktop", label: "Máy tính (mặc định)" },
  { value: "meta_quest", label: "Meta Quest" },
  { value: "xbox", label: "Xbox" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "ps4", label: "PlayStation 4" },
];

function Dashboard() {
  const [view, setView] = useState<DashboardView>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newToken, setNewToken] = useState({ label: "", token: "" });
  const callAddToken = useServerFn(addToken);
  const callRegen = useServerFn(regenerateRunnerKey);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, sync_mode, active_preset_id, runner_key, rpc_running")
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

  async function toggleRpc() {
    if (!profile) return;
    if (!profile.rpc_running && tokens.length === 0) {
      toast.error("Hãy thêm ít nhất một token trước khi chạy RPC");
      setView("rpc");
      return;
    }
    const running = !profile.rpc_running;
    await updateProfile({ rpc_running: running });
    toast.success(running ? "Đã gửi lệnh chạy RPC tới host" : "Đã gửi lệnh dừng RPC tới host");
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
    <div className="flex min-h-screen bg-background">
      {mobileNavOpen ? <button aria-label="Đóng menu" className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} /> : null}
      <aside className={`${mobileNavOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:flex md:h-screen ${sidebarCollapsed ? "md:w-20" : "md:w-64"} transition-[width] duration-200`}>
        <div className="flex h-12 items-center justify-between px-2">
          <div className="flex items-center gap-3 overflow-hidden"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Radio className="size-4" /></span>{!sidebarCollapsed ? <span className="font-display text-xl font-bold">Binix</span> : null}</div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu"><X /></Button>
        </div>
        <nav className="mt-7 flex-1 space-y-1" aria-label="Khu vực dashboard">
          <DashboardNavButton compact={sidebarCollapsed} active={view === "overview"} icon={Home} onClick={() => { setView("overview"); setMobileNavOpen(false); }}>Tổng quan</DashboardNavButton>
          <DashboardNavButton compact={sidebarCollapsed} active={view === "rpc"} icon={Gamepad2} onClick={() => { setView("rpc"); setMobileNavOpen(false); }}>Rich Presence</DashboardNavButton>
          <DashboardNavButton compact={sidebarCollapsed} active={view === "voice"} icon={Headphones} onClick={() => { setView("voice"); setMobileNavOpen(false); }}>Treo Voice</DashboardNavButton>
          <DashboardNavButton compact={sidebarCollapsed} active={view === "status"} icon={CircleDot} onClick={() => { setView("status"); setMobileNavOpen(false); }}>Status</DashboardNavButton>
          <DashboardNavButton compact={sidebarCollapsed} active={view === "quest"} icon={CheckCircle2} onClick={() => { setView("quest"); setMobileNavOpen(false); }}>Auto Quest</DashboardNavButton>
        </nav>
        <a href="https://discord.gg/binsito" target="_blank" rel="noreferrer" className={`mb-3 flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground ${sidebarCollapsed ? "justify-center" : "gap-3"}`} title="Hỗ trợ"><LifeBuoy className="size-4 shrink-0" />{!sidebarCollapsed ? "Hỗ trợ" : null}</a>
        <div className={`flex items-center gap-3 border-t border-sidebar-border pt-4 ${sidebarCollapsed ? "justify-center" : ""}`}>
          <img src={profile.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="size-9 shrink-0 rounded-full ring-2 ring-primary/25" />
          {!sidebarCollapsed ? <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile.username ?? "Bạn"}</p><p className="text-xs text-muted-foreground">Discord đã kết nối</p></div> : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Mở menu"><Menu /></Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
            <div><p className="text-sm font-semibold">{view === "overview" ? "Không gian điều khiển" : view === "rpc" ? "Rich Presence" : view === "voice" ? "Treo Voice" : view === "status" ? "Status" : "Auto Quest"}</p><p className="hidden text-xs text-muted-foreground sm:block">Điều khiển dịch vụ Discord từ Binix</p></div>
          </div>
          <Button variant="secondary" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}><LogOut /> <span className="hidden sm:inline">Đăng xuất</span></Button>
        </header>

      {view === "overview" ? (
        <Overview
          username={profile.username ?? "Bạn"}
          rpcCount={tokens.filter((token) => token.enabled).length}
          tokenCount={tokens.length}
          rpcRunning={profile.rpc_running}
          onOpen={setView}
          onToggleRpc={toggleRpc}
        />
      ) : view === "voice" ? (
        <FeatureEmpty
          title="Treo Voice"
          description="Treo tài khoản trong kênh voice Discord 24/7."
          itemName="Voice"
          icon={Headphones}
        />
      ) : view === "status" ? (
        <FeatureEmpty
          title="Status"
          description="Đặt trạng thái Discord và Meta VR 24/7."
          itemName="Status"
          icon={CircleDot}
        />
      ) : view === "quest" ? (
        <FeatureEmpty
          title="Auto Quest"
          description="Khu vực quản lý các tác vụ Discord Quest của bạn."
          itemName="Auto Quest"
          icon={CheckCircle2}
        />
      ) : (
      <main className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 lg:col-span-2">
          <div>
            <h1 className="text-3xl font-semibold">Rich Presence</h1>
            <p className="mt-2 text-sm text-muted-foreground">Thiết lập Rich Presence tùy chỉnh 24/7 cho từng tài khoản Discord.</p>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => toast.info("Thêm token Discord tại khu vực Token bên dưới.")}><Plus />Thêm tài khoản</Button><Button variant={profile.rpc_running ? "destructive" : "default"} onClick={toggleRpc}>{profile.rpc_running ? <Square /> : <Play />}{profile.rpc_running ? "Dừng RPC" : "Chạy RPC"}</Button></div>
        </div>
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
      )}
      <footer className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-2 border-t border-border px-5 py-5 text-xs text-muted-foreground sm:flex-row md:px-8">
        <p>© {new Date().getFullYear()} Binix</p>
        <p>Sở hữu & phát triển bởi <span className="font-semibold text-foreground">@nm6c</span> · <a href="https://discord.com" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Discord</a></p>
      </footer>
      </div>
    </div>
  );
}

function DashboardNavButton({
  active,
  icon: Icon,
  onClick,
  compact,
  children,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      title={compact ? String(children) : undefined}
      className={`h-11 w-full ${compact ? "justify-center px-0" : "justify-start px-3"} ${active ? "border border-primary/25 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
    >
      <Icon className="size-4" />
      {!compact ? children : null}
    </Button>
  );
}

function Overview({
  username,
  rpcCount,
  tokenCount,
  rpcRunning,
  onOpen,
  onToggleRpc,
}: {
  username: string;
  rpcCount: number;
  tokenCount: number;
  rpcRunning: boolean;
  onOpen: (view: DashboardView) => void;
  onToggleRpc: () => void;
}) {
  const shortcuts: Array<{ label: string; view: DashboardView; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
    { label: "Rich Presence", view: "rpc", icon: Activity, tone: "text-primary" },
    { label: "Treo Voice", view: "voice", icon: Headphones, tone: "text-voice" },
    { label: "Status", view: "status", icon: CircleDot, tone: "text-status" },
    { label: "Auto Quest", view: "quest", icon: CheckCircle2, tone: "text-quest" },
  ];

  return (
    <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Không gian của {username}</p><h1 className="mt-2 text-3xl font-semibold">Điều khiển Discord của bạn</h1><p className="mt-2 text-sm text-muted-foreground">Bật dịch vụ, đổi cấu hình và theo dõi mọi tài khoản tại một nơi.</p></div><Button variant={rpcRunning ? "destructive" : "default"} size="lg" onClick={onToggleRpc}>{rpcRunning ? <Square /> : <Play />}{rpcRunning ? "Dừng RPC" : "Chạy RPC"}</Button></div>

      <section className="overflow-hidden rounded-lg border border-border bg-card/60">
        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
          <div className="relative min-h-[300px] p-6 sm:p-8"><div className="absolute inset-y-0 left-0 w-1 bg-primary" /><div className="flex items-center gap-3"><span className={`size-2.5 rounded-full ${rpcRunning ? "bg-success shadow-[0_0_16px_var(--success)]" : "bg-muted-foreground"}`} /><span className="text-xs font-bold uppercase text-muted-foreground">{rpcRunning ? "Host đang nhận lệnh chạy" : "RPC đang dừng"}</span></div><p className="mt-12 max-w-xl text-4xl font-semibold sm:text-5xl">{rpcRunning ? `${rpcCount} tài khoản đang sẵn sàng hoạt động` : "Sẵn sàng phát Rich Presence"}</p><p className="mt-4 max-w-lg text-sm text-muted-foreground">Runner trên host tự nhận trạng thái của riêng tài khoản này. Mọi thay đổi đã lưu sẽ được áp dụng trong lần đồng bộ tiếp theo.</p><Button className="mt-8" variant="secondary" onClick={() => onOpen("rpc")}><Gamepad2 />Mở trình chỉnh RPC</Button></div>
          <div className="border-t border-border bg-background/35 p-6 lg:border-l lg:border-t-0"><p className="text-xs font-bold uppercase text-muted-foreground">Dung lượng tài khoản</p><div className="mt-6 flex items-end justify-between"><span className="text-5xl font-semibold text-primary">{tokenCount}</span><span className="pb-1 text-sm text-muted-foreground">trên 5 token</span></div><div className="mt-5 flex gap-2">{Array.from({ length: 5 }, (_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index < tokenCount ? "bg-primary" : "bg-surface-2"}`} />)}</div><p className="mt-6 text-xs leading-5 text-muted-foreground">{rpcCount} token đang bật. Bạn có thể dùng chung một mẫu hoặc gán mẫu riêng cho từng token.</p></div>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ label, view: target, icon: Icon, tone }, index) => <button key={label} onClick={() => onOpen(target)} className="group flex min-h-32 items-start justify-between rounded-lg border border-border bg-card/45 p-5 text-left transition hover:border-primary/35 hover:bg-card"><div><p className="text-xs text-muted-foreground">Kênh {String(index + 1).padStart(2, "0")}</p><p className="mt-5 font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{label === "Rich Presence" ? `${rpcCount} token đang bật` : "Khung sẵn sàng"}</p></div><span className="flex size-10 items-center justify-center rounded-lg bg-surface-2 transition group-hover:bg-primary/15"><Icon className={`size-5 ${tone}`} /></span></button>)}
      </div>
    </main>
  );
}

function FeatureEmpty({
  title,
  description,
  itemName,
  icon: Icon,
}: {
  title: string;
  description: string;
  itemName: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <main className="mx-auto min-h-[calc(100vh-190px)] max-w-[1280px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><h1 className="text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
        <Button onClick={() => toast.info(`${title} đã có khung sẵn để bạn tự kết nối phần chạy.`)}><Plus />Thêm tài khoản</Button>
      </div>
      <div className="mt-6 flex gap-2">
        <Button size="sm"><Layers3 />Tất cả <span className="rounded-full bg-primary-foreground/15 px-1.5">0</span></Button>
        <Button size="sm" variant="secondary">Không nhóm <span className="rounded-full bg-background/50 px-1.5">0</span></Button>
      </div>
      <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
        <Icon className="size-9 text-primary/65" />
        <p className="mt-4 text-sm font-medium">Chưa có tài khoản {itemName} nào trong nhóm này</p>
        <p className="mt-2 text-xs text-muted-foreground">Nhấn “Thêm tài khoản” để bắt đầu.</p>
      </div>
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-card/55 p-4 text-sm text-muted-foreground">
        <Bot className="size-5 shrink-0 text-primary" />
        <p><span className="font-semibold text-foreground">Khung giao diện đã sẵn sàng.</span> Phần chạy chưa được kết nối để bạn tự phát triển.</p>
      </div>
    </main>
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
