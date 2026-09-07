import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

export const BUCKET = "videos";

export type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export async function listVideos(): Promise<VideoRow[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, description, storage_path, thumbnail_path, duration_seconds, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoRow[];
}

export async function getVideo(id: string): Promise<VideoRow | null> {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, description, storage_path, thumbnail_path, duration_seconds, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as VideoRow | null) ?? null;
}

export async function getPlaybackUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 8);
  if (error || !data) throw error ?? new Error("Playback link nahi bana");
  return data.signedUrl;
}

/** Original file ka exact size (bytes) — admin ne jitni MB upload ki, wahi. */
export async function getFileSize(storagePath: string): Promise<number | null> {
  const idx = storagePath.lastIndexOf("/");
  const dir = idx > 0 ? storagePath.slice(0, idx) : "";
  const name = idx > 0 ? storagePath.slice(idx + 1) : storagePath;
  const { data } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 100 });
  const hit = (data ?? []).find((f) => f.name === name);
  const size = (hit?.metadata as { size?: number } | null | undefined)?.size;
  return typeof size === "number" ? size : null;
}

export function formatSize(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

/** Full original file download link (attachment) — koi compression nahi. */
export async function getDownloadUrl(storagePath: string, title: string): Promise<string> {
  const ext = storagePath.split(".").pop() || "mp4";
  const safe = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 8, { download: `${safe}.${ext}` });
  if (error || !data) throw error ?? new Error("Download link nahi bana");
  return data.signedUrl;
}

export async function getThumbnailUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 8);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Video ke pehle frame se thumbnail banata hai (browser me hi). */
export function captureThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.muted = true;
      (el as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
      const cleanup = () => URL.revokeObjectURL(el.src);
      el.onloadedmetadata = () => {
        el.currentTime = Math.min(3, (el.duration || 1) / 2);
      };
      el.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = 640;
          const ratio = el.videoHeight / (el.videoWidth || 1);
          canvas.width = w;
          canvas.height = Math.round(w * (ratio || 0.5625));
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => {
            cleanup();
            resolve(b);
          }, "image/jpeg", 0.8);
        } catch {
          cleanup();
          resolve(null);
        }
      };
      el.onerror = () => resolve(null);
      el.src = URL.createObjectURL(file);
    } catch {
      resolve(null);
    }
  });
}

export async function uploadThumbnail(blob: Blob, path: string): Promise<string | null> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) return null;
  return path;
}

export async function deleteVideo(video: VideoRow) {
  const files = [video.storage_path];
  if (video.thumbnail_path) files.push(video.thumbnail_path);
  await supabase.storage.from(BUCKET).remove(files);
  const { error } = await supabase.from("videos").delete().eq("id", video.id);
  if (error) throw error;
}

export function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
        URL.revokeObjectURL(el.src);
        resolve(d);
      };
      el.onerror = () => resolve(null);
      el.src = URL.createObjectURL(file);
    } catch {
      resolve(null);
    }
  });
}

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

type TusExtras = {
  parallelUploads?: number;
  uploadDataDuringCreation?: boolean;
  chunkSize?: number;
};

function runTus(
  file: File,
  path: string,
  onProgress: (percent: number) => void,
  extras: TusExtras,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 500, 1500, 3000],
      headers: {
        authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "x-upsert": "true",
      },
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
      },
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
      ...extras,
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0 && prev[0]) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

/**
 * Resumable upload. Large files are pushed in several parallel streams so the
 * full upload bandwidth is used; falls back to a single stream if the storage
 * server does not support parallel parts.
 */
export async function uploadVideoFile(
  file: File,
  path: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  const big = file.size > 50 * 1024 * 1024;
  if (big) {
    const parts = Math.min(6, Math.max(3, Math.ceil(file.size / (60 * 1024 * 1024))));
    try {
      await runTus(file, path, onProgress, { parallelUploads: parts });
      return;
    } catch {
      onProgress(0);
    }
  }
  await runTus(file, path, onProgress, {
    uploadDataDuringCreation: true,
    chunkSize: 50 * 1024 * 1024,
  });
}

export async function saveVideoRecord(input: {
  title: string;
  description: string;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
}) {
  const { error } = await supabase.from("videos").insert(input);
  if (error) throw error;
}

export type StorageFile = { name: string; size: number | null };

/** Cloud storage me padi hui video files jo abhi database me nahi hain. */
export async function listUnlinkedStorageFiles(): Promise<StorageFile[]> {
  const [{ data: files }, rows] = await Promise.all([
    supabase.storage.from(BUCKET).list("", { limit: 1000, sortBy: { column: "name", order: "asc" } }),
    listVideos(),
  ]);
  const used = new Set(rows.map((r) => r.storage_path));
  return (files ?? [])
    .filter((f) => f.id && !used.has(f.name) && /\.(mp4|mkv|webm|mov|m4v|avi)$/i.test(f.name))
    .map((f) => ({
      name: f.name,
      size: (f.metadata as { size?: number } | null | undefined)?.size ?? null,
    }));
}

/** Storage me already uploaded file ko database me add karta hai. */
export async function importStorageFile(input: {
  storage_path: string;
  title: string;
  description: string;
}) {
  const { error } = await supabase.from("videos").insert({
    title: input.title,
    description: input.description,
    storage_path: input.storage_path,
    thumbnail_path: null,
    duration_seconds: null,
  });
  if (error) throw error;
}

export function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
