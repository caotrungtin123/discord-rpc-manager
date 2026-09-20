import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  Gamepad2,
  Headphones,
  Home,
  Layers3,
  Plus,
  Radio,
  ShieldCheck,
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
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="hidden size-9 items-center justify-center rounded-lg bg-primary sm:flex">
              <Radio className="size-4 text-primary-foreground" />
            </div>
            <img
              src={profile.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"}
              alt=""
              className="h-10 w-10 rounded-full ring-2 ring-primary/30"
            />
            <div>
              <p className="text-sm font-semibold">{profile.username ?? "Bạn"}</p>
              <p className="text-xs text-muted-foreground">Binix Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://discord.gg/binsito"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3.5 text-sm font-semibold text-foreground backdrop-blur-xl transition hover:border-primary/40 hover:text-primary"
            >
              Hỗ trợ
            </a>
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
        </div>
        <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 md:px-8" aria-label="Khu vực dashboard">
          <DashboardNavButton active={view === "overview"} icon={Home} onClick={() => setView("overview")}>Tổng quan</DashboardNavButton>
          <DashboardNavButton active={view === "rpc"} icon={Gamepad2} onClick={() => setView("rpc")}>Rich Presence</DashboardNavButton>
          <DashboardNavButton active={view === "voice"} icon={Headphones} onClick={() => setView("voice")}>Treo Voice</DashboardNavButton>
          <DashboardNavButton active={view === "status"} icon={CircleDot} onClick={() => setView("status")}>Status</DashboardNavButton>
          <DashboardNavButton active={view === "quest"} icon={CheckCircle2} onClick={() => setView("quest")}>Auto Quest</DashboardNavButton>
        </nav>
      </header>

      {view === "overview" ? (
        <Overview
          username={profile.username ?? "Bạn"}
          rpcCount={tokens.filter((token) => token.enabled).length}
          tokenCount={tokens.length}
          onOpen={setView}
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
      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 lg:col-span-2">
          <div>
            <h1 className="text-3xl font-semibold">Rich Presence</h1>
            <p className="mt-2 text-sm text-muted-foreground">Thiết lập Rich Presence tùy chỉnh 24/7 cho từng tài khoản Discord.</p>
          </div>
          <Button onClick={() => toast.info("Thêm token Discord tại khu vực Token bên dưới.")}><Plus />Thêm tài khoản</Button>
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
      <footer className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 border-t border-border px-5 py-5 text-xs text-muted-foreground sm:flex-row md:px-8">
        <p>© {new Date().getFullYear()} Binix</p>
        <p>Sở hữu & phát triển bởi <span className="font-semibold text-foreground">@nm6c</span> · <a href="https://discord.com" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Discord</a></p>
      </footer>
    </div>
  );
}

function DashboardNavButton({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`h-11 shrink-0 rounded-none border-b-2 px-3 ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}

function Overview({
  username,
  rpcCount,
  tokenCount,
  onOpen,
}: {
  username: string;
  rpcCount: number;
  tokenCount: number;
  onOpen: (view: DashboardView) => void;
}) {
  const stats = [
    { label: "RPC", value: rpcCount, detail: "đang chạy", icon: Activity, tone: "text-primary" },
    { label: "Voice", value: 0, detail: "đang chạy", icon: Headphones, tone: "text-voice" },
    { label: "Status", value: 0, detail: "đang chạy", icon: CircleDot, tone: "text-status" },
    { label: "Auto Quest", value: 0, detail: "đang chạy", icon: CheckCircle2, tone: "text-quest" },
    { label: "Online lâu nhất", value: "—", detail: "0 phiên", icon: Clock3, tone: "text-muted-foreground" },
    { label: "Gói hiện tại", value: "Free", detail: "Gói miễn phí", icon: ShieldCheck, tone: "text-foreground" },
  ];
  const shortcuts: Array<{ label: string; view: DashboardView; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
    { label: "Rich Presence", view: "rpc", icon: Activity, tone: "text-primary" },
    { label: "Treo Voice", view: "voice", icon: Headphones, tone: "text-voice" },
    { label: "Status", view: "status", icon: CircleDot, tone: "text-status" },
    { label: "Auto Quest", view: "quest", icon: CheckCircle2, tone: "text-quest" },
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      <div className="mb-7">
        <h1 className="text-3xl font-semibold">Chào mừng trở lại, {username}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Theo dõi tất cả các phiên Discord đang hoạt động của bạn dưới đây.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-border bg-card/55 p-4 transition-colors hover:bg-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{label}</p>
              <span className="flex size-9 items-center justify-center rounded-full bg-surface-2"><Icon className={`size-4 ${tone}`} /></span>
            </div>
            <p className={`mt-4 text-2xl font-semibold ${tone}`}>{value}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-h-[440px] rounded-lg border border-border bg-card/45 p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Phiên đang hoạt động</h2><span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{rpcCount}</span></div>
          <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-primary/50 text-primary"><Radio className="size-5" /></span>
            <p className="mt-4 text-sm font-medium">{rpcCount ? `${rpcCount} phiên RPC đang được bật` : "Chưa có phiên nào hoạt động"}</p>
            <p className="mt-2 text-xs text-muted-foreground">Chuyển sang Rich Presence, Voice, Status hoặc Auto Quest để bắt đầu.</p>
          </div>
        </section>
        <aside className="rounded-lg border border-border bg-card/45 p-4">
          <h2 className="text-xs font-bold uppercase">Phân bổ phiên</h2>
          <div className="mt-4 space-y-4">
            {shortcuts.map(({ label, tone }) => (
              <div key={label}><div className="mb-2 flex justify-between text-xs"><span className={`font-semibold ${tone}`}>{label}</span><span className="text-muted-foreground">{label === "Rich Presence" ? rpcCount : 0}/5</span></div><div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: label === "Rich Presence" ? `${Math.min(100, rpcCount * 20)}%` : "0%" }} /></div></div>
            ))}
          </div>
          <div className="my-5 border-t border-border" />
          <h2 className="text-xs font-bold uppercase">Truy cập nhanh</h2>
          <div className="mt-3 space-y-2">
            {shortcuts.map(({ label, view: target, icon: Icon, tone }) => (
              <Button key={label} variant="secondary" onClick={() => onOpen(target)} className="h-11 w-full justify-start"><Icon className={`size-4 ${tone}`} />{label}</Button>
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">{tokenCount} token đã thêm</p>
        </aside>
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
