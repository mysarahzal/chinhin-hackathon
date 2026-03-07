"""
PR Generator — BC4 Procurement Planning Agent.

Handles:
  • Auto-incrementing PR numbers
  • Purchase Request structure creation
  • Excel export
  • PDF export (basic, reportlab-free — uses FPDF)
"""

from __future__ import annotations

import io
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd

# We use fpdf2 (pip install fpdf2) for lightweight PDF generation.
# Falls back gracefully if not installed.
try:
    from fpdf import FPDF  # type: ignore[import-untyped]

    _HAS_FPDF = True
except ImportError:
    _HAS_FPDF = False


# ── In-memory auto-increment counter ──────────────────────────────────────

_pr_counter: int = 0


def _next_pr_no() -> int:
    global _pr_counter
    _pr_counter += 1
    return _pr_counter


def reset_pr_counter() -> None:
    """Reset counter (useful between test runs)."""
    global _pr_counter
    _pr_counter = 0


# ── PR creation ────────────────────────────────────────────────────────────

def generate_pr(
    sku: str,
    quantity: float,
    risk_level: str,
    approved_by: str,
    unit_price: Optional[float] = None,
) -> Dict:
    """Build a single Purchase Request dict."""
    pr_no = _next_pr_no()
    total_value = round(quantity * unit_price, 2) if unit_price else None
    return {
        "pr_no": pr_no,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sku": sku,
        "quantity": quantity,
        "risk_level": risk_level,
        "approved_by": approved_by,
        "unit_price": unit_price,
        "total_value": total_value,
    }


# ── Excel export ───────────────────────────────────────────────────────────

def export_to_excel(pr_list: List[Dict]) -> bytes:
    """Return an in-memory Excel file (.xlsx) as bytes."""
    df = pd.DataFrame(pr_list)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Purchase Requests")
    return buf.getvalue()


# ── PDF export ──────────────────────────────────────────────────────────────

def export_to_pdf(pr_list: List[Dict]) -> bytes:
    """Return a basic PDF report as bytes.

    Falls back to a plain-text representation if fpdf2 is not installed.
    """
    if not _HAS_FPDF:
        # Graceful plain-text fallback
        lines = ["PURCHASE REQUEST REPORT", "=" * 50, ""]
        for pr in pr_list:
            for k, v in pr.items():
                lines.append(f"  {k}: {v}")
            lines.append("-" * 50)
        text = "\n".join(lines)
        return text.encode("utf-8")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "BC4 Procurement - Purchase Requests", ln=True, align="C")
    pdf.ln(4)

    # ── Date
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True, align="R")
    pdf.ln(4)

    if not pr_list:
        pdf.set_font("Helvetica", "I", 11)
        pdf.cell(0, 10, "No purchase requests to display.", ln=True)
        return bytes(pdf.output())

    # ── Table header
    headers = ["PR#", "Date", "SKU", "Qty", "Risk", "Approved By", "Unit $", "Total $"]
    col_widths = [12, 32, 40, 20, 18, 30, 20, 22]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(41, 65, 122)
    pdf.set_text_color(255, 255, 255)
    for header, w in zip(headers, col_widths):
        pdf.cell(w, 8, header, border=1, fill=True, align="C")
    pdf.ln()

    # ── Table rows
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(0, 0, 0)
    fill = False
    for pr in pr_list:
        if fill:
            pdf.set_fill_color(230, 235, 245)
        else:
            pdf.set_fill_color(255, 255, 255)

        row = [
            str(pr.get("pr_no", "")),
            str(pr.get("date", "")),
            str(pr.get("sku", "")),
            str(pr.get("quantity", "")),
            str(pr.get("risk_level", "")),
            str(pr.get("approved_by", "")),
            str(pr.get("unit_price", "-")),
            str(pr.get("total_value", "-")),
        ]
        for val, w in zip(row, col_widths):
            pdf.cell(w, 7, val, border=1, fill=True, align="C")
        pdf.ln()
        fill = not fill

    return bytes(pdf.output())
