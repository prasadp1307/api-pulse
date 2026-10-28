import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <header className="border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-900 font-mono text-2xs">
              AP
            </span>
            API Pulse
          </span>
          <Link href="/login" className="btn-primary">
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-sm text-zinc-500">API monitoring &amp; testing</p>
        <h1 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
          Uptime checks, latency metrics, and a built-in HTTP client.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Schedule probes against production endpoints, review p95/p99 history, and debug APIs in
          the same workspace—without switching tools.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/login" className="btn-primary">
            Open console
          </Link>
          <a href="#capabilities" className="btn-secondary">
            Capabilities
          </a>
        </div>

        <section id="capabilities" className="mt-16 grid gap-px overflow-hidden rounded border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          {[
            {
              title: "Scheduled monitors",
              body: "Interval-based checks with configurable timeouts and expected status codes.",
            },
            {
              title: "Workspace",
              body: "Collections, environments, auth helpers, and response inspection.",
            },
            {
              title: "Operations log",
              body: "Control-plane access and probe history for incident review.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-[var(--surface-1)] p-5">
              <h2 className="text-sm font-medium text-zinc-200">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
