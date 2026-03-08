"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, listRuns, type DashboardStats, type RunSummary } from "@/lib/api";
import { formatCurrencyRM, formatRunId, formatDate } from "@/lib/utils";
import {
  BarChart3, AlertTriangle, CheckCircle, TrendingUp, Clock,
  Package, DollarSign, Upload, Brain, Shield, FileText,
  ChevronRight, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const RISK_COLORS: Record<string, string> = { High: "#EF4444", Medium: "#F59E0B", Low: "#10B981" };

const PROCESS_STEPS = [
  { icon: Upload, label: "Upload Data", sub: "CSV or manual", href: "/bulk-analysis", color: "bg-blue-500" },
  { icon: Brain, label: "AI Analysis", sub: "Azure OpenAI", href: "/single-analysis", color: "bg-violet-500" },
  { icon: BarChart3, label: "Review Results", sub: "Decision Cockpit", href: "/decision-cockpit", color: "bg-amber-500" },
  { icon: CheckCircle, label: "Approve Items", sub: "Approval workflow", href: "/approvals", color: "bg-emerald-500" },
  { icon: FileText, label: "Generate PR", sub: "PDF / Excel export", href: "/purchase-requests", color: "bg-slate-700" },
];

function riskBadge(count: number) {
  return count > 0
    ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"
    : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700";
}

interface StatCardProps {
  label: string; value: string | number; icon: React.ComponentType<any>;
  color: string; bgColor: string; delay: number; sub?: string;
}

function StatCard({ label, value, icon: Icon, color, bgColor, delay, sub }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <Icon size={20} color={color} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-900 truncate">{value}</div>
        <div className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-slate-300 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);

  useEffect(() => {
    getDashboardStats().then((r) => setStats(r.data)).catch(() => {});
    listRuns().then((r) => setRuns(r.data)).catch(() => {});
  }, []);

  const riskData = stats
    ? Object.entries(stats.risk_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const latestRun = runs[0];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Strategic Dashboard</h1>
        <p className="text-slate-500 text-sm">AI-powered procurement intelligence overview</p>
      </div>

      {/* Process Flow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 px-6 py-5 mb-7"
      >
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Procurement Workflow</div>
        <div className="flex items-center gap-0">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center flex-1">
                <Link href={step.href} className="flex-1 flex flex-col items-center text-center group no-underline">
                  <div className={`w-9 h-9 rounded-xl ${step.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon size={16} color="white" />
                  </div>
                  <div className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors leading-tight">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{step.sub}</div>
                </Link>
                {i < PROCESS_STEPS.length - 1 && (
                  <ArrowRight size={14} className="text-slate-200 flex-shrink-0 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* KPI Grid — 4 columns × 2 rows */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <StatCard label="Analysis Runs" value={stats?.total_runs ?? 0} icon={BarChart3} color="#3B82F6" bgColor="bg-blue-50" delay={0} />
        <StatCard label="SKUs Analyzed" value={stats?.total_skus_analyzed ?? 0} icon={Package} color="#8B5CF6" bgColor="bg-violet-50" delay={0.04} />
        <StatCard label="Critical (High Risk)" value={stats?.total_high_risk ?? 0} icon={AlertTriangle} color="#EF4444" bgColor="bg-red-50" delay={0.08} />
        <StatCard label="Pending Approvals" value={stats?.total_pending ?? 0} icon={Clock} color="#F59E0B" bgColor="bg-amber-50" delay={0.12} />
        <StatCard label="Approved Items" value={stats?.total_approved ?? 0} icon={CheckCircle} color="#10B981" bgColor="bg-emerald-50" delay={0.16} />
        <StatCard label="Purchase Requests" value={stats?.total_prs ?? 0} icon={TrendingUp} color="#6366F1" bgColor="bg-indigo-50" delay={0.2} />
        <StatCard label="Total PR Value" value={formatCurrencyRM(stats?.total_pr_value ?? 0)} icon={DollarSign} color="#0EA5E9" bgColor="bg-sky-50" delay={0.24} />
        <StatCard
          label="Avg Coverage"
          value={latestRun ? `${latestRun.avg_coverage.toFixed(1)} mo` : "—"}
          icon={Shield} color="#64748B" bgColor="bg-slate-50" delay={0.28}
          sub={latestRun ? "latest run" : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-5 mb-7">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Risk Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Across all analyzed SKUs</p>
          {riskData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} SKUs`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {riskData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[d.name] || "#94A3B8" }} />
                      <span className="text-xs text-slate-600">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-slate-300 text-sm gap-2">
              <BarChart3 size={32} className="opacity-30" />
              <span>No data yet.</span>
              <Link href="/bulk-analysis" className="text-blue-500 text-xs hover:underline">Run an analysis</Link>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Quick Actions</h3>
          <p className="text-xs text-slate-400 mb-5">Jump to key workflows</p>
          <div className="space-y-2.5">
            {[
              { label: "Run Bulk Analysis", sub: "Upload CSV, analyze all SKUs with AI", href: "/bulk-analysis", color: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
              { label: "Open Decision Cockpit", sub: "Priority-ranked results + SKU drawer", href: "/decision-cockpit", color: "text-violet-600 bg-violet-50 hover:bg-violet-100" },
              { label: "Review Approvals", sub: `${stats?.total_pending ?? 0} items pending review`, href: "/approvals", color: "text-amber-700 bg-amber-50 hover:bg-amber-100" },
              { label: "Generate Purchase Request", sub: "From approved items", href: "/purchase-requests", color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors no-underline ${a.color}`}
              >
                <div>
                  <div className="text-sm font-semibold leading-tight">{a.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{a.sub}</div>
                </div>
                <ChevronRight size={15} className="opacity-50" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Runs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Recent Analysis Runs</h3>
            <p className="text-xs text-slate-400 mt-0.5">{runs.length} total runs</p>
          </div>
          <Link href="/decision-cockpit" className="text-blue-500 text-xs font-medium hover:underline no-underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {runs.length === 0 ? (
          <div className="py-12 text-center text-slate-300">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-slate-400">No analysis runs yet.</p>
            <Link href="/bulk-analysis" className="text-blue-500 text-xs hover:underline mt-1 inline-block">
              Run your first analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.slice(0, 5).map((run, i) => {
              const runLabel = formatRunId(i, runs.length);
              const highRisk = run.high_risk_count;
              return (
                <Link
                  key={run.id}
                  href={`/decision-cockpit?run_id=${run.id}`}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors no-underline group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center w-16">
                      <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{runLabel}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{run.run_type}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div>
                      <div className="text-xs font-semibold text-slate-700">
                        {run.total_skus} SKUs analyzed
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Avg Coverage: {run.avg_coverage.toFixed(1)} months &nbsp;·&nbsp; {formatDate(run.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={riskBadge(highRisk)}>
                      {highRisk} High Risk
                    </span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
