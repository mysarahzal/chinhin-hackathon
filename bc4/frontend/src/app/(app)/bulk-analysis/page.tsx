"use client";

import { useState, useRef } from "react";
import { analyzeBulk } from "@/lib/api";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, ArrowRight, Download } from "lucide-react";
import { useRouter } from "next/navigation";

const SAMPLE_CSV = `sku,current_stock,incoming_stock,avg_3m,avg_6m,lead_time_months,failure_rate_pct,unit_price
Electric Kettle KX900,120,50,95,88,2,4,89.90
Steel Pipe SP200,300,0,210,195,3,2,45.00
Bearing B100,80,20,65,70,1,7,12.50
Industrial Fan IF550,40,0,35,30,2,3,320.00
Safety Helmet SH01,500,100,180,160,1,1,28.00
Hydraulic Pump HP300,15,5,18,20,4,9,1250.00
Cable Reel CR75,60,30,50,48,2,5,75.00
Valve Gate VG22,90,0,120,110,3,6,180.00
`;

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_skus.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",");
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = isNaN(Number(vals[i]?.trim())) ? vals[i]?.trim() : Number(vals[i]?.trim());
      });
      return obj;
    }).filter((o) => o.sku);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      setItems(parsed);
    };
    reader.readAsText(f);
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await analyzeBulk(items);
      setRunId(data.run_id);
      setSummary({
        total_skus: data.total_skus,
        high_risk_count: data.high_risk_count,
        total_recommended_units: data.total_recommended_units,
        avg_coverage: data.avg_coverage,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Bulk analysis failed");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Bulk Analysis</h1>
        <p className="text-slate-500 text-sm">Upload CSV with multiple SKUs for AI-powered batch analysis</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Upload CSV File</h3>
            <button
              onClick={downloadSampleCSV}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer"
            >
              <Download size={13} /> Download Sample CSV
            </button>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (!f) return;
              setFile(f);
              const reader = new FileReader();
              reader.onload = (ev) => setItems(parseCSV(ev.target?.result as string));
              reader.readAsText(f);
            }}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-5 ${
              dragOver
                ? "border-blue-400 bg-blue-50/60"
                : file
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
            }`}
          >
            <Upload size={36} className={`mx-auto mb-3 ${dragOver ? "text-blue-400" : file ? "text-emerald-400" : "text-slate-300"}`} />
            <p className="text-sm font-semibold text-slate-600 mb-1">
              {file ? file.name : "Click or drag & drop CSV"}
            </p>
            <p className="text-xs text-slate-400">
              Columns: sku, current_stock, incoming_stock, avg_3m, avg_6m, lead_time_months, failure_rate_pct
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </div>

          {items.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={15} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">{items.length} SKUs parsed</span>
              </div>
              <div className="max-h-48 overflow-auto border border-slate-100 rounded-lg text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-1.5 text-left text-slate-500 font-semibold">SKU</th>
                      <th className="px-2 py-1.5 text-right text-slate-500 font-semibold">Stock</th>
                      <th className="px-2 py-1.5 text-right text-slate-500 font-semibold">Avg 3m</th>
                      <th className="px-2 py-1.5 text-right text-slate-500 font-semibold">Lead Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((item, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-2 py-1.5 text-slate-700">{item.sku}</td>
                        <td className="px-2 py-1.5 text-right text-slate-600">{item.current_stock}</td>
                        <td className="px-2 py-1.5 text-right text-slate-600">{item.avg_3m}</td>
                        <td className="px-2 py-1.5 text-right text-slate-600">{item.lead_time_months}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length > 10 && (
                  <div className="px-2 py-2 text-center text-slate-400">+ {items.length - 10} more</div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600 mb-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className={`w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors ${
              items.length === 0
                ? "bg-slate-200 cursor-not-allowed"
                : loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? `Analyzing ${items.length} SKUs with AI...` : `Run Bulk Analysis (${items.length} SKUs)`}
          </button>
        </motion.div>

        {/* Results Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col"
        >
          {summary ? (
            <>
              <h3 className="text-sm font-semibold text-emerald-600 mb-5">Analysis Complete</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-900">{summary.total_skus}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Total SKUs</div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">{summary.high_risk_count}</div>
                  <div className="text-xs text-slate-500 mt-0.5">High Risk</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-900">{summary.total_recommended_units.toFixed(0)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Rec. Units</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-900">{summary.avg_coverage.toFixed(1)}mo</div>
                  <div className="text-xs text-slate-500 mt-0.5">Avg Coverage</div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/decision-cockpit?run_id=${runId}`)}
                className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                View in Decision Cockpit <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-slate-300 py-16">
              <FileSpreadsheet size={48} className="mb-4 opacity-40" />
              <p className="text-sm text-slate-400">Upload a CSV to see results</p>
              <p className="text-xs text-slate-300 mt-1">Use the sample_skus.csv in the project root</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
