import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  listVideos,
  uploadVideoFile,
  saveVideoRecord,
  deleteVideo,
  readDuration,
  formatDuration,
  captureThumbnail,
  uploadThumbnail,
} from "@/lib/videos";
import { convertToMp4, toMp4Name } from "@/lib/convert";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Video upload — amanXanime" },
      {
        name: "description",
        content: "360p MP4 video upload karein aur episodes dekhein.",
      },
      { property: "og:title", content: "Video upload — amanXanime" },
      { property: "og:description", content: "360p MP4 video upload karein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["videos"], queryFn: listVideos });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("Ep.1");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [converting, setConverting] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setMessage(null);
    try {
      setConverting(0);
      setMessage("Video 360p MP4 me badli ja rahi hai… isme thoda samay lag sakta hai.");
      let uploadFile: File;
      try {
        uploadFile = await convertToMp4(file, setConverting);
        setMessage("360p MP4 taiyar hai, ab upload ho rahi hai…");
      } catch (convErr) {
        setConverting(null);
        setMessage(
          `Video convert nahi ho payi: ${
            convErr instanceof Error ? convErr.message : String(convErr)
          }`,
        );
        return;
      }
      setConverting(null);

      setProgress(0);
      const duration = await readDuration(uploadFile);
      const safe = toMp4Name(uploadFile.name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const stamp = Date.now();
      const path = `${stamp}-${safe}`;
      const thumbPromise = captureThumbnail(uploadFile);
      await uploadVideoFile(uploadFile, path, setProgress);
      const thumbBlob = await thumbPromise;
      let thumbPath: string | null = null;
      if (thumbBlob) thumbPath = await uploadThumbnail(thumbBlob, `thumbs/${stamp}.jpg`);
      await saveVideoRecord({
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        description: description.trim(),
        storage_path: path,
        thumbnail_path: thumbPath,
        duration_seconds: duration,
      });
      setMessage("Video 360p MP4 me upload ho gayi!");
      setTitle("");
      setFile(null);
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (err) {
      setProgress(null);
      setConverting(null);
      const detail = err instanceof Error ? err.message : String(err);
      const connectionFailed =
        detail.includes("ProgressEvent") ||
        detail.includes("response code: n/a") ||
        detail.includes("Failed to fetch");
      setMessage(
        connectionFailed
          ? "Upload ke dauran internet connection toot gaya. Wahi file dobara chun kar Upload karein—upload resume ho jayega."
          : `Upload fail hua: ${detail}`,
      );
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-3 pb-16 pt-4 sm:px-6">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Site par wapas
      </Link>
      <h1 className="text-2xl font-bold">Video upload</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Video upload se pehle 360p MP4 me badal di jayegi. Badi files ko badalne me waqt lag sakta
        hai—browser khula rakhein.
      </p>

      <form
        onSubmit={handleUpload}
        className="mt-5 space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Video ka naam</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Jaise: Mahabharat"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description (video ke niche dikhega)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ep.1"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Video file</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-secondary-foreground"
          />
        </div>

        {converting !== null && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${converting}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{converting}% MP4 me badla</p>
          </div>
        )}

        {progress !== null && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{progress}% upload hua</p>
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <button
          type="submit"
          disabled={!file || progress !== null || converting !== null}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {converting !== null
            ? "MP4 ban rahi hai…"
            : progress !== null
              ? "Upload ho raha hai…"
              : "Upload karein"}
        </button>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Uploaded videos ({data?.length ?? 0})</h2>
      <ul className="mt-3 space-y-2">
        {data?.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{v.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {v.description} {formatDuration(v.duration_seconds) ? `· ${formatDuration(v.duration_seconds)}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
