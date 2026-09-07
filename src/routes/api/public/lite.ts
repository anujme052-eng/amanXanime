import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "videos";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function client() {
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string) || process.env["SUPABASE_URL"]!;
  const key =
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string) ||
    process.env["SUPABASE_ANON_KEY"]!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const page = (title: string, body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{margin:0;padding:6px;background:#000;color:#fff;font-family:sans-serif;font-size:14px}
h1{font-size:16px;margin:4px 0 8px}
a{color:#ffb347;text-decoration:none}
ul{list-style:none;margin:0;padding:0}
li{border-bottom:1px solid #333;padding:6px 0}
.dl{color:#7fdd7f}
.small{color:#aaa;font-size:12px}
</style></head><body>${body}</body></html>`;

export const Route = createFileRoute("/api/public/lite")({
  server: {
    handlers: {
      GET: async () => {
        const sb = client();
        const { data, error } = await sb
          .from("videos")
          .select("id, title, duration_seconds, created_at")
          .order("created_at", { ascending: true });
        if (error) {
          return new Response(page("amanXanime Lite", "<p>Videos load nahi hui.</p>"), {
            status: 500,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        const items = (data ?? [])
          .map(
            (v, i) =>
              `<li><a href="/api/public/lite/watch?id=${encodeURIComponent(v.id as string)}">Ep. ${i + 1} - ${esc(
                (v.title as string) || "Video",
              )}</a></li>`,
          )
          .join("");
        return new Response(
          page(
            "amanXanime Lite",
            `<h1>amanXanime</h1><p class="small">Lite version (slow phones ke liye)</p><ul>${
              items || "<li>Abhi koi video nahi.</li>"
            }</ul>`,
          ),
          { headers: { "content-type": "text/html; charset=utf-8" } },
        );
      },
    },
  },
});

export { BUCKET, esc, client };
