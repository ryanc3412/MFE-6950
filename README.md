# Minimal Micro-Frontend (MFE) Demo

Small MFE for learning: one shell app that loads two remotes via Module Federation, plus a Python API.

## Structure

```
mfe-minimal/
  shell/        # Host app (Next.js) — port 3000
  remote-a/     # Exposes Square Number — port 3001
  remote-b/     # Exposes Character Count — port 3003
  api/          # FastAPI backend — port 3002
```

All app source lives in those four folders; no `packages/`, no Turbo.

## One-time setup

- **Node:** From repo root run `pnpm install` (installs shell, remote-a, remote-b).
- **API:** `cd api && pip install -r requirements.txt` (or use a venv).

## Run (4 terminals)

1. **API:** `pnpm run dev:api` or `cd api && python -m uvicorn main:app --reload --port 3002`
2. **Remote A:** `pnpm run dev:remote-a`
3. **Remote B:** `pnpm run dev:remote-b`
4. **Shell:** `pnpm run dev:shell`

Then open http://localhost:3000 — use the nav for Home, Square Number, Character Count.
