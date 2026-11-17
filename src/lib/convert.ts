// Re-encode videos in the browser as broadly playable 360p MP4 (H.264 + AAC).
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
const FFmpegClass = "libx264";
const outputSizeFilter = "scale=-2:360:flags=fast_bilinear";

export function toMp4Name(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".mp4";
}

export function getMp4ConversionArgs(inputName: string, outputName: string) {
  return [
    "-i", inputName,
    "-vf", outputSizeFilter,
    "-c:v", FFmpegClass,
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "96k",
    "-movflags", "+faststart",
    "-f", "mp4",
    outputName,
  ];
}

/** Convert any browser-selected video into a 360p H.264/AAC MP4 file. */
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
    onProgress(Math.min(99, Math.max(0, Math.round((progress || 0) * 100))));
  });

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });

    const inputName = `input${file.name.match(/\.[^.]+$/)?.[0] ?? ".bin"}`;
    const outputName = "output.mp4";
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const code = await ffmpeg.exec(getMp4ConversionArgs(inputName, outputName));
    if (code !== 0) throw new Error("Is video format ko 360p MP4 me convert nahi kiya ja saka.");

    const output = await ffmpeg.readFile(outputName);
    const bytes = output as Uint8Array;
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    onProgress(100);
    return new File([buffer], toMp4Name(file.name), { type: "video/mp4" });
  } finally {
    ffmpeg.terminate();
  }
}