import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Layers3, Radio, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RpcPreview } from "@/components/RpcPreview";
import { Button } from "@/components/ui/button";
import treoVoiceSample from "@/assets/treo-voice-sample.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Binix · Tạo Discord Rich Presence của riêng bạn" },
      { name: "description", content: "Tạo, xem trước và quản lý Discord Rich Presence ngay trên web với tối đa 5 mẫu và 5 tài khoản." },
      { property: "og:title", content: "Binix · Tạo Discord Rich Presence của riêng bạn" },
      { property: "og:description", content: "Studio trực quan để chỉnh và đồng bộ Discord Rich Presence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const DEMO = {
  activity_name: "Midnight Studio",
  text_1: "Đang tạo một điều tuyệt vời",
  text_2: "🌡️ {temp:c} °C · Đêm yên tĩnh",
  text_3: "⏱ Online {uptime:hours}h {uptime:minutes}m",
  big_img: "https://i.pinimg.com/736x/6f/61/93/6f6193025abd55ffc466180090f5ec53.jpg",
  small_img: "https://i.pinimg.com/originals/f9/2e/34/f92e3421f536d8c38b1c1edd589c11bf.gif",
  button_1_name: "Tham gia Discord",
  button_1_url: "https://discord.com",
  button_2_name: "Xem hồ sơ",
  button_2_url: "https://discord.com",
  platform: "desktop",
  duration: 1703,
  elapsed: 209,
};

function Landing() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return window.location.replace("/dashboard");
      setChecking(false);
    });
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/30"><Radio className="size-5 text-primary-foreground" /></div>
          <span className="font-display text-lg font-semibold">Binix</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden items-center gap-2 sm:flex"><span className="size-2 animate-pulse rounded-full bg-success" /> Dịch vụ sẵn sàng</span>
          <a href="https://discord.gg/binsito" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card/60 px-4 text-sm font-semibold text-foreground backdrop-blur-xl transition hover:border-primary/40 hover:text-primary">Hỗ trợ</a>
          <Button variant="secondary" onClick={() => { (window.top ?? window).location.href = "/api/public/auth/discord/start"; }}>Đăng nhập</Button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 md:px-8 lg:min-h-[760px] lg:grid-cols-[1.05fr_0.95fr] lg:pt-4">
        <div className="animate-rise-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> Trình chỉnh RPC trực quan
          </div>
          <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            Binix
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Chỉnh sửa RPC và giữ Discord bạn online 24/24.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" disabled={checking} onClick={() => { (window.top ?? window).location.href = "/api/public/auth/discord/start"; }}>
              {checking ? "Đang kiểm tra…" : "Bắt đầu với Discord"}<ArrowRight />
            </Button>
          </div>
        </div>

        <div className="relative animate-rise-in [animation-delay:120ms]">
          <div className="glass-panel relative mx-auto max-w-lg overflow-hidden p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between px-1">
              <div><p className="text-sm font-semibold">Xem trước trực tiếp</p><p className="text-xs text-muted-foreground">Mọi thay đổi xuất hiện ngay lập tức</p></div>
              <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success"><span className="size-1.5 rounded-full bg-success" /> LIVE</div>
            </div>
            <RpcPreview preset={DEMO} username="Bạn" avatarUrl="https://cdn.discordapp.com/embed/avatars/0.png" />
          </div>
          <div className="mx-auto mt-4 flex max-w-lg items-center gap-3 rounded-lg border border-border bg-card/70 px-4 py-3 backdrop-blur-xl">
            <Layers3 className="size-5 shrink-0 text-primary" /><div><p className="text-xs font-semibold">Đổi mẫu linh hoạt</p><p className="text-[11px] text-muted-foreground">Đồng bộ hoặc riêng từng tài khoản</p></div>
          </div>
          <div className="mx-auto mt-4 max-w-lg overflow-hidden rounded-lg border border-border bg-card/70 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-xs font-semibold">Treo voice 24/7</p>
              <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Ví dụ</span>
            </div>
            <img src={treoVoiceSample} alt="Ví dụ treo voice — tài khoản Binix trong server bin sì to" loading="lazy" width={1024} height={640} className="block w-full" />
          </div>
        </div>

      </section>

      <footer className="relative z-10 mx-auto max-w-7xl border-t border-border px-5 py-6 md:px-8">
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Binix</p>
          <p>Sở hữu & phát triển bởi <span className="font-semibold text-foreground">@nm6c</span> · <a href="https://discord.com" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Discord</a></p>
        </div>
      </footer>
    </main>
  );
}