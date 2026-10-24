import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, Download, Loader2, Compass, LogOut } from "lucide-react";
import { listVideos, formatDuration, getThumbnailUrls, getDownloadUrl } from "@/lib/videos";
import type { VideoRow } from "@/lib/videos";
import { getCurrentUsername, signOutWithCleanup } from "@/lib/auth";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/amanxanime-text-logo.jpg";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
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
  loader: async () => {
    try {
      const videos = await listVideos();
      const paths = videos.map((v) => v.thumbnail_path).filter(Boolean) as string[];
      const thumbs = await getThumbnailUrls(paths);
      return { videos, thumbs, failed: false };
    } catch {
      return { videos: [] as VideoRow[], thumbs: {} as Record<string, string>, failed: true };
    }
  },
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [busyOut, setBusyOut] = useState(false);

  const { videos: data, thumbs, failed } = Route.useLoaderData();

  useEffect(() => {
    getCurrentUsername().then(setUsername);
  }, []);

  async function handleSignOut() {
    if (busyOut) return;
    setBusyOut(true);
    await signOutWithCleanup(queryClient);
    navigate({ to: "/auth", replace: true });
  }

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
            src={logo}
            alt="amanXanime logo"
            width={64}
            height={64}
            className="h-16 w-16 select-none"
            draggable={false}
          />
        </button>
        <img
          src={textLogo}
          alt="amanXanime"
          className="h-10 w-auto object-contain sm:h-12"
          draggable={false}
        />
        {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
      </header>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
        <span className="truncate text-sm text-muted-foreground">
          {username ? `Namaste, ${username}!` : "Namaste!"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/compass"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Compass className="h-4 w-4" /> Compass
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={busyOut}
            aria-label="Sign out"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            {busyOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
        </div>
      </div>

      {failed && <p className="text-sm text-destructive">Videos load nahi ho payi.</p>}
      {!failed && data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Abhi koi video nahi hai.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-5">
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
                      loading={i < 4 ? "eager" : "lazy"}
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
      className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
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
