"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");
  const dbHint = useMemo(() => {
    if (urlError === "DatabaseUnavailable") {
      return "Cannot reach PostgreSQL. Start Docker, run docker compose up -d, then npm run db:push && npm run db:seed.";
    }
    if (urlError && /Authentication failed against database/i.test(urlError)) {
      return "Database credentials mismatch. Check DATABASE_URL (port 5434) and restart services.";
    }
    return null;
  }, [urlError]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "DatabaseUnavailable"
          ? "Database is not reachable. See the notice below."
          : "Invalid email or password"
      );
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-0)]">
      <header className="border-b border-[var(--border-subtle)] px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-zinc-200">
          API Pulse
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="panel w-full max-w-sm p-6">
          <h1 className="text-base font-semibold text-zinc-100">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-500">Use your organization account credentials.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {dbHint && <p className="alert-warning">{dbHint}</p>}
            {error && <p className="alert-error">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
