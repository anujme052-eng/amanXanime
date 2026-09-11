import {
  captureThumbnail,
  readDuration,
  saveVideoRecord,
  uploadThumbnail,
  uploadVideoFile,
} from "@/lib/videos";

export type UploadState = {
  active: boolean;
  progress: number;
  label: string | null;
  message: string | null;
  /** badhta hua number jab bhi upload poora hota hai (list refresh ke liye) */
  completedCount: number;
};

let state: UploadState = {
  active: false,
  progress: 0,
  label: null,
  message: null,
  completedCount: 0,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUploads(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getUploadState(): UploadState {
  return state;
}

export function clearUploadMessage() {
  if (!state.active && state.message) {
    state = { ...state, message: null };
    emit();
  }
}

/**
 * Background me video upload karta hai. Page badalne par bhi chalta rehta hai
 * (tab tak jab tak browser tab band na ho).
 */
export function startBackgroundUpload(input: {
  file: File;
  title: string;
  description: string;
}) {
  if (state.active) {
    state = { ...state, message: "Pehle wali upload poori hone dijiye." };
    emit();
    return false;
  }

  const { file, title, description } = input;
  state = {
    active: true,
    progress: 0,
    label: title.trim() || file.name,
    message: null,
    completedCount: state.completedCount,
  };
  emit();

  void (async () => {
    try {
      const duration = await readDuration(file);
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stamp = Date.now();
      const path = `${stamp}-${safe}`;
      const thumbPromise = captureThumbnail(file);
      await uploadVideoFile(file, path, (p) => {
        state = { ...state, progress: p };
        emit();
      });
      const thumbBlob = await thumbPromise;
      let thumbPath: string | null = null;
      if (thumbBlob) thumbPath = await uploadThumbnail(thumbBlob, `thumbs/${stamp}.jpg`);
      await saveVideoRecord({
        title: title.trim() || file.name,
        description: description.trim(),
        storage_path: path,
        thumbnail_path: thumbPath,
        duration_seconds: duration,
      });
      state = {
        active: false,
        progress: 100,
        label: state.label,
        message: "Video upload ho gayi!",
        completedCount: state.completedCount + 1,
      };
      emit();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const connectionFailed =
        detail.includes("ProgressEvent") ||
        detail.includes("response code: n/a") ||
        detail.includes("Failed to fetch");
      state = {
        ...state,
        active: false,
        message: connectionFailed
          ? "Upload ke dauran internet connection toot gaya. Wahi file dobara chun kar Upload karein—upload resume ho jayega."
          : `Upload fail hua: ${detail}`,
      };
      emit();
    }
  })();

  return true;
}
