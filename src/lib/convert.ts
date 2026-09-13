// Browser me hi video ko MP4 container me badalta hai (ffmpeg WebAssembly).
// Sirf container change hota hai (stream copy), isliye quality waisi hi rehti hai
// aur ye re-encode se bahut tez hota hai.

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export function isMp4(file: File) {
  return /\.mp4$/i.test(file.name) || file.type === "video/mp4";
}

export function toMp4Name(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".mp4";
}

/**
 * Non-MP4 file ko MP4 me badal kar naya File deta hai.
 * Agar convert na ho paye to error throw karta hai.
 */
export async function convertToMp4(
  file: File,
  onProgress: (percent: number) => void,
): Promise<File> {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);

  const ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => {
    const pct = Math.round((progress || 0) * 100);
    onProgress(Math.min(99, Math.max(0, pct)));
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });

  const inputName = "input" + (file.name.match(/\.[^.]+$/)?.[0] ?? ".bin");
  const outputName = "output.mp4";
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const attempts: string[][] = [
    ["-i", inputName, "-c", "copy", "-movflags", "+faststart", outputName],
    ["-i", inputName, "-c:v", "copy", "-c:a", "aac", "-movflags", "+faststart", outputName],
  ];

  let ok = false;
  for (const args of attempts) {
    try {
      const code = await ffmpeg.exec(args);
      if (code === 0) {
        ok = true;
        break;
      }
    } catch {
      // agla tarika try karein
    }
  }

  if (!ok) {
    ffmpeg.terminate();
    throw new Error("Ye video MP4 me convert nahi ho payi.");
  }

  const out = await ffmpeg.readFile(outputName);
  ffmpeg.terminate();

  const bytes = out as Uint8Array;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], toMp4Name(file.name), { type: "video/mp4" });
}
