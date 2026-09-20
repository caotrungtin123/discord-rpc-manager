import { createFileRoute } from "@tanstack/react-router";

function errorPage(message: string) {
  return new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Đăng nhập thất bại</title></head><body style="font-family:system-ui;background:#1e1f27;color:#eee;display:flex;min-height:100vh;align-items:center;justify-content:center"><div style="text-align:center"><h1>Đăng nhập thất bại</h1><p>${message}</p><a style="color:#8b7bf7" href="/">Quay lại trang chủ</a></div></body></html>`,
    { status: 400, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookie = request.headers.get("cookie") ?? "";
        const savedState = /rpc_oauth_state=([^;]+)/.exec(cookie)?.[1];

        if (!code) return errorPage("Thiếu mã xác thực từ Discord.");
        if (!state || !savedState || state !== savedState) {
          return errorPage("Phiên đăng nhập không hợp lệ, hãy thử lại.");
        }

        const clientId = process.env["DISCORD_CLIENT_ID"];
        const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
        if (!clientId || !clientSecret) {
          return errorPage("Chưa cấu hình Client ID / Client Secret của bot.");
        }

        const redirectUri = `${url.origin}/api/public/auth/discord/callback`;
        const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });
        if (!tokenRes.ok) {
          return errorPage("Discord từ chối mã xác thực. Kiểm tra lại Redirect URI trong bot.");
        }
        const tokenJson = (await tokenRes.json()) as { access_token?: string };
        if (!tokenJson.access_token) return errorPage("Không lấy được quyền truy cập từ Discord.");

        const meRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (!meRes.ok) return errorPage("Không đọc được thông tin tài khoản Discord.");
        const me = (await meRes.json()) as {
          id: string;
          username: string;
          global_name?: string | null;
          avatar?: string | null;
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const email = `discord_${me.id}@rpc.local`;
        const avatarUrl = me.avatar
          ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.${me.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
          : `https://cdn.discordapp.com/embed/avatars/0.png`;
        const displayName = me.global_name || me.username;

        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { discord_id: me.id, username: displayName, avatar_url: avatarUrl },
        });

        let userId = created.data.user?.id;
        if (!userId) {
          const { data: existing } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("discord_id", me.id)
            .maybeSingle();
          userId = existing?.id;
        }
        if (!userId) return errorPage("Không tạo được tài khoản. Hãy thử lại sau.");

        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            discord_id: me.id,
            username: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" },
        );

        const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${url.origin}/dashboard` },
        });
        if (linkError || !link?.properties?.action_link) {
          return errorPage("Không tạo được phiên đăng nhập.");
        }

        return new Response(null, {
          status: 302,
          headers: {
            location: link.properties.action_link,
            "set-cookie": "rpc_oauth_state=; Path=/; Max-Age=0",
          },
        });
      },
    },
  },
});
