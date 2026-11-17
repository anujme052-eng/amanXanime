import { expect, test } from "bun:test";
import { getMp4ConversionArgs, toMp4Name } from "../src/lib/convert";

test("every upload is re-encoded as 360p H.264/AAC MP4", () => {
  const args = getMp4ConversionArgs("episode.mkv", "output.mp4");
  expect(args).toContain("scale=-2:360:flags=fast_bilinear");
  expect(args).toContain("libx264");
  expect(args).toContain("aac");
  expect(args.at(-2)).toBe("-f");
  expect(args.at(-1)).toBe("output.mp4");
});

test("converted files are named with the MP4 extension", () => {
  expect(toMp4Name("episode.mkv")).toBe("episode.mp4");
});