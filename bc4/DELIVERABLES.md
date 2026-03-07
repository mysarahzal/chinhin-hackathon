# BC4 Procurement Agent — Deliverables Summary

*Chin Hin AI Hackathon 2026 — Business Challenge 4*

---

## Status: All Systems Complete

| Layer | Status | Notes |
|-------|--------|-------|
| Backend (FastAPI) | Complete | Async, PostgreSQL-backed, 22 endpoints |
| Frontend (Next.js 15) | Complete | 9 pages, Tailwind v3, all API-connected |
| AI Engine | Complete | Parallel async calls, seasonal detection |
| What-If Simulator | Complete | New page + LLM comparison endpoint |
| Exports | Complete | PDF (fpdf2) + Excel (openpyxl) |
| Auth | Complete | JWT + RBAC, 3 roles |
| Audit Trail | Complete | Immutable log, 8 action types |

---

## 1. Multi-SKU Bulk Analysis

**Endpoint:** `POST /analyze-bulk`
**Frontend:** `/bulk-analysis` page — CSV drag-and-drop upload

- Accepts CSV with columns: `sku, current_stock, incoming_stock, avg_3m, avg_6m, lead_time_months, failure_rate_pct`
- All SKUs processed **in parallel** via `asyncio.gather()` over `AsyncAzureOpenAI`
- Executive summaries for all SKUs also parallelized
- **Performance:** 8 SKUs in ~3 seconds (was 16–24s sequential)
- Returns: `BulkAnalysisResponse` — results list + summary metrics

---

## 2. Decision Cockpit

**Frontend:** `/decision-cockpit` page

- Priority-ranked table sorted by composite score (risk × coverage × demand × confidence)
- Click any row → detail drawer (420px slide-in panel) with:
  - Full AI analysis, explainability bullets, executive summary
  - Forecast confidence gauge
  - Seasonal flag if applicable
- KPI cards: total SKUs, high-risk count, avg coverage, total recommended units
- Filter by risk level (High / Medium / Low)

---

## 3. What-If Simulator

**Endpoint:** `POST /what-if` — returns `WhatIfCompareResponse`
**Frontend:** `/what-if` page (new)

Inputs:
- Base SKU data (same as `/analyze`)
- `demand_change_pct` — e.g. +20 for CNY surge
- `lead_time_change` — e.g. +1 month for supplier delay
- `stock_adjustment` — e.g. -50 for damaged goods
- `month` — 1–12, triggers seasonal multiplier

Returns:
- `baseline` — original `AnalysisResult` (with executive summary)
- `scenario` — adjusted `AnalysisResult` (with executive summary)
- `delta` — `qty_delta`, `risk_changed`, `risk_before/after`, `coverage_delta`, `demand_delta`, `recommendation`

Both LLM calls run in parallel; executive summaries also parallelized. Total latency ~3s for full comparison.

---

## 4. Seasonal Demand Detection

**Location:** `backend/forecasting.py` — `get_seasonal_info(month)`

| Month | Season | Demand Multiplier |
|-------|--------|-------------------|
| 1, 2 | CNY Season | ×1.30 |
| 4, 5 | Raya Season | ×1.20 |
| 11, 12 | Year-End Season | ×1.15 |
| Other | — | ×1.00 |

- Applied to `avg_3m` and `avg_6m` **before** LLM call
- `seasonal_flag` and `adjusted_demand` returned in `AnalysisResult`
- Sidebar month selector persists selection to `localStorage`
- What-If page syncs with sidebar month on load

---

## 5. Approval Workflow

**Frontend:** `/approvals` page
**Endpoints:** `/approvals/{run_id}/{sku}/approve|reject`, `/approvals/{run_id}/approve-all`

- Per-SKU approve / reject buttons with optimistic UI update
- "Approve All" bulk action with pending count badge
- Status badges: Pending (indigo) / Approved (emerald) / Rejected (red)
- Each action creates an `AuditLog` entry with user ID and timestamp
- Run selector dropdown to switch between analysis runs

---

## 6. Purchase Request Generation

**Frontend:** `/purchase-requests` page
**Endpoints:** `POST /prs/from-run/{run_id}`, `GET /prs/{id}/export/pdf|excel`

- Generates PR from all Approved items in a run
- Auto-incrementing PR numbers (from 1000)
- Expandable item table per PR (SKU, qty, risk, unit price, total value)
- PDF export (fpdf2) — formatted table with PR header, approver names
- Excel export (openpyxl) — structured spreadsheet with all PR items

---

## 7. Audit Trail

**Frontend:** `/audit-trail` page
**Endpoint:** `GET /audit` — filterable by `action` and `entity_type`

Action types tracked:
- `analysis_run` — single and bulk
- `approval` / `rejection` / `bulk_approval`
- `pr_generated`
- `login`
- `seed_demo`
- `settings_update`

---

## 8. Authentication & Authorization

**Endpoints:** `/auth/login`, `/auth/refresh`, `/auth/me`

- JWT access token (short-lived) + refresh token (long-lived)
- Auto-refresh interceptor in Axios — transparent token rotation
- Roles: `admin`, `procurement_officer`, `approver`
- Settings update requires `admin` role (enforced backend + frontend)
- Route protection via `AuthGuard` component

---

## 9. Dashboard

**Frontend:** `/dashboard` page
**Endpoint:** `GET /dashboard/stats`

KPI cards:
- Total analysis runs
- Total SKUs analyzed
- High-risk SKUs
- Pending approvals
- Total PRs generated
- Total PR value (RM)

Charts:
- Risk distribution (Pie — High / Medium / Low)
- Coverage distribution (Bar by range)

---

## File Manifest

| File | Purpose | Status |
|------|---------|--------|
| `api.py` | FastAPI — 22 async endpoints | Complete |
| `models.py` | Pydantic schemas — 15 models | Complete |
| `backend/forecasting.py` | Async AI engine + seasonal detection | Complete |
| `backend/pr_generator.py` | PDF + Excel export | Complete |
| `backend/tables.py` | SQLAlchemy ORM — 9 tables | Complete |
| `backend/auth.py` | JWT + bcrypt + RBAC | Complete |
| `backend/db.py` | SQLAlchemy session management | Complete |
| `backend/seed.py` | 200-SKU demo data generator | Complete |
| `frontend/src/app/(app)/dashboard/` | Dashboard page | Complete |
| `frontend/src/app/(app)/single-analysis/` | Single SKU page | Complete |
| `frontend/src/app/(app)/bulk-analysis/` | CSV upload + bulk results | Complete |
| `frontend/src/app/(app)/decision-cockpit/` | Priority cockpit + drawer | Complete |
| `frontend/src/app/(app)/what-if/` | What-If simulator | Complete |
| `frontend/src/app/(app)/approvals/` | Approval queue | Complete |
| `frontend/src/app/(app)/purchase-requests/` | PR list + export | Complete |
| `frontend/src/app/(app)/audit-trail/` | Audit log | Complete |
| `frontend/src/app/(app)/settings/` | Settings + seed | Complete |
| `frontend/src/components/sidebar.tsx` | Navigation + month selector | Complete |
| `frontend/src/lib/api.ts` | Axios client + typed functions | Complete |
| `sample_skus.csv` | 8-row demo CSV for bulk upload | Ready |
| `requirements.txt` | Python dependencies | Complete |
| `docker-compose.yml` | PostgreSQL container | Complete |
| `start.ps1` | One-command startup script | Complete |

---

## Demo Flow (5–6 min)

1. **(30s)** Login → `admin` / `admin123`
2. **(30s)** Settings → Seed Demo Data → 200 SKUs created
3. **(45s)** Single Analysis → Enter one SKU → show AI result + executive summary
4. **(60s)** Bulk Analysis → Upload `sample_skus.csv` → 8 SKUs in ~3s (parallel)
5. **(45s)** Decision Cockpit → Priority table → click SKU → detail drawer
6. **(45s)** What-If Simulator → Change month to February (CNY) → set +20% demand → run → show delta
7. **(45s)** Approvals → Approve All → bulk approve
8. **(45s)** Purchase Requests → Generate PR → Download PDF
9. **(30s)** Audit Trail → show full action log

---

## Performance Benchmarks

| Operation | Before | After |
|-----------|--------|-------|
| 8-SKU bulk LLM calls | 16–24 s | ~3 s |
| 8-SKU executive summaries | ~16 s | ~2 s |
| What-if comparison (2× LLM) | ~6 s | ~3 s |
| Single SKU end-to-end | ~4–6 s | ~3 s |

---

## Technical Highlights for Judges

1. **True Parallelism** — `asyncio.gather()` over `AsyncAzureOpenAI`; not simulated concurrency
2. **Seasonal Intelligence** — Demand multipliers applied before LLM call; affects risk, quantity, coverage
3. **What-If Engine** — Both LLM paths run simultaneously; structured delta with clear recommendation
4. **Enterprise Auth** — JWT rotation, RBAC, audit trail — production-ready security pattern
5. **Zero Local State** — All data from PostgreSQL; no in-memory session state
6. **Type-Safe Contract** — Pydantic v2 on backend + TypeScript strict mode on frontend
7. **Clean Architecture** — Forecasting engine, PR generator, auth, DB — each isolated module
8. **Export Ready** — PDF with formatted tables; Excel with proper typing

---

## Differentiators

| Feature | BC4 | Typical Hackathon Project |
|---------|-----|--------------------------|
| Parallel LLM calls | asyncio.gather() | Sequential loop |
| Seasonal demand | Month-aware multiplier | Static calculation |
| What-If comparison | Dual parallel LLM + delta | Slider on static data |
| Frontend | Next.js 15 SaaS UI | Streamlit |
| Auth | JWT + RBAC + refresh | None or hardcoded |
| Database | PostgreSQL (Docker) | In-memory / CSV |
| Exports | PDF + Excel (real files) | CSV download |
| Audit trail | Immutable DB log | print() / st.write() |

---

**System is demo-ready. All features tested end-to-end.**
