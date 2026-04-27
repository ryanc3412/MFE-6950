# Minimal Micro-Frontend (MFE) Demo

This project is a class demo of microfrontends:
- Next.js **host shell** that composes remote apps at runtime.
- Next.js **remote-a** and **remote-b** via Module Federation.
- Vue 3 **remote-vue** loaded by the shell from `remoteEntry.js`.
- FastAPI backend for transactions, watchlist, and quotes.

This README is written as a **professor setup guide** so a first-time machine can run the app smoothly.

## What Runs Where

```text
shell       -> http://localhost:3000  (host app)
remote-a    -> http://localhost:3001  (transactions remote)
api         -> http://localhost:3002  (FastAPI backend)
remote-b    -> http://localhost:3003  (watchlist remote)
remote-vue  -> http://localhost:3004  (Vue Hello World remote)
```

## Option 1 (Recommended): Local Dev (No Docker)

Use this for easiest grading/demo flow. It guarantees all pages, including Vue Hello World, work.

### 1) Prerequisites

- Node `22.x` recommended (works with current scripts and Docker config).
- `pnpm` `9.15.0` (project package manager).
- Python `3.12` recommended.

Quick checks:

```bash
node -v
pnpm -v
python --version
```

If `pnpm` is missing:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

### 2) Clone and install

From repo root:

```bash
pnpm install
```

Install API dependencies:

```bash
cd api
python -m pip install -r requirements.txt
cd ..
```

### 3) Environment setup (important)

Create API env file from example:

```bash
cp api/.env.example api/.env
```

Edit `api/.env`:
- `OPENAI_API_KEY`: optional (CSV categorization uses fallback if missing).
- `FINNHUB_API_KEY`: optional but needed for live stock quotes.

If keys are not set:
- Transactions still import (fallback categorization).
- Watchlist still works, but live quote features may be stale/unavailable.

### 4) Start services (5 terminals)

From repo root:

Terminal 1 (API):
```bash
pnpm run dev:api
```

Terminal 2 (remote-a):
```bash
pnpm run dev:remote-a
```

Terminal 3 (remote-b):
```bash
pnpm run dev:remote-b
```

Terminal 4 (remote-vue federation preview):
```bash
pnpm run dev:remote-vue:fed
```

Terminal 5 (shell):
```bash
pnpm run dev:shell
```

### 5) Verify app is healthy

Open `http://localhost:3000`.

Check these pages:
- `Command Center`
- `Transactions` (remote-a)
- `Market Watch` (remote-b)
- `Hello World (Vue)` (remote-vue)

If all four work, the setup is complete.

---

## Option 2: Docker Compose (Mostly One-Command)

This is good for quick startup, but note one important limitation:
- Current `docker-compose.yml` starts `shell`, `remote-a`, `remote-b`, and `api`.
- It does **not** start `remote-vue`.
- Therefore, `Hello World (Vue)` route will not work unless `remote-vue` is run separately.

### 1) Prerequisites

- Docker Desktop (or Docker Engine) with `docker compose`.

### 2) Environment file at repo root

Create root env file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY` (optional)
- `FINNHUB_API_KEY` (optional but needed for live quotes)

### 3) Build and start

```bash
docker compose build
docker compose up
```

Or detached:

```bash
docker compose up -d
```

### 4) Open the app

Go to `http://localhost:3000`.

Working routes with compose-only startup:
- `Command Center`
- `Transactions`
- `Market Watch`

`Hello World (Vue)` requires extra step (next section).

### 5) Optional: run Vue remote alongside Docker

In a separate local terminal (repo root):

```bash
pnpm install
pnpm run dev:remote-vue:fed
```

Now the `Hello World (Vue)` page should load at `http://localhost:3000/hello-world`.

### 6) Stop and cleanup

```bash
docker compose down
```

Data note:
- SQLite data is stored in Docker volume `finance_api_data`.
- `docker compose down` keeps that data.
- `docker compose down -v` deletes the volume and wipes persisted data.

---

## Common Issues and Fixes

### 1) Shell loads but remote pages fail

Cause: one or more remotes not running.

Fix:
- Ensure ports `3001`, `3003`, and `3004` are active when using local dev.
- In Docker-only mode, remember `3004` is not included unless run separately.

### 2) Quote data missing / stock errors

Cause: `FINNHUB_API_KEY` missing or invalid.

Fix:
- Add a valid key to `api/.env` (local dev) or `.env` (docker compose).
- Restart API service.

### 3) CSV import works but AI category quality is basic

Cause: no `OPENAI_API_KEY`; fallback categorizer is used.

Fix:
- Add `OPENAI_API_KEY` and restart API.

### 4) Docker credential helper error in WSL/Linux

If build fails with `docker-credential-desktop.exe: exec format error`:

```bash
mkdir -p ~/.docker
echo '{"auths":{}}' > ~/.docker/config.json
```

Then retry:

```bash
docker compose build
docker compose up
```

---

## Quick Demo Checklist (Professor-Friendly)

From a clean machine:
1. Install Node 22, pnpm 9.15.0, Python 3.12.
2. `pnpm install`
3. `cd api && python -m pip install -r requirements.txt && cd ..`
4. `cp api/.env.example api/.env` (optional keys can stay placeholder for basic demo)
5. Start 5 terminals with the commands in **Option 1**.
6. Open `http://localhost:3000` and navigate through all sections.

If that checklist passes, the project is fully up and running.
