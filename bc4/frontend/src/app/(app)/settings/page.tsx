"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings, seedDemo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Database, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [serviceLevel, setServiceLevel] = useState(95);
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.data.service_level) setServiceLevel(Number(r.data.service_level));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await updateSettings({ service_level: serviceLevel });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const { data } = await seedDemo();
      setSeedResult(data);
    } catch (e: any) {
      setSeedResult({ error: e?.response?.data?.detail || "Seed failed" });
    }
    setSeeding(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 text-sm">Configure system parameters and manage demo data</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Service Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" /> Service Level Configuration
          </h3>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Target Service Level: <span className="text-blue-600">{serviceLevel}%</span>
            </label>
            <input
              type="range"
              min={80}
              max={99}
              step={0.5}
              value={serviceLevel}
              onChange={(e) => setServiceLevel(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1">
              <span>80%</span>
              <span>90%</span>
              <span>95%</span>
              <span>99%</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Higher service levels increase safety stock buffer. This affects the recommended purchase quantity calculation for all new analysis runs.
          </p>
          <button
            onClick={handleSave}
            disabled={user?.role !== "admin"}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors border-none cursor-pointer ${
              saved
                ? "bg-emerald-500"
                : user?.role === "admin"
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            {saved ? "Saved" : "Save Settings"}
          </button>
          {user?.role !== "admin" && (
            <p className="text-xs text-amber-500 mt-2">Admin role required to change settings</p>
          )}
        </motion.div>

        {/* Seed Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
            <Database size={16} className="text-violet-500" /> Demo Data Seed
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Generate a synthetic dataset with 200 SKUs, 12 months of sales data, multi-warehouse distribution,
            varying lead times, and failure rates. Creates users, analysis runs, and approval records.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors border-none cursor-pointer"
          >
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
          {seedResult && (
            <div className={`mt-3 p-3 rounded-lg text-xs ${seedResult.error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
              {seedResult.error
                ? seedResult.error
                : `Seeded ${seedResult.skus} SKUs · Run ID: ${seedResult.run_id?.slice(0, 8)}...`}
            </div>
          )}
        </motion.div>
      </div>

      {/* User Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Current User</h3>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Username", value: user?.username },
            { label: "Full Name", value: user?.full_name },
            { label: "Email", value: user?.email },
            { label: "Role", value: user?.role?.replace("_", " ") },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{item.label}</div>
              <div className="text-sm font-medium text-slate-700 capitalize">{item.value}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
