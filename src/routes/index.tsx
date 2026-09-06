import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Play, Download, Loader2 } from "lucide-react";
import { listVideos, formatDuration, getThumbnailUrls, getDownloadUrl } from "@/lib/videos";
import type { VideoRow } from "@/lib/videos";
import { readCache, writeCache } from "@/lib/local-cache";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/amanxanime-text-logo.jpg";


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
    queryFn: async () => {
      const rows = await listVideos();
      writeCache("videos", rows);
      return rows;
    },
    initialData: () => readCache<VideoRow[]>("videos", 24 * 60 * 60 * 1000),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const thumbKey = (data ?? []).map((v) => v.thumbnail_path).join(",");

  const { data: thumbs } = useQuery({
    queryKey: ["thumbs", thumbKey],
    queryFn: async () => {
      const map = await getThumbnailUrls(
        (data ?? []).map((v) => v.thumbnail_path).filter(Boolean) as string[],
      );
      writeCache(`thumbs:${thumbKey}`, map);
      return map;
    },
    enabled: !!data,
    initialData: () => readCache<Record<string, string>>(`thumbs:${thumbKey}`, 6 * 60 * 60 * 1000),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-3 pb-16 pt-4 sm:px-6 sm:pt-5">
      <header className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:mb-6 sm:gap-3">
        <button
          onClick={handleLogoTap}
          aria-label="amanXanime"
          className="shrink-0 rounded-full outline-none"
        >
          <img
            src={logo}
            alt="amanXanime logo"
            width={64}
            height={64}
            className="h-12 w-12 select-none sm:h-16 sm:w-16"
            draggable={false}
            fetchPriority="high"
            decoding="async"
          />
        </button>
        <img
          src={textLogo}
          alt="amanXanime"
          className="h-8 w-auto min-w-0 max-w-full object-contain object-left sm:h-12"
          draggable={false}
          fetchPriority="high"
          decoding="async"
        />
        <span className="text-xs text-muted-foreground">{hint}</span>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Videos load ho rahi hain…</p>}
      {error && <p className="text-sm text-destructive">Videos load nahi ho payi.</p>}
      {!isLoading && data?.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Abhi koi video nahi hai.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {data?.map((v, i) => {
          const thumb = v.thumbnail_path ? thumbs?.[v.thumbnail_path] : undefined;
          return (
            <div
              key={v.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary"
            >
              <Link to="/watch/$id" params={{ id: v.id }} className="block">
                <div className="relative flex aspect-video items-center justify-center bg-secondary">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={v.title}
                      width={640}
                      height={360}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading={i < 2 ? "eager" : "lazy"}
                      fetchPriority={i < 2 ? "high" : "low"}
                      decoding="async"
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
              </Link>
              <div className="p-2.5 sm:p-3">
                <div className="flex items-start gap-2">
                  <Link to="/watch/$id" params={{ id: v.id }} className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">{v.title}</h2>
                  </Link>
                  <DownloadButton video={v} />
                </div>
                {v.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                    {v.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </main>
  );
}

function DownloadButton({ video }: { video: VideoRow }) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    try {
      const url = await getDownloadUrl(video.storage_path, video.title);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      aria-label={`${video.title} download karein`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      disabled={busy}
    >

      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
