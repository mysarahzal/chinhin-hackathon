"use client";

import { useEffect, useState } from "react";
import { whatIfCompare, type WhatIfCompareResponse } from "@/lib/api";
import { motion } from "framer-motion";
import { SlidersHorizontal, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Zap } from "lucide-react";

type PresetScenario = {
  label: string;
  description: string;
  color: string;
  patch: { demand_change_pct?: string; lead_time_change?: string; stock_adjustment?: string; month?: number };
};

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    label: "CNY Demand Surge",
    description: "+30% demand, Feb (CNY Season)",
    color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    patch: { demand_change_pct: "30", lead_time_change: "0", stock_adjustment: "0", month: 2 },
  },
  {
    label: "Supplier Delay",
    description: "+1 month lead time",
    color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    patch: { demand_change_pct: "0", lead_time_change: "1", stock_adjustment: "0" },
  },
  {
    label: "Damaged Inventory",
    description: "-50 units stock loss",
    color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
    patch: { demand_change_pct: "0", lead_time_change: "0", stock_adjustment: "-50" },
  },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SEASONAL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "CNY Season (+30% demand)", color: "text-red-400" },
  2: { label: "CNY Season (+30% demand)", color: "text-red-400" },
  4: { label: "Raya Season (+20% demand)", color: "text-emerald-400" },
  5: { label: "Raya Season (+20% demand)", color: "text-emerald-400" },
  11: { label: "Year-End Season (+15% demand)", color: "text-blue-400" },
  12: { label: "Year-End Season (+15% demand)", color: "text-blue-400" },
};

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[level] ?? "bg-slate-100 text-slate-600"}`;
};

const defaultForm = {
  sku: "",
  current_stock: "",
  incoming_stock: "",
  avg_3m: "",
  avg_6m: "",
  lead_time_months: "",
  failure_rate_pct: "",
  unit_price: "",
  demand_change_pct: "0",
  lead_time_change: "0",
  stock_adjustment: "0",
};

export default function WhatIfPage() {
  const [form, setForm] = useState(defaultForm);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync month from sidebar localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_month");
      if (stored) setMonth(Number(stored));
    }
  }, []);

  const seasonal = SEASONAL_LABELS[month];

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleRun = async () => {
    if (!form.sku || !form.current_stock || !form.avg_3m || !form.lead_time_months) {
      setError("SKU, Current Stock, Avg 3M Sales, and Lead Time are required.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await whatIfCompare({
        sku: form.sku,
        current_stock: Number(form.current_stock),
        incoming_stock: Number(form.incoming_stock) || 0,
        avg_3m: Number(form.avg_3m),
        avg_6m: Number(form.avg_6m) || Number(form.avg_3m),
        lead_time_months: Number(form.lead_time_months),
        failure_rate_pct: Number(form.failure_rate_pct) || 0,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        month,
        demand_change_pct: Number(form.demand_change_pct) || 0,
        lead_time_change: Number(form.lead_time_change) || 0,
        stock_adjustment: Number(form.stock_adjustment) || 0,
      });
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Simulation failed. Check inputs and try again.");
    }
    setLoading(false);
  };

  const deltaColor = (v: number) =>
    v > 0 ? "text-red-600" : v < 0 ? "text-emerald-600" : "text-slate-500";

  const DeltaIcon = ({ v }: { v: number }) =>
    v > 0 ? <TrendingUp size={14} className="text-red-500" /> :
    v < 0 ? <TrendingDown size={14} className="text-emerald-500" /> :
    <Minus size={14} className="text-slate-400" />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <SlidersHorizontal size={22} className="text-violet-500" /> What-If Simulator
        </h1>
        <p className="text-slate-500 text-sm">Compare baseline procurement vs adjusted scenario (season, supplier delay, damaged stock)</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Base SKU Inputs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Base SKU Data</h3>
          <div className="space-y-3">
            {[
              { key: "sku", label: "SKU", placeholder: "e.g. SKU-001" },
              { key: "current_stock", label: "Current Stock", placeholder: "units" },
              { key: "incoming_stock", label: "Incoming Stock", placeholder: "units" },
              { key: "avg_3m", label: "Avg Sales (3M)", placeholder: "units/month" },
              { key: "avg_6m", label: "Avg Sales (6M)", placeholder: "units/month" },
              { key: "lead_time_months", label: "Lead Time (months)", placeholder: "e.g. 2" },
              { key: "failure_rate_pct", label: "Failure Rate (%)", placeholder: "0–100" },
              { key: "unit_price", label: "Unit Price (RM)", placeholder: "optional" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                <input
                  type={key === "sku" ? "text" : "number"}
                  value={(form as any)[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scenario Adjustments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Zap size={14} className="text-violet-500" /> Scenario Adjustments
          </h3>

          {/* Preset scenario buttons */}
          <div className="mb-5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Presets</div>
            <div className="flex flex-col gap-2">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setForm((f) => ({ ...f, ...preset.patch }));
                    if (preset.patch.month !== undefined) {
                      setMonth(preset.patch.month);
                      if (typeof window !== "undefined") localStorage.setItem("sim_month", String(preset.patch.month));
                    }
                    setResult(null);
                    setError(null);
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${preset.color}`}
                >
                  <div>
                    <div className="text-xs font-semibold leading-tight">{preset.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Month selector */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Simulation Month</label>
            <select
              value={month}
              onChange={(e) => {
                const m = Number(e.target.value);
                setMonth(m);
                if (typeof window !== "undefined") localStorage.setItem("sim_month", String(m));
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              {MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            {seasonal && (
              <div className={`mt-1.5 text-xs font-semibold ${seasonal.color}`}>{seasonal.label}</div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Demand Change (%) <span className="text-slate-400 normal-case font-normal">e.g. +20 for CNY surge</span>
              </label>
              <input
                type="number"
                value={form.demand_change_pct}
                onChange={set("demand_change_pct")}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Lead Time Change (months) <span className="text-slate-400 normal-case font-normal">e.g. +1 supplier delay</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={form.lead_time_change}
                onChange={set("lead_time_change")}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Stock Adjustment (units) <span className="text-slate-400 normal-case font-normal">e.g. -50 damaged goods</span>
              </label>
              <input
                type="number"
                value={form.stock_adjustment}
                onChange={set("stock_adjustment")}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="mt-6 w-full px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors border-none cursor-pointer"
          >
            {loading ? "Running Simulation..." : "Run Simulation"}
          </button>

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-600 text-xs">{error}</div>
          )}
        </motion.div>

        {/* Delta Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Impact Summary</h3>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300">
              <SlidersHorizontal size={40} className="mb-3" />
              <p className="text-sm">Run a simulation to see results</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Additional Units Needed</div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${deltaColor(result.delta.qty_delta)}`}>
                  <DeltaIcon v={result.delta.qty_delta} />
                  {result.delta.qty_delta > 0 ? "+" : ""}{result.delta.qty_delta.toFixed(0)} units
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Coverage Change</div>
                <div className={`text-lg font-bold flex items-center gap-2 ${deltaColor(-result.delta.coverage_delta)}`}>
                  <DeltaIcon v={-result.delta.coverage_delta} />
                  {result.delta.coverage_delta > 0 ? "+" : ""}{result.delta.coverage_delta.toFixed(1)} months
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Demand Shift</div>
                <div className={`text-lg font-bold flex items-center gap-2 ${deltaColor(result.delta.demand_delta)}`}>
                  <DeltaIcon v={result.delta.demand_delta} />
                  {result.delta.demand_delta > 0 ? "+" : ""}{result.delta.demand_delta.toFixed(0)} units/mo
                </div>
              </div>

              {result.delta.risk_changed && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-red-700">Risk Level Changed</div>
                    <div className="text-xs text-red-500 mt-0.5">
                      {result.delta.risk_before} → {result.delta.risk_after}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <CheckCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">{result.delta.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Baseline vs Scenario Comparison Table */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-5">Baseline vs Scenario Comparison</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* Header */}
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Metric</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Baseline</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Scenario</div>

            {[
              { label: "Risk Level", b: result.baseline.risk_level, s: result.scenario.risk_level, badge: true },
              { label: "Weighted Demand", b: `${result.baseline.weighted_demand.toFixed(0)} units/mo`, s: `${result.scenario.weighted_demand.toFixed(0)} units/mo` },
              { label: "Coverage", b: `${result.baseline.coverage_months.toFixed(1)} months`, s: `${result.scenario.coverage_months.toFixed(1)} months` },
              { label: "Recommended Qty", b: `${result.baseline.recommended_purchase_qty.toFixed(0)} units`, s: `${result.scenario.recommended_purchase_qty.toFixed(0)} units` },
              { label: "Total Stock", b: `${result.baseline.total_stock.toFixed(0)} units`, s: `${result.scenario.total_stock.toFixed(0)} units` },
              { label: "Forecast Confidence", b: `${result.baseline.forecast_confidence}%`, s: `${result.scenario.forecast_confidence}%` },
              { label: "Seasonal Flag", b: result.baseline.seasonal_flag || "—", s: result.scenario.seasonal_flag || "—" },
            ].map(({ label, b, s, badge }) => (
              <>
                <div key={`l-${label}`} className="py-2.5 border-t border-slate-50 text-slate-500 text-xs font-medium">{label}</div>
                <div key={`b-${label}`} className="py-2.5 border-t border-slate-50">
                  {badge ? <span className={riskBadge(b)}>{b}</span> : <span className="text-slate-700 text-xs">{b}</span>}
                </div>
                <div key={`s-${label}`} className="py-2.5 border-t border-slate-50">
                  {badge ? <span className={riskBadge(s)}>{s}</span> : (
                    <span className={`text-xs font-medium ${b !== s ? "text-violet-600" : "text-slate-700"}`}>{s}</span>
                  )}
                </div>
              </>
            ))}
          </div>

          {/* Executive Summaries */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-100">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Baseline Executive Summary</div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.baseline.executive_summary || "—"}</p>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Scenario Executive Summary</div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.scenario.executive_summary || "—"}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
