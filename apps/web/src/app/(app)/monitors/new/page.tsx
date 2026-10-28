"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default function NewMonitorPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        url: form.get("url"),
        method: form.get("method"),
        intervalSec: Number(form.get("intervalSec")),
        timeoutMs: Number(form.get("timeoutMs")),
        expectedStatus: Number(form.get("expectedStatus")),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(typeof body.error === "string" ? body.error : "Failed to create monitor");
      return;
    }
    const { monitor } = await res.json();
    router.push(`/monitors/${monitor.id}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="New monitor"
        description="The worker will probe this URL on the interval you specify."
      />
      <form onSubmit={onSubmit} className="panel space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">
            Display name
          </label>
          <input id="name" name="name" className="input" required placeholder="Payments API" />
        </div>
        <div>
          <label className="label" htmlFor="url">
            Request URL
          </label>
          <input
            id="url"
            name="url"
            className="input font-mono text-xs"
            required
            type="url"
            placeholder="https://api.example.com/health"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="method">
              Method
            </label>
            <select id="method" name="method" className="select" defaultValue="GET">
              {["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="expectedStatus">
              Expected status
            </label>
            <input
              id="expectedStatus"
              name="expectedStatus"
              className="input font-mono"
              type="number"
              defaultValue={200}
              min={100}
              max={599}
            />
          </div>
          <div>
            <label className="label" htmlFor="intervalSec">
              Interval (seconds)
            </label>
            <input
              id="intervalSec"
              name="intervalSec"
              className="input font-mono"
              type="number"
              defaultValue={60}
              min={15}
            />
          </div>
          <div>
            <label className="label" htmlFor="timeoutMs">
              Timeout (ms)
            </label>
            <input
              id="timeoutMs"
              name="timeoutMs"
              className="input font-mono"
              type="number"
              defaultValue={30000}
              min={1000}
            />
          </div>
        </div>
        {error && <p className="alert-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create monitor"}
        </button>
      </form>
    </div>
  );
}
