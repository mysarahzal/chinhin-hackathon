"""
Shared Pydantic models for BC4 Procurement Planning Agent.
Used by both backend and frontend to ensure consistent data contracts.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────────────────

class ProcurementInput(BaseModel):
    """Single SKU input payload."""
    sku: str
    current_stock: float = Field(ge=0)
    incoming_stock: float = Field(ge=0)
    avg_3m: float = Field(ge=0)
    avg_6m: float = Field(ge=0)
    lead_time_months: float = Field(gt=0)
    failure_rate_pct: float = Field(ge=0, le=100)
    unit_price: Optional[float] = Field(default=None, ge=0, description="Optional unit price for value calculation")


class BulkProcurementInput(BaseModel):
    """Wrapper for multi-SKU bulk analysis."""
    items: List[ProcurementInput]


# ── Response Models ─────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    """Structured output from the AI forecasting engine."""
    sku: str
    total_stock: float
    weighted_demand: float
    coverage_months: float
    risk_level: str
    slow_moving: bool
    quality_risk: bool
    projected_lead_time_demand: float
    recommended_purchase_qty: float
    management_justification: str
    pr_summary: str
    # AI Brain additions
    seasonality_factor: float = 1.0
    forecast_confidence: float = 50.0
    explainability: str = ""
    priority_score: float = 0.0
    executive_summary: str = ""
    # Seasonal detection
    seasonal_flag: str = ""
    adjusted_demand: Optional[float] = None
    # Input snapshot
    current_stock: Optional[float] = None
    incoming_stock: Optional[float] = None
    avg_3m: Optional[float] = None
    avg_6m: Optional[float] = None
    lead_time_months: Optional[float] = None
    failure_rate_pct: Optional[float] = None
    unit_price: Optional[float] = None


class SingleAnalysisResponse(BaseModel):
    """Response wrapper for single SKU analysis."""
    run_id: str
    result: AnalysisResult


class BulkAnalysisResponse(BaseModel):
    """Response wrapper for bulk analysis."""
    run_id: str
    results: List[AnalysisResult]
    total_skus: int
    high_risk_count: int
    total_recommended_units: float
    avg_coverage: float


# ── PR / Approval Models ───────────────────────────────────────────────────

class PurchaseRequest(BaseModel):
    """Auto-generated Purchase Request after approval."""
    pr_no: int
    date: str
    sku: str
    quantity: float
    risk_level: str
    approved_by: str
    unit_price: Optional[float] = None
    total_value: Optional[float] = None


class ApprovalRecord(BaseModel):
    """Audit-trail entry for each approval/rejection action."""
    sku: str
    status: str  # Pending | Approved | Rejected
    approved_by: Optional[str] = None
    timestamp: Optional[str] = None
    recommended_qty: float = 0.0
    risk_level: str = ""


# ── Auth Models ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo


class UserInfo(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Run / Approval / PR Response Models ─────────────────────────────────────

class RunSummary(BaseModel):
    id: str
    run_type: str
    total_skus: int
    high_risk_count: int
    total_recommended_units: float
    avg_coverage: float
    created_at: str
    service_level: float = 95.0


class ApprovalOut(BaseModel):
    id: str
    run_id: str
    sku: str
    status: str
    recommended_qty: float
    risk_level: str
    approved_by: Optional[str] = None
    decided_at: Optional[str] = None
    created_at: str


class PROut(BaseModel):
    id: str
    pr_number: Optional[int] = None
    run_id: Optional[str] = None
    status: str
    created_at: str
    total_value: float
    items: List[PRItemOut] = []


class PRItemOut(BaseModel):
    id: str
    sku: str
    quantity: float
    risk_level: str
    unit_price: Optional[float] = None
    total_value: Optional[float] = None


class AuditOut(BaseModel):
    id: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    user_id: Optional[str] = None
    details: Optional[dict] = None
    created_at: str


class WhatIfRequest(BaseModel):
    """What-if simulation parameters (legacy — kept for backward compat)."""
    run_id: str
    sku: str
    demand_multiplier: float = 1.0
    lead_time_delta_months: float = 0.0
    service_level: float = 95.0


class WhatIfCompareRequest(BaseModel):
    """What-if comparison: base SKU data + scenario adjustments."""
    # Base SKU data
    sku: str
    current_stock: float = Field(ge=0)
    incoming_stock: float = Field(ge=0)
    avg_3m: float = Field(ge=0)
    avg_6m: float = Field(ge=0)
    lead_time_months: float = Field(gt=0)
    failure_rate_pct: float = Field(ge=0, le=100)
    unit_price: Optional[float] = Field(default=None, ge=0)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    # Scenario adjustments
    demand_change_pct: float = Field(default=0.0, description="e.g. 20 for +20% demand (CNY season)")
    lead_time_change: float = Field(default=0.0, description="e.g. 1 for +1 month supplier delay")
    stock_adjustment: float = Field(default=0.0, description="e.g. -50 if 50 units damaged")


class WhatIfDelta(BaseModel):
    """Difference between baseline and scenario results."""
    qty_delta: float
    risk_changed: bool
    risk_before: str
    risk_after: str
    coverage_delta: float
    demand_delta: float
    recommendation: str


class WhatIfCompareResponse(BaseModel):
    """Full what-if comparison response."""
    baseline: AnalysisResult
    scenario: AnalysisResult
    delta: WhatIfDelta


class SettingsUpdate(BaseModel):
    service_level: float = Field(ge=80, le=99.9)

