import { createFileRoute } from "@tanstack/react-router";
import { BUCKET, esc, liteClient, litePage, liteResponse } from "@/lib/lite-html";

export const Route = createFileRoute("/api/public/lite/watch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return liteResponse(litePage("amanXanime Lite", "<p>Video nahi mila.</p>"), 400);

        const sb = liteClient();
        const { data: video } = await sb
          .from("videos")
          .select("id, title, storage_path")
          .eq("id", id)
          .maybeSingle();
        if (!video) {
          return liteResponse(litePage("amanXanime Lite", "<p>Video nahi mila.</p>"), 404);
        }

        const path = video.storage_path as string;
        const title = (video.title as string) || "Video";
        const ext = path.split(".").pop() || "mp4";
        const safe = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "video";

        const [play, download] = await Promise.all([
          sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 8),
          sb.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60 * 8, { download: `${safe}.${ext}` }),
        ]);

        const playUrl = play.data?.signedUrl;
        const dlUrl = download.data?.signedUrl;
        if (!playUrl || !dlUrl) {
          return liteResponse(litePage(title, "<p>Link nahi bana.</p>"), 500);
        }

        return liteResponse(
          litePage(
            title,
            `<h1>${esc(title)}</h1>
<p><a href="${esc(playUrl)}">&#9654; Video chalayein</a></p>
<p><a class="dl" href="${esc(dlUrl)}">&#8681; Download karein</a></p>
<p class="small">Download ke baad phone ke video player me offline dekh sakte hain.</p>
<p><a href="/api/public/lite">&#8592; Sab episodes</a></p>`,
          ),
        );
      },
    },
  },
});
