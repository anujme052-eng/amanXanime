import { createFileRoute } from "@tanstack/react-router";
import { esc, liteClient, litePage, liteResponse } from "@/lib/lite-html";

export const Route = createFileRoute("/api/public/lite")({
  server: {
    handlers: {
      GET: async () => {
        const sb = liteClient();
        const { data, error } = await sb
          .from("videos")
          .select("id, title, created_at")
          .order("created_at", { ascending: true });
        if (error) {
          return liteResponse(litePage("amanXanime Lite", "<p>Videos load nahi hui.</p>"), 500);
        }
        const items = (data ?? [])
          .map(
            (v, i) =>
              `<li><a href="/api/public/lite/watch?id=${encodeURIComponent(
                v.id as string,
              )}">Ep. ${i + 1} - ${esc((v.title as string) || "Video")}</a></li>`,
          )
          .join("");
        return liteResponse(
          litePage(
            "amanXanime Lite",
            `<h1>amanXanime</h1><p class="small">Lite version - slow / keypad phones ke liye</p><ul>${
              items || "<li>Abhi koi video nahi.</li>"
            }</ul>`,
          ),
        );
      },
    },
  },
});
