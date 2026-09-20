import { createFileRoute } from "@tanstack/react-router";
const DISCORD_CLIENT_ID = "1400551921541976086";
const DISCORD_REDIRECT_URI =
  "https://id-preview--975cea33-3cda-4ade-b8f3-0ef09798e71c.lovable.app/api/public/auth/discord/callback";

export const Route = createFileRoute("/api/public/auth/discord/start")({
  server: {
    handlers: {
      GET: async () => {
        const state = crypto.randomUUID();
        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.set("client_id", DISCORD_CLIENT_ID);
        url.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "identify guilds guilds.join");
        url.searchParams.set("state", state);

        return new Response(null, {
          status: 302,
          headers: {
            location: url.toString(),
            "set-cookie": [
              `rpc_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
              `rpc_oauth_redirect=${encodeURIComponent(DISCORD_REDIRECT_URI)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`,
            ].join(", "),
          },
        });
      },
    },
  },
});
