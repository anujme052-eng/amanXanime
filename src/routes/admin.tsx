import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { convertToMp4, isMp4, toMp4Name } from "@/lib/convert";

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
  const [secret, setSecret] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAllowed(sessionStorage.getItem(ADMIN_KEY) === "1");
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setKeyError(null);
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc("verify_admin_secret", {
        _secret: secret.trim(),
      });
      if (error) throw error;
      if (data === true) {
        sessionStorage.setItem(ADMIN_KEY, "1");
        setAllowed(true);
      } else {
        setKeyError("Secret key galat hai.");
      }
    } catch {
      setKeyError("Key check nahi ho payi. Internet check karein.");
    } finally {
      setChecking(false);
    }
  }

  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["videos"], queryFn: listVideos, enabled: allowed === true });

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
      let uploadFile = file;
      if (!isMp4(file)) {
        setConverting(0);
        setMessage("Video MP4 me badli ja rahi hai… ye thoda samay le sakta hai.");
        try {
          uploadFile = await convertToMp4(file, setConverting);
          setMessage("MP4 ban gayi, ab upload ho rahi hai…");
        } catch (convErr) {
          setConverting(null);
          setMessage(
            `Ye video MP4 me convert nahi ho payi: ${
              convErr instanceof Error ? convErr.message : String(convErr)
            }`,
          );
          return;
        }
        setConverting(null);
      }

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
      setMessage("Video upload ho gayi (MP4 me)!");
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

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-semibold">Admin secret key</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin panel kholne ke liye secret key daalein.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Secret key"
            autoComplete="off"
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {keyError && <p className="mt-2 text-sm text-destructive">{keyError}</p>}
          <button
            type="submit"
            disabled={!secret.trim() || checking}
            className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {checking ? "Check ho raha hai…" : "Unlock karein"}
          </button>
          <Link to="/" className="mt-3 block text-center text-sm text-muted-foreground">
            Home par jayein
          </Link>
        </form>
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
        Kisi bhi format ki video chunein (MKV, AVI, MOV…) — upload se pehle wo apne aap MP4 me badal
        di jayegi, aur download bhi MP4 me hi hoga.
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
