import { createClient } from "@supabase/supabase-js";

export const BUCKET = "videos";

export function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function litePage(title: string, body: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
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
}

export function liteResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export function liteClient() {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  return createClient(url, key, { auth: { persistSession: false } });
}
