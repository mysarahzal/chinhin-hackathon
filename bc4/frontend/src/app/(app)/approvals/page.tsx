"use client";

import { useEffect, useState } from "react";
import { listApprovals, listRuns, approveSku, rejectSku, approveAll, type ApprovalItem, type RunSummary } from "@/lib/api";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, CheckCheck } from "lucide-react";

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[level] ?? "bg-slate-100 text-slate-600"}`;
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "bg-indigo-100 text-indigo-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`;
};

export default function ApprovalsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    listRuns().then((r) => {
      setRuns(r.data);
      if (r.data.length > 0) {
        const bulk = r.data.find((x: any) => x.run_type === "bulk") ?? r.data[0];
        setSelectedRunId(bulk.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    setLoading(true);
    listApprovals({ run_id: selectedRunId })
      .then((r) => { setApprovals(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedRunId]);

  const handleApprove = async (sku: string) => {
    setActionLoading(sku);
    try {
      await approveSku(selectedRunId, sku);
      setApprovals((prev) => prev.map((a) => a.sku === sku ? { ...a, status: "Approved" } : a));
    } catch {}
    setActionLoading(null);
  };

  const handleReject = async (sku: string) => {
    setActionLoading(sku);
    try {
      await rejectSku(selectedRunId, sku);
      setApprovals((prev) => prev.map((a) => a.sku === sku ? { ...a, status: "Rejected" } : a));
    } catch {}
    setActionLoading(null);
  };

  const handleApproveAll = async () => {
    try {
      await approveAll(selectedRunId);
      setApprovals((prev) => prev.map((a) => a.status === "Pending" ? { ...a, status: "Approved" } : a));
    } catch {}
  };

  const pending = approvals.filter((a) => a.status === "Pending");

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Approval Queue</h1>
          <p className="text-slate-500 text-sm">Review and approve procurement recommendations</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            {runs.map((r) => <option key={r.id} value={r.id}>{r.run_type} — {r.total_skus} SKUs</option>)}
          </select>
          {pending.length > 0 && (
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors border-none cursor-pointer"
            >
              <CheckCheck size={15} /> Approve All ({pending.length})
            </button>
          )}
        </div>
      </div>

      {/* Status summary */}
      <div className="flex gap-3 mb-6">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
          Pending: {pending.length}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          Approved: {approvals.filter((a) => a.status === "Approved").length}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          Rejected: {approvals.filter((a) => a.status === "Rejected").length}
        </span>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100">
              {[
                { label: "SKU", align: "left" },
                { label: "Risk", align: "left" },
                { label: "Recommended Qty", align: "left" },
                { label: "Status", align: "center" },
                { label: "Actions", align: "center" },
              ].map((h) => (
                <th
                  key={h.label}
                  className={`py-2.5 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-${h.align}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 font-medium text-slate-800">{a.sku}</td>
                <td className="py-3 px-3">
                  <span className={riskBadge(a.risk_level)}>{a.risk_level}</span>
                </td>
                <td className="py-3 px-3 text-slate-600">{a.recommended_qty.toFixed(0)} units</td>
                <td className="py-3 px-3 text-center">
                  <span className={statusBadge(a.status)}>{a.status}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  {a.status === "Pending" ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleApprove(a.sku)}
                        disabled={actionLoading === a.sku}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(a.sku)}
                        disabled={actionLoading === a.sku}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {a.decided_at ? new Date(a.decided_at).toLocaleString() : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="py-10 text-center text-slate-400 text-sm">Loading approvals...</div>}
        {!loading && approvals.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">
            No approvals found. Run an analysis first.
          </div>
        )}
      </motion.div>
    </div>
  );
}
