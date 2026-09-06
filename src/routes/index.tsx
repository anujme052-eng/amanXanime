import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { listVideos, formatDuration, getThumbnailUrls } from "@/lib/videos";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "amanXanime — Sabhi Anime Episodes" },
      {
        name: "description",
        content:
          "amanXanime par sabhi episodes ek jagah — halka player, mobile aur JioPhone par smooth streaming.",
      },
      { property: "og:title", content: "amanXanime — Sabhi Anime Episodes" },
      {
        property: "og:description",
        content: "Episode wise anime videos, halka player, mobile friendly streaming.",
      },
    ],
  }),
  component: Home,
});

const ADMIN_KEY = "amanx_admin_unlocked";

function Home() {
  const navigate = useNavigate();
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const { data: thumbs } = useQuery({
    queryKey: ["thumbs", data?.map((v) => v.thumbnail_path).join(",")],
    queryFn: () =>
      getThumbnailUrls((data ?? []).map((v) => v.thumbnail_path).filter(Boolean) as string[]),
    enabled: !!data,
  });

  function handleLogoTap() {
    taps.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      taps.current = 0;
      setHint(null);
    }, 1500);
    if (taps.current >= 6 && taps.current < 10) setHint(`${10 - taps.current}`);
    if (taps.current >= 10) {
      taps.current = 0;
      setHint(null);
      localStorage.setItem(ADMIN_KEY, "1");
      navigate({ to: "/admin" });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-3 pb-16 pt-5 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={handleLogoTap}
          aria-label="amanXanime"
          className="shrink-0 rounded-full outline-none"
        >
          <img
            src={logo.url}
            alt="amanXanime logo"
            width={64}
            height={64}
            className="h-16 w-16 select-none"
            draggable={false}
          />
        </button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">amanXanime</h1>
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Videos load ho rahi hain…</p>}
      {error && <p className="text-sm text-destructive">Videos load nahi ho payi.</p>}
      {!isLoading && data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Abhi koi video nahi hai.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {data?.map((v) => {
          const thumb = v.thumbnail_path ? thumbs?.[v.thumbnail_path] : undefined;
          return (
            <Link
              key={v.id}
              to="/watch/$id"
              params={{ id: v.id }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary"
            >
              <div className="relative flex aspect-video items-center justify-center bg-secondary">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={v.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Play className="h-9 w-9 text-primary" />
                )}
                {formatDuration(v.duration_seconds) && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[11px] font-medium">
                    {formatDuration(v.duration_seconds)}
                  </span>
                )}
              </div>
              <div className="p-2.5 sm:p-3">
                <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">{v.title}</h2>
                {v.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {v.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
