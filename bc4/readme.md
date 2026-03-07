# BC4 Procurement Planning Agent

**AI-Powered Intelligent Procurement Planning** — Enterprise-grade procurement analytics powered by Azure OpenAI with full-stack Next.js + FastAPI + PostgreSQL.

*Chin Hin AI Hackathon 2026 — Business Challenge 4*

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router + TypeScript + Tailwind CSS v3) │
│  Port 3000 — Sidebar SaaS UI (9 pages)                  │
├─────────────────────────────────────────────────────────┤
│  FastAPI (Python) — Async REST API                       │
│  Port 8000 — Auth + Analysis + Approvals + PRs + Audit  │
├─────────────────────────────────────────────────────────┤
│  Azure OpenAI — GPT-4 (AsyncAzureOpenAI, parallel)      │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 16 (Docker) — Persistent data store          │
│  Port 5432                                               │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **Docker Desktop** (for PostgreSQL)
- **Azure OpenAI** credentials (see `.env.example`)

## Quick Start

### 1. Start PostgreSQL

```powershell
docker compose up -d
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure OpenAI credentials:

```
AZURE_OPENAI_ENDPOINT=<your-endpoint>
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=<your-deployment>
AZURE_OPENAI_API_VERSION=2024-02-15-preview
DATABASE_URL=postgresql://bc4user:bc4pass@localhost:5432/bc4_procurement
JWT_SECRET=<random-secret>
```

### 3. Start Backend

```powershell
pip install -r requirements.txt
uvicorn api:app --reload
```

Backend runs at **http://localhost:8000** — Swagger docs at **/docs**

> Tables auto-create on first startup via `init_db()`.

### 4. Seed Demo Data

```powershell
python -m backend.seed
```

Or via API: `POST http://localhost:8000/seed/demo`

Creates:
- 3 demo users (`admin/admin123`, `procurement/proc123`, `approver/appr123`)
- 200 synthetic SKUs with 12-month sales history
- Full analysis run with approvals pre-populated

### 5. Start Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

### One-Command Start (PowerShell)

```powershell
.\start.ps1 -SeedDemo
```

Flags: `-SkipDocker`, `-SeedDemo`, `-BackendOnly`, `-FrontendOnly`

---

## Demo Flow for Judges

1. **Login** → `http://localhost:3000/login` → `admin` / `admin123`
2. **Dashboard** → Strategic KPIs, risk distribution chart, recent runs
3. **Settings** → Click "Seed Demo Data" → populates 200 SKUs in seconds
4. **Single Analysis** → Enter one SKU → AI analysis with explainability + executive summary
5. **Bulk Analysis** → Upload `sample_skus.csv` → all SKUs processed **in parallel** (~3s for 8 SKUs)
6. **Decision Cockpit** → Priority-ranked table → click a SKU for detail drawer
7. **What-If Simulator** → Adjust demand/lead time/damaged stock → see baseline vs scenario side-by-side
8. **Approvals** → "Approve All" → bulk-approve recommendations
9. **Purchase Requests** → "Generate PR" → export PDF or Excel
10. **Audit Trail** → Full immutable log of every system action

---

## Key Features

### AI Brain
- **Azure OpenAI** structured JSON analysis (GPT-4, temperature 0.2)
- **Parallel processing** — `asyncio.gather()` fires all SKU calls simultaneously; 8 SKUs in ~3s (was 16–24s)
- **Seasonal demand detection** — month-aware multipliers applied before LLM call:
  - January / February → **CNY Season** × 1.30
  - April / May → **Raya Season** × 1.20
  - November / December → **Year-End Season** × 1.15
- **Executive summary** — GPT-4 boardroom-tone narrative per SKU (also parallelized)
- **Forecast confidence** — calculated from demand volatility (CV)
- **AI explainability** — bullet-point reasoning per SKU
- **Priority ranking** — composite score: risk × coverage × demand × confidence

### What-If Simulator
- Input: base SKU data + `demand_change_pct`, `lead_time_change`, `stock_adjustment`, `month`
- Runs baseline + scenario LLM analyses in parallel
- Returns `baseline`, `scenario`, and `delta` (qty_delta, risk change, coverage_delta, recommendation)
- Month selector in sidebar persists to `localStorage` and pre-fills the simulator

### Authentication
- JWT access + refresh tokens (auto-refresh interceptor in Axios)
- Roles: `admin`, `procurement_officer`, `approver`
- Protected routes via `AuthGuard` component

### Persistence
- PostgreSQL 16 via Docker
- 9 tables: `users`, `analysis_runs`, `analysis_results`, `approvals`, `purchase_requests`, `purchase_request_items`, `audit_logs`, `settings`, (+ sequences)

### Exports
- PDF export via fpdf2
- Excel export via openpyxl

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login — returns JWT pair + user info |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user profile |
| POST | `/analyze` | Single SKU analysis (async, LLM) |
| POST | `/analyze-bulk` | Multi-SKU parallel analysis |
| GET | `/analysis/runs` | List all analysis runs |
| GET | `/analysis/run/{id}` | Run summary |
| GET | `/analysis/run/{id}/results` | All results for a run |
| POST | `/what-if` | Baseline vs scenario comparison |
| GET | `/approvals` | List approvals (filterable by run/status) |
| POST | `/approvals/{run_id}/{sku}/approve` | Approve one SKU |
| POST | `/approvals/{run_id}/{sku}/reject` | Reject one SKU |
| POST | `/approvals/{run_id}/approve-all` | Bulk approve pending |
| POST | `/prs/from-run/{run_id}` | Generate PR from approved items |
| GET | `/prs` | List all purchase requests |
| GET | `/prs/{id}/export/pdf` | Export PR as PDF |
| GET | `/prs/{id}/export/excel` | Export PR as Excel |
| GET | `/audit` | Audit trail (filterable by action/entity) |
| GET | `/settings` | Current system settings |
| PUT | `/settings` | Update settings (admin only) |
| POST | `/seed/demo` | Generate 200-SKU demo dataset |
| GET | `/dashboard/stats` | Aggregated KPIs for dashboard |

---

## Business Logic

1. **Weighted Demand** = (0.6 × Avg 3m) + (0.4 × Avg 6m)
2. **Total Stock** = Current + Incoming
3. **Projected Demand** = Weighted Demand × Lead Time
4. **Coverage** = Total Stock / Weighted Demand (months)
5. **Risk Level:**
   - **High** = Coverage < Lead Time
   - **Medium** = Lead Time ≤ Coverage < Lead Time + 1
   - **Low** = Coverage ≥ Lead Time + 1
6. **Slow-Moving:** Weighted Demand < 30 units/month
7. **Failure Rate:**
   - > 8% → Flag "Quality Risk" + advise supplier evaluation
   - > 10% → Cap purchase to max 1 month demand
8. **Purchase Quantity:**
   - Required = Projected Demand − Total Stock (min 0)
   - Add 1-month safety buffer if High Risk AND Failure Rate ≤ 8%

---

## Project Structure

```
HACKATHON/
├── api.py                    # FastAPI entry point — all async routes
├── models.py                 # Pydantic request/response schemas
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # PostgreSQL container
├── sample_skus.csv           # Sample CSV for bulk analysis demo
├── start.ps1                 # PowerShell quick-start script
├── .env                      # Environment variables (not committed)
├── .env.example              # Template for .env
│
├── backend/
│   ├── __init__.py
│   ├── forecasting.py        # Azure OpenAI engine (sync + async, seasonal)
│   ├── pr_generator.py       # PR creation + PDF/Excel export
│   ├── db.py                 # SQLAlchemy engine & session
│   ├── tables.py             # SQLAlchemy ORM models (9 tables)
│   ├── auth.py               # JWT authentication + RBAC
│   └── seed.py               # 200-SKU demo data generator
│
└── frontend/                 # Next.js 15 App Router
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   ├── login/page.tsx
        │   └── (app)/
        │       ├── layout.tsx               # Auth guard + sidebar wrapper
        │       ├── dashboard/page.tsx       # KPIs + risk chart
        │       ├── single-analysis/page.tsx # Single SKU form + result
        │       ├── bulk-analysis/page.tsx   # CSV upload + bulk results
        │       ├── decision-cockpit/page.tsx # Priority table + detail drawer
        │       ├── what-if/page.tsx         # Baseline vs scenario simulator
        │       ├── approvals/page.tsx       # Approve/reject queue
        │       ├── purchase-requests/page.tsx # PR list + PDF/Excel export
        │       ├── audit-trail/page.tsx     # Filterable audit log
        │       └── settings/page.tsx        # Service level + seed demo
        ├── components/
        │   ├── sidebar.tsx                  # Nav + month selector
        │   └── auth-guard.tsx               # Route protection
        └── lib/
            ├── api.ts                       # Axios client + typed API functions
            ├── auth.tsx                     # AuthContext + useAuth hook
            └── utils.ts                     # cn() utility
```

---

## Assumptions & Design Decisions

1. **No Alembic migrations** — `Base.metadata.create_all()` on startup for hackathon simplicity
2. **JWT in localStorage** — Suitable for demo; production uses httpOnly cookies
3. **Seed uses deterministic math** — No LLM calls during seeding
4. **CORS allows all origins** — For development convenience
5. **PR numbering** — In-memory counter from 1000; resets on server restart
6. **Tailwind v3** — `tailwind.config.ts` + `@tailwind base/components/utilities` directives; no custom CSS classes

## Performance

| Operation | Before | After |
|-----------|--------|-------|
| 8-SKU bulk analysis | 16–24 s | ~3 s |
| 8-SKU executive summaries | ~16 s | ~2 s |
| What-if comparison (2 LLM calls) | ~6 s | ~3 s |

Parallel processing via `asyncio.gather()` on `AsyncAzureOpenAI` client.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v3, Recharts, Framer Motion, Lucide React
- **Backend**: FastAPI, SQLAlchemy 2.0, python-jose (JWT), passlib (bcrypt), asyncio
- **Database**: PostgreSQL 16 (Docker)
- **AI**: Azure OpenAI GPT-4 (AsyncAzureOpenAI for parallel calls)
- **Export**: fpdf2 (PDF), openpyxl (Excel)

---

## Team

Built for BC4 — Intelligent Procurement Planning | Chin Hin AI Hackathon 2026
