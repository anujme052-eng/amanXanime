import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { getVideo, getPlaybackUrl, formatDuration } from "@/lib/videos";

export const Route = createFileRoute("/watch/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video chalayein — amanXanime" },
      { name: "description", content: "Episode ko seedha browser me chalayein, JioPhone par bhi." },
      { property: "og:title", content: "Video chalayein — amanXanime" },
      { property: "og:description", content: "Episode ko seedha browser me chalayein." },
    ],
  }),
  component: Watch,
});

function Watch() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const video = await getVideo(id);
      if (!video) return null;
      const url = await getPlaybackUrl(video.storage_path);
      return { video, url };
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-3 pb-16 pt-4 sm:px-6">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Sabhi videos
      </Link>

      {isLoading && <p className="text-sm text-muted-foreground">Video khul rahi hai…</p>}
      {(error || data === null) && !isLoading && (
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
