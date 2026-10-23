import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import {
  isUsernameAvailable,
  normalizeUsername,
  signUpWithUsername,
} from "@/lib/auth";
import { hindiAuthError } from "@/routes/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Naya account — amanXanime" },
      { name: "description", content: "amanXanime par naya account banayein — username aur password se." },
      { property: "og:title", content: "Naya account — amanXanime" },
      { property: "og:description", content: "amanXanime par naya account banayein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const normalized = normalizeUsername(username);
    if (!normalized) {
      setError("Username me sirf chhote letters, number aur _ use karein.");
      return;
    }
    if (password.length < 6) {
      setError("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }
    if (password !== confirm) {
      setError("Dono password same nahi hai.");
      return;
    }

    setBusy(true);
    const available = await isUsernameAvailable(normalized);
    if (!available) {
      setError("Ye username pehle se le liya gaya hai — dusra chunein.");
      setBusy(false);
      return;
    }
    const { error: err } = await signUpWithUsername(normalized, password);
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
        <h1 className="text-xl font-bold">Naya account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Username aur password chun kar account banayein.
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
            <p className="mt-1 text-xs text-muted-foreground">
              Sirf a-z, 0-9 aur _ (koi space nahi)
            </p>
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
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
              Password (phir se)
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Account banayein
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pehle se account hai?{" "}
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Sign in karein
          </Link>
        </p>
      </div>
    </main>
  );
}
