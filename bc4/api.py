"""
BC4 Procurement Planning Agent — FastAPI Application.

Full API with:
  • Auth (JWT)
  • Analysis (single + bulk) with DB persistence
  • Approvals
  • Purchase Requests + exports
  • Audit trail
  • Seed endpoint
  • What-if simulation
  • Settings

Run with:
    uvicorn api:app --reload
"""

from __future__ import annotations

import asyncio
import json
import math
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models import (
    AnalysisResult,
    ApprovalOut,
    AuditOut,
    BulkAnalysisResponse,
    BulkProcurementInput,
    LoginRequest,
    PRItemOut,
    PROut,
    ProcurementInput,
    RefreshRequest,
    RunSummary,
    SettingsUpdate,
    SingleAnalysisResponse,
    TokenResponse,
    UserInfo,
    WhatIfCompareRequest,
    WhatIfCompareResponse,
    WhatIfDelta,
)
from backend.forecasting import (
    async_analyze_single_sku, async_generate_executive_summary, async_analyze_bulk,
)
from backend.pr_generator import generate_pr, export_to_excel, export_to_pdf
from backend.db import get_db, init_db, SessionLocal
from backend.tables import (
    AnalysisResultRow,
    AnalysisRun,
    Approval,
    AuditLog,
    PurchaseRequestDB,
    PurchaseRequestItem,
    Settings,
    User,
)
from backend.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_optional_user,
    hash_password,
    require_role,
    verify_password,
)
from backend.seed import seed_demo, _compute_analysis, SEASONALITY_MAP

# ── App instance ────────────────────────────────────────────────────────────

app = FastAPI(
    title="BC4 Procurement Agent API",
    version="3.0.0",
    description="Intelligent Procurement Planning Agent — Hackathon Edition",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    # Add executive_summary column if it doesn't exist (no Alembic in hackathon)
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS executive_summary TEXT DEFAULT ''"))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


# ── Helpers ─────────────────────────────────────────────────────────────────


def _audit(db: Session, action: str, entity_type: str = None, entity_id: str = None, user_id: str = None, details: dict = None):
    db.add(AuditLog(action=action, entity_type=entity_type, entity_id=entity_id, user_id=user_id, details=details))
    db.commit()


def _get_service_level(db: Session) -> float:
    row = db.query(Settings).filter(Settings.key == "service_level").first()
    return float(row.value) if row else 95.0


async def _enrich_result(raw: dict, inp: dict, service_level: float = 95.0) -> dict:
    """Add AI Brain fields to a raw LLM analysis result."""
    weighted_demand = raw.get("weighted_demand", 0)
    coverage = raw.get("coverage_months", 0)
    risk = raw.get("risk_level", "Low")
    lt = inp.get("lead_time_months", 2)
    failure = inp.get("failure_rate_pct", 0)

    month_now = datetime.utcnow().month
    seasonality = SEASONALITY_MAP.get(month_now, 1.0)

    avg3 = inp.get("avg_3m", 0)
    avg6 = inp.get("avg_6m", 0)
    cv = abs(avg3 - avg6) / max(weighted_demand, 1)
    confidence = max(10, min(100, round(100 - cv * 100 - (1 if failure > 10 else 0) * 15)))

    risk_score = {"High": 3, "Medium": 2, "Low": 1}.get(risk, 1)
    priority = round(risk_score * 25 + (1 - coverage / max(lt + 2, 1)) * 25 + (weighted_demand / 500) * 25 + (confidence / 100) * 25, 1)
    priority = max(0, min(100, priority))

    raw["seasonality_factor"] = seasonality
    raw["forecast_confidence"] = confidence
    raw["explainability"] = (
        f"• Weighted demand: {weighted_demand:.0f} units/mo\n"
        f"• Stock coverage: {coverage:.1f} months vs lead time {lt} months\n"
        f"• Risk assessment: {risk}\n"
        f"• {'Slow-moving item — monitor closely' if raw.get('slow_moving') else 'Normal demand velocity'}\n"
        f"• {'⚠ Quality risk flagged (failure rate >{failure:.1f}%)' if raw.get('quality_risk') else 'Quality metrics within acceptable range'}"
    )
    raw["priority_score"] = priority

    # Executive Summary via Azure OpenAI
    exec_metrics = {
        "sku": raw.get("sku", inp.get("sku", "")),
        "weighted_demand": weighted_demand,
        "total_stock": raw.get("total_stock", 0),
        "projected_demand": raw.get("projected_lead_time_demand", 0),
        "coverage": coverage,
        "lead_time": lt,
        "risk_level": risk,
        "recommended_qty": raw.get("recommended_purchase_qty", 0),
        "failure_rate": failure,
        "confidence": confidence,
    }
    raw["executive_summary"] = await async_generate_executive_summary(exec_metrics)

    # Snapshot inputs
    raw["current_stock"] = inp.get("current_stock")
    raw["incoming_stock"] = inp.get("incoming_stock")
    raw["avg_3m"] = avg3
    raw["avg_6m"] = avg6
    raw["lead_time_months"] = lt
    raw["failure_rate_pct"] = failure
    raw["unit_price"] = inp.get("unit_price")
    return raw


def _row_to_result(r: AnalysisResultRow) -> AnalysisResult:
    return AnalysisResult(
        sku=r.sku,
        total_stock=r.total_stock,
        weighted_demand=r.weighted_demand,
        coverage_months=r.coverage_months,
        risk_level=r.risk_level,
        slow_moving=r.slow_moving,
        quality_risk=r.quality_risk,
        projected_lead_time_demand=r.projected_lead_time_demand,
        recommended_purchase_qty=r.recommended_purchase_qty,
        management_justification=r.management_justification,
        pr_summary=r.pr_summary,
        seasonality_factor=r.seasonality_factor,
        forecast_confidence=r.forecast_confidence,
        explainability=r.explainability,
        priority_score=r.priority_score,
        executive_summary=r.executive_summary or "",
        current_stock=r.current_stock,
        incoming_stock=r.incoming_stock,
        avg_3m=r.avg_3m,
        avg_6m=r.avg_6m,
        lead_time_months=r.lead_time_months,
        failure_rate_pct=r.failure_rate_pct,
        unit_price=r.unit_price,
    )


# ═══════════════════════════════════════════════════════════════════════════
#   HEALTH
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════
#   AUTH
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access = create_access_token({"sub": user.id, "role": user.role})
    refresh = create_refresh_token({"sub": user.id})
    _audit(db, "login", "user", user.id, user.id, {"username": user.username})
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserInfo(id=user.id, username=user.username, email=user.email, full_name=user.full_name, role=user.role),
    )


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access = create_access_token({"sub": user.id, "role": user.role})
    new_refresh = create_refresh_token({"sub": user.id})
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        user=UserInfo(id=user.id, username=user.username, email=user.email, full_name=user.full_name, role=user.role),
    )


@app.get("/auth/me", response_model=UserInfo)
def me(user: User = Depends(get_current_user)):
    return UserInfo(id=user.id, username=user.username, email=user.email, full_name=user.full_name, role=user.role)


# ═══════════════════════════════════════════════════════════════════════════
#   ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/analyze", response_model=SingleAnalysisResponse)
async def analyze(inp: ProcurementInput, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    """Analyse a single SKU → persist run + result, return structured data."""
    try:
        sl = _get_service_level(db)
        raw = await async_analyze_single_sku(
            sku=inp.sku, current_stock=inp.current_stock, incoming_stock=inp.incoming_stock,
            avg_3m=inp.avg_3m, avg_6m=inp.avg_6m, lead_time_months=inp.lead_time_months,
            failure_rate_pct=inp.failure_rate_pct,
        )
        enriched = await _enrich_result(raw, inp.model_dump(), sl)

        run = AnalysisRun(run_type="single", total_skus=1, created_by=user.id if user else None, service_level=sl)
        db.add(run)
        db.flush()

        result_row = AnalysisResultRow(run_id=run.id, **{k: v for k, v in enriched.items() if hasattr(AnalysisResultRow, k)})
        db.add(result_row)

        risk = enriched.get("risk_level", "Low")
        run.high_risk_count = 1 if risk == "High" else 0
        run.total_recommended_units = enriched.get("recommended_purchase_qty", 0)
        run.avg_coverage = enriched.get("coverage_months", 0)

        # Create approval
        db.add(Approval(run_id=run.id, sku=inp.sku, recommended_qty=enriched.get("recommended_purchase_qty", 0), risk_level=risk))

        _audit(db, "analysis_run", "run", run.id, user.id if user else None, {"sku": inp.sku, "type": "single"})
        db.commit()

        return SingleAnalysisResponse(run_id=run.id, result=AnalysisResult(**enriched))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze-bulk", response_model=BulkAnalysisResponse)
async def analyze_bulk_endpoint(payload: BulkProcurementInput, db: Session = Depends(get_db), user: User = Depends(get_optional_user)):
    """Analyse multiple SKUs in parallel → persist to DB."""
    try:
        sl = _get_service_level(db)

        # Phase 1: all SKU analyses in parallel
        raw_results: List[Dict] = await async_analyze_bulk([item.model_dump() for item in payload.items])

        # Phase 2: all executive summary enrichments in parallel
        enriched_list = await asyncio.gather(*[
            _enrich_result(r, inp_item.model_dump(), sl)
            for r, inp_item in zip(raw_results, payload.items)
        ])

        run = AnalysisRun(run_type="bulk", total_skus=len(raw_results), created_by=user.id if user else None, service_level=sl)
        db.add(run)
        db.flush()

        results: List[AnalysisResult] = []
        high_risk = 0
        total_qty = 0.0
        total_cov = 0.0

        for enriched in enriched_list:
            result_row = AnalysisResultRow(run_id=run.id, **{k: v for k, v in enriched.items() if hasattr(AnalysisResultRow, k)})
            db.add(result_row)

            db.add(Approval(run_id=run.id, sku=enriched["sku"], recommended_qty=enriched.get("recommended_purchase_qty", 0), risk_level=enriched.get("risk_level", "Low")))

            results.append(AnalysisResult(**enriched))
            if enriched.get("risk_level", "").lower() == "high":
                high_risk += 1
            total_qty += enriched.get("recommended_purchase_qty", 0)
            total_cov += enriched.get("coverage_months", 0)

        avg_cov = round(total_cov / len(results), 2) if results else 0
        run.high_risk_count = high_risk
        run.total_recommended_units = total_qty
        run.avg_coverage = avg_cov

        _audit(db, "analysis_run", "run", run.id, user.id if user else None, {"type": "bulk", "skus": len(results)})
        db.commit()

        return BulkAnalysisResponse(run_id=run.id, results=results, total_skus=len(results), high_risk_count=high_risk, total_recommended_units=total_qty, avg_coverage=avg_cov)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/analysis/run/{run_id}", response_model=RunSummary)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunSummary(
        id=run.id, run_type=run.run_type, total_skus=run.total_skus,
        high_risk_count=run.high_risk_count, total_recommended_units=run.total_recommended_units,
        avg_coverage=run.avg_coverage, created_at=run.created_at.isoformat(), service_level=run.service_level,
    )


@app.get("/analysis/run/{run_id}/results", response_model=List[AnalysisResult])
def get_run_results(run_id: str, db: Session = Depends(get_db)):
    rows = db.query(AnalysisResultRow).filter(AnalysisResultRow.run_id == run_id).order_by(desc(AnalysisResultRow.priority_score)).all()
    return [_row_to_result(r) for r in rows]


@app.get("/analysis/runs", response_model=List[RunSummary])
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(AnalysisRun).order_by(
        desc(AnalysisRun.total_skus),
        desc(AnalysisRun.created_at)
    ).limit(50).all()
    return [
        RunSummary(id=r.id, run_type=r.run_type, total_skus=r.total_skus,
                   high_risk_count=r.high_risk_count, total_recommended_units=r.total_recommended_units,
                   avg_coverage=r.avg_coverage, created_at=r.created_at.isoformat(), service_level=r.service_level)
        for r in runs
    ]


# ═══════════════════════════════════════════════════════════════════════════
#   WHAT-IF SIMULATION
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/what-if", response_model=WhatIfCompareResponse)
async def what_if_compare(body: WhatIfCompareRequest, db: Session = Depends(get_db)):
    """Run baseline + scenario LLM analyses in parallel and return comparison."""
    try:
        sl = _get_service_level(db)

        # Run baseline and scenario SKU analyses in parallel
        baseline_raw, scenario_raw = await asyncio.gather(
            async_analyze_single_sku(
                sku=body.sku,
                current_stock=body.current_stock,
                incoming_stock=body.incoming_stock,
                avg_3m=body.avg_3m,
                avg_6m=body.avg_6m,
                lead_time_months=body.lead_time_months,
                failure_rate_pct=body.failure_rate_pct,
                month=body.month,
            ),
            async_analyze_single_sku(
                sku=body.sku,
                current_stock=max(0.0, body.current_stock + body.stock_adjustment),
                incoming_stock=body.incoming_stock,
                avg_3m=round(body.avg_3m * (1 + body.demand_change_pct / 100), 2),
                avg_6m=round(body.avg_6m * (1 + body.demand_change_pct / 100), 2),
                lead_time_months=max(0.5, body.lead_time_months + body.lead_time_change),
                failure_rate_pct=body.failure_rate_pct,
                month=body.month,
            ),
        )

        baseline_inp = body.model_dump()
        scenario_inp = {
            **baseline_inp,
            "current_stock": max(0.0, body.current_stock + body.stock_adjustment),
            "avg_3m": round(body.avg_3m * (1 + body.demand_change_pct / 100), 2),
            "avg_6m": round(body.avg_6m * (1 + body.demand_change_pct / 100), 2),
            "lead_time_months": max(0.5, body.lead_time_months + body.lead_time_change),
        }

        # Enrich both in parallel (executive summaries)
        baseline_enriched, scenario_enriched = await asyncio.gather(
            _enrich_result(baseline_raw, baseline_inp, sl),
            _enrich_result(scenario_raw, scenario_inp, sl),
        )

        # Compute delta
        baseline_qty = baseline_enriched.get("recommended_purchase_qty", 0)
        scenario_qty = scenario_enriched.get("recommended_purchase_qty", 0)
        baseline_risk = baseline_enriched.get("risk_level", "Low")
        scenario_risk = scenario_enriched.get("risk_level", "Low")
        baseline_cov = baseline_enriched.get("coverage_months", 0)
        scenario_cov = scenario_enriched.get("coverage_months", 0)
        baseline_demand = baseline_enriched.get("weighted_demand", 0)
        scenario_demand = scenario_enriched.get("weighted_demand", 0)

        qty_delta = round(scenario_qty - baseline_qty, 1)
        risk_changed = baseline_risk != scenario_risk

        if risk_changed:
            rec = (
                f"Risk escalates from {baseline_risk} to {scenario_risk}. "
                f"{'Immediate procurement action required.' if scenario_risk == 'High' else 'Increase monitoring frequency.'}"
            )
        elif qty_delta > 0:
            rec = f"Scenario requires {abs(qty_delta):.0f} additional units vs baseline. Plan procurement accordingly."
        elif qty_delta < 0:
            rec = f"Scenario reduces required purchase by {abs(qty_delta):.0f} units. Deferral may be acceptable."
        else:
            rec = "No significant change in procurement requirement under this scenario."

        delta = WhatIfDelta(
            qty_delta=qty_delta,
            risk_changed=risk_changed,
            risk_before=baseline_risk,
            risk_after=scenario_risk,
            coverage_delta=round(scenario_cov - baseline_cov, 2),
            demand_delta=round(scenario_demand - baseline_demand, 1),
            recommendation=rec,
        )

        return WhatIfCompareResponse(
            baseline=AnalysisResult(**baseline_enriched),
            scenario=AnalysisResult(**scenario_enriched),
            delta=delta,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ═══════════════════════════════════════════════════════════════════════════
#   APPROVALS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/approvals", response_model=List[ApprovalOut])
def list_approvals(run_id: Optional[str] = Query(None), status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Approval)
    if run_id:
        q = q.filter(Approval.run_id == run_id)
    if status:
        q = q.filter(Approval.status == status)
    rows = q.order_by(desc(Approval.created_at)).all()
    return [
        ApprovalOut(id=a.id, run_id=a.run_id, sku=a.sku, status=a.status,
                    recommended_qty=a.recommended_qty, risk_level=a.risk_level,
                    approved_by=a.approved_by, decided_at=a.decided_at.isoformat() if a.decided_at else None,
                    created_at=a.created_at.isoformat())
        for a in rows
    ]


@app.post("/approvals/{run_id}/{sku}/approve", response_model=ApprovalOut)
def approve_sku(run_id: str, sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(Approval).filter(Approval.run_id == run_id, Approval.sku == sku).first()
    if not a:
        raise HTTPException(status_code=404, detail="Approval record not found")
    a.status = "Approved"
    a.approved_by = user.id
    a.decided_at = datetime.utcnow()
    _audit(db, "approval", "approval", a.id, user.id, {"sku": sku, "run_id": run_id})
    db.commit()
    return ApprovalOut(id=a.id, run_id=a.run_id, sku=a.sku, status=a.status,
                       recommended_qty=a.recommended_qty, risk_level=a.risk_level,
                       approved_by=a.approved_by, decided_at=a.decided_at.isoformat(),
                       created_at=a.created_at.isoformat())


@app.post("/approvals/{run_id}/{sku}/reject", response_model=ApprovalOut)
def reject_sku(run_id: str, sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.query(Approval).filter(Approval.run_id == run_id, Approval.sku == sku).first()
    if not a:
        raise HTTPException(status_code=404, detail="Approval record not found")
    a.status = "Rejected"
    a.approved_by = user.id
    a.decided_at = datetime.utcnow()
    _audit(db, "rejection", "approval", a.id, user.id, {"sku": sku, "run_id": run_id})
    db.commit()
    return ApprovalOut(id=a.id, run_id=a.run_id, sku=a.sku, status=a.status,
                       recommended_qty=a.recommended_qty, risk_level=a.risk_level,
                       approved_by=a.approved_by, decided_at=a.decided_at.isoformat(),
                       created_at=a.created_at.isoformat())


@app.post("/approvals/{run_id}/approve-all")
def approve_all(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    approvals = db.query(Approval).filter(Approval.run_id == run_id, Approval.status == "Pending").all()
    for a in approvals:
        a.status = "Approved"
        a.approved_by = user.id
        a.decided_at = datetime.utcnow()
    _audit(db, "bulk_approval", "run", run_id, user.id, {"count": len(approvals)})
    db.commit()
    return {"approved": len(approvals)}


# ═══════════════════════════════════════════════════════════════════════════
#   PURCHASE REQUESTS
# ═══════════════════════════════════════════════════════════════════════════

_pr_seq = 1000


@app.post("/prs/from-run/{run_id}", response_model=PROut)
def create_pr_from_run(run_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Generate a PR draft from approved items in a run."""
    global _pr_seq
    approved = db.query(Approval).filter(Approval.run_id == run_id, Approval.status == "Approved").all()
    if not approved:
        raise HTTPException(status_code=400, detail="No approved items found for this run")

    _pr_seq += 1
    pr = PurchaseRequestDB(run_id=run_id, pr_number=_pr_seq, created_by=user.id if user else None, status="Draft")
    db.add(pr)
    db.flush()

    total_val = 0.0
    items = []
    for appr in approved:
        result_row = db.query(AnalysisResultRow).filter(
            AnalysisResultRow.run_id == run_id, AnalysisResultRow.sku == appr.sku
        ).first()
        unit_price = result_row.unit_price if result_row else None
        item_val = round(appr.recommended_qty * unit_price, 2) if unit_price else None
        item = PurchaseRequestItem(
            pr_id=pr.id, sku=appr.sku, quantity=appr.recommended_qty,
            risk_level=appr.risk_level, unit_price=unit_price, total_value=item_val,
        )
        db.add(item)
        if item_val:
            total_val += item_val
        items.append(item)

    pr.total_value = round(total_val, 2)
    _audit(db, "pr_generated", "pr", pr.id, user.id if user else None, {"run_id": run_id, "items": len(approved)})
    db.commit()
    db.refresh(pr)

    items_out = [
        PRItemOut(id=i.id, sku=i.sku, quantity=i.quantity,
                  risk_level=i.risk_level, unit_price=i.unit_price, total_value=i.total_value)
        for i in items
    ]

    return PROut(id=pr.id, pr_number=pr.pr_number, run_id=pr.run_id, status=pr.status,
                 created_at=pr.created_at.isoformat(), total_value=pr.total_value, items=items_out)


@app.get("/prs", response_model=List[PROut])
def list_prs(db: Session = Depends(get_db)):
    prs = db.query(PurchaseRequestDB).order_by(desc(PurchaseRequestDB.created_at)).all()
    out = []
    for pr in prs:
        items = [PRItemOut(id=i.id, sku=i.sku, quantity=i.quantity, risk_level=i.risk_level,
                           unit_price=i.unit_price, total_value=i.total_value) for i in pr.items]
        out.append(PROut(id=pr.id, pr_number=pr.pr_number, run_id=pr.run_id, status=pr.status,
                         created_at=pr.created_at.isoformat(), total_value=pr.total_value, items=items))
    return out


@app.get("/prs/{pr_id}", response_model=PROut)
def get_pr(pr_id: str, db: Session = Depends(get_db)):
    pr = db.query(PurchaseRequestDB).filter(PurchaseRequestDB.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    items = [PRItemOut(id=i.id, sku=i.sku, quantity=i.quantity, risk_level=i.risk_level,
                       unit_price=i.unit_price, total_value=i.total_value) for i in pr.items]
    return PROut(id=pr.id, pr_number=pr.pr_number, run_id=pr.run_id, status=pr.status,
                 created_at=pr.created_at.isoformat(), total_value=pr.total_value, items=items)


@app.get("/prs/{pr_id}/export/pdf")
def export_pr_pdf(pr_id: str, db: Session = Depends(get_db)):
    pr = db.query(PurchaseRequestDB).filter(PurchaseRequestDB.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    creator = db.query(User).filter(User.id == pr.created_by).first() if pr.created_by else None
    creator_name = creator.username if creator else "System"
    pr_dicts = []
    for i in pr.items:
        appr = db.query(Approval).filter(Approval.run_id == pr.run_id, Approval.sku == i.sku).first()
        approver = db.query(User).filter(User.id == appr.approved_by).first() if (appr and appr.approved_by) else None
        approved_by_name = approver.username if approver else creator_name
        pr_dicts.append({"pr_no": pr.pr_number, "date": pr.created_at.strftime("%Y-%m-%d %H:%M"), "sku": i.sku,
             "quantity": i.quantity, "risk_level": i.risk_level, "approved_by": approved_by_name,
             "unit_price": i.unit_price, "total_value": i.total_value})
    pdf_bytes = export_to_pdf(pr_dicts)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=PR-{pr.pr_number}.pdf"})


@app.get("/prs/{pr_id}/export/excel")
def export_pr_excel(pr_id: str, db: Session = Depends(get_db)):
    pr = db.query(PurchaseRequestDB).filter(PurchaseRequestDB.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    creator = db.query(User).filter(User.id == pr.created_by).first() if pr.created_by else None
    creator_name = creator.username if creator else "System"
    pr_dicts = []
    for i in pr.items:
        appr = db.query(Approval).filter(Approval.run_id == pr.run_id, Approval.sku == i.sku).first()
        approver = db.query(User).filter(User.id == appr.approved_by).first() if (appr and appr.approved_by) else None
        approved_by_name = approver.username if approver else creator_name
        pr_dicts.append({"pr_no": pr.pr_number, "date": pr.created_at.strftime("%Y-%m-%d %H:%M"), "sku": i.sku,
             "quantity": i.quantity, "risk_level": i.risk_level, "approved_by": approved_by_name,
             "unit_price": i.unit_price, "total_value": i.total_value})
    xlsx_bytes = export_to_excel(pr_dicts)
    return Response(content=xlsx_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f"attachment; filename=PR-{pr.pr_number}.xlsx"})


# ═══════════════════════════════════════════════════════════════════════════
#   AUDIT
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/audit", response_model=List[AuditOut])
def list_audit(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    rows = q.order_by(desc(AuditLog.created_at)).limit(limit).all()
    return [
        AuditOut(id=a.id, action=a.action, entity_type=a.entity_type, entity_id=a.entity_id,
                 user_id=a.user_id, details=a.details, created_at=a.created_at.isoformat())
        for a in rows
    ]


# ═══════════════════════════════════════════════════════════════════════════
#   SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(Settings).all()
    return {r.key: r.value for r in rows}


@app.put("/settings")
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = db.query(Settings).filter(Settings.key == "service_level").first()
    if row:
        row.value = str(body.service_level)
        row.updated_at = datetime.utcnow()
    else:
        db.add(Settings(key="service_level", value=str(body.service_level)))
    _audit(db, "settings_update", "settings", "service_level", user.id, {"service_level": body.service_level})
    db.commit()
    return {"service_level": body.service_level}


# ═══════════════════════════════════════════════════════════════════════════
#   SEED
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/seed/demo")
def seed_demo_endpoint(db: Session = Depends(get_db)):
    """Generate synthetic demo dataset (200 SKUs). Admin-only in production."""
    result = seed_demo(db)
    return result


# ═══════════════════════════════════════════════════════════════════════════
#   DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    """Aggregated stats for the dashboard page."""
    from sqlalchemy import func

    total_runs = db.query(func.count(AnalysisRun.id)).scalar() or 0
    total_skus_analyzed = db.query(func.sum(AnalysisRun.total_skus)).scalar() or 0
    total_high_risk = db.query(func.count(AnalysisResultRow.id)).filter(AnalysisResultRow.risk_level == "High").scalar() or 0
    total_approved = db.query(func.count(Approval.id)).filter(Approval.status == "Approved").scalar() or 0
    total_pending = db.query(func.count(Approval.id)).filter(Approval.status == "Pending").scalar() or 0
    total_prs = db.query(func.count(PurchaseRequestDB.id)).scalar() or 0
    total_pr_value = db.query(func.sum(PurchaseRequestDB.total_value)).scalar() or 0

    # Risk distribution
    risk_dist = db.query(AnalysisResultRow.risk_level, func.count(AnalysisResultRow.id)).group_by(AnalysisResultRow.risk_level).all()
    risk_map = {r[0]: r[1] for r in risk_dist}

    # Latest run
    latest_run = db.query(AnalysisRun).order_by(desc(AnalysisRun.created_at)).first()

    return {
        "total_runs": total_runs,
        "total_skus_analyzed": int(total_skus_analyzed),
        "total_high_risk": total_high_risk,
        "total_approved": total_approved,
        "total_pending": total_pending,
        "total_prs": total_prs,
        "total_pr_value": round(float(total_pr_value), 2),
        "risk_distribution": risk_map,
        "latest_run_id": latest_run.id if latest_run else None,
        "latest_run_at": latest_run.created_at.isoformat() if latest_run else None,
    }

