import { expect, test } from "bun:test";
import { episodeLabel } from "../src/lib/episodes";

test("episode labels start at Ep. 1 and increase in list order", () => {
  expect(episodeLabel(0)).toBe("Ep. 1");
  expect(episodeLabel(1)).toBe("Ep. 2");
});