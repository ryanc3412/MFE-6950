# Minimal Micro-Frontend (MFE) Demo

This project is intended to run through Docker for a smooth, reproducible setup on a fresh machine.

## Architecture and Ports

```text
shell       -> http://localhost:3000  (host app)
remote-a    -> http://localhost:3001  (transactions remote)
api         -> http://localhost:3002  (FastAPI backend)
remote-b    -> http://localhost:3003  (watchlist remote)
remote-vue  -> http://localhost:3004  (Vue Hello World remote, started separately)
```

## Prerequisites

- Docker Desktop (or Docker Engine) installed.
- `docker compose` available.

Quick checks:

```bash
docker --version
docker compose version
```

## Docker-Only Quick Start (Recommended)

From repo root:

### 1) Create environment file

```bash
cp .env.example .env
```

Optional but recommended:
- set `FINNHUB_API_KEY` for live stock quotes.
- set `OPENAI_API_KEY` for LLM transaction categorization.

If keys are left as placeholders:
- app still runs,
- stock quotes may be stale/unavailable,
- CSV categorization uses fallback rules.

### 2) Build and start core services

```bash
docker compose build
docker compose up -d
```

This starts:
- `shell` (3000)
- `remote-a` (3001)
- `api` (3002)
- `remote-b` (3003)

### 3) Start Vue remote in Docker (for Hello World page)

Current `docker-compose.yml` does not include `remote-vue`, so run it as a separate Docker container:

```bash
docker build -t mfe-remote-vue ./remote-vue
docker run --rm -p 3004:3004 mfe-remote-vue
```

Keep this terminal running while demoing `Hello World (Vue)`.

### 4) Open and verify

Open `http://localhost:3000` and verify:
- `Command Center`
- `Transactions`
- `Market Watch`
- `Hello World (Vue)`

### 5) Populate demo transaction data (recommended)

To preload transaction data for the class demo:

1. Open `http://localhost:3000/transactions`
2. In **Upload transactions (CSV)**, choose:
   - `dummy_transactions_jan_to_apr.csv` (from the repo root)
3. Wait for the import success message.

After upload, you should see populated data in:
- spending matrix on `Transactions`
- recent transactions table
- related account/summary views in the shell.

## Stop / Cleanup

Stop compose stack:

```bash
docker compose down
```

Stop Vue remote container:
- press `Ctrl+C` in the terminal where `docker run ...` is active.

Data persistence notes:
- SQLite data is persisted on Docker volume `finance_api_data`.
- `docker compose down` keeps data.
- `docker compose down -v` removes volumes and deletes persisted DB data.

## Troubleshooting

### Docker credential helper error (WSL/Linux)

If `docker compose build` fails with:
`docker-credential-desktop.exe: exec format error`

Run:

```bash
mkdir -p ~/.docker
echo '{"auths":{}}' > ~/.docker/config.json
```

Then retry:

```bash
docker compose build
docker compose up -d
```

### Shell loads but remote page fails

Check required ports:
- `3001` (`remote-a`)
- `3003` (`remote-b`)
- `3004` (`remote-vue`, separate container)

### Quote data missing

Set a valid `FINNHUB_API_KEY` in `.env`, then restart API:

```bash
docker compose restart api
```

### CSV categorization is basic

Set `OPENAI_API_KEY` in `.env`, then restart API:

```bash
docker compose restart api
```

## Professor Demo Checklist

1. `cp .env.example .env`
2. `docker compose build`
3. `docker compose up -d`
4. `docker build -t mfe-remote-vue ./remote-vue`
5. `docker run --rm -p 3004:3004 mfe-remote-vue`
6. Open `http://localhost:3000/transactions` and upload `dummy_transactions_jan_to_apr.csv`
7. Open `http://localhost:3000` and click through all pages.
