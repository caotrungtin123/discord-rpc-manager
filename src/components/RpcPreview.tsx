import { useEffect, useState } from "react";
import { resolvePreview } from "@/lib/placeholders";

export type PresetLike = {
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
};

const PLATFORM_LABEL: Record<string, string> = {
  desktop: "",
  meta_quest: "trên Meta Quest",
  xbox: "trên Xbox",
  ps5: "trên PlayStation 5",
  ps4: "trên PlayStation 4",
};

function fmt(total: number) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0
    ? `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${min}:${String(sec).padStart(2, "0")}`;
}

export function RpcPreview({
  preset,
  username,
  avatarUrl,
}: {
  preset: PresetLike;
  username: string;
  avatarUrl: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const duration = Math.max(1, preset.duration || 1);
  const elapsed = ((preset.elapsed || 0) + tick) % duration;
  const pct = Math.min(100, (elapsed / duration) * 100);
  const line1 = resolvePreview(preset.text_1);
  const line2 = resolvePreview(preset.text_2);
  const line3 = resolvePreview(preset.text_3);
  const platformLabel = PLATFORM_LABEL[preset.platform] ?? "";

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card p-5 shadow-2xl transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <img
          src={avatarUrl}
          alt=""
          className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/30"
          onError={(e) => {
            e.currentTarget.src = "https://cdn.discordapp.com/embed/avatars/0.png";
          }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{username}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" /> Đang trực tuyến</p>
        </div>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase text-muted-foreground">
        {platformLabel ? `Đang chơi ${platformLabel}` : "Đang chơi trò chơi"}
      </p>

      <div className="mt-3 flex gap-4">
        <div className="relative h-24 w-24 shrink-0">
          {preset.big_img ? (
            <img
              src={preset.big_img}
              alt=""
              className="h-full w-full rounded-lg object-cover ring-1 ring-border"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : (
            <div className="h-full w-full rounded-lg bg-surface-2" />
          )}
          {preset.small_img ? (
            <img
              src={preset.small_img}
              alt=""
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border-[3px] border-card object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1 py-1 text-sm leading-relaxed">
          <p className="truncate font-semibold text-foreground">{preset.activity_name || "—"}</p>
          {line1 ? <p className="truncate text-xs text-muted-foreground">{line1}</p> : null}
          {line2 ? <p className="truncate text-xs text-muted-foreground">{line2}</p> : null}
          {line3 ? <p className="truncate text-xs text-muted-foreground">{line3}</p> : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{fmt(elapsed)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {preset.button_1_name || preset.button_2_name ? (
        <div className="mt-3 space-y-2">
          {preset.button_1_name ? (
            <a
              href={preset.button_1_url || "#"}
              target="_blank"
              rel="noreferrer"
               className="block rounded-md border border-border bg-surface-2 py-2 text-center text-xs font-semibold transition-colors hover:bg-accent"
            >
              {preset.button_1_name}
            </a>
          ) : null}
          {preset.button_2_name ? (
            <a
              href={preset.button_2_url || "#"}
              target="_blank"
              rel="noreferrer"
               className="block rounded-md border border-border bg-surface-2 py-2 text-center text-xs font-semibold transition-colors hover:bg-accent"
            >
              {preset.button_2_name}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
