"use client";

import { useState } from "react";
import { analyzeSingle, type AnalysisResult } from "@/lib/api";
import { motion } from "framer-motion";
import { Search, Info, Brain, ChevronDown } from "lucide-react";

const riskBadgeClass = (level: string) => {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${map[level] ?? "bg-slate-100 text-slate-600"}`;
};

type SkuPreset = {
  sku: string;
  current_stock: string;
  incoming_stock: string;
  avg_3m: string;
  avg_6m: string;
  lead_time_months: string;
  failure_rate_pct: string;
  unit_price: string;
};

const SKU_CATALOG: SkuPreset[] = [
  { sku: "Electric Kettle KX900", current_stock: "120", incoming_stock: "50", avg_3m: "95", avg_6m: "88", lead_time_months: "2", failure_rate_pct: "4", unit_price: "89.90" },
  { sku: "Steel Pipe SP200", current_stock: "300", incoming_stock: "0", avg_3m: "210", avg_6m: "195", lead_time_months: "3", failure_rate_pct: "2", unit_price: "45.00" },
  { sku: "Bearing B100", current_stock: "80", incoming_stock: "20", avg_3m: "65", avg_6m: "70", lead_time_months: "1", failure_rate_pct: "7", unit_price: "12.50" },
  { sku: "Industrial Fan IF550", current_stock: "40", incoming_stock: "0", avg_3m: "35", avg_6m: "30", lead_time_months: "2", failure_rate_pct: "3", unit_price: "320.00" },
  { sku: "Safety Helmet SH01", current_stock: "500", incoming_stock: "100", avg_3m: "180", avg_6m: "160", lead_time_months: "1", failure_rate_pct: "1", unit_price: "28.00" },
  { sku: "Hydraulic Pump HP300", current_stock: "15", incoming_stock: "5", avg_3m: "18", avg_6m: "20", lead_time_months: "4", failure_rate_pct: "9", unit_price: "1250.00" },
  { sku: "Cable Reel CR75", current_stock: "60", incoming_stock: "30", avg_3m: "50", avg_6m: "48", lead_time_months: "2", failure_rate_pct: "5", unit_price: "75.00" },
  { sku: "Valve Gate VG22", current_stock: "90", incoming_stock: "0", avg_3m: "120", avg_6m: "110", lead_time_months: "3", failure_rate_pct: "6", unit_price: "180.00" },
];

const EMPTY_FORM: SkuPreset & { sku: string } = {
  sku: "", current_stock: "", incoming_stock: "", avg_3m: "", avg_6m: "",
  lead_time_months: "", failure_rate_pct: "", unit_price: "",
};

export default function SingleAnalysisPage() {
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSkuSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SKU_CATALOG.find((s) => s.sku === e.target.value);
    if (selected) {
      setForm({ ...selected });
    } else {
      setForm(EMPTY_FORM);
    }
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        sku: form.sku,
        current_stock: Number(form.current_stock),
        incoming_stock: Number(form.incoming_stock),
        avg_3m: Number(form.avg_3m),
        avg_6m: Number(form.avg_6m),
        lead_time_months: Number(form.lead_time_months),
        failure_rate_pct: Number(form.failure_rate_pct),
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
      };
      const { data } = await analyzeSingle(payload);
      setResult(data.result);
      setRunId(data.run_id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Analysis failed");
    }
    setLoading(false);
  };

  const field = (label: string, key: keyof typeof EMPTY_FORM, placeholder: string) => (
    <div className="flex-1">
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={key === "sku" ? "text" : "number"}
        value={(form as any)[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={key !== "unit_price"}
        placeholder={placeholder}
        step="any"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
      />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Single SKU Analysis</h1>
        <p className="text-slate-500 text-sm">Analyze one item using Azure OpenAI procurement intelligence</p>
      </div>

      <div className={`grid gap-6 ${result ? "grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <Search size={16} color="#3B82F6" /> Input Parameters
          </h3>

          {/* SKU Quick-Select */}
          <div className="mb-5 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <label className="block text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <ChevronDown size={13} /> Quick-Select SKU from Catalog
            </label>
            <select
              onChange={handleSkuSelect}
              defaultValue=""
              className="w-full bg-white text-slate-700 text-sm rounded-lg px-3 py-2 border border-blue-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Select a SKU to auto-fill fields —</option>
              {SKU_CATALOG.map((s) => (
                <option key={s.sku} value={s.sku}>{s.sku}</option>
              ))}
            </select>
            <p className="text-[10px] text-blue-500 mt-1.5">You can modify any field after selection</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-3">{field("SKU Name", "sku", "Electric Kettle KX900")}</div>
            <div className="flex gap-3">
              {field("Current Stock", "current_stock", "150")}
              {field("Incoming Stock", "incoming_stock", "50")}
            </div>
            <div className="flex gap-3">
              {field("Avg Sales (3mo)", "avg_3m", "100")}
              {field("Avg Sales (6mo)", "avg_6m", "90")}
            </div>
            <div className="flex gap-3">
              {field("Lead Time (months)", "lead_time_months", "2")}
              {field("Failure Rate (%)", "failure_rate_pct", "5")}
            </div>
            <div className="flex gap-3">{field("Unit Price (RM)", "unit_price", "25.00")}</div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors mt-2"
            >
              {loading ? "Analyzing with AI..." : "Run Analysis"}
            </button>
          </form>
        </motion.div>

        {result && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
          >
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Analysis Result</h3>

            <div className="flex items-center gap-2 mb-5">
              <span className={riskBadgeClass(result.risk_level)}>{result.risk_level} Risk</span>
              {result.slow_moving && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  Slow Moving
                </span>
              )}
              {result.quality_risk && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Quality Risk
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Total Stock", value: result.total_stock.toFixed(0), highlight: false },
                { label: "Weighted Demand", value: `${result.weighted_demand.toFixed(0)}/mo`, highlight: false },
                { label: "Coverage", value: `${result.coverage_months.toFixed(1)} months`, highlight: false },
                { label: "Lead Time Demand", value: result.projected_lead_time_demand.toFixed(0), highlight: false },
                { label: "Recommended Qty", value: result.recommended_purchase_qty.toFixed(0), highlight: true },
                { label: "Priority Score", value: `${result.priority_score.toFixed(0)}/100`, highlight: false },
                { label: "Confidence", value: `${result.forecast_confidence}%`, highlight: false },
                { label: "Seasonality", value: `×${result.seasonality_factor}`, highlight: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-3 rounded-lg ${item.highlight ? "bg-blue-50 border border-blue-100" : "bg-slate-50"}`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{item.label}</div>
                  <div className={`text-lg font-bold ${item.highlight ? "text-blue-600" : "text-slate-900"}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-3">
              <div className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1.5">
                <Info size={13} /> AI Explainability
              </div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap m-0 font-sans leading-relaxed">
                {result.explainability}
              </pre>
            </div>

            {result.executive_summary && (
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 mb-3 border-l-4 border-blue-500">
                <div className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <Brain size={14} /> Executive Insight
                </div>
                <p className="text-xs text-blue-900 leading-relaxed m-0">{result.executive_summary}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Justification</div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">{result.management_justification}</p>
            </div>

            {runId && <div className="mt-3 text-[10px] text-slate-300">Run ID: {runId}</div>}
          </motion.div>
        )}
      </div>
    </div>
  );
}
