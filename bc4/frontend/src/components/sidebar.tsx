"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Search,
  Upload,
  Target,
  CheckCircle,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  Brain,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/single-analysis", label: "Single Analysis", icon: Search },
  { href: "/bulk-analysis", label: "Bulk Analysis", icon: Upload },
  { href: "/decision-cockpit", label: "Decision Cockpit", icon: Target },
  { href: "/what-if", label: "What-If Simulator", icon: SlidersHorizontal },
  { href: "/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/purchase-requests", label: "Purchase Requests", icon: FileText },
  { href: "/audit-trail", label: "Audit Trail", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SEASONAL_LABELS: Record<number, string> = {
  1: "CNY Season", 2: "CNY Season",
  4: "Raya Season", 5: "Raya Season",
  11: "Year-End", 12: "Year-End",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const currentMonth = new Date().getMonth() + 1;
  const [simMonth, setSimMonth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_month");
      return stored ? Number(stored) : currentMonth;
    }
    return currentMonth;
  });

  const handleMonthChange = (m: number) => {
    setSimMonth(m);
    if (typeof window !== "undefined") localStorage.setItem("sim_month", String(m));
  };

  const seasonLabel = SEASONAL_LABELS[simMonth];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col py-6 z-50">
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Brain size={18} color="white" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">BC4</div>
            <div className="text-slate-500 text-[10px] tracking-widest uppercase">Procurement AI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors no-underline",
                active
                  ? "bg-blue-500/10 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-normal",
              ].join(" ")}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.2 : 1.8}
                color={active ? "#60A5FA" : "#64748B"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Month Selector */}
      <div className="px-4 pb-3 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={13} color="#64748B" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Simulation Month</span>
        </div>
        <select
          value={simMonth}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          className="w-full bg-slate-800 text-slate-200 text-xs rounded-md px-2 py-1.5 border border-slate-700 outline-none"
        >
          {MONTHS.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        {seasonLabel && (
          <div className="mt-1.5 text-[10px] text-amber-400 font-semibold">{seasonLabel} active</div>
        )}
      </div>

      {/* User */}
      {user && (
        <div className="px-4 pt-4 border-t border-slate-800">
          <div className="text-white text-sm font-semibold mb-0.5">{user.full_name}</div>
          <div className="text-slate-500 text-xs capitalize mb-3">
            {user.role.replace("_", " ")}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm cursor-pointer bg-transparent border-none transition-colors p-0"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
