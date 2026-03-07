# BC4 Procurement Agent — System Flow & Architecture

---

## End-to-End Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                 NEXT.JS 15 FRONTEND (Port 3000)                │
│                                                                │
│  /dashboard   /single-analysis   /bulk-analysis                │
│  /decision-cockpit   /what-if   /approvals                     │
│  /purchase-requests  /audit-trail  /settings                   │
│                                                                │
│  Sidebar: nav links + month selector (localStorage)            │
└─────────────────────────┬──────────────────────────────────────┘
                          │ Axios (JWT Bearer, auto-refresh)
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND (Port 8000)                   │
│                                                                │
│  Auth ──────────► /auth/login  /auth/refresh  /auth/me        │
│                                                                │
│  Analysis ──────► POST /analyze          (single, async LLM)  │
│                   POST /analyze-bulk     (parallel, gather)    │
│                   GET  /analysis/runs                          │
│                   GET  /analysis/run/{id}/results              │
│                                                                │
│  What-If ───────► POST /what-if          (2× parallel LLM)    │
│                                                                │
│  Approvals ─────► GET  /approvals                             │
│                   POST /approvals/{run_id}/{sku}/approve       │
│                   POST /approvals/{run_id}/{sku}/reject        │
│                   POST /approvals/{run_id}/approve-all         │
│                                                                │
│  PRs ───────────► POST /prs/from-run/{run_id}                 │
│                   GET  /prs/{id}/export/pdf                    │
│                   GET  /prs/{id}/export/excel                  │
│                                                                │
│  System ────────► GET  /dashboard/stats                       │
│                   GET/PUT /settings                            │
│                   GET  /audit                                  │
│                   POST /seed/demo                              │
└──────────────┬─────────────────────────────────────────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
┌──────────────┐    ┌──────────────────────────┐
│ PostgreSQL   │    │  Azure OpenAI (GPT-4)    │
│ (Docker)     │    │                          │
│              │    │  AsyncAzureOpenAI client │
│ • users      │    │  asyncio.gather() calls  │
│ • runs       │    │  Temperature: 0.2        │
│ • results    │    │  JSON mode               │
│ • approvals  │    │  max_tokens: 250 (exec)  │
│ • prs        │    └──────────────────────────┘
│ • audit_logs │
│ • settings   │
└──────────────┘
```

---

## Async Parallel Processing — Core Innovation

### Sequential (Before)

```
Bulk 8 SKUs:
  SKU-1 ──[LLM call ~2s]──► result
  SKU-2 ──[LLM call ~2s]──► result
  SKU-3 ──[LLM call ~2s]──► result
  ...
  Total: 16-24 seconds
```

### Parallel (After — asyncio.gather)

```
Bulk 8 SKUs:
  SKU-1 ──┐
  SKU-2 ──┤
  SKU-3 ──┤──[asyncio.gather]──► all 8 results simultaneously
  SKU-4 ──┤
  SKU-5 ──┤     ~3 seconds total
  SKU-6 ──┤     (latency of slowest single call)
  SKU-7 ──┤
  SKU-8 ──┘

Phase 2 (Executive Summaries):
  Summary-1 ──┐
  Summary-2 ──┤──[asyncio.gather]──► all 8 summaries in parallel
  ...
```

**Implementation:**
```python
# forecasting.py
async def async_analyze_bulk(items):
    tasks = [async_analyze_single_sku(**item) for item in items]
    return list(await asyncio.gather(*tasks))

# api.py
raw_results = await async_analyze_bulk(items)
enriched_list = await asyncio.gather(*[
    _enrich_result(r, inp, sl) for r, inp in zip(raw_results, items)
])
```

---

## Seasonal Demand Detection Flow

```
Request includes month=2 (February)
         │
         ▼
get_seasonal_info(2)
         │
         ▼
Returns ("CNY Season", 1.3)
         │
         ▼
Apply multiplier:
  effective_avg_3m = avg_3m × 1.3
  effective_avg_6m = avg_6m × 1.3
         │
         ▼
LLM call uses effective demand values
(higher demand → higher recommended qty, may change risk)
         │
         ▼
Result includes:
  seasonal_flag = "CNY Season"
  adjusted_demand = round(0.6×eff_3m + 0.4×eff_6m, 2)
```

| Month | Season | Multiplier | Business Reason |
|-------|--------|------------|-----------------|
| 1, 2 | CNY Season | ×1.30 | Chinese New Year surge |
| 4, 5 | Raya Season | ×1.20 | Hari Raya surge |
| 11, 12 | Year-End | ×1.15 | Year-end clearance |
| Other | — | ×1.00 | Normal demand |

---

## What-If Simulation Flow

```
POST /what-if
Body: {
  sku, current_stock, avg_3m, avg_6m, lead_time_months,
  failure_rate_pct, month,
  demand_change_pct: 20,    ← +20% demand (CNY surge)
  lead_time_change: 1,      ← +1 month supplier delay
  stock_adjustment: -50     ← 50 units damaged
}
         │
         ▼
Compute scenario inputs:
  scenario_avg_3m = avg_3m × (1 + 20/100) = avg_3m × 1.2
  scenario_avg_6m = avg_6m × 1.2
  scenario_lead_time = lead_time + 1
  scenario_stock = current_stock - 50

         │
         ├──────────────────────┐
         ▼                      ▼
async_analyze_single_sku   async_analyze_single_sku
(baseline inputs)          (scenario inputs)
         │                      │
         └──────┬───────────────┘
                │ asyncio.gather() — both run simultaneously
                ▼
         ├──────────────────────┐
         ▼                      ▼
_enrich_result(baseline)   _enrich_result(scenario)
(+ executive summary LLM)  (+ executive summary LLM)
         │                      │
         └──────┬───────────────┘
                │ asyncio.gather() — both run simultaneously
                ▼
Compute delta:
  qty_delta = scenario_qty - baseline_qty
  risk_changed = baseline_risk != scenario_risk
  coverage_delta = scenario_cov - baseline_cov
  demand_delta = scenario_demand - baseline_demand
  recommendation = (human-readable conclusion)
                ▼
WhatIfCompareResponse { baseline, scenario, delta }
```

**Frontend display:** 3-column layout
- Left: Base SKU form
- Center: Scenario adjustments + month selector
- Right: Impact summary (qty delta, coverage delta, risk change badge)
- Below: Full metric comparison table + dual executive summaries

---

## Single SKU Analysis Flow

```
User fills form in /single-analysis
  │
  ▼
POST /analyze
  │
  ├─ _get_service_level(db) → 95.0 (from Settings table)
  │
  ├─ await async_analyze_single_sku(sku, stock, avg_3m, ...)
  │   │
  │   ├─ Seasonal check (if month provided)
  │   │
  │   ├─ Build user_msg with SKU data
  │   │
  │   ├─ await _async_client.chat.completions.create(
  │   │     model=_DEPLOYMENT,
  │   │     response_format={"type": "json_object"},
  │   │     temperature=0.2
  │   │   )
  │   │
  │   └─ Parse JSON, normalize booleans → return dict
  │
  ├─ await _enrich_result(raw, inp, sl)
  │   │
  │   ├─ Calculate: seasonality_factor, forecast_confidence, priority_score
  │   │
  │   ├─ Build explainability bullet string
  │   │
  │   └─ await async_generate_executive_summary(metrics)
  │       └─ GPT-4 narrative, boardroom tone, max 120 words
  │
  ├─ Persist: AnalysisRun + AnalysisResultRow + Approval to PostgreSQL
  │
  ├─ _audit(db, "analysis_run", ...)
  │
  └─ Return SingleAnalysisResponse { run_id, result: AnalysisResult }
```

---

## Bulk Analysis Flow

```
User uploads CSV in /bulk-analysis
  │
  ▼
Parse CSV → list of SKU dicts
  │
  ▼
POST /analyze-bulk { items: [...] }
  │
  ├─ Phase 1: All SKU LLM calls in parallel
  │   await async_analyze_bulk(items)
  │   └─ asyncio.gather(*[async_analyze_single_sku(...) for each item])
  │   ~3 seconds for 8 SKUs
  │
  ├─ Phase 2: All enrichments in parallel
  │   await asyncio.gather(*[_enrich_result(r, inp, sl) for each])
  │   ~2 seconds for 8 executive summaries
  │
  ├─ Persist: AnalysisRun + all AnalysisResultRows + all Approvals
  │
  ├─ _audit(db, "analysis_run", ...)
  │
  └─ Return BulkAnalysisResponse {
         run_id, results[], total_skus,
         high_risk_count, total_recommended_units, avg_coverage
     }
```

---

## Approval & PR Flow

```
/approvals page
  │
  ├─ Select run from dropdown
  │
  ├─ GET /approvals?run_id={id} → list of ApprovalOut
  │
  ├─ User clicks Approve:
  │   POST /approvals/{run_id}/{sku}/approve
  │   ├─ Set status = "Approved", approved_by = user.id, decided_at = now()
  │   ├─ _audit(db, "approval", ...)
  │   └─ Optimistic UI update (no refetch needed)
  │
  ├─ User clicks Approve All:
  │   POST /approvals/{run_id}/approve-all
  │   └─ Bulk update all Pending → Approved
  │
  └─ Navigate to /purchase-requests
      │
      ├─ POST /prs/from-run/{run_id}
      │   ├─ Fetch all Approved approvals for run
      │   ├─ Look up unit_price from AnalysisResultRow
      │   ├─ Create PurchaseRequestDB + PurchaseRequestItems
      │   ├─ Calculate total_value
      │   └─ _audit(db, "pr_generated", ...)
      │
      ├─ GET /prs/{id}/export/pdf
      │   └─ fpdf2 → formatted table → Response(application/pdf)
      │
      └─ GET /prs/{id}/export/excel
          └─ openpyxl → BytesIO → Response(xlsx)
```

---

## Authentication Flow

```
User submits login form
  │
  ▼
POST /auth/login { username, password }
  │
  ├─ Query User by username
  ├─ verify_password(password, hashed)  ← bcrypt
  ├─ create_access_token({ sub: user.id, role: user.role })
  ├─ create_refresh_token({ sub: user.id })
  ├─ _audit(db, "login", ...)
  └─ Return { access_token, refresh_token, user: UserInfo }

Frontend (auth.tsx):
  ├─ Store tokens in localStorage
  ├─ Decode JWT → extract role, name
  └─ Set AuthContext user

Axios interceptor (api.ts):
  ├─ Every request: attach Bearer token
  └─ On 401: auto POST /auth/refresh → swap tokens → retry
```

---

## Data Model Relationships

```
AnalysisRun (1)
    │
    ├──── AnalysisResultRow (many) ── linked by run_id
    │     • sku, weighted_demand, coverage, risk_level
    │     • recommended_purchase_qty, executive_summary
    │     • seasonal_flag, adjusted_demand
    │
    ├──── Approval (many) ── linked by run_id + sku
    │     • status: Pending | Approved | Rejected
    │     • approved_by → User.id
    │
    └──── PurchaseRequestDB (1, after generate)
              │
              └──── PurchaseRequestItem (many)
                    • sku, quantity, unit_price, total_value
```

---

## Architecture Principles

1. **Separation of Concerns**
   - `frontend/` — UI only, no business rules
   - `api.py` — routing, persistence orchestration
   - `backend/forecasting.py` — AI engine, seasonal logic
   - `backend/pr_generator.py` — export logic
   - `models.py` — shared data contract

2. **Zero Local State**
   - All data sourced from PostgreSQL
   - No in-memory session state on backend
   - Frontend reads fresh from API on every navigation

3. **Type Safety End-to-End**
   - Pydantic v2 (backend validation + OpenAPI schema)
   - TypeScript strict mode (frontend)
   - Same field names across both layers

4. **Async-First**
   - All analysis endpoints are `async def`
   - `AsyncAzureOpenAI` client for non-blocking LLM calls
   - `asyncio.gather()` for maximum parallelism

5. **Audit Everything**
   - Every state-changing action writes to `audit_logs`
   - Includes: analysis runs, approvals, PRs, logins, settings changes

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Password storage | bcrypt via passlib |
| Session tokens | JWT (HS256, short TTL) + refresh token |
| Token rotation | Auto-refresh Axios interceptor |
| Route protection | `AuthGuard` component checks localStorage token |
| Admin endpoints | `require_role("admin")` FastAPI dependency |
| CORS | Allow all origins (demo) → restrict to frontend domain (prod) |
| Secrets | `.env` file, not committed |

---

## Frontend Page Map

| Route | Page | Key Functionality |
|-------|------|------------------|
| `/login` | Login | JWT auth form |
| `/dashboard` | Dashboard | KPIs, charts |
| `/single-analysis` | Single Analysis | Manual SKU form + AI result |
| `/bulk-analysis` | Bulk Analysis | CSV upload + parallel results |
| `/decision-cockpit` | Decision Cockpit | Priority table + SKU drawer |
| `/what-if` | What-If Simulator | Baseline vs scenario comparison |
| `/approvals` | Approvals | Approve/reject queue |
| `/purchase-requests` | Purchase Requests | PR cards + PDF/Excel export |
| `/audit-trail` | Audit Trail | Filterable action log |
| `/settings` | Settings | Service level + seed data |

---

*End of Flow Documentation*
