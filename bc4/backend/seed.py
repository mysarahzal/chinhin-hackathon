"""
Seed Script — BC4 Procurement Agent.

Generates synthetic demo data: 200 SKUs × 12 months, multi-warehouse,
incoming PO, lead time variance, failure rates.
Also seeds default users and settings.
"""

from __future__ import annotations

import random
import math
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.db import SessionLocal, init_db
from backend.tables import User, Settings, AnalysisRun, AnalysisResultRow, Approval, AuditLog
from backend.auth import hash_password


# ── SKU category templates ──────────────────────────────────────────────────

CATEGORIES = [
    ("Electric", ["Kettle", "Motor", "Fan", "Heater", "Pump", "Compressor", "Generator", "Transformer", "Switch", "Relay"]),
    ("Steel", ["Pipe", "Rod", "Sheet", "Coil", "Beam", "Plate", "Wire", "Tube", "Angle", "Channel"]),
    ("LED", ["Panel", "Bulb", "Strip", "Flood", "Tube", "Spot", "Driver", "Module", "Lens", "Housing"]),
    ("Hydraulic", ["Pump", "Valve", "Cylinder", "Hose", "Filter", "Gauge", "Fitting", "Seal", "Motor", "Regulator"]),
    ("Ceramic", ["Tile", "Brick", "Plate", "Insulator", "Liner", "Ring", "Disc", "Block", "Pipe", "Cap"]),
    ("Solar", ["Inverter", "Panel", "Battery", "Controller", "Cable", "Connector", "Mount", "Fuse", "Meter", "Optimizer"]),
    ("Cable", ["Drum", "Tray", "Tie", "Gland", "Lug", "Sleeve", "Duct", "Clip", "Marker", "Joint"]),
    ("Bearing", ["Ball", "Roller", "Needle", "Thrust", "Sleeve", "Flanged", "Pillow", "Linear", "Cam", "Spherical"]),
    ("Valve", ["Gate", "Ball", "Check", "Globe", "Butterfly", "Relief", "Solenoid", "Needle", "Plug", "Diaphragm"]),
    ("Fastener", ["Bolt", "Nut", "Screw", "Washer", "Rivet", "Anchor", "Pin", "Clip", "Stud", "Insert"]),
]

WAREHOUSES = ["WH-Dubai", "WH-AbuDhabi", "WH-Sharjah", "WH-Riyadh"]

SEASONALITY_MAP = {
    1: 0.85, 2: 0.90, 3: 1.00, 4: 1.05, 5: 1.15, 6: 1.25,
    7: 1.20, 8: 1.10, 9: 1.05, 10: 1.00, 11: 0.95, 12: 0.90,
}


def _generate_skus(n: int = 200):
    """Generate n unique SKU definitions."""
    skus = []
    codes = set()
    while len(skus) < n:
        cat_name, sub_items = random.choice(CATEGORIES)
        sub = random.choice(sub_items)
        code = f"{cat_name[:3].upper()}-{sub[:3].upper()}-{random.randint(100,999)}"
        if code in codes:
            continue
        codes.add(code)

        base_demand = random.uniform(15, 500)
        lead_time = round(random.uniform(1, 6), 1)
        failure_rate = round(random.uniform(0.5, 18.0), 1)
        unit_price = round(random.uniform(5, 2500), 2)
        warehouse = random.choice(WAREHOUSES)

        monthly_sales = []
        for m in range(1, 13):
            vol = base_demand * SEASONALITY_MAP[m] * random.uniform(0.7, 1.3)
            monthly_sales.append(round(vol, 1))

        avg_3m = round(sum(monthly_sales[-3:]) / 3, 2)
        avg_6m = round(sum(monthly_sales[-6:]) / 6, 2)
        current_stock = round(random.uniform(0, base_demand * 4), 0)
        incoming_stock = round(random.uniform(0, base_demand * 1.5), 0) if random.random() > 0.3 else 0

        skus.append({
            "sku": f"{cat_name} {sub} {code}",
            "code": code,
            "category": cat_name,
            "warehouse": warehouse,
            "current_stock": current_stock,
            "incoming_stock": incoming_stock,
            "avg_3m": avg_3m,
            "avg_6m": avg_6m,
            "lead_time_months": lead_time,
            "failure_rate_pct": failure_rate,
            "unit_price": unit_price,
            "monthly_sales": monthly_sales,
        })
    return skus


def _compute_analysis(sku_data: dict, service_level: float = 95.0) -> dict:
    """Deterministic analysis matching backend rules (no LLM call)."""
    d = sku_data
    weighted_demand = 0.6 * d["avg_3m"] + 0.4 * d["avg_6m"]
    total_stock = d["current_stock"] + d["incoming_stock"]
    coverage = total_stock / weighted_demand if weighted_demand > 0 else 999
    lt = d["lead_time_months"]

    if coverage < lt:
        risk = "High"
    elif coverage <= lt + 1:
        risk = "Medium"
    else:
        risk = "Low"

    slow_moving = weighted_demand < 30
    quality_risk = d["failure_rate_pct"] > 8

    proj_demand = weighted_demand * lt
    required = proj_demand - total_stock
    if required < 0:
        required = 0

    # Safety buffer
    sl_factor = 1 + (service_level - 90) / 100  # e.g. 95 → 1.05
    if risk == "High" and d["failure_rate_pct"] <= 8:
        required += weighted_demand * sl_factor

    if d["failure_rate_pct"] > 10:
        required = min(required, weighted_demand)

    # Seasonality
    month_now = datetime.utcnow().month
    seasonality = SEASONALITY_MAP.get(month_now, 1.0)

    # Confidence
    cv = abs(d["avg_3m"] - d["avg_6m"]) / max(weighted_demand, 1)
    confidence = max(10, min(100, round(100 - cv * 100 - (1 if d["failure_rate_pct"] > 10 else 0) * 15)))

    # Priority score
    risk_score = {"High": 3, "Medium": 2, "Low": 1}.get(risk, 1)
    priority = round(risk_score * 25 + (1 - coverage / max(lt + 2, 1)) * 25 + (weighted_demand / 500) * 25 + (confidence / 100) * 25, 1)
    priority = max(0, min(100, priority))

    return {
        "sku": d["sku"],
        "total_stock": total_stock,
        "weighted_demand": round(weighted_demand, 2),
        "coverage_months": round(coverage, 2),
        "risk_level": risk,
        "slow_moving": slow_moving,
        "quality_risk": quality_risk,
        "projected_lead_time_demand": round(proj_demand, 2),
        "recommended_purchase_qty": round(required, 0),
        "management_justification": f"{'⚠ High risk — ' if risk == 'High' else ''}Coverage {coverage:.1f}mo vs lead time {lt}mo. WD={weighted_demand:.0f}/mo.",
        "pr_summary": f"Order {required:.0f} units of {d['sku']}. Risk: {risk}.",
        "seasonality_factor": seasonality,
        "forecast_confidence": confidence,
        "explainability": f"• Weighted demand: {weighted_demand:.0f} units/mo\n• Coverage: {coverage:.1f} months\n• Risk: {risk}\n• {'Slow-moving item' if slow_moving else 'Normal velocity'}\n• {'Quality risk flagged' if quality_risk else 'Quality OK'}",
        "priority_score": priority,
        "current_stock": d["current_stock"],
        "incoming_stock": d["incoming_stock"],
        "avg_3m": d["avg_3m"],
        "avg_6m": d["avg_6m"],
        "lead_time_months": d["lead_time_months"],
        "failure_rate_pct": d["failure_rate_pct"],
        "unit_price": d["unit_price"],
    }


def seed_demo(db: Session):
    """Main seed function — creates users, settings, and a demo analysis run."""

    # ── 1. Default Users ────────────────────────────────────────────────────
    users_data = [
        {"username": "admin", "email": "admin@bc4.io", "full_name": "System Admin", "role": "admin", "password": "admin123"},
        {"username": "procurement", "email": "procurement@bc4.io", "full_name": "Sarah Al-Rashid", "role": "procurement_officer", "password": "proc123"},
        {"username": "approver", "email": "approver@bc4.io", "full_name": "Mohammed Khan", "role": "approver", "password": "appr123"},
    ]

    created_users = {}
    for u in users_data:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if existing:
            created_users[u["username"]] = existing
            continue
        user = User(
            username=u["username"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            hashed_password=hash_password(u["password"]),
        )
        db.add(user)
        db.flush()
        created_users[u["username"]] = user

    # ── 2. Settings ─────────────────────────────────────────────────────────
    existing_sl = db.query(Settings).filter(Settings.key == "service_level").first()
    if not existing_sl:
        db.add(Settings(key="service_level", value="95.0"))

    # ── 3. Generate SKUs & analysis ─────────────────────────────────────────
    skus = _generate_skus(200)

    run = AnalysisRun(
        run_type="bulk",
        total_skus=len(skus),
        created_by=created_users["procurement"].id,
        service_level=95.0,
    )
    db.add(run)
    db.flush()

    high_risk = 0
    total_units = 0.0
    total_coverage = 0.0

    for sku_data in skus:
        analysis = _compute_analysis(sku_data)
        row = AnalysisResultRow(
            run_id=run.id,
            **{k: v for k, v in analysis.items()},
        )
        db.add(row)

        # Create approval record
        approval = Approval(
            run_id=run.id,
            sku=analysis["sku"],
            recommended_qty=analysis["recommended_purchase_qty"],
            risk_level=analysis["risk_level"],
            status="Pending",
        )
        db.add(approval)

        if analysis["risk_level"] == "High":
            high_risk += 1
        total_units += analysis["recommended_purchase_qty"]
        total_coverage += analysis["coverage_months"]

    run.high_risk_count = high_risk
    run.total_recommended_units = round(total_units, 0)
    run.avg_coverage = round(total_coverage / len(skus), 2)

    # ── 4. Audit log ────────────────────────────────────────────────────────
    db.add(AuditLog(
        action="seed_demo",
        entity_type="run",
        entity_id=run.id,
        user_id=created_users["admin"].id,
        details={"skus_generated": len(skus), "note": "Demo seed for hackathon"},
    ))

    db.commit()
    return {"run_id": run.id, "skus": len(skus), "users_created": len(users_data)}


# ── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        result = seed_demo(session)
        print(f"✅ Seed complete: {result}")
