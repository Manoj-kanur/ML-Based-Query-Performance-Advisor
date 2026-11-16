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
  const [activeTab, setActiveTab] = useState<"advice" | "features" | "plan" | "models">("advice");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<Record<string, any> | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Check saved login session on mount
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
          alert("Invalid JSON format in raw plan textarea.");
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
      // Attempt login with demo account
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
        // If not registered yet, register demo account
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
      // Fallback local session
      const user = { username: "pes_demo" };
      setCurrentUser(user);
      localStorage.setItem("advisor_user", JSON.stringify(user));
      setShowAuthModal(false);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-20">
      {/* Top Navigation / Header */}
      <header className="border-b border-slate-800 bg-[#0c1324]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-white tracking-tight">Query Performance Advisor</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  PostgreSQL · ML
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PES University · AM125 (K R Manoj) & AM127 (K Ravish Rao)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* User Profile / Login status */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-[#121c38] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-slate-200">{currentUser.username}</span>
                  <span className="text-[10px] text-emerald-400 block font-mono">MongoDB Authenticated</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="ml-2 p-1 text-slate-400 hover:text-rose-400 transition"
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
                className="flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-500/20 transition"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}

            <div className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>XGBoost Active (R²: 0.97)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Sample Workloads Carousel / Pills */}
        <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Quick Benchmark Workloads (TPC-H & E-Commerce)
              </span>
            </div>
            <span className="text-xs text-slate-400">Click any preset to test instantly</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {samples.map((s) => {
              const isSelected = selectedSampleId === s.id;
              const isSlow = s.difficulty.includes("Slow");
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSample(s)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
                      : "bg-[#131d36]/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-[#15203b]"
                  }`}
                >
                  <div className="font-medium line-clamp-1 mb-1">{s.title.split("—")[0]}</div>
                  <div className="flex items-center justify-between text-[11px] mt-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        isSlow ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400 opacity-60" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Query Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="h-5 w-5 text-blue-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  SQL Query & Execution Plan Target
                </h2>
              </div>
              <button
                onClick={() => setShowConnStr(!showConnStr)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <span>{showConnStr ? "Hide Connection String" : "Connect Live PostgreSQL DB (Optional)"}</span>
                {showConnStr ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showConnStr && (
              <div className="p-3 rounded-xl bg-[#131d36] border border-slate-800 text-xs space-y-2">
                <label className="text-slate-300 block font-medium">PostgreSQL Connection URI:</label>
                <input
                  type="text"
                  placeholder="postgresql://user:password@localhost:5432/tpch"
                  value={connStr}
                  onChange={(e) => setConnStr(e.target.value)}
                  className="w-full bg-[#0a0f1d] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  Leave empty to use built-in PostgreSQL cost and cardinality simulator.
                </p>
              </div>
            )}

            {/* SQL Textarea */}
            <div className="relative">
              <textarea
                rows={7}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="Enter SQL Query (e.g. SELECT * FROM orders WHERE status = 'PENDING')..."
                className="w-full bg-[#070c18] border border-slate-800 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Optional Raw EXPLAIN JSON Accordion */}
            <div>
              <button
                onClick={() => setShowRawPlan(!showRawPlan)}
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center space-x-1"
              >
                <span>{showRawPlan ? "Hide Raw EXPLAIN JSON" : "+ Paste Custom EXPLAIN (FORMAT JSON) Tree"}</span>
              </button>
              {showRawPlan && (
                <div className="mt-2">
                  <textarea
                    rows={4}
                    value={rawPlanInput}
                    onChange={(e) => setRawPlanInput(e.target.value)}
                    placeholder='Paste EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output (e.g. [{"Plan": {...}}] )'
                    className="w-full bg-[#070c18] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {!currentUser
                  ? "⚡ Guest Mode: Analyzes latency & verdict. Sign in with MongoDB to unlock detailed index advice & plan explanations."
                  : "✓ Authenticated with MongoDB: Full access to index DDL, plan trees, and feature attributions."}
              </span>
              <button
                onClick={handleAnalyze}
                disabled={loading || !sql.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center space-x-2 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Plan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Analyze Query & Get Advice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* KPI Cards Row (Always visible to all users) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Latency */}
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Predicted Latency</span>
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono">{result.predicted_ms} ms</div>
                <div className="text-xs text-slate-400 mt-1">
                  Budget: <span className="font-mono text-slate-300">{result.slow_threshold_ms} ms</span>
                </div>
              </div>

              {/* Card 2: Performance Verdict */}
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Performance Classification</span>
                  {result.is_slow ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      result.is_slow
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {result.is_slow ? "🔴 SLOW QUERY" : "🟢 FAST / OPTIMAL"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2 line-clamp-1">
                  {result.is_slow ? "Exceeds latency budget" : "Within target SLAs"}
                </div>
              </div>

              {/* Card 3: Projected Speedup */}
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Projected Speedup</span>
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {result.speedup_ratio > 1 ? `${result.speedup_ratio}x` : "1.0x (Optimal)"}
                </div>
                <div className="text-xs text-slate-400 mt-1">Post-optimization projection</div>
              </div>

              {/* Card 4: Estimated Execution Post-Fix */}
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Optimized Target Latency</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {result.estimated_improved_ms} ms
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Estimated post-index execution
                </div>
              </div>
            </div>

            {/* Executive Summary Card (Visible to all) */}
            <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex items-start space-x-4">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Executive Advisor Summary</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Detailed Tabs Header */}
            <div className="flex space-x-2 border-b border-slate-800">
              <button
                onClick={() => setActiveTab("advice")}
                className={`pb-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "advice"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Recommendations ({result.recommendations.length})</span>
                {!currentUser && <Lock className="h-3 w-3 text-amber-400 ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("features")}
                className={`pb-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "features"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Feature Importance / Bottlenecks</span>
                {!currentUser && <Lock className="h-3 w-3 text-amber-400 ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("plan")}
                className={`pb-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "plan"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Execution Plan Tree</span>
                {!currentUser && <Lock className="h-3 w-3 text-amber-400 ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("models")}
                className={`pb-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "models"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="h-4 w-4" />
                <span>Model Benchmark & R²</span>
              </button>
            </div>

            {/* TAB 1: RECOMMENDATIONS */}
            {activeTab === "advice" && (
              <div className="space-y-4 relative">
                {!currentUser ? (
                  /* Gated / Locked State for Unauthenticated User */
                  <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-[#0e162a] p-6 shadow-2xl">
                    {/* Blurred Background Teaser */}
                    <div className="filter blur-sm pointer-events-none opacity-40 select-none space-y-4">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="h-4 bg-slate-700 rounded w-1/4 mb-2" />
                        <div className="h-10 bg-slate-800 rounded w-full mb-2 font-mono text-xs flex items-center px-3">
                          CREATE INDEX idx_orders_customer_id ON orders(customer_id, status);
                        </div>
                        <div className="h-3 bg-slate-700 rounded w-3/4" />
                      </div>
                    </div>

                    {/* Lock Overlay Banner */}
                    <div className="absolute inset-0 bg-[#080d19]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                        <Lock className="h-6 w-6" />
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h3 className="text-base font-bold text-white">
                          Login Required to Unlock Index Recommendations & Improved Query
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Basic query latency and performance verdict are shown above. To view exact{" "}
                          <span className="text-amber-400 font-mono">CREATE INDEX</span> DDL statements,
                          predicate column fixes, and speedup multipliers, sign in using your MongoDB account.
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 pt-2">
                        <button
                          onClick={() => {
                            setAuthMode("login");
                            setShowAuthModal(true);
                          }}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition flex items-center space-x-1.5"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Sign In to Unlock</span>
                        </button>
                        <button
                          onClick={handleDemoQuickLogin}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition flex items-center space-x-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          <span>1-Click Demo Login</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Full Unlocked View for Logged-In User */
                  <>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2 text-xs text-emerald-400">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unlocked with MongoDB Auth · Full DDL and Speedup Advice</span>
                      </div>
                    </div>

                    {result.recommendations.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#0e162a] border border-slate-800 text-center text-slate-400">
                        <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                        <p className="font-medium text-slate-200">No Missing Indexes Detected</p>
                        <p className="text-xs mt-1">This query already runs with optimal access paths.</p>
                      </div>
                    ) : (
                      result.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-[#0e162a] border border-slate-800/80 shadow-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  rec.priority === "CRITICAL"
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                Action: {rec.action_type} on {rec.target_table}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-emerald-400 font-semibold">
                              ~{rec.estimated_speedup}x speedup
                            </div>
                          </div>

                          {/* SQL Code Box with Copy */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-[#080d1a] border border-slate-800 font-mono text-xs sm:text-sm text-blue-300">
                            <code className="overflow-x-auto pr-4">{rec.sql}</code>
                            <button
                              onClick={() => handleCopy(rec.sql)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 transition text-xs shrink-0"
                            >
                              {copiedSql === rec.sql ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">{rec.reason}</p>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: FEATURE IMPORTANCE / BOTTLENECK EXPLANATION */}
            {activeTab === "features" && (
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-6 relative overflow-hidden">
                {!currentUser ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Login Required for Detailed Feature Attributions</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      SHAP-like attribution scores and query execution bottleneck breakdowns are locked. Sign in to view.
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                    >
                      Sign In with MongoDB
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Local Feature Attributions</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Impact weights assigned to this query plan by the gradient-boosted tree model.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {result.top_features.map((feat, idx) => {
                        const maxScore = Math.max(...result.top_features.map((f) => f.impact_score), 1.0);
                        const percent = Math.min(Math.round((feat.impact_score / maxScore) * 100), 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-slate-300">{feat.label}</span>
                              <span className="font-mono text-slate-400">
                                val: {feat.value} · impact: +{feat.impact_score}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottlenecks list */}
                    {result.bottlenecks && result.bottlenecks.length > 0 && (
                      <div className="border-t border-slate-800 pt-5 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Identified Query Execution Bottlenecks
                        </h4>
                        <div className="space-y-2">
                          {result.bottlenecks.map((b, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between p-3 rounded-xl bg-[#080d1a] border border-slate-800/70 text-xs"
                            >
                              <div className="flex items-start space-x-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-0.5 ${
                                    b.severity === "CRITICAL"
                                      ? "bg-rose-500/20 text-rose-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  }`}
                                >
                                  {b.node_type}
                                </span>
                                <span className="text-slate-300">{b.description}</span>
                              </div>
                              {b.impact_ms > 0 && (
                                <span className="font-mono text-slate-400 shrink-0 ml-4">{b.impact_ms} ms</span>
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

            {/* TAB 3: EXECUTION PLAN TREE */}
            {activeTab === "plan" && (
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4">
                {!currentUser ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Login Required for Full PostgreSQL Plan Tree</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Raw JSON plan trees and buffer metrics require authentication.
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                    >
                      Sign In to View Plan Tree
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">PostgreSQL EXPLAIN Plan Tree</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Hierarchical node structure returned by database optimizer.
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(JSON.stringify(result.plan, null, 2))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy JSON</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-[#070c18] border border-slate-800 overflow-x-auto text-xs font-mono text-slate-300 max-h-96">
                      {JSON.stringify(result.plan, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* TAB 4: MODEL COMPARISON */}
            {activeTab === "models" && (
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Model Benchmark & Evaluation Metrics</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Trained across 1,500+ plans with RTX 2050 / Ampere-compatible pipeline.
                  </p>
                </div>

                {modelMetrics ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#121b33] text-slate-300 uppercase font-mono">
                        <tr>
                          <th className="p-3 rounded-l-lg">Model Architecture</th>
                          <th className="p-3">RMSE (ms)</th>
                          <th className="p-3">MAE (ms)</th>
                          <th className="p-3">R² Score</th>
                          <th className="p-3 rounded-r-lg">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {Object.entries(modelMetrics).map(([name, m]: [string, any]) => (
                          <tr key={name} className="hover:bg-slate-800/30">
                            <td className="p-3 font-medium text-white">{name}</td>
                            <td className="p-3 font-mono text-slate-300">{m.rmse ?? "—"}</td>
                            <td className="p-3 font-mono text-slate-300">{m.mae ?? "—"}</td>
                            <td className="p-3 font-mono text-emerald-400 font-semibold">{m.r2 ?? m.accuracy ?? "—"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                Pre-Trained
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Loading model benchmarks...</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Auth Modal (Login / Register using MongoDB) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e162a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">MongoDB User Authentication</h3>
                <p className="text-xs text-slate-400">Credentials stored with bcrypt in MongoDB</p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-[#070c18] p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  authMode === "login" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
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
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  authMode === "register" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. manoj or pes_student"
                  className="w-full bg-[#070c18] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full bg-[#070c18] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
              >
                {authLoading
                  ? "Verifying with MongoDB..."
                  : authMode === "login"
                  ? "Sign In to Unlock Features"
                  : "Create Account in MongoDB"}
              </button>
            </form>

            {/* Quick Demo Login Option */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={handleDemoQuickLogin}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-1.5 mx-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>One-Click Class Demo Login (pes_demo)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
