import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RpcPreview } from "@/components/RpcPreview";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RPC Studio · Bảng điều khiển Discord Rich Presence" },
      {
        name: "description",
        content:
          "Chỉnh Discord Rich Presence ngay trên web: 5 mẫu RPC, 5 token, xem trước trực tiếp và đồng bộ với runner trên host của bạn.",
      },
      { property: "og:title", content: "RPC Studio · Bảng điều khiển Discord Rich Presence" },
      {
        property: "og:description",
        content: "Chỉnh RPC trên web thay vì sửa file. Đăng nhập bằng Discord.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const DEMO = {
  activity_name: "Sleep",
  text_1: "𝙻 𝙴̂ 𝙱 𝙰̉ 𝙾",
  text_2: "🌡️ {temp:c} °C | 🍃 {wind:kph} km/h",
  text_3: "⏱ {uptime:days}d⬖{uptime:hours}h⬗{uptime:minutes}m⬙{uptime:seconds}s",
  big_img: "https://i.pinimg.com/736x/6f/61/93/6f6193025abd55ffc466180090f5ec53.jpg",
  small_img: "https://i.pinimg.com/originals/f9/2e/34/f92e3421f536d8c38b1c1edd589c11bf.gif",
  button_1_name: "🧸 Discord",
  button_1_url: "https://discord.com",
  button_2_name: "🎀 LeBao",
  button_2_url: "https://anhemnova.xyz/",
  platform: "meta_quest",
  duration: 1703,
  elapsed: 209,
};

function Landing() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/dashboard");
        return;
      }
      setChecking(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Discord Rich Presence
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            Chỉnh RPC ngay trên web, không cần sửa file
          </h1>
          <p className="mt-4 text-muted-foreground">
            Đăng nhập bằng Discord, lưu tối đa 5 mẫu RPC và 5 token. Chọn chạy đồng bộ một mẫu cho
            tất cả token hoặc mỗi token một mẫu riêng. Mọi thay đổi hiện ra ngay ở khung xem trước
            bên cạnh.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              disabled={checking}
              onClick={() => {
                window.location.href = "/api/public/auth/discord/start";
              }}
            >
              Đăng nhập với Discord
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Bạn sẽ thấy màn hình duyệt quyền quen thuộc của Discord, giống các bot khác.
            </p>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <RpcPreview
            preset={DEMO}
            username="Bạn"
            avatarUrl="https://cdn.discordapp.com/embed/avatars/0.png"
          />
        </div>
      </div>
    </main>
  );
}
