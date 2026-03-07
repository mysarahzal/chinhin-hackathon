"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BarChart3, Upload, CheckCircle, FileText, SlidersHorizontal,
  ArrowRight, Zap, Shield, TrendingUp, AlertTriangle, Clock,
  Package, ChevronRight, Database, Server, Cpu, Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain, title: "AI Demand Forecasting", color: "text-violet-600", bg: "bg-violet-50",
    desc: "Azure OpenAI GPT-4 analyzes each SKU with weighted demand, coverage, and risk scoring. Parallel processing — 8 SKUs in under 3 seconds.",
  },
  {
    icon: Upload, title: "Bulk SKU Analysis", color: "text-blue-600", bg: "bg-blue-50",
    desc: "Upload a CSV with hundreds of SKUs. All LLM calls fire simultaneously via asyncio.gather() for maximum throughput.",
  },
  {
    icon: BarChart3, title: "Decision Cockpit", color: "text-amber-600", bg: "bg-amber-50",
    desc: "Priority-ranked table sorted by composite risk score. Click any SKU to open a detail drawer with executive summary and AI explainability.",
  },
  {
    icon: SlidersHorizontal, title: "What-If Simulator", color: "text-emerald-600", bg: "bg-emerald-50",
    desc: "Model CNY demand surges, supplier delays, or damaged inventory. Compare baseline vs scenario side-by-side with full delta analysis.",
  },
  {
    icon: CheckCircle, title: "Approval Workflow", color: "text-indigo-600", bg: "bg-indigo-50",
    desc: "Structured approve/reject queue with bulk approval. Every action is logged to an immutable audit trail with user and timestamp.",
  },
  {
    icon: FileText, title: "Purchase Request Generator", color: "text-slate-600", bg: "bg-slate-100",
    desc: "Generate formatted PDFs and Excel files from approved items. Auto-populates PR numbers, unit prices, and total values.",
  },
];

const PROBLEMS = [
  { icon: Clock, label: "Manual spreadsheets take days", color: "text-red-500" },
  { icon: AlertTriangle, label: "Stockouts disrupt production lines", color: "text-red-500" },
  { icon: Package, label: "Overstocking ties up working capital", color: "text-amber-500" },
  { icon: TrendingUp, label: "No seasonal demand awareness", color: "text-amber-500" },
  { icon: Shield, label: "Approval workflows lack traceability", color: "text-slate-400" },
  { icon: FileText, label: "PR generation is slow and error-prone", color: "text-slate-400" },
];

const ARCH = [
  { 
    image: "/Architecture/nextjs.jpg", 
    label: "Next.js 15", 
    sub: "App Router · TypeScript · Tailwind v3", 
    color: "bg-blue-500" 
  },
  { 
    image: "/Architecture/fastapi.jpg", 
    label: "FastAPI", 
    sub: "Async endpoints · JWT auth · RBAC", 
    color: "bg-emerald-600" 
  },
  { 
    image: "/Architecture/postgresql.jpg", 
    label: "PostgreSQL 16", 
    sub: "Docker · SQLAlchemy ORM · Audit logs", 
    color: "bg-slate-700" 
  },
  { 
    image: "/Architecture/openai.jpg", 
    label: "Azure OpenAI GPT-4", 
    sub: "asyncio.gather() · Parallel calls · JSON mode", 
    color: "bg-violet-600" 
  },
];

const SCREENSHOTS = [
  { title: "Strategic Dashboard", 
    desc: "KPIs, risk distribution, process flow, recent runs", 
    color: "from-blue-600 to-blue-800", 
    image : "/screenshots/dashboard.png"
    },
  { title: "Decision Cockpit", 
    desc: "Priority-ranked table, SKU drawer, bar chart", 
    color: "from-violet-600 to-violet-800", 
    image : "/screenshots/decision-cockpit.png"
},
  { title: "What-If Simulator", 
    desc: "Preset scenarios, baseline vs scenario delta", 
    color: "from-emerald-600 to-emerald-800", 
    image : "/screenshots/what-if-simulator.png"
  },
  { title: "Procurement Workflow", 
    desc: "Upload → Analyze → Approve → Generate PR", 
    color: "from-amber-600 to-amber-800", 
    image : "/screenshots/procurement-workflow.png"
  },
  { title: "AI Analysis Flow", 
    desc: "Parallel LLM calls, seasonal detection, executive summary", 
    color: "from-rose-600 to-rose-800",
    image : "/screenshots/ai-analysis-flow.png"
   },
  { title: "System Architecture", 
    desc: "Next.js + FastAPI + PostgreSQL + Azure OpenAI", 
    color: "from-slate-700 to-slate-900",
    image : "/screenshots/system-architecture.png"
  },
];

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hoveredScreenshot, setHoveredScreenshot] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain size={14} color="white" />
            </div>
            <span className="text-white font-bold text-sm">BC4 Procurement AI</span>
            <span className="text-slate-600 text-xs ml-2 hidden sm:inline">Chin Hin Hackathon 2026</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors no-underline flex items-center gap-1.5"
              >
                Go to Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors no-underline">
                  Login
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold transition-colors no-underline"
                >
                  View Demo
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative min-h-[92vh] flex flex-col justify-center px-6 overflow-hidden"
        style={{ backgroundImage: "url('/landingpage/chinhinbuilding.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6"
          >
            <Zap size={11} /> Built for Chin Hin Hackathon 2026 — Business Challenge 4
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl font-black text-white leading-tight tracking-tight mb-6"
          >
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Procurement Planning
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Predict stock shortages before they happen.
            Generate purchase requests instantly with AI.
            8 SKUs analyzed in under 3 seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors no-underline flex items-center gap-2"
            >
              View Live Demo <ArrowRight size={15} />
            </Link>
            <a
              href="#architecture"
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 transition-colors no-underline"
            >
              See Architecture
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-16 pt-10 border-t border-white/5"
          >
            {[
              { value: "< 3s", label: "8-SKU bulk analysis" },
              { value: "100%", label: "Async parallel LLM" },
              { value: "GPT-4", label: "Azure OpenAI engine" },
              { value: "3 roles", label: "Enterprise auth" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-24 px-6 bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">The Problem</div>
            <h2 className="text-3xl font-black text-white mb-4">Procurement is still stuck in the past</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Trading companies lose millions annually from inefficient procurement — stockouts, overstocking, and slow approval workflows.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROBLEMS.map((p, i) => {
              const Icon = p.icon;
              return (
                <FadeIn key={p.label} delay={i * 0.05}>
                  <div className="bg-slate-800/60 rounded-xl border border-white/10 p-5 flex items-start gap-3">
                    <Icon size={18} className={`${p.color} flex-shrink-0 mt-0.5`} />
                    <span className="text-sm text-slate-300 font-medium leading-snug">{p.label}</span>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-3">The Solution</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Enterprise AI that acts like your best procurement analyst</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              BC4 replaces guesswork with data-driven AI decisions — from demand forecasting to PR generation in one unified workflow.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Parallel AI Analysis", desc: "All SKU calls fire simultaneously using asyncio.gather() — 8 SKUs in the time it used to take 1.", icon: Zap, color: "bg-blue-500" },
              { title: "Seasonal Intelligence", desc: "CNY (+30%), Raya (+20%), Year-End (+15%) demand multipliers applied automatically based on month.", icon: TrendingUp, color: "bg-violet-500" },
              { title: "Risk-Based Prioritization", desc: "Composite priority score from risk level, coverage gap, demand volume, and forecast confidence.", icon: Shield, color: "bg-emerald-500" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={item.title} delay={i * 0.08}>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                      <Icon size={18} color="white" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-3">Features</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Everything procurement needs, nothing it doesn't</h2>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 0.06}>
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                      <Icon size={18} className={f.color} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-sm">{f.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process Flow */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <div className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-3">Workflow</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Five steps from data to purchase order</h2>
          </FadeIn>
          {/* Mobile: vertical stack. Desktop: horizontal row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 md:gap-0">
            {[
              { n: "1", label: "Upload Data", sub: "CSV or manual entry", color: "bg-blue-500" },
              { n: "2", label: "AI Analysis", sub: "Parallel GPT-4 processing", color: "bg-violet-500" },
              { n: "3", label: "Review Results", sub: "Decision Cockpit", color: "bg-amber-500" },
              { n: "4", label: "Approve Items", sub: "Structured workflow", color: "bg-emerald-500" },
              { n: "5", label: "Generate PR", sub: "PDF / Excel export", color: "bg-slate-700" },
            ].map((step, i, arr) => (
              <div key={step.n} className="flex md:flex-col md:flex-1 items-center md:items-stretch">
                <FadeIn delay={i * 0.08} className="flex md:flex-col items-center md:text-center gap-4 md:gap-0 flex-1 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none p-4 md:p-0">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center flex-shrink-0 md:mx-auto md:mb-3 text-white font-black text-lg shadow-md`}>
                    {step.n}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{step.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{step.sub}</div>
                  </div>
                </FadeIn>
                {i < arr.length - 1 && (
                  <ChevronRight size={20} className="text-slate-200 flex-shrink-0 mx-1 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

{/* Architecture Section */}
<section id="architecture" className="py-24 px-6 bg-slate-950 relative overflow-hidden">
  {/* Subtle Background Glow */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

  <div className="max-w-5xl mx-auto relative z-10">
    <FadeIn className="text-center mb-16">
      <div className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4">
        Enterprise Stack
      </div>
      <h2 className="text-4xl font-black text-white mb-6 tracking-tight">
        Modern Architecture
      </h2>
      <p className="text-slate-400 max-w-2xl mx-auto text-base leading-relaxed">
        Sistem pemprosesan selari yang dibina untuk skalabiliti, menggunakan 
        teknologi AI terkini dan pangkalan data berprestasi tinggi.
      </p>
    </FadeIn>

    {/* Grid Tech Stack */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {ARCH.map((a, i) => (
        <FadeIn key={a.label} delay={i * 0.08}>
          <div className="group relative bg-slate-900/50 border border-white/5 rounded-3xl p-8 text-center transition-all duration-300 hover:border-blue-500/30 hover:bg-slate-900 hover:-translate-y-1 shadow-2xl">
            
            {/* Logo Container */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 flex-shrink-0">
              <img
                src={a.image}
                alt={a.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            
            <div className="text-white font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">
              {a.label}
            </div>
            <div className="text-slate-500 text-[12px] leading-snug font-medium">
              {a.sub}
            </div>
          </div>
        </FadeIn>
      ))}
    </div>

    {/* Data Flow Visualization */}
    <FadeIn delay={0.4} className="mt-12">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              System Pipeline
            </div>
            <h3 className="text-white font-bold text-xl">Data Processing Flow</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              "CSV Upload", "→", 
              "FastAPI", "→", 
              "asyncio.gather()", "→", 
              "GPT-4 Parallel", "→", 
              "PostgreSQL"
            ].map((t, i) => (
              <span 
                key={i} 
                className={t === "→" 
                  ? "text-slate-600 font-bold px-1" 
                  : "bg-white/5 hover:bg-white/10 border border-white/5 px-4 py-2 rounded-xl text-slate-300 text-[11px] font-semibold transition-colors"
                }
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FadeIn>
  </div>
</section>
      {/* Screenshots Reference */}
      <section className="py-24 px-6 bg-white overflow-visible">
        <div className="max-w-5xl mx-auto overflow-visible">
          <FadeIn className="text-center mb-14">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">System Screenshots & Architecture Reference</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">See it in action</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Login to explore all features interactively. Screenshots can be added below.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCREENSHOTS.map((s, i) => (
              <FadeIn key={s.title} delay={i * 0.06} className="relative">
                <motion.div
                  className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white cursor-pointer relative"
                  onHoverStart={() => setHoveredScreenshot(i)}
                  onHoverEnd={() => setHoveredScreenshot(null)}
                  whileHover={{ scale: 1.03, boxShadow: "0 20px 40px -8px rgba(0,0,0,0.18)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{ zIndex: hoveredScreenshot === i ? 20 : 1 }}
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    {s.image ? (
                      <img
                        src={s.image}
                        alt={s.title}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                        <BarChart3 size={32} className="text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="font-bold text-slate-800 text-sm mb-1">{s.title}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{s.desc}</div>
                  </div>

                  {/* Hover popup preview */}
                  <AnimatePresence>
                    {hoveredScreenshot === i && (
                      <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.9 }}
                        animate={{ opacity: 1, y: -12, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.9 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="absolute -top-[380px] left-1/2 -translate-x-1/2 w-[440px] rounded-2xl overflow-hidden shadow-[0_24px_60px_-8px_rgba(0,0,0,0.35)] border border-slate-200 bg-white pointer-events-none"
                        style={{ zIndex: 50 }}
                      >
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.title}
                            className="w-full h-64 object-cover object-top"
                          />
                        ) : (
                          <div className={`w-full h-64 bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                            <BarChart3 size={52} className="text-white/30" />
                          </div>
                        )}
                        <div className="bg-slate-900 px-5 py-4">
                          <div className="text-white font-bold text-sm">{s.title}</div>
                          <div className="text-slate-400 text-xs mt-1 leading-relaxed">{s.desc}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to see it live?</h2>
          <p className="text-slate-400 mb-8">
            Login with{" "}
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-slate-300 text-sm">admin / admin123</code>
            {" "}to explore all features.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-colors no-underline"
          >
            Enter Demo <ArrowRight size={16} />
          </Link>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain size={10} color="white" />
            </div>
            BC4 Procurement AI — Chin Hin Hackathon 2026
          </div>
          <div>FastAPI + Next.js 15 + Azure OpenAI</div>
        </div>
      </footer>
    </div>
  );
}
