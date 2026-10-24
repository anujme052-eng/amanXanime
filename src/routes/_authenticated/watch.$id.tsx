import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download } from "lucide-react";
import {
  getVideo,
  getPlaybackUrl,
  getDownloadUrl,
  getFileSize,
  formatSize,
  formatDuration,
} from "@/lib/videos";

export const Route = createFileRoute("/_authenticated/watch/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video chalayein — amanXanime" },
      { name: "description", content: "Episode ko seedha browser me chalayein, JioPhone par bhi." },
      { property: "og:title", content: "Video chalayein — amanXanime" },
      { property: "og:description", content: "Episode ko seedha browser me chalayein." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const video = await getVideo(params.id);
      if (!video) return { data: null, failed: false };
      const [url, downloadUrl, size] = await Promise.all([
        getPlaybackUrl(video.storage_path),
        getDownloadUrl(video.storage_path, video.title),
        getFileSize(video.storage_path),
      ]);
      return { data: { video, url, downloadUrl, size }, failed: false };
    } catch {
      return { data: null, failed: true };
    }
  },
  component: Watch,
});

function Watch() {
  const { data, failed } = Route.useLoaderData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-3 pb-16 pt-4 sm:px-6">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Sabhi videos
      </Link>

      {(failed || data === null) && (
        <p className="text-sm text-destructive">Ye video nahi mili.</p>
      )}

      {data && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            <video
              key={data.video.id}
              src={data.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
            />
          </div>
          <a
            href={data.downloadUrl}
            download
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Download video{formatSize(data.size) ? ` (${formatSize(data.size)})` : ""}
          </a>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Poori original quality file phone me save hogi — baad me offline apne video player app me
            dekh sakte hain.
          </p>

          <h1 className="mt-4 text-xl font-bold sm:text-2xl">{data.video.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            720p tak · {formatDuration(data.video.duration_seconds) ?? "full episode"}
          </p>
          {data.video.description && (
            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
              {data.video.description}
            </p>
          )}
        </>
      )}
    </main>
  );
}
