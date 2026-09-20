import { createFileRoute } from "@tanstack/react-router";
import { resolveOrigin } from "@/lib/origin";

function getRequestedOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get("origin");
  if (!requested) return resolveOrigin(request);

  try {
    const parsed = new URL(requested);
    const isLovableHost = parsed.protocol === "https:" && parsed.hostname.endsWith(".lovable.app");
    const isLocal = parsed.protocol === "http:" && parsed.hostname === "localhost";
    return isLovableHost || isLocal ? parsed.origin : resolveOrigin(request);
  } catch {
    return resolveOrigin(request);
  }
}

export const Route = createFileRoute("/api/public/auth/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env["DISCORD_CLIENT_ID"];
        if (!clientId) {
          return new Response("Chưa cấu hình DISCORD_CLIENT_ID", { status: 500 });
        }
        const origin = getRequestedOrigin(request);
        const redirectUri = `${origin}/api/public/auth/discord/callback`;
        const state = crypto.randomUUID();
        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "identify");
        url.searchParams.set("state", state);
        url.searchParams.set("prompt", "consent");

        return new Response(null, {
          status: 302,
          headers: {
            location: url.toString(),
            "set-cookie": [
              `rpc_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
              `rpc_oauth_redirect=${encodeURIComponent(redirectUri)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
            ].join(", "),
          },
        });
      },
    },
  },
});
