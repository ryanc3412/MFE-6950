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
- **API:** `cd api && pip install -r requirements.txt` (or use a venv).
- **Stock Price:** Copy `shell/.env.example` to `shell/.env.local` and set `FINNHUB_API_KEY` to your [Finnhub](https://finnhub.io/register) API key.

## Run (5 terminals)

1. **API:** `pnpm run dev:api` or `cd api && python -m uvicorn main:app --reload --port 3002`
2. **Remote A:** `pnpm run dev:remote-a`
3. **Remote B:** `pnpm run dev:remote-b`
4. **Remote Vue:** `pnpm run dev:remote-vue:fed` (builds and serves the Vue remote so the shell can load it; use `pnpm run dev:remote-vue` for standalone Vue dev)
5. **Shell:** `pnpm run dev:shell`

Then open http://localhost:3000 — use the nav for Home, Square Number, Character Count, **Stock Price**, and **Hello World** (Vue 3 remote loaded via Module Federation).
