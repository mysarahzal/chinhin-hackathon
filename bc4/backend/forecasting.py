"""
Forecasting Engine — BC4 Procurement Planning Agent.

Encapsulates:
  • Azure OpenAI client initialisation
  • System prompt / rules
  • Single-SKU analysis
  • Bulk-SKU analysis (reuses single-SKU internally)
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from openai import AzureOpenAI, AsyncAzureOpenAI

load_dotenv()

# ── Azure OpenAI clients ───────────────────────────────────────────────────

_client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
)

_async_client = AsyncAzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
)

_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "bc4-gpt")

# ── Seasonal Detection ──────────────────────────────────────────────────────

def get_seasonal_info(month: int) -> tuple[str, float]:
    """Return (seasonal_flag, demand_multiplier) for a given month."""
    if month in (1, 2):
        return "CNY Season", 1.3
    if month in (4, 5):
        return "Raya Season", 1.2
    if month in (11, 12):
        return "Year-End Season", 1.15
    return "", 1.0


# ── System Rules (unchanged business logic) ────────────────────────────────

SYSTEM_RULES: str = """
You are an AI Procurement Planning Agent for a trading company.

Strict rules:
1) Weighted Demand = (0.6 * Avg last 3 months) + (0.4 * Avg last 6 months)
2) Total Stock = Current stock + Incoming stock
3) Projected demand during lead time = Weighted Demand * Lead time (months)
4) Coverage = Total Stock / Weighted Demand  (months)
5) Risk:
   High = Coverage < Lead time
   Medium = Coverage between Lead time and Lead time + 1
   Low = Coverage > Lead time + 1
6) Slow-moving: if Weighted Demand < 30 units/month => Slow Moving
7) Failure rate:
   - If Failure Rate > 8%  => Flag "Quality Risk" + advise supplier evaluation
   - If Failure Rate > 10% => Cap purchase recommendation to max 1 month demand
8) Purchase quantity:
   Required = (Projected lead-time demand) - Total Stock
   If Required < 0 => 0
   Add safety buffer of 1 month demand ONLY if Risk=High AND Failure Rate <= 8%
9) Output MUST be JSON with keys:
   sku, total_stock, weighted_demand, coverage_months, risk_level,
   slow_moving, quality_risk, projected_lead_time_demand,
   recommended_purchase_qty, management_justification, pr_summary
"""


# ── Public API ──────────────────────────────────────────────────────────────

def analyze_single_sku(
    sku: str,
    current_stock: float,
    incoming_stock: float,
    avg_3m: float,
    avg_6m: float,
    lead_time_months: float,
    failure_rate_pct: float,
) -> Dict[str, Any]:
    """Call Azure OpenAI and return the parsed analysis dict for one SKU."""

    user_msg = (
        f"SKU: {sku}\n"
        f"Current stock: {current_stock}\n"
        f"Incoming stock: {incoming_stock}\n"
        f"Avg sales last 3 months: {avg_3m}\n"
        f"Avg sales last 6 months: {avg_6m}\n"
        f"Lead time (months): {lead_time_months}\n"
        f"Failure rate (%): {failure_rate_pct}\n"
        "Return JSON only."
    )

    resp = _client.chat.completions.create(
        model=_DEPLOYMENT,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_RULES},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
    )

    raw: str = resp.choices[0].message.content  # type: ignore[union-attr]
    parsed: Dict[str, Any] = json.loads(raw)

    # Normalise boolean fields that the LLM may return as strings
    for bool_key in ("slow_moving", "quality_risk"):
        val = parsed.get(bool_key)
        if isinstance(val, str):
            parsed[bool_key] = val.strip().lower() in ("true", "yes", "1")

    return parsed


# ── Executive Summary ───────────────────────────────────────────────────

def build_executive_summary_prompt(metrics: dict) -> str:
    return f"""
You are a senior procurement strategy advisor.

Generate a concise executive procurement summary (max 120 words).
Use professional boardroom tone.
Be direct, strategic, and actionable.
Do NOT repeat raw numbers unnecessarily.

Context:
SKU: {metrics['sku']}
Weighted Monthly Demand: {metrics['weighted_demand']}
Total Available Stock: {metrics['total_stock']}
Projected Demand During Lead Time: {metrics['projected_demand']}
Coverage (months): {metrics['coverage']}
Lead Time (months): {metrics['lead_time']}
Risk Level: {metrics['risk_level']}
Recommended Purchase Quantity: {metrics['recommended_qty']}
Failure Rate (%): {metrics['failure_rate']}
Forecast Confidence (%): {metrics.get('confidence', 'N/A')}

Explain:
1. Current procurement risk level
2. Business impact
3. Clear recommended action
4. Mention urgency if high risk
5. Mention quality concern if failure_rate > 8%

Avoid generic language.
Make it sound like advice to a procurement director.
"""


def generate_executive_summary(metrics: dict) -> str:
    """Call Azure OpenAI to produce an executive-level procurement summary."""
    prompt = build_executive_summary_prompt(metrics)
    try:
        response = _client.chat.completions.create(
            model=_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are an enterprise procurement AI advisor."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=250,
        )
        return response.choices[0].message.content.strip()  # type: ignore[union-attr]
    except Exception as exc:
        return f"Executive summary unavailable: {exc}"


def analyze_bulk(
    items: list,
) -> List[Dict[str, Any]]:
    """Analyse multiple SKUs in sequence and return a list of result dicts.

    ``items`` is a list of dicts (or Pydantic models converted via .model_dump()).
    Each element must contain the keys expected by ``analyze_single_sku``.
    """
    results: List[Dict[str, Any]] = []
    for item in items:
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        result = analyze_single_sku(
            sku=item["sku"],
            current_stock=item["current_stock"],
            incoming_stock=item["incoming_stock"],
            avg_3m=item["avg_3m"],
            avg_6m=item["avg_6m"],
            lead_time_months=item["lead_time_months"],
            failure_rate_pct=item["failure_rate_pct"],
        )
        results.append(result)
    return results


# ── Async API (parallel bulk processing) ───────────────────────────────────

async def async_analyze_single_sku(
    sku: str,
    current_stock: float,
    incoming_stock: float,
    avg_3m: float,
    avg_6m: float,
    lead_time_months: float,
    failure_rate_pct: float,
    month: int | None = None,
) -> Dict[str, Any]:
    """Async version of analyze_single_sku using AsyncAzureOpenAI.

    Optional ``month`` (1-12) activates seasonal demand adjustment.
    """
    # Apply seasonal multiplier before sending to LLM
    seasonal_flag = ""
    effective_avg_3m = avg_3m
    effective_avg_6m = avg_6m
    if month is not None:
        seasonal_flag, multiplier = get_seasonal_info(month)
        if seasonal_flag:
            effective_avg_3m = round(avg_3m * multiplier, 2)
            effective_avg_6m = round(avg_6m * multiplier, 2)

    user_msg = (
        f"SKU: {sku}\n"
        f"Current stock: {current_stock}\n"
        f"Incoming stock: {incoming_stock}\n"
        f"Avg sales last 3 months: {effective_avg_3m}\n"
        f"Avg sales last 6 months: {effective_avg_6m}\n"
        f"Lead time (months): {lead_time_months}\n"
        f"Failure rate (%): {failure_rate_pct}\n"
        "Return JSON only."
    )

    resp = await _async_client.chat.completions.create(
        model=_DEPLOYMENT,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_RULES},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
    )

    raw: str = resp.choices[0].message.content  # type: ignore[union-attr]
    parsed: Dict[str, Any] = json.loads(raw)

    for bool_key in ("slow_moving", "quality_risk"):
        val = parsed.get(bool_key)
        if isinstance(val, str):
            parsed[bool_key] = val.strip().lower() in ("true", "yes", "1")

    parsed["seasonal_flag"] = seasonal_flag
    if seasonal_flag:
        parsed["adjusted_demand"] = round(0.6 * effective_avg_3m + 0.4 * effective_avg_6m, 2)

    return parsed


async def async_generate_executive_summary(metrics: dict) -> str:
    """Async version of generate_executive_summary."""
    prompt = build_executive_summary_prompt(metrics)
    try:
        response = await _async_client.chat.completions.create(
            model=_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are an enterprise procurement AI advisor."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=250,
        )
        return response.choices[0].message.content.strip()  # type: ignore[union-attr]
    except Exception as exc:
        return f"Executive summary unavailable: {exc}"


async def async_analyze_bulk(items: list) -> List[Dict[str, Any]]:
    """Analyse all SKUs in parallel using asyncio.gather()."""
    normalized = []
    for item in items:
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        normalized.append(item)

    tasks = [
        async_analyze_single_sku(
            sku=item["sku"],
            current_stock=item["current_stock"],
            incoming_stock=item["incoming_stock"],
            avg_3m=item["avg_3m"],
            avg_6m=item["avg_6m"],
            lead_time_months=item["lead_time_months"],
            failure_rate_pct=item["failure_rate_pct"],
        )
        for item in normalized
    ]
    return list(await asyncio.gather(*tasks))
