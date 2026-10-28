# API Pulse Intelligence

**API Pulse Intelligence** is a full-stack platform that combines **production API monitoring** (uptime, latency, alerts) with an **integrated HTTP workspace** for building, sending, and debugging requests. Unlike tools that only relay traffic, it helps developers **understand failures** through rule-based analysis that separates **confirmed facts** from **hypotheses**, response diffs, OpenAPI contract checks, and security findings.

Repository: [github.com/prasadp1307/api-pulse](https://github.com/prasadp1307/api-pulse)

---

## Why this project exists

Teams often split work across:

- An **uptime monitor** for production endpoints  
- **Postman** (or similar) for manual testing  
- Spreadsheets or docs for environment URLs and tokens  

API Pulse Intelligence unifies **observability** and **interactive testing** in one authenticated console, with a worker that runs scheduled probes and a server-side proxy that executes workspace requests safely (SSRF protection, rate limits, secret redaction).

---

## Use cases

### 1. SRE / platform — production uptime

- Register critical HTTP endpoints as **monitors** with interval, timeout, and expected status.  
- Track **24h uptime**, **p95/p99 latency**, and failure counts on the overview dashboard.  
- Stream **live probe events** over SSE while the worker runs.  
- Configure **alert rules** (consecutive failures, latency thresholds) and optional webhooks.

**Example:** Monitor `https://api.example.com/health` every 60s; page on two consecutive `DOWN` results.

### 2. Backend developer — debug a failing API

- Open **HTTP workspace**, pick a saved request from **Live Demo APIs** or **+ Add API**.  
- Send the request; inspect status, timing, headers, and formatted JSON.  
- Read **Pulse Intelligence**: HTTP status explanation, likely auth/routing/payload hypotheses, suggested fixes.  
- Set a **diff baseline**, switch **environment** (`{{baseUrl}}`), and compare responses across staging vs production.

**Example:** `401` on staging → Intelligence flags missing Bearer token; fix env var and re-send.

### 3. QA / release — contract and regression checks

- **Import OpenAPI** or Postman collection into a workspace collection.  
- Attach an OpenAPI document and **validate** live responses against the operation schema (AJV).  
- Use **response diff** after a deploy to see changed or removed JSON fields.  
- Apply **generated tests** (positive, negative, boundary) from the intelligence panel.

**Example:** After a release, diff production response against last week’s baseline; fail release if required fields disappear.

### 4. Security-conscious teams — quick response review

- Every workspace response runs a **security scan**: missing security headers, possible secrets in body (redacted in UI), error payloads on HTTP 200.  
- Requests execute **on the server**; credentials in saved requests are not exposed to the browser beyond what you type for the session.  
- Private IPs and cloud metadata hosts are blocked unless explicitly allowed for local dev.

### 5. Integration / workflow testing

- **Workflow** tab: run a login request, **extract** `access_token` via JSON path into the environment, then call a protected endpoint in step 2.  
- Save workflows and collections; **export** `.apipulse.json` for sharing.

---

## Feature overview

| Area | Capabilities |
| --- | --- |
| **Monitoring** | Scheduled checks, on-demand probe, latency percentiles, alerts, logs |
| **Workspace** | GET/POST/PUT/PATCH/DELETE, query, headers, body, Bearer/API key auth |
| **Collections** | **+ Add API**, searchable sidebar, save/load, import/export |
| **Environments** | Variables with `{{name}}` substitution |
| **Pulse Intelligence** | Facts vs hypotheses, fixes, follow-up tests, performance vs history |
| **Response diff** | Deep JSON compare vs baseline |
| **OpenAPI** | Import spec, validate response against operation schema |
| **Security scan** | Headers, secret patterns, fingerprinting hints |
| **Import** | Postman v2.1, OpenAPI, native collection format |
| **Engineering** | NextAuth, Redis rate limits, SSRF guard, Prisma/PostgreSQL |

---

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Next.js (web)  │────▶│  PostgreSQL      │◀────│   Worker    │
│  Dashboard +    │     │  monitors,       │     │  scheduled  │
│  Workspace API  │     │  checks,         │     │  health     │
└────────┬────────┘     │  collections     │     │  checks     │
         │              └──────────────────┘     └──────┬──────┘
         │                        ▲                      │
         └────────────────────────┴──────────────────────┘
                                  Redis (rate limit, SSE live feed)
```

| Layer | Technology |
| --- | --- |
| Web & API | Next.js 15, TypeScript, NextAuth, Tailwind CSS |
| Worker | Node.js scheduled health-check processor |
| Database | PostgreSQL (Prisma ORM) |
| Cache / pub-sub | Redis |
| Shared logic | `@api-pulse/shared` (HTTP executor, intelligence, diff, OpenAPI validation) |
| Cloud (reference) | AWS ECS, RDS, ElastiCache — see `infra/aws/README.md` |

### Monorepo layout

```text
apps/web              Next.js UI + REST API
apps/worker           Background monitor scheduler
packages/database     Prisma schema & client
packages/shared       Health checks, workspace HTTP, intelligence engine
fixtures/             Sample collection (Live Demo APIs)
```

---

## Quick start

### Prerequisites

- Node.js 20+  
- Docker (PostgreSQL and Redis)

### Install and configure

```bash
git clone https://github.com/prasadp1307/api-pulse.git
cd api-pulse
npm install
cp .env.example .env
cp .env.example apps/web/.env
```

Edit `.env` for production (`NEXTAUTH_SECRET`, credentials). Never commit `.env`.

### Infrastructure

Start Docker, then:

```bash
docker compose up -d
```

Default ports: **Postgres 5434**, **Redis 6380** (avoids conflicts with local 5432/6379).

### Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Seed creates a demo user, sample monitor, **Live Demo APIs** collection (8 public endpoints), and a **Demo** environment.

### Run

```bash
npm run dev:all
```

- Web: [http://localhost:3000](http://localhost:3000)  
- Sign in with `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` from `.env` (defaults in `.env.example`)

For local API URLs in the workspace:

```env
WORKSPACE_ALLOW_PRIVATE_URLS="true"
```

### Production build

```bash
npm run build
npm run start -w @api-pulse/web
npm run start -w @api-pulse/worker
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Login fails / `Authentication failed for apipulse` | Use Docker Postgres on **5434**, `npm run db:push` + `db:seed` |
| `DATABASE_URL` not found on `db:push` | Run `npm run db:push` from **repo root** |
| Redis/port bind errors | Use `REDIS_URL=redis://localhost:6380` per `docker-compose.yml` |

---

## API reference (selected)

### Monitoring

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Web health |
| GET/POST | `/api/monitors` | List / create monitors |
| GET | `/api/monitors/:id/stats` | Uptime & latency percentiles |
| POST | `/api/monitors/:id/check-now` | On-demand probe |
| GET | `/api/dashboard` | Overview aggregates |
| GET | `/api/live` | SSE live probe stream |

### Workspace & intelligence

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/workspace/send` | Execute request + intelligence, diff, security, OpenAPI validation |
| GET/POST | `/api/workspace/collections` | Collections |
| GET/POST | `/api/workspace/requests` | Save requests |
| GET/POST | `/api/workspace/environments` | Environments |
| GET | `/api/workspace/history` | Request history |
| POST | `/api/workspace/import` | Postman / OpenAPI / apipulse JSON |
| GET/POST | `/api/workspace/openapi` | OpenAPI documents |
| GET | `/api/workspace/export?collectionId=` | Export collection |

---

## Demo data

- **Monitors:** Example HTTPBin status check (seed).  
- **Workspace:** Collection **Live Demo APIs** — httpbin, JSONPlaceholder, GitHub Zen, REST Countries, Bearer sample.  
- **Import file:** `fixtures/live-demo-apis.apipulse.json`

---

## Security notes

- Workspace requests are executed **server-side** with URL allowlisting (SSRF).  
- Response bodies may be **redacted** when secret-like patterns are detected.  
- Use environment variables for tokens; rotate secrets used in demos.  
- Enable `WORKSPACE_ALLOW_PRIVATE_URLS` only in trusted local development.

---

## License

MIT

---

## Author

Maintained by [prasadp1307](https://github.com/prasadp1307). Contributions and issues welcome on GitHub.
