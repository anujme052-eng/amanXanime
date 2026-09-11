import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { listVideos, deleteVideo, formatDuration } from "@/lib/videos";
import {
  getUploadState,
  startBackgroundUpload,
  subscribeUploads,
} from "@/lib/upload-manager";
import { useSyncExternalStore } from "react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Video Upload | amanXanime" },
      {
        name: "description",
        content: "Admin panel: unlimited videos upload karein, episode description ke saath.",
      },
      { property: "og:title", content: "Admin — Video Upload" },
      { property: "og:description", content: "Unlimited videos upload karein, 1 ghante se lambi bhi." },
    ],
  }),
  component: Admin,
});

const ADMIN_KEY = "amanx_admin_unlocked";

function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    setAllowed(localStorage.getItem(ADMIN_KEY) === "1");
  }, []);

  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["videos"], queryFn: listVideos });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("Ep.1");
  const [file, setFile] = useState<File | null>(null);
  const upload = useSyncExternalStore(subscribeUploads, getUploadState);
  const progress = upload.active ? upload.progress : null;
  const message = upload.message;

  // Background upload poora hote hi list refresh
  useEffect(() => {
    if (upload.completedCount > 0) qc.invalidateQueries({ queryKey: ["videos"] });
  }, [upload.completedCount, qc]);

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const started = startBackgroundUpload({ file, title, description });
    if (started) {
      setTitle("");
      setFile(null);
    }
  }

  if (allowed === null) return null;
  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Ye page sirf admin ke liye hai.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary">
            Home par jayein
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-3 pb-16 pt-4 sm:px-6">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Site par wapas
      </Link>
      <h1 className="text-2xl font-bold">Admin — Video Upload</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kitni bhi videos daaliye. 1 ghante se lambi video bhi chalegi (5 GB tak, upload beech me ruk
        jaye to dobara wahi file chunne par resume ho jata hai).
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
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-secondary-foreground"
          />
        </div>

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
          disabled={!file || progress !== null}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {progress !== null ? "Upload ho raha hai…" : "Upload karein"}
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
            <button
              onClick={async () => {
                await deleteVideo(v);
                qc.invalidateQueries({ queryKey: ["videos"] });
              }}
              className="shrink-0 rounded-md p-2 text-destructive hover:bg-secondary"
              aria-label="Delete video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
