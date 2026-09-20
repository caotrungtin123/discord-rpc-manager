import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Eye, EyeOff, LoaderCircle, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteItem,
  adminRevealToken,
  adminUpdatePreset,
  adminUpdateProfile,
  adminUpdateToken,
  getAdminUsers,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AdminPreset = {
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
  city_enabled: boolean;
};

type AdminToken = { id: string; label: string; masked: string; enabled: boolean; preset_id: string | null };
type AdminUser = {
  id: string;
  discord_id: string | null;
  username: string | null;
  avatar_url: string | null;
  sync_mode: boolean;
  active_preset_id: string | null;
  rpc_running: boolean;
  created_at: string;
  presets: AdminPreset[];
  tokens: AdminToken[];
};

export function AdminDashboard() {
  const fetchUsers = useServerFn(getAdminUsers);
  const updateProfile = useServerFn(adminUpdateProfile);
  const updatePreset = useServerFn(adminUpdatePreset);
  const updateToken = useServerFn(adminUpdateToken);
  const revealToken = useServerFn(adminRevealToken);
  const deleteItem = useServerFn(adminDeleteItem);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedTokens, setRevealedTokens] = useState<Record<string, string>>({});
  const [revealingTokenId, setRevealingTokenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "user" | "preset" | "token"; id: string; userId: string; label: string } | null>(null);

  async function reload() {
    try {
      const data = await fetchUsers();
      setUsers(data as AdminUser[]);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu quản trị");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);
  useEffect(() => { setRevealedTokens({}); }, [selectedId]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => user.discord_id?.includes(value) || user.username?.toLowerCase().includes(value));
  }, [query, users]);
  const selected = users.find((user) => user.id === selectedId) ?? filtered[0] ?? null;

  async function patchProfile(user: AdminUser, changes: Partial<Pick<AdminUser, "rpc_running" | "sync_mode" | "active_preset_id">>) {
    setUsers((list) => list.map((item) => item.id === user.id ? { ...item, ...changes } : item));
    try {
      await updateProfile({ data: { userId: user.id, ...changes } });
      toast.success("Đã cập nhật dashboard người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cập nhật thất bại");
      await reload();
    }
  }

  function patchPreset(userId: string, presetId: string, changes: Partial<AdminPreset>) {
    setUsers((list) => list.map((user) => user.id === userId ? {
      ...user,
      presets: user.presets.map((preset) => preset.id === presetId ? { ...preset, ...changes } : preset),
    } : user));
  }

  async function savePreset(userId: string, preset: AdminPreset) {
    try {
      await updatePreset({ data: { userId, preset } });
      toast.success("Đã lưu mẫu của người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không lưu được mẫu");
    }
  }

  async function toggleToken(userId: string, tokenId: string, enabled: boolean) {
    setUsers((list) => list.map((user) => user.id === userId ? {
      ...user,
      tokens: user.tokens.map((token) => token.id === tokenId ? { ...token, enabled } : token),
    } : user));
    try {
      await updateToken({ data: { userId, tokenId, enabled } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không cập nhật được token");
      await reload();
    }
  }

  async function toggleTokenVisibility(userId: string, tokenId: string) {
    if (revealedTokens[tokenId]) {
      setRevealedTokens((current) => {
        const next = { ...current };
        delete next[tokenId];
        return next;
      });
      return;
    }
    setRevealingTokenId(tokenId);
    try {
      const result = await revealToken({ data: { userId, tokenId } });
      setRevealedTokens((current) => ({ ...current, [tokenId]: result.token }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xem token");
    } finally {
      setRevealingTokenId(null);
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Đã sao chép token");
    } catch {
      toast.error("Không thể sao chép token");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteItem({ data: { type: deleteTarget.type, userId: deleteTarget.userId, id: deleteTarget.id } });
      toast.success(`Đã xóa ${deleteTarget.label}`);
      setDeleteTarget(null);
      setSelectedId(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa");
    }
  }

  if (loading) return <main className="flex min-h-[520px] items-center justify-center"><span className="size-9 animate-spin rounded-full border-2 border-primary border-t-transparent" /></main>;

  return (
    <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><ShieldCheck className="size-4" />Owner Binix</p><h1 className="mt-2 text-3xl font-semibold">Quản trị người dùng</h1><p className="mt-2 text-sm text-muted-foreground">Tìm và quản lý dashboard đã kết nối với Binix.</p></div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-3"><Users className="size-4 text-primary" /><span className="text-sm font-semibold">{users.length} người dùng</span></div>
      </div>

      <div className="relative mt-6 max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo Discord User ID hoặc tên…" /></div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="max-h-[720px] space-y-2 overflow-y-auto rounded-lg border border-border bg-card/45 p-3">
          {filtered.map((user) => <Button key={user.id} variant="ghost" onClick={() => setSelectedId(user.id)} className={`h-auto w-full justify-start gap-3 p-3 text-left ${selected?.id === user.id ? "border border-primary/30 bg-primary/10" : "border border-transparent"}`}><img src={user.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="size-10 rounded-full" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{user.username ?? "Người dùng Discord"}</span><span className="block truncate font-mono text-[11px] text-muted-foreground">{user.discord_id ?? "Chưa có Discord ID"}</span></span></Button>)}
          {filtered.length === 0 ? <p className="px-3 py-10 text-center text-sm text-muted-foreground">Không tìm thấy người dùng.</p> : null}
        </section>

        {selected ? <section className="space-y-5">
          <div className="glass-panel flex flex-wrap items-center gap-4 p-5"><img src={selected.avatar_url ?? "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="size-14 rounded-full ring-2 ring-primary/25" /><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">{selected.username ?? "Người dùng Discord"}</h2><p className="font-mono text-xs text-muted-foreground">Discord ID: {selected.discord_id ?? "—"}</p></div><Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ type: "user", id: selected.id, userId: selected.id, label: "tài khoản người dùng" })}><Trash2 />Xóa tài khoản</Button></div>

          <div className="grid gap-3 sm:grid-cols-2"><AdminToggle label="RPC" description={selected.rpc_running ? "Đang chạy" : "Đang dừng"} checked={selected.rpc_running} onChange={(value) => patchProfile(selected, { rpc_running: value })} /><AdminToggle label="Chế độ mẫu" description={selected.sync_mode ? "Đồng bộ một mẫu" : "Riêng từng token"} checked={selected.sync_mode} onChange={(value) => patchProfile(selected, { sync_mode: value })} /></div>

          <div className="glass-panel p-5"><h3 className="font-semibold">Token ({selected.tokens.length}/5)</h3><div className="mt-4 space-y-2">{selected.tokens.map((token) => {
            const revealedToken = revealedTokens[token.id];
            const isRevealing = revealingTokenId === token.id;
            return <div key={token.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/30 p-3"><Switch checked={token.enabled} onCheckedChange={(value) => toggleToken(selected.id, token.id, value)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{token.label}</p><p className={`font-mono text-xs ${revealedToken ? "break-all text-foreground" : "text-muted-foreground"}`}>{revealedToken ?? token.masked}</p></div><div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" disabled={isRevealing} title={revealedToken ? "Ẩn token" : "Xem token gốc"} aria-label={revealedToken ? `Ẩn token ${token.label}` : `Xem token gốc ${token.label}`} onClick={() => void toggleTokenVisibility(selected.id, token.id)}>{isRevealing ? <LoaderCircle className="animate-spin" /> : revealedToken ? <EyeOff /> : <Eye />}</Button>{revealedToken ? <Button variant="ghost" size="icon" title="Sao chép token" aria-label={`Sao chép token ${token.label}`} onClick={() => void copyToken(revealedToken)}><Copy /></Button> : null}<Button variant="ghost" size="icon" title="Xóa token" aria-label={`Xóa token ${token.label}`} onClick={() => setDeleteTarget({ type: "token", id: token.id, userId: selected.id, label: `token ${token.label}` })}><Trash2 /></Button></div></div>;
          })}{selected.tokens.length === 0 ? <p className="text-sm text-muted-foreground">Người dùng chưa thêm token.</p> : null}</div></div>

          <div className="space-y-3"><h3 className="font-semibold">Mẫu RPC ({selected.presets.length}/5)</h3>{selected.presets.map((preset) => <div key={preset.id} className="glass-panel p-5"><div className="grid gap-3 sm:grid-cols-2"><AdminField label="Tên mẫu" value={preset.name} onChange={(value) => patchPreset(selected.id, preset.id, { name: value })} /><AdminField label="Tên hoạt động" value={preset.activity_name} onChange={(value) => patchPreset(selected.id, preset.id, { activity_name: value })} /><AdminField label="Dòng 1" value={preset.text_1} onChange={(value) => patchPreset(selected.id, preset.id, { text_1: value })} /><AdminField label="Dòng 2" value={preset.text_2} onChange={(value) => patchPreset(selected.id, preset.id, { text_2: value })} /><AdminField label="Dòng 3" value={preset.text_3} onChange={(value) => patchPreset(selected.id, preset.id, { text_3: value })} /><AdminField label="Thành phố" value={preset.city} onChange={(value) => patchPreset(selected.id, preset.id, { city: value })} /></div><div className="mt-4 flex flex-wrap justify-between gap-2"><Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ type: "preset", id: preset.id, userId: selected.id, label: `mẫu ${preset.name}` })}><Trash2 />Xóa mẫu</Button><Button size="sm" onClick={() => savePreset(selected.id, preset)}>Lưu thay đổi</Button></div></div>)}</div>
        </section> : <section className="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Chọn một người dùng để xem dashboard.</section>}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle><AlertDialogDescription>Thao tác này sẽ xóa {deleteTarget?.label} và không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => void confirmDelete()}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

function AdminToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-lg border border-border bg-card/55 p-4"><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
}

function AdminField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}