import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signInWithUsername } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — amanXanime" },
      { name: "description", content: "amanXanime me sign in karein — username aur password se." },
      { property: "og:title", content: "Sign in — amanXanime" },
      { property: "og:description", content: "amanXanime me sign in karein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithUsername(username, password);
    if (err) {
      setError(hindiAuthError(err));
      setBusy(false);
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Videos dekhne ke liye sign in karein.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Account nahi hai?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Naya account banayein
          </Link>
        </p>
      </div>
    </main>
  );
}

export function hindiAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Username ya password galat hai.";
  if (m.includes("already registered")) return "Ye username pehle se le liya gaya hai.";
  if (m.includes("at least")) return "Password kam se kam 6 characters ka hona chahiye.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Internet connection check karein aur dobara try karein.";
  return message;
}
