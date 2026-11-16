"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Cpu,
  Zap,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  BarChart3,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  User,
  LogOut,
  KeyRound,
  ShieldCheck,
  X,
  FileCode2,
  Sliders,
  Terminal,
} from "lucide-react";

interface SampleQuery {
  id: string;
  title: string;
  difficulty: string;
  sql: string;
  description: string;
}

interface Recommendation {
  action_type: string;
  sql: string;
  target_table: string;
  target_columns: string[];
  reason: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  estimated_speedup: number;
}

interface Bottleneck {
  node_type: string;
  table: string | null;
  severity: "CRITICAL" | "WARNING" | "INFO";
  description: string;
  impact_ms: number;
}

interface FeatureAttribution {
  feature: string;
  label: string;
  value: number;
  impact_score: number;
}

interface AnalysisData {
  sql: string;
  predicted_ms: number;
  actual_ms: number;
  is_slow: boolean;
  slow_threshold_ms: number;
  estimated_improved_ms: number;
  speedup_ratio: number;
  summary: string;
  recommendations: Recommendation[];
  bottlenecks: Bottleneck[];
  top_features: FeatureAttribution[];
  features?: Record<string, any>;
  plan?: any;
}

interface AuthUser {
  username: string;
  created_at?: string;
}

export default function Dashboard() {
  const [samples, setSamples] = useState<SampleQuery[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [sql, setSql] = useState<string>("");
  const [connStr, setConnStr] = useState<string>("");
  const [showConnStr, setShowConnStr] = useState<boolean>(false);
  const [showRawPlan, setShowRawPlan] = useState<boolean>(false);
  const [rawPlanInput, setRawPlanInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"advice" | "improved" | "features" | "plan" | "models">("advice");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<Record<string, any> | null>(null);

  // Authentication State (MongoDB)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Load sample queries & model comparison metrics on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("advisor_user");
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }

    fetch("/api/workload/samples")
      .then((res) => res.json())
      .then((data) => {
        if (data.samples && data.samples.length > 0) {
          setSamples(data.samples);
          setSql(data.samples[0].sql);
          setSelectedSampleId(data.samples[0].id);
        }
      })
      .catch((err) => console.error("Error loading samples:", err));

    fetch("/api/models/comparison")
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) {
          setModelMetrics(data.metrics);
        }
      })
      .catch((err) => console.error("Error loading models:", err));
  }, []);

  const handleSelectSample = (sample: SampleQuery) => {
    setSelectedSampleId(sample.id);
    setSql(sample.sql);
  };

  const handleAnalyze = async () => {
    if (!sql.trim()) return;
    setLoading(true);

    try {
      let parsedPlan = null;
      if (rawPlanInput.trim()) {
        try {
          parsedPlan = JSON.parse(rawPlanInput);
        } catch {
          alert("Invalid JSON format in raw plan input.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sql: sql.trim(),
          conn_str: connStr.trim() || undefined,
          plan_json: parsedPlan || undefined,
          slow_threshold_ms: 50.0,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Failed to run analysis. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(text);
    setTimeout(() => setCopiedSql(null), 2500);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setAuthError(data.error || "Authentication failed.");
      } else {
        const user = data.user || { username: authUsername.trim() };
        setCurrentUser(user);
        localStorage.setItem("advisor_user", JSON.stringify(user));
        setShowAuthModal(false);
        setAuthUsername("");
        setAuthPassword("");
      }
    } catch (err: any) {
      setAuthError(err.message || "Network error communicating with MongoDB auth.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("advisor_user");
  };

  const handleDemoQuickLogin = async () => {
    setAuthUsername("pes_demo");
    setAuthPassword("pes1234");
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "pes_demo", password: "pes1234" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user = data.user || { username: "pes_demo" };
        setCurrentUser(user);
        localStorage.setItem("advisor_user", JSON.stringify(user));
        setShowAuthModal(false);
      } else {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "pes_demo", password: "pes1234" }),
        });
        const regData = await regRes.json();
        const user = regData.user || { username: "pes_demo" };
        setCurrentUser(user);
        localStorage.setItem("advisor_user", JSON.stringify(user));
        setShowAuthModal(false);
      }
    } catch {
      const user = { username: "pes_demo" };
      setCurrentUser(user);
      localStorage.setItem("advisor_user", JSON.stringify(user));
      setShowAuthModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] text-[#F4F6F8] font-mono selection:bg-[#CCFF00] selection:text-[#121316] pb-24">
      {/* Bento Header Bar */}
      <header className="border-b border-[#2D333E] bg-[#181B1F]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-[#242931] border border-[#2D333E] flex items-center justify-center text-[#F4F6F8] shadow-inner">
              <Database className="h-4.5 w-4.5 text-[#F4F6F8]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-[#F4F6F8] tracking-tight">
                  QUERY.ADVISOR
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#242931] text-[#A6B2C0] border border-[#2D333E] font-medium">
                  v2.4·ML
                </span>
              </div>
              <p className="text-[10px] text-[#7E8C9E]">
                PESU · AM125 (K R Manoj) & AM127 (K Ravish Rao)
              </p>
            </div>
          </div>

          {/* Right Header Badges & Auth */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-xl bg-[#1E2228] border border-[#2D333E] text-[#A6B2C0]">
              <Activity className="h-3.5 w-3.5 text-[#A6B2C0]" />
              <span>XGBoost R²: <strong className="text-[#F4F6F8]">0.9715</strong></span>
            </div>

            {currentUser ? (
              <div className="flex items-center space-x-2 bg-[#1E2228] border border-[#2D333E] rounded-xl px-3 py-1.5 text-xs">
                <div className="h-5 w-5 rounded-md bg-[#242931] border border-[#39414E] flex items-center justify-center text-[#F4F6F8]">
                  <User className="h-3 w-3" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-[#F4F6F8] block text-[11px] leading-tight">
                    {currentUser.username}
                  </span>
                  <span className="text-[9px] text-[#A6B2C0] block">MongoDB Active</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="ml-1 p-1 text-[#7E8C9E] hover:text-[#F4F6F8] transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-xl bg-[#242931] hover:bg-[#2D333E] text-[#F4F6F8] font-semibold border border-[#39414E] transition shadow-sm"
              >
                <KeyRound className="h-3.5 w-3.5 text-[#A6B2C0]" />
                <span>MongoDB Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Bento Layout Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* BENTO ROW 1: Quick Benchmark Workloads (Horizontal Bento Strip) */}
        <section className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-[#F4F6F8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                Benchmark Workload Presets
              </span>
            </div>
            <span className="text-[11px] text-[#7E8C9E]">Select a query profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {samples.map((s) => {
              const isSelected = selectedSampleId === s.id;
              const isSlow = s.difficulty.includes("Slow");
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSample(s)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#1E2228] border-[#CCFF00] text-[#F4F6F8] shadow-md ring-1 ring-[#CCFF00]"
                      : "bg-[#141619] border-[#2D333E] text-[#A6B2C0] hover:border-[#39414E] hover:text-[#F4F6F8] hover:bg-[#1E2228]"
                  }`}
                >
                  <div className="font-bold line-clamp-1 mb-1 text-[11px]">
                    {s.title.split("—")[0]}
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-[#2D333E]/60">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                        isSlow
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[#7E8C9E]" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* BENTO ROW 2: Asymmetric Bento Grid (Input Console + Engine Telemetry) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main SQL Console Bento Card (8 Cols) */}
          <div className="lg:col-span-8 bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 className="h-4.5 w-4.5 text-[#F4F6F8]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                    SQL Query Input
                  </h2>
                </div>
                <button
                  onClick={() => setShowConnStr(!showConnStr)}
                  className="text-xs text-[#A6B2C0] hover:text-[#F4F6F8] flex items-center space-x-1 transition"
                >
                  <span>{showConnStr ? "Hide Connection" : "PostgreSQL URI (Optional)"}</span>
                  {showConnStr ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {showConnStr && (
                <div className="p-3 rounded-xl bg-[#141619] border border-[#2D333E] text-xs space-y-2">
                  <label className="text-[#A6B2C0] block font-medium">PostgreSQL Connection URI:</label>
                  <input
                    type="text"
                    placeholder="postgresql://user:password@localhost:5432/tpch"
                    value={connStr}
                    onChange={(e) => setConnStr(e.target.value)}
                    className="w-full bg-[#181B1F] border border-[#39414E] rounded-lg px-3 py-2 text-[#F4F6F8] font-mono text-xs focus:outline-none focus:border-[#CCFF00]"
                  />
                  <p className="text-[10px] text-[#7E8C9E]">
                    Leave empty to invoke internal PostgreSQL cost & cardinality plan simulator.
                  </p>
                </div>
              )}

              {/* SQL Textarea */}
              <div className="relative rounded-xl overflow-hidden border border-[#2D333E] bg-[#121316]">
                <div className="bg-[#181B1F] px-4 py-2 border-b border-[#2D333E] flex items-center justify-between text-[11px] text-[#7E8C9E]">
                  <span>query.sql</span>
                  <span>PostgreSQL 15 Dialect</span>
                </div>
                <textarea
                  rows={7}
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="Enter SQL Query (e.g. SELECT * FROM orders WHERE total_amount > 500)..."
                  className="w-full bg-[#121316] p-4 text-xs font-mono text-[#F4F6F8] focus:outline-none focus:ring-1 focus:ring-[#CCFF00] border-none resize-y"
                />
              </div>

              {/* Optional Custom EXPLAIN Tree */}
              <div>
                <button
                  onClick={() => setShowRawPlan(!showRawPlan)}
                  className="text-xs text-[#7E8C9E] hover:text-[#A6B2C0] flex items-center space-x-1 transition"
                >
                  <span>{showRawPlan ? "Hide Custom Plan JSON" : "+ Paste EXPLAIN (FORMAT JSON) Tree"}</span>
                </button>
                {showRawPlan && (
                  <div className="mt-2">
                    <textarea
                      rows={4}
                      value={rawPlanInput}
                      onChange={(e) => setRawPlanInput(e.target.value)}
                      placeholder='Paste EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output (e.g. [{"Plan": {...}}] )'
                      className="w-full bg-[#141619] border border-[#2D333E] rounded-xl p-3 text-xs font-mono text-[#F4F6F8] focus:outline-none focus:border-[#CCFF00]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar (10% Accent Lime Yellow CTA) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#2D333E]">
              <span className="text-[11px] text-[#7E8C9E]">
                {!currentUser
                  ? "Guest Mode: Free latency & verdict. Login to unlock index DDL."
                  : "✓ MongoDB Authenticated: Unrestricted access active."}
              </span>
              <button
                onClick={handleAnalyze}
                disabled={loading || !sql.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#DCFF3B] text-[#121316] font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 tracking-tight"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-[#121316]" />
                    <span>Analyzing Plan Tree...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-[#121316]" />
                    <span>Analyze Query & Get Advice</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Engine Telemetry Bento Card (4 Cols) */}
          <div className="lg:col-span-4 bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Sliders className="h-4.5 w-4.5 text-[#F4F6F8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                  Advisor Telemetry
                </h3>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#141619] border border-[#2D333E] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">ML Predictor</span>
                    <span className="font-bold text-[#F4F6F8]">XGBoost Regressor</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">R² Goodness-of-Fit</span>
                    <span className="font-bold text-[#F4F6F8]">0.9715</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Test Root MSE</span>
                    <span className="font-mono text-[#A6B2C0]">15.35 ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#141619] border border-[#2D333E] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Feature Extractor</span>
                    <span className="font-bold text-[#F4F6F8]">22 DFS Nodes</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Target Latency SLA</span>
                    <span className="font-mono text-[#A6B2C0]">50.0 ms budget</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Index Advisor</span>
                    <span className="font-bold text-[#F4F6F8]">AST Predicate Synthesizer</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#141619] border border-[#2D333E] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Auth Store</span>
                    <span className="font-bold text-[#F4F6F8]">MongoDB · bcrypt (10 rounds)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7E8C9E]">Run History DB</span>
                    <span className="font-bold text-[#F4F6F8]">SQLite Local Log</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#2D333E] flex items-center justify-between text-[11px] text-[#7E8C9E]">
              <span>Hardware Acceleration</span>
              <span className="text-[#A6B2C0]">RTX 2050 / Ampere</span>
            </div>
          </div>
        </section>

        {/* BENTO ROW 3: Query Analysis Results (4 KPI Bento Cards + Executive Summary) */}
        {result && (
          <section className="space-y-6">
            {/* 4 Metric Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Latency */}
              <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#7E8C9E] mb-2">
                  <span>Predicted Latency</span>
                  <Clock className="h-4 w-4 text-[#A6B2C0]" />
                </div>
                <div className="text-2xl font-bold text-[#F4F6F8] font-mono tracking-tight">
                  {result.predicted_ms} ms
                </div>
                <div className="text-[11px] text-[#7E8C9E] mt-2 pt-2 border-t border-[#2D333E]">
                  Budget: <span className="text-[#F4F6F8]">{result.slow_threshold_ms} ms</span>
                </div>
              </div>

              {/* Card 2: Performance Verdict */}
              <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#7E8C9E] mb-2">
                  <span>Classification</span>
                  {result.is_slow ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                      result.is_slow
                        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {result.is_slow ? "🔴 SLOW QUERY" : "🟢 FAST / OPTIMAL"}
                  </span>
                </div>
                <div className="text-[11px] text-[#7E8C9E] mt-2 pt-2 border-t border-[#2D333E] line-clamp-1">
                  {result.is_slow ? "Exceeds SLA threshold" : "Compliant with target SLAs"}
                </div>
              </div>

              {/* Card 3: Projected Speedup (10% Accent Highlight) */}
              <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#7E8C9E] mb-2">
                  <span>Projected Speedup</span>
                  <Zap className="h-4 w-4 text-[#CCFF00]" />
                </div>
                <div className="text-2xl font-bold text-[#CCFF00] font-mono tracking-tight">
                  {result.speedup_ratio > 1 ? `${result.speedup_ratio}x` : "1.0x (Optimal)"}
                </div>
                <div className="text-[11px] text-[#7E8C9E] mt-2 pt-2 border-t border-[#2D333E]">
                  Post-index multiplier
                </div>
              </div>

              {/* Card 4: Post-Optimization Target Latency */}
              <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#7E8C9E] mb-2">
                  <span>Optimized Target</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
                  {result.estimated_improved_ms} ms
                </div>
                <div className="text-[11px] text-[#7E8C9E] mt-2 pt-2 border-t border-[#2D333E]">
                  Estimated post-DDL run
                </div>
              </div>
            </div>

            {/* Executive Advisor Summary Bento Card */}
            <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-5 shadow-lg flex items-start space-x-4">
              <div className="p-2.5 rounded-xl bg-[#141619] border border-[#2D333E] text-[#F4F6F8] mt-0.5">
                <Sparkles className="h-4.5 w-4.5 text-[#F4F6F8]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                  Advisor Summary
                </h3>
                <p className="text-xs sm:text-sm text-[#A6B2C0] leading-relaxed">
                  {result.summary}
                </p>
              </div>
            </div>

            {/* BENTO ROW 4: Tabbed Intelligence Module */}
            <div className="space-y-4">
              {/* Tab Header Strip */}
              <div className="flex flex-wrap gap-2 border-b border-[#2D333E] pb-2">
                <button
                  onClick={() => setActiveTab("advice")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "advice"
                      ? "bg-[#242931] text-[#CCFF00] border border-[#CCFF00]/40"
                      : "text-[#A6B2C0] hover:text-[#F4F6F8] hover:bg-[#181B1F]"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Recommendations ({result.recommendations.length})</span>
                  {!currentUser && result.recommendations.length > 0 && (
                    <Lock className="h-3 w-3 text-[#CCFF00] ml-1" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("improved")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "improved"
                      ? "bg-[#242931] text-[#CCFF00] border border-[#CCFF00]/40"
                      : "text-[#A6B2C0] hover:text-[#F4F6F8] hover:bg-[#181B1F]"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>Improved Query DDL</span>
                  {!currentUser && <Lock className="h-3 w-3 text-[#CCFF00] ml-1" />}
                </button>

                <button
                  onClick={() => setActiveTab("features")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "features"
                      ? "bg-[#242931] text-[#CCFF00] border border-[#CCFF00]/40"
                      : "text-[#A6B2C0] hover:text-[#F4F6F8] hover:bg-[#181B1F]"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Feature Attributions</span>
                  {!currentUser && <Lock className="h-3 w-3 text-[#CCFF00] ml-1" />}
                </button>

                <button
                  onClick={() => setActiveTab("plan")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "plan"
                      ? "bg-[#242931] text-[#CCFF00] border border-[#CCFF00]/40"
                      : "text-[#A6B2C0] hover:text-[#F4F6F8] hover:bg-[#181B1F]"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Execution Plan Tree</span>
                  {!currentUser && <Lock className="h-3 w-3 text-[#CCFF00] ml-1" />}
                </button>

                <button
                  onClick={() => setActiveTab("models")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                    activeTab === "models"
                      ? "bg-[#242931] text-[#CCFF00] border border-[#CCFF00]/40"
                      : "text-[#A6B2C0] hover:text-[#F4F6F8] hover:bg-[#181B1F]"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Model Benchmark</span>
                </button>
              </div>

              {/* TAB 1: RECOMMENDATIONS */}
              {activeTab === "advice" && (
                <div className="space-y-4">
                  {result.recommendations.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#181B1F] border border-[#2D333E] text-center space-y-2 shadow-lg">
                      <CheckCircle className="h-7 w-7 text-emerald-400 mx-auto mb-1" />
                      <p className="font-bold text-sm text-[#F4F6F8]">Optimal Execution Path Detected</p>
                      <p className="text-xs text-[#7E8C9E] max-w-md mx-auto">
                        This query is already optimized with index scans or primary key lookups. No missing indexes detected.
                      </p>
                    </div>
                  ) : !currentUser ? (
                    /* Bento Gated Lock Card (Unclipped, Spacious, Clear Typography) */
                    <div className="rounded-2xl border border-[#2D333E] bg-[#181B1F] p-8 sm:p-10 shadow-2xl text-center space-y-5">
                      <div className="h-12 w-12 rounded-2xl bg-[#1E2228] border border-[#CCFF00]/40 flex items-center justify-center text-[#CCFF00] mx-auto shadow-md">
                        <Lock className="h-6 w-6 text-[#CCFF00]" />
                      </div>

                      <div className="max-w-lg mx-auto space-y-2">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#CCFF00]/10 text-[#CCFF00] text-xs font-mono font-bold border border-[#CCFF00]/25">
                          <Zap className="h-3.5 w-3.5" />
                          <span>
                            {result.recommendations.length} Index Recommendation(s) Available (~{result.speedup_ratio}x Speedup)
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#F4F6F8]">
                          Login Required to Unlock Index DDL & Improved Query
                        </h3>
                        <p className="text-xs text-[#A6B2C0] leading-relaxed">
                          Basic query latency and performance verdicts are shown above. To unlock the exact{" "}
                          <span className="text-[#CCFF00] font-mono font-semibold">CREATE INDEX</span> statements,
                          predicate column fixes, and full plan trees, please sign in using your MongoDB account.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setAuthMode("login");
                            setShowAuthModal(true);
                          }}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#DCFF3B] text-[#121316] font-bold text-xs transition flex items-center justify-center space-x-2 shadow-md"
                        >
                          <KeyRound className="h-4 w-4 text-[#121316]" />
                          <span>Sign In with MongoDB</span>
                        </button>
                        <button
                          onClick={handleDemoQuickLogin}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#242931] hover:bg-[#2D333E] text-[#F4F6F8] font-semibold text-xs border border-[#39414E] transition flex items-center justify-center space-x-2"
                        >
                          <Sparkles className="h-4 w-4 text-[#A6B2C0]" />
                          <span>1-Click Demo Login (pes_demo)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Unlocked View for Authenticated Users */
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold px-1">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>MongoDB Authenticated · Recommendations Unlocked</span>
                      </div>

                      {result.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-[#181B1F] border border-[#2D333E] shadow-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.priority === "CRITICAL"
                                    ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                    : "bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/30"
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <span className="text-xs font-semibold text-[#F4F6F8]">
                                Action: {rec.action_type} on {rec.target_table}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-[#CCFF00] font-bold">
                              ~{rec.estimated_speedup}x speedup
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121316] border border-[#2D333E] font-mono text-xs sm:text-sm text-[#F4F6F8]">
                            <code className="overflow-x-auto pr-4">{rec.sql}</code>
                            <button
                              onClick={() => handleCopy(rec.sql)}
                              className="px-3 py-1.5 rounded-lg bg-[#242931] hover:bg-[#2D333E] text-[#F4F6F8] border border-[#39414E] flex items-center space-x-1.5 transition text-xs shrink-0 font-medium"
                            >
                              {copiedSql === rec.sql ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-[#A6B2C0]" />
                                  <span>Copy DDL</span>
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-[#A6B2C0] leading-relaxed">{rec.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: IMPROVED QUERY PREVIEW */}
              {activeTab === "improved" && (
                <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-6 shadow-lg space-y-4">
                  {!currentUser ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#1E2228] border border-[#CCFF00]/40 flex items-center justify-center text-[#CCFF00] mx-auto shadow-md">
                        <Lock className="h-6 w-6 text-[#CCFF00]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[#F4F6F8]">
                          Login Required for Improved Query DDL
                        </h3>
                        <p className="text-xs text-[#7E8C9E] max-w-md mx-auto">
                          Sign in to view the rewritten query statements and projected index execution plans.
                        </p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="px-5 py-2 rounded-xl bg-[#CCFF00] text-[#121316] font-bold text-xs"
                        >
                          Sign In with MongoDB
                        </button>
                        <button
                          onClick={handleDemoQuickLogin}
                          className="px-4 py-2 rounded-xl bg-[#242931] text-[#F4F6F8] border border-[#39414E] text-xs font-semibold"
                        >
                          1-Click Demo Login
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                            Improved Query Execution Plan
                          </h3>
                          <p className="text-xs text-[#7E8C9E]">
                            Apply this index in PostgreSQL to reach projected ~{result.speedup_ratio}x speedup.
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                          Target Latency: {result.estimated_improved_ms} ms
                        </span>
                      </div>

                      {result.recommendations.length > 0 ? (
                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-[#121316] border border-[#2D333E] font-mono text-xs sm:text-sm text-[#F4F6F8] space-y-2">
                            <div className="text-[#7E8C9E] text-xs">-- 1. Synthesized CREATE INDEX DDL:</div>
                            {result.recommendations.map((r, i) => (
                              <div key={i} className="text-[#CCFF00]">
                                {r.sql}
                              </div>
                            ))}
                            <div className="text-[#7E8C9E] text-xs pt-2">-- 2. Target Query (Accelerated via Index):</div>
                            <div className="text-[#A6B2C0] whitespace-pre-wrap">{result.sql}</div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#141619] border border-[#2D333E] text-xs text-[#A6B2C0] space-y-1">
                            <span className="font-semibold text-[#F4F6F8]">Planner Optimization Mechanism:</span>
                            <p className="text-[#7E8C9E]">
                              PostgreSQL cost-based optimizer converts the sequential relation scan into a targeted
                              B-Tree Index Scan, replacing full disk block traversals with logarithmic index lookups.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#121316] border border-[#2D333E] text-xs text-[#A6B2C0]">
                          The query already runs at optimal execution ({result.predicted_ms} ms). No DDL updates required.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FEATURE ATTRIBUTIONS */}
              {activeTab === "features" && (
                <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-6 shadow-lg space-y-6">
                  {!currentUser ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#1E2228] border border-[#CCFF00]/40 flex items-center justify-center text-[#CCFF00] mx-auto shadow-md">
                        <Lock className="h-6 w-6 text-[#CCFF00]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[#F4F6F8]">
                          Login Required for Feature Attributions
                        </h3>
                        <p className="text-xs text-[#7E8C9E] max-w-md mx-auto">
                          SHAP-like attribution scores and query execution bottleneck breakdowns are locked. Sign in to view.
                        </p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="px-5 py-2 rounded-xl bg-[#CCFF00] text-[#121316] font-bold text-xs"
                        >
                          Sign In with MongoDB
                        </button>
                        <button
                          onClick={handleDemoQuickLogin}
                          className="px-4 py-2 rounded-xl bg-[#242931] text-[#F4F6F8] border border-[#39414E] text-xs font-semibold"
                        >
                          1-Click Demo Login
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                          Gradient-Boosted Feature Attributions
                        </h3>
                        <p className="text-xs text-[#7E8C9E] mt-0.5">
                          Relative importance weights assigned to this query plan by the tree model.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {result.top_features.map((feat, idx) => {
                          const maxScore = Math.max(...result.top_features.map((f) => f.impact_score), 1.0);
                          const percent = Math.min(Math.round((feat.impact_score / maxScore) * 100), 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-[#F4F6F8]">{feat.label}</span>
                                <span className="font-mono text-[#7E8C9E]">
                                  val: {feat.value} · impact: <span className="text-[#CCFF00]">+{feat.impact_score}</span>
                                </span>
                              </div>
                              <div className="h-2 w-full bg-[#121316] rounded-full overflow-hidden border border-[#2D333E]">
                                <div
                                  className="h-full bg-[#CCFF00] rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottlenecks */}
                      {result.bottlenecks && result.bottlenecks.length > 0 && (
                        <div className="border-t border-[#2D333E] pt-5 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                            Identified Execution Bottlenecks
                          </h4>
                          <div className="space-y-2">
                            {result.bottlenecks.map((b, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between p-3.5 rounded-xl bg-[#121316] border border-[#2D333E] text-xs"
                              >
                                <div className="flex items-start space-x-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-0.5 ${
                                      b.severity === "CRITICAL"
                                        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                        : "bg-[#242931] text-[#F4F6F8] border border-[#39414E]"
                                    }`}
                                  >
                                    {b.node_type}
                                  </span>
                                  <span className="text-[#A6B2C0]">{b.description}</span>
                                </div>
                                {b.impact_ms > 0 && (
                                  <span className="font-mono text-[#7E8C9E] shrink-0 ml-4">{b.impact_ms} ms</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: EXECUTION PLAN TREE */}
              {activeTab === "plan" && (
                <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-6 shadow-lg space-y-4">
                  {!currentUser ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#1E2228] border border-[#CCFF00]/40 flex items-center justify-center text-[#CCFF00] mx-auto shadow-md">
                        <Lock className="h-6 w-6 text-[#CCFF00]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-[#F4F6F8]">
                          Login Required for Full Execution Plan Tree
                        </h3>
                        <p className="text-xs text-[#7E8C9E] max-w-md mx-auto">
                          Hierarchical node structure, operator cost buffers, and plan tree details require authentication.
                        </p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="px-5 py-2 rounded-xl bg-[#CCFF00] text-[#121316] font-bold text-xs"
                        >
                          Sign In with MongoDB
                        </button>
                        <button
                          onClick={handleDemoQuickLogin}
                          className="px-4 py-2 rounded-xl bg-[#242931] text-[#F4F6F8] border border-[#39414E] text-xs font-semibold"
                        >
                          1-Click Demo Login
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                            PostgreSQL Plan Tree JSON
                          </h3>
                          <p className="text-xs text-[#7E8C9E] mt-0.5">
                            Hierarchical node structure parsed by recursive DFS engine.
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(JSON.stringify(result.plan, null, 2))}
                          className="px-3 py-1.5 rounded-lg bg-[#242931] hover:bg-[#2D333E] text-[#F4F6F8] border border-[#39414E] flex items-center space-x-1.5 text-xs font-semibold"
                        >
                          <Copy className="h-3.5 w-3.5 text-[#A6B2C0]" />
                          <span>Copy Plan JSON</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-[#121316] border border-[#2D333E] overflow-x-auto text-xs font-mono text-[#F4F6F8] max-h-96">
                        {JSON.stringify(result.plan, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: MODEL BENCHMARK */}
              {activeTab === "models" && (
                <div className="bg-[#181B1F] border border-[#2D333E] rounded-2xl p-6 shadow-lg space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F6F8]">
                      Trained Model Benchmark Evaluation
                    </h3>
                    <p className="text-xs text-[#7E8C9E] mt-0.5">
                      Evaluated on 1,500+ query plans across 22 quantitative execution features.
                    </p>
                  </div>

                  {modelMetrics ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#141619] text-[#7E8C9E] uppercase font-mono text-[11px] border-b border-[#2D333E]">
                          <tr>
                            <th className="p-3">Architecture</th>
                            <th className="p-3">RMSE (ms)</th>
                            <th className="p-3">MAE (ms)</th>
                            <th className="p-3">R² Score / Acc</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2D333E]">
                          {Object.entries(modelMetrics).map(([name, m]: [string, any]) => (
                            <tr key={name} className="hover:bg-[#1E2228]/50">
                              <td className="p-3 font-semibold text-[#F4F6F8]">{name}</td>
                              <td className="p-3 font-mono text-[#A6B2C0]">{m.rmse ?? "—"}</td>
                              <td className="p-3 font-mono text-[#A6B2C0]">{m.mae ?? "—"}</td>
                              <td className="p-3 font-mono text-[#CCFF00] font-bold">
                                {m.r2 ?? m.accuracy ?? "—"}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-[#242931] text-[#A6B2C0] border border-[#39414E] text-[10px] font-bold">
                                  Pre-Trained
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-[#7E8C9E]">Loading model metrics...</div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Auth Modal (Bento Dialog with Deep Graphite, Soft Cloud White, Lime Yellow Accent) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#181B1F] border border-[#39414E] rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1 text-[#7E8C9E] hover:text-[#F4F6F8] rounded-lg hover:bg-[#242931]"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-[#242931] border border-[#39414E] flex items-center justify-center text-[#F4F6F8]">
                <ShieldCheck className="h-4.5 w-4.5 text-[#F4F6F8]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#F4F6F8]">MongoDB Authentication</h3>
                <p className="text-[11px] text-[#7E8C9E]">Hashed with bcrypt in query_advisor_db</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-[#121316] p-1 border border-[#2D333E]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  authMode === "login"
                    ? "bg-[#242931] text-[#F4F6F8] shadow-sm"
                    : "text-[#7E8C9E] hover:text-[#F4F6F8]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  authMode === "register"
                    ? "bg-[#242931] text-[#F4F6F8] shadow-sm"
                    : "text-[#7E8C9E] hover:text-[#F4F6F8]"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F4F6F8] block">Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. manoj or pes_demo"
                  className="w-full bg-[#121316] border border-[#2D333E] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#F4F6F8] focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#F4F6F8] block">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full bg-[#121316] border border-[#2D333E] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#F4F6F8] focus:outline-none focus:border-[#CCFF00]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-[#CCFF00] hover:bg-[#DCFF3B] text-[#121316] font-bold text-xs transition disabled:opacity-50 tracking-tight"
              >
                {authLoading
                  ? "Verifying with MongoDB..."
                  : authMode === "login"
                  ? "Sign In to Unlock All Features"
                  : "Create Account in MongoDB"}
              </button>
            </form>

            {/* 1-Click Demo Login */}
            <div className="pt-2 border-t border-[#2D333E] text-center">
              <button
                type="button"
                onClick={handleDemoQuickLogin}
                className="text-xs text-[#A6B2C0] hover:text-[#F4F6F8] flex items-center justify-center space-x-1.5 mx-auto font-medium transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#CCFF00]" />
                <span>One-Click Class Demo Login (pes_demo)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
