"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listRuns, getRunResults, runWhatIf, type RunSummary, type AnalysisResult } from "@/lib/api";
import { motion } from "framer-motion";
import { Sliders, Brain, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

const RISK_COLORS: Record<string, string> = { High: "#EF4444", Medium: "#F59E0B", Low: "#10B981" };

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[level] ?? "bg-slate-100 text-slate-600"}`;
};

export default function DecisionCockpitPage() {
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(searchParams.get("run_id") || "");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRisk, setFilterRisk] = useState("all");
  const [whatIfSku, setWhatIfSku] = useState("");
  const [whatIfParams, setWhatIfParams] = useState({ demand_multiplier: 1.0, lead_time_delta_months: 0, service_level: 95 });
  const [whatIfResult, setWhatIfResult] = useState<AnalysisResult | null>(null);
  const [selectedSku, setSelectedSku] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    listRuns().then((r) => {
      setRuns(r.data);
      if (!selectedRunId && r.data.length > 0) {
        const bulk = r.data.find((x: any) => x.run_type === "bulk") ?? r.data[0];
        setSelectedRunId(bulk.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    setLoading(true);
    getRunResults(selectedRunId)
      .then((r) => { setResults(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedRunId]);

  const filteredResults = filterRisk === "all" ? results : results.filter((r) => r.risk_level === filterRisk);
  const topPriority = [...results].sort((a, b) => b.priority_score - a.priority_score).slice(0, 10);

  const handleWhatIf = async () => {
    if (!whatIfSku || !selectedRunId) return;
    try {
      const { data } = await runWhatIf({ run_id: selectedRunId, sku: whatIfSku, ...whatIfParams });
      setWhatIfResult(data);
    } catch {}
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Decision Cockpit</h1>
          <p className="text-slate-500 text-sm">Full analysis results with priority ranking and what-if simulation</p>
        </div>
        <select
          value={selectedRunId}
          onChange={(e) => setSelectedRunId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500"
        >
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.run_type} — {r.total_skus} SKUs — {new Date(r.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Strip */}
      {results.length > 0 && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total SKUs", value: results.length, color: "text-blue-600" },
            { label: "High Risk", value: results.filter((r) => r.risk_level === "High").length, color: "text-red-500" },
            { label: "Medium Risk", value: results.filter((r) => r.risk_level === "Medium").length, color: "text-amber-500" },
            { label: "Avg Confidence", value: `${(results.reduce((s, r) => s + r.forecast_confidence, 0) / results.length).toFixed(0)}%`, color: "text-violet-600" },
            { label: "Total Rec. Qty", value: results.reduce((s, r) => s + r.recommended_purchase_qty, 0).toFixed(0), color: "text-emerald-600" },
          ].map((kpi) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 text-center"
            >
              <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chart + What-If */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Priority Items</h3>
          {topPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPriority} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="sku" tick={{ fontSize: 11 }} width={75} />
                <Tooltip />
                <Bar dataKey="priority_score" radius={[0, 4, 4, 0]}>
                  {topPriority.map((item, i) => (
                    <Cell key={i} fill={RISK_COLORS[item.risk_level] || "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-300 text-sm">Select a run to view chart</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Sliders size={15} className="text-violet-500" /> What-If Simulation
          </h3>
          <select
            value={whatIfSku}
            onChange={(e) => setWhatIfSku(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none mb-4"
          >
            <option value="">Select SKU...</option>
            {results.map((r) => <option key={r.sku} value={r.sku}>{r.sku}</option>)}
          </select>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Demand multiplier: {whatIfParams.demand_multiplier}x</label>
              <input type="range" min={0.5} max={2} step={0.1} value={whatIfParams.demand_multiplier}
                onChange={(e) => setWhatIfParams({ ...whatIfParams, demand_multiplier: Number(e.target.value) })}
                className="w-full accent-violet-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Lead time delta: {whatIfParams.lead_time_delta_months > 0 ? "+" : ""}{whatIfParams.lead_time_delta_months}mo
              </label>
              <input type="range" min={-3} max={3} step={0.5} value={whatIfParams.lead_time_delta_months}
                onChange={(e) => setWhatIfParams({ ...whatIfParams, lead_time_delta_months: Number(e.target.value) })}
                className="w-full accent-violet-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Service level: {whatIfParams.service_level}%</label>
              <input type="range" min={80} max={99} step={1} value={whatIfParams.service_level}
                onChange={(e) => setWhatIfParams({ ...whatIfParams, service_level: Number(e.target.value) })}
                className="w-full accent-violet-500" />
            </div>
          </div>

          <button
            onClick={handleWhatIf}
            disabled={!whatIfSku}
            className="w-full py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            Run Simulation
          </button>

          {whatIfResult && (
            <div className="mt-3 p-3 bg-violet-50 rounded-lg text-xs space-y-1.5">
              <div className="font-semibold text-slate-700">Simulated: {whatIfResult.sku}</div>
              <div className="flex items-center gap-2">
                Risk: <span className={riskBadge(whatIfResult.risk_level)}>{whatIfResult.risk_level}</span>
              </div>
              <div>Rec. Qty: <strong>{whatIfResult.recommended_purchase_qty.toFixed(0)}</strong></div>
              <div>Coverage: {whatIfResult.coverage_months.toFixed(1)}mo</div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Results Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-700">All Results ({filteredResults.length})</h3>
          <div className="flex gap-1.5">
            {["all", "High", "Medium", "Low"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterRisk(f)}
                className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                  filterRisk === f
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto max-h-[500px]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 sticky top-0 bg-white">
                {["#", "SKU", "Risk", "Coverage", "W. Demand", "Rec. Qty", "Confidence", "Priority"].map((h, i) => (
                  <th key={h} className={`py-2 px-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide ${i <= 1 ? "text-left" : "text-right"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, i) => (
                <tr key={r.sku} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2.5 text-right text-slate-300 text-xs">{i + 1}</td>
                  <td className="py-2 px-2.5 font-medium">
                    <button
                      onClick={() => setSelectedSku(r)}
                      className="text-blue-500 font-semibold text-xs hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      {r.sku}
                    </button>
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    <span className={riskBadge(r.risk_level)}>{r.risk_level}</span>
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-600">{r.coverage_months.toFixed(1)}mo</td>
                  <td className="py-2 px-2.5 text-right text-slate-600">{r.weighted_demand.toFixed(0)}</td>
                  <td className="py-2 px-2.5 text-right font-semibold text-slate-800">{r.recommended_purchase_qty.toFixed(0)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-600">{r.forecast_confidence}%</td>
                  <td className="py-2 px-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.priority_score}%`, background: RISK_COLORS[r.risk_level] || "#94A3B8" }}
                        />
                      </div>
                      <span className="text-[10px] w-6 text-slate-500">{r.priority_score.toFixed(0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-10 text-center text-slate-400 text-sm">Loading results...</div>
        )}
      </motion.div>

      {/* SKU Detail Drawer */}
      {selectedSku && (
        <div className="fixed top-0 right-0 w-[420px] h-screen bg-white shadow-2xl z-50 overflow-y-auto p-7">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-900">SKU Details</h3>
            <button
              onClick={() => setSelectedSku(null)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="text-lg font-bold text-slate-900 mb-3">{selectedSku.sku}</div>

          <div className="flex gap-2 flex-wrap mb-5">
            <span className={riskBadge(selectedSku.risk_level)}>{selectedSku.risk_level} Risk</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
              {selectedSku.forecast_confidence}% Confidence
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
              {selectedSku.priority_score.toFixed(0)}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              { label: "Total Stock", value: selectedSku.total_stock.toFixed(0) },
              { label: "W. Demand", value: `${selectedSku.weighted_demand.toFixed(0)}/mo` },
              { label: "Coverage", value: `${selectedSku.coverage_months.toFixed(1)}mo` },
              { label: "Rec. Qty", value: selectedSku.recommended_purchase_qty.toFixed(0) },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 mb-1 uppercase tracking-wide">{item.label}</div>
                <div className="text-base font-bold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          {selectedSku.executive_summary && (
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 mb-3 border-l-4 border-blue-500">
              <div className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                <Brain size={13} /> Executive Insight
              </div>
              <p className="text-xs text-blue-900 leading-relaxed m-0">{selectedSku.executive_summary}</p>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Explainability</div>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap m-0 font-sans leading-relaxed">{selectedSku.explainability}</pre>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Justification</div>
            <p className="text-xs text-slate-600 leading-relaxed m-0">{selectedSku.management_justification}</p>
          </div>
        </div>
      )}
    </div>
  );
}
