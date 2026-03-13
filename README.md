# Minimal Micro-Frontend (MFE) Demo

Small MFE for learning: one shell app that loads two remotes via Module Federation, plus a Python API.

## Structure

```
mfe-minimal/
  shell/        # Host app (Next.js) — port 3000
  remote-a/     # Exposes Square Number — port 3001
  remote-b/     # Exposes Character Count, Stock Price — port 3003
  remote-vue/   # Vue 3 remote (Hello World) — port 3004
  api/          # FastAPI backend — port 3002
```

All app source lives in those directories; no `packages/`, no Turbo.

## One-time setup

- **Node:** From repo root run `pnpm install` (installs shell, remote-a, remote-b, remote-vue).
- **API:** `cd api && pip install -r requirements.txt` (or use a venv). For **Stock Price**, copy `api/.env.example` to `api/.env` and set `FINNHUB_API_KEY` ([get a key](https://finnhub.io/register)).

## Run locally (5 terminals)

1. **API:** `pnpm run dev:api` or `cd api && python -m uvicorn main:app --reload --port 3002`
2. **Remote A:** `pnpm run dev:remote-a`
3. **Remote B:** `pnpm run dev:remote-b`
4. **Remote Vue:** `pnpm run dev:remote-vue:fed` (builds and serves the Vue remote so the shell can load it; use `pnpm run dev:remote-vue` for standalone Vue dev)
5. **Shell:** `pnpm run dev:shell`

Then open http://localhost:3000 — use the nav for Home, Square Number, Character Count, **Stock Price**, and **Hello World** (Vue 3 remote loaded via Module Federation).

## Run with Docker (all services)

- **Prereqs**: Docker (and `docker compose`) installed.
- **API env**: For Stock Price to work, copy `api/.env.example` to `api/.env` and set `FINNHUB_API_KEY` ([get a key](https://finnhub.io/register)).

From the repo root:

1. **Build all images**  
   `docker compose build`

2. **Start everything** (shell, remotes, API)  
   `docker compose up`

   Or in the background: `docker compose up -d`

3. **Open the shell**  
   Go to http://localhost:3000 and use the nav for Home, Square Number, Character Count, **Stock Price**, and **Hello World** (Vue 3 remote via Module Federation).

To stop the stack, run `docker compose down`.

### Docker: "error getting credentials" / docker-credential-desktop.exe

If `docker compose build` fails with `error getting credentials - err: fork/exec ... docker-credential-desktop.exe: exec format error`, Docker is using a Windows credential helper on a Linux/WSL host.

**Option A – Fix your global Docker config (recommended):**

```bash
mkdir -p ~/.docker
echo '{"auths":{}}' > ~/.docker/config.json
```

Then run `docker compose build` again. Use `docker login` later if you need a private registry.

**Option B – Use a temporary config only for this project** (no change to `~/.docker`):

```bash
mkdir -p .docker-tmp
echo '{"auths":{}}' > .docker-tmp/config.json
DOCKER_CONFIG=$PWD/.docker-tmp docker compose build
DOCKER_CONFIG=$PWD/.docker-tmp docker compose up
```

Add `.docker-tmp/` to `.gitignore` if you use Option B.
