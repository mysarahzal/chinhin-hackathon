"use client";

import { useEffect, useState } from "react";
import { listAudit, type AuditEntry } from "@/lib/api";
import { motion } from "framer-motion";

const ACTION_DOT: Record<string, string> = {
  analysis_run: "bg-blue-500",
  approval: "bg-emerald-500",
  rejection: "bg-red-500",
  bulk_approval: "bg-emerald-500",
  pr_generated: "bg-violet-500",
  login: "bg-slate-400",
  seed_demo: "bg-amber-500",
  settings_update: "bg-cyan-500",
};

const ACTION_TEXT: Record<string, string> = {
  analysis_run: "text-blue-600",
  approval: "text-emerald-600",
  rejection: "text-red-600",
  bulk_approval: "text-emerald-600",
  pr_generated: "text-violet-600",
  login: "text-slate-500",
  seed_demo: "text-amber-600",
  settings_update: "text-cyan-600",
};

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filterAction, setFilterAction] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, [filterAction]);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (filterAction) params.action = filterAction;
      const { data } = await listAudit(params);
      setEntries(data);
    } catch {}
    setLoading(false);
  };

  const actions = ["analysis_run", "approval", "rejection", "bulk_approval", "pr_generated", "login", "seed_demo", "settings_update"];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Audit Trail</h1>
        <p className="text-slate-500 text-sm">Complete log of all system actions and decisions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterAction("")}
          className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
            filterAction === ""
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setFilterAction(a)}
            className={`px-3 py-1 rounded-md border text-xs font-medium capitalize transition-colors cursor-pointer ${
              filterAction === a
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {a.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
      >
        <div className="max-h-[600px] overflow-auto">
          {entries.map((e) => (
            <div key={e.id} className="flex gap-4 py-3.5 border-b border-slate-50 items-start last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ACTION_DOT[e.action] ?? "bg-slate-300"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-semibold capitalize ${ACTION_TEXT[e.action] ?? "text-slate-700"}`}>
                    {e.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 ml-4">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                {(e.entity_type || e.entity_id) && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {e.entity_type && <span>Entity: {e.entity_type}</span>}
                    {e.entity_id && <span> · ID: {e.entity_id.slice(0, 8)}...</span>}
                  </div>
                )}
                {e.details && (
                  <div className="text-[10px] text-slate-300 mt-1 font-mono truncate">
                    {JSON.stringify(e.details)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {loading && <div className="py-10 text-center text-slate-400 text-sm">Loading audit trail...</div>}
        {!loading && entries.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-sm">No audit entries found.</div>
        )}
      </motion.div>
    </div>
  );
}
