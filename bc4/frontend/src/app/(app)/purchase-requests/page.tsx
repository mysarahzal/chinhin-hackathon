"use client";

import { useEffect, useState } from "react";
import { listPrs, listRuns, createPrFromRun, exportPrPdf, exportPrExcel, type PurchaseRequest, type RunSummary } from "@/lib/api";
import { motion } from "framer-motion";
import { FileText, Download, FilePlus, FileDown } from "lucide-react";

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] ?? "bg-slate-100 text-slate-600"}`;
};

export default function PurchaseRequestsPage() {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedPr, setExpandedPr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    listPrs().then((r) => setPrs(r.data)).catch(() => {});
    listRuns().then((r) => {
      const sorted = [...r.data].sort((a: RunSummary, b: RunSummary) => {
        if (a.run_type === "bulk" && b.run_type !== "bulk") return -1;
        if (b.run_type === "bulk" && a.run_type !== "bulk") return 1;
        return b.total_skus - a.total_skus;
      });
      setRuns(sorted);
      if (sorted.length > 0) setSelectedRunId(sorted[0].id);
    });
  }, []);

  const handleCreatePr = async () => {
    if (!selectedRunId) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      await createPrFromRun(selectedRunId);
      const { data } = await listPrs();
      setPrs(data);
      setSuccess(`PR generated successfully with ${data[0]?.items?.length ?? 0} items.`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to generate PR. Make sure items are approved first.");
    }
    setCreating(false);
  };

  const handleExportPdf = async (id: string) => {
    try {
      const { data } = await exportPrPdf(id);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `PR-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("PDF export failed: " + (e?.message ?? "unknown error"));
    }
  };

  const handleExportExcel = async (id: string) => {
    try {
      const { data } = await exportPrExcel(id);
      const url = URL.createObjectURL(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a");
      a.href = url; a.download = `PR-${id.slice(0, 8)}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Excel export failed: " + (e?.message ?? "unknown error"));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Purchase Requests</h1>
          <p className="text-slate-500 text-sm">Generate and manage purchase requests from approved items</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            {runs.map((r) => <option key={r.id} value={r.id}>{r.run_type} — {r.total_skus} SKUs</option>)}
          </select>
          <button
            onClick={handleCreatePr}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors border-none cursor-pointer"
          >
            <FilePlus size={15} /> {creating ? "Generating..." : "Generate PR"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-emerald-700 mb-4">
          {success}
        </div>
      )}

      {/* PR List */}
      <div className="space-y-4">
        {prs.map((pr) => (
          <motion.div
            key={pr.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={17} className="text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">PR #{pr.pr_number || "—"}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(pr.created_at).toLocaleString()} · {pr.items.length} items · RM{pr.total_value.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandedPr(expandedPr === pr.id ? null : pr.id)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  {expandedPr === pr.id ? "Collapse" : "Details"}
                </button>
                <button
                  onClick={() => handleExportPdf(pr.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer bg-white"
                >
                  <FileDown size={13} /> PDF
                </button>
                <button
                  onClick={() => handleExportExcel(pr.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer bg-white"
                >
                  <Download size={13} /> Excel
                </button>
              </div>
            </div>

            {expandedPr === pr.id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["SKU", "Quantity", "Risk", "Unit Price", "Total Value"].map((h) => (
                        <th key={h} className="py-2 px-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pr.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2.5 font-medium text-slate-800">{item.sku}</td>
                        <td className="py-2 px-2.5 text-slate-600">{item.quantity.toFixed(0)}</td>
                        <td className="py-2 px-2.5">
                          <span className={riskBadge(item.risk_level)}>{item.risk_level}</span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">{item.unit_price ? `RM${item.unit_price.toFixed(2)}` : "—"}</td>
                        <td className="py-2 px-2.5 text-slate-600">{item.total_value ? `RM${item.total_value.toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {prs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 py-16 text-center">
          <FileText size={44} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No purchase requests yet. Approve items first, then generate PRs.</p>
        </div>
      )}
    </div>
  );
}
