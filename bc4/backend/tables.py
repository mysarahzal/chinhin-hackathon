"""
SQLAlchemy ORM models — BC4 Procurement Agent.

Separate from models.py (Pydantic schemas).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.db import Base


def _uuid():
    return str(uuid.uuid4())


# ── Users ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="procurement_officer")  # admin | procurement_officer | approver
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Analysis Runs ───────────────────────────────────────────────────────────

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String, primary_key=True, default=_uuid)
    run_type = Column(String(20), nullable=False)  # single | bulk
    total_skus = Column(Integer, default=0)
    high_risk_count = Column(Integer, default=0)
    total_recommended_units = Column(Float, default=0)
    avg_coverage = Column(Float, default=0)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    service_level = Column(Float, default=95.0)

    results = relationship("AnalysisResultRow", back_populates="run", cascade="all, delete-orphan")


# ── Analysis Results (per-SKU rows) ────────────────────────────────────────

class AnalysisResultRow(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, default=_uuid)
    run_id = Column(String, ForeignKey("analysis_runs.id"), nullable=False, index=True)
    sku = Column(String(255), nullable=False)
    total_stock = Column(Float, default=0)
    weighted_demand = Column(Float, default=0)
    coverage_months = Column(Float, default=0)
    risk_level = Column(String(20), default="Low")
    slow_moving = Column(Boolean, default=False)
    quality_risk = Column(Boolean, default=False)
    projected_lead_time_demand = Column(Float, default=0)
    recommended_purchase_qty = Column(Float, default=0)
    management_justification = Column(Text, default="")
    pr_summary = Column(Text, default="")
    # AI Brain additions
    seasonality_factor = Column(Float, default=1.0)
    forecast_confidence = Column(Float, default=50.0)
    explainability = Column(Text, default="")
    priority_score = Column(Float, default=0.0)
    executive_summary = Column(Text, default="")
    # Input snapshot for what-if
    current_stock = Column(Float, default=0)
    incoming_stock = Column(Float, default=0)
    avg_3m = Column(Float, default=0)
    avg_6m = Column(Float, default=0)
    lead_time_months = Column(Float, default=0)
    failure_rate_pct = Column(Float, default=0)
    unit_price = Column(Float, nullable=True)

    run = relationship("AnalysisRun", back_populates="results")


# ── Approvals ───────────────────────────────────────────────────────────────

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String, primary_key=True, default=_uuid)
    run_id = Column(String, ForeignKey("analysis_runs.id"), nullable=False, index=True)
    sku = Column(String(255), nullable=False)
    status = Column(String(20), default="Pending")  # Pending | Approved | Rejected
    recommended_qty = Column(Float, default=0)
    risk_level = Column(String(20), default="Low")
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Purchase Requests ───────────────────────────────────────────────────────

class PurchaseRequestDB(Base):
    __tablename__ = "purchase_requests"

    id = Column(String, primary_key=True, default=_uuid)
    pr_number = Column(Integer, autoincrement=True, unique=True)
    run_id = Column(String, ForeignKey("analysis_runs.id"), nullable=True)
    status = Column(String(20), default="Draft")  # Draft | Submitted | Completed
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    total_value = Column(Float, default=0.0)

    items = relationship("PurchaseRequestItem", back_populates="purchase_request", cascade="all, delete-orphan")


class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"

    id = Column(String, primary_key=True, default=_uuid)
    pr_id = Column(String, ForeignKey("purchase_requests.id"), nullable=False, index=True)
    sku = Column(String(255), nullable=False)
    quantity = Column(Float, default=0)
    risk_level = Column(String(20), default="Low")
    unit_price = Column(Float, nullable=True)
    total_value = Column(Float, nullable=True)

    purchase_request = relationship("PurchaseRequestDB", back_populates="items")


# ── Audit Logs ──────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_uuid)
    action = Column(String(100), nullable=False)  # analysis_run | approval | rejection | pr_generated | login | ...
    entity_type = Column(String(50), nullable=True)  # run | approval | pr | user
    entity_id = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Settings ────────────────────────────────────────────────────────────────

class Settings(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
