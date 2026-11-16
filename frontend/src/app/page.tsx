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
    <div className="min-h-screen bg-[#170515] text-[#DDE3E8] pb-24 selection:bg-[#EAA000] selection:text-[#170515]">
      {/* Top Navigation / Header */}
      <header className="border-b border-[#4D1546] bg-[#22081F]/90 backdrop-blur sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#3A0F34] to-[#EAA000] p-0.5 shadow-lg shadow-[#3A0F34]/50">
              <div className="h-full w-full bg-[#22081F] rounded-[10px] flex items-center justify-center">
                <Database className="h-5 w-5 text-[#EAA000]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg text-[#DDE3E8] tracking-tight">
                  Query Performance Advisor
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EAA000]/15 text-[#EAA000] border border-[#EAA000]/30 font-mono font-semibold">
                  ML + MongoDB
                </span>
              </div>
              <p className="text-[11px] text-[#A0B0BE]">
                PES University · AM125 (K R Manoj) & AM127 (K Ravish Rao)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* MongoDB User Profile / Sign in CTA */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-[#2B0B27] border border-[#4D1546] rounded-xl px-3 py-1.5 text-xs shadow-inner">
                <div className="h-6 w-6 rounded-lg bg-[#EAA000]/20 border border-[#EAA000]/40 flex items-center justify-center text-[#EAA000]">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-[#DDE3E8]">{currentUser.username}</span>
                  <span className="text-[10px] text-[#EAA000] block font-mono">MongoDB Active</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="ml-2 p-1 text-[#A0B0BE] hover:text-[#EAA000] transition"
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
                className="flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] hover:from-[#FFB526] hover:to-[#EAA000] text-[#170515] font-bold shadow-md shadow-[#EAA000]/20 transition"
              >
                <KeyRound className="h-3.5 w-3.5 text-[#170515]" />
                <span>Sign In / Register</span>
              </button>
            )}

            <div className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-[#3A0F34]/80 border border-[#631C5B] text-[#DDE3E8]">
              <Activity className="h-3.5 w-3.5 text-[#EAA000] animate-pulse" />
              <span>XGBoost (R²: 0.97)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Sample Workloads Carousel / Pills */}
        <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-[#EAA000]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#DDE3E8]">
                Quick Benchmark Workloads (TPC-H & E-Commerce)
              </span>
            </div>
            <span className="text-xs text-[#A0B0BE]">Click any preset to test instantly</span>
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
                      ? "bg-[#3A0F34] border-[#EAA000] text-[#DDE3E8] shadow-lg shadow-[#EAA000]/15 ring-1 ring-[#EAA000]"
                      : "bg-[#280A24]/70 border-[#4D1546] text-[#A0B0BE] hover:border-[#631C5B] hover:text-[#DDE3E8] hover:bg-[#2F0C2A]"
                  }`}
                >
                  <div className="font-semibold line-clamp-1 mb-1">{s.title.split("—")[0]}</div>
                  <div className="flex items-center justify-between text-[11px] mt-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                        isSlow
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[#A0B0BE] opacity-70" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Query Input Section */}
        <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code2 className="h-5 w-5 text-[#EAA000]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#DDE3E8]">
                SQL Query & Target Execution Plan
              </h2>
            </div>
            <button
              onClick={() => setShowConnStr(!showConnStr)}
              className="text-xs text-[#EAA000] hover:underline flex items-center space-x-1"
            >
              <span>{showConnStr ? "Hide Connection String" : "Connect Live PostgreSQL DB (Optional)"}</span>
              {showConnStr ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {showConnStr && (
            <div className="p-3 rounded-xl bg-[#2B0B27] border border-[#4D1546] text-xs space-y-2">
              <label className="text-[#DDE3E8] block font-medium">PostgreSQL Connection URI:</label>
              <input
                type="text"
                placeholder="postgresql://user:password@localhost:5432/tpch"
                value={connStr}
                onChange={(e) => setConnStr(e.target.value)}
                className="w-full bg-[#170515] border border-[#631C5B] rounded-lg px-3 py-2 text-[#DDE3E8] font-mono focus:outline-none focus:border-[#EAA000]"
              />
              <p className="text-[11px] text-[#A0B0BE]">
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
              className="w-full bg-[#170515] border border-[#4D1546] rounded-xl p-4 text-xs sm:text-sm font-mono text-[#DDE3E8] focus:outline-none focus:border-[#EAA000] focus:ring-1 focus:ring-[#EAA000] transition"
            />
          </div>

          {/* Optional Raw EXPLAIN JSON Accordion */}
          <div>
            <button
              onClick={() => setShowRawPlan(!showRawPlan)}
              className="text-xs text-[#A0B0BE] hover:text-[#DDE3E8] flex items-center space-x-1"
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
                  className="w-full bg-[#170515] border border-[#4D1546] rounded-xl p-3 text-xs font-mono text-[#DDE3E8] focus:outline-none focus:border-[#EAA000]"
                />
              </div>
            )}
          </div>

          {/* Submit Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#A0B0BE]">
              {!currentUser
                ? "⚡ Guest Mode: Analyzes query latency & fast/slow verdict. Sign in with MongoDB to view full index DDL, query fixes & plan trees."
                : "✓ Authenticated with MongoDB: Full access to CREATE INDEX DDL, query rewrites & execution plan trees."}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !sql.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] hover:from-[#FFB526] hover:to-[#EAA000] text-[#170515] font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#EAA000]/20 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#170515]" />
                  <span>Analyzing Plan...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-[#170515]" />
                  <span>Analyze Query & Get Advice</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* KPI Cards Row (Always visible to all users) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Latency */}
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-[#A0B0BE] mb-2">
                  <span>Predicted Latency</span>
                  <Clock className="h-4 w-4 text-[#EAA000]" />
                </div>
                <div className="text-2xl font-bold text-[#DDE3E8] font-mono">{result.predicted_ms} ms</div>
                <div className="text-xs text-[#A0B0BE] mt-1">
                  Budget: <span className="font-mono text-[#DDE3E8]">{result.slow_threshold_ms} ms</span>
                </div>
              </div>

              {/* Card 2: Performance Verdict */}
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-[#A0B0BE] mb-2">
                  <span>Performance Classification</span>
                  {result.is_slow ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      result.is_slow
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {result.is_slow ? "🔴 SLOW QUERY" : "🟢 FAST / OPTIMAL"}
                  </span>
                </div>
                <div className="text-xs text-[#A0B0BE] mt-2 line-clamp-1">
                  {result.is_slow ? "Exceeds latency SLA budget" : "Within target SLAs"}
                </div>
              </div>

              {/* Card 3: Projected Speedup */}
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-[#A0B0BE] mb-2">
                  <span>Projected Speedup</span>
                  <Zap className="h-4 w-4 text-[#EAA000]" />
                </div>
                <div className="text-2xl font-bold text-[#EAA000] font-mono">
                  {result.speedup_ratio > 1 ? `${result.speedup_ratio}x` : "1.0x (Optimal)"}
                </div>
                <div className="text-xs text-[#A0B0BE] mt-1">Post-optimization projection</div>
              </div>

              {/* Card 4: Estimated Execution Post-Fix */}
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-xs text-[#A0B0BE] mb-2">
                  <span>Optimized Target Latency</span>
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {result.estimated_improved_ms} ms
                </div>
                <div className="text-xs text-[#A0B0BE] mt-1">
                  Estimated post-index execution
                </div>
              </div>
            </div>

            {/* Executive Summary Card (Visible to all) */}
            <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-5 shadow-lg flex items-start space-x-4">
              <div className="p-2.5 rounded-xl bg-[#3A0F34] border border-[#631C5B] text-[#EAA000] mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#DDE3E8] mb-1">Executive Advisor Summary</h3>
                <p className="text-xs sm:text-sm text-[#A0B0BE] leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Detailed Tabs Header */}
            <div className="flex flex-wrap gap-2 border-b border-[#4D1546] pb-1">
              <button
                onClick={() => setActiveTab("advice")}
                className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "advice"
                    ? "border-[#EAA000] text-[#EAA000]"
                    : "border-transparent text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>
                  Recommendations ({result.recommendations.length})
                </span>
                {!currentUser && result.recommendations.length > 0 && (
                  <Lock className="h-3 w-3 text-[#EAA000] ml-1" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("improved")}
                className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "improved"
                    ? "border-[#EAA000] text-[#EAA000]"
                    : "border-transparent text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                <FileCode2 className="h-4 w-4" />
                <span>Improved Query DDL</span>
                {!currentUser && <Lock className="h-3 w-3 text-[#EAA000] ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("features")}
                className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "features"
                    ? "border-[#EAA000] text-[#EAA000]"
                    : "border-transparent text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Feature Importance / Bottlenecks</span>
                {!currentUser && <Lock className="h-3 w-3 text-[#EAA000] ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("plan")}
                className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "plan"
                    ? "border-[#EAA000] text-[#EAA000]"
                    : "border-transparent text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Execution Plan Tree</span>
                {!currentUser && <Lock className="h-3 w-3 text-[#EAA000] ml-1" />}
              </button>

              <button
                onClick={() => setActiveTab("models")}
                className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
                  activeTab === "models"
                    ? "border-[#EAA000] text-[#EAA000]"
                    : "border-transparent text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                <Cpu className="h-4 w-4" />
                <span>Model Benchmark & R²</span>
              </button>
            </div>

            {/* TAB 1: RECOMMENDATIONS */}
            {activeTab === "advice" && (
              <div className="space-y-4">
                {result.recommendations.length === 0 ? (
                  /* Optimal Query State (Always clean and visible) */
                  <div className="p-8 rounded-2xl bg-[#22081F] border border-[#4D1546] text-center space-y-2 shadow-lg">
                    <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
                    <p className="font-bold text-base text-[#DDE3E8]">No Missing Indexes Detected</p>
                    <p className="text-xs text-[#A0B0BE] max-w-md mx-auto">
                      This query already runs with optimal access paths (B-Tree index scans or primary key lookups).
                      Zero sequential scan bottlenecks were detected.
                    </p>
                  </div>
                ) : !currentUser ? (
                  /* Gated Lock State for Unauthenticated User (FULL HEIGHT, UNCLIPPED, WITH GLOWING BUTTONS) */
                  <div className="rounded-2xl border-2 border-[#EAA000]/40 bg-[#22081F] p-8 sm:p-10 shadow-2xl text-center space-y-5">
                    <div className="h-14 w-14 rounded-2xl bg-[#3A0F34] border border-[#EAA000]/50 flex items-center justify-center text-[#EAA000] shadow-xl shadow-[#EAA000]/10 mx-auto">
                      <Lock className="h-7 w-7 text-[#EAA000]" />
                    </div>

                    <div className="max-w-lg mx-auto space-y-2">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#EAA000]/15 text-[#EAA000] text-xs font-mono font-bold border border-[#EAA000]/30">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{result.recommendations.length} Index Recommendation(s) Available (~{result.speedup_ratio}x Speedup)</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#DDE3E8]">
                        Login Required to Unlock Index Recommendations & Improved Query
                      </h3>
                      <p className="text-xs sm:text-sm text-[#A0B0BE] leading-relaxed">
                        Basic query latency and performance verdicts are shown above. To unlock the exact{" "}
                        <span className="text-[#EAA000] font-mono font-semibold">CREATE INDEX</span> DDL statements,
                        predicate column fixes, and full plan trees, please sign in using your MongoDB account.
                      </p>
                    </div>

                    {/* Prominent, Unclipped Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                      <button
                        onClick={() => {
                          setAuthMode("login");
                          setShowAuthModal(true);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] hover:from-[#FFB526] hover:to-[#EAA000] text-[#170515] font-bold text-xs shadow-lg shadow-[#EAA000]/25 transition flex items-center justify-center space-x-2"
                      >
                        <KeyRound className="h-4 w-4 text-[#170515]" />
                        <span>Sign In with MongoDB</span>
                      </button>
                      <button
                        onClick={handleDemoQuickLogin}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#3A0F34] hover:bg-[#4D1546] text-[#DDE3E8] font-semibold text-xs border border-[#631C5B] transition flex items-center justify-center space-x-2 shadow-md"
                      >
                        <Sparkles className="h-4 w-4 text-[#EAA000]" />
                        <span>One-Click Class Demo Login (pes_demo)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Full Unlocked View for Logged-In User */
                  <>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unlocked with MongoDB Auth · Full DDL and Speedup Advice Active</span>
                      </div>
                    </div>

                    {result.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-[#22081F] border border-[#4D1546] shadow-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                rec.priority === "CRITICAL"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                  : "bg-[#EAA000]/20 text-[#EAA000] border border-[#EAA000]/40"
                              }`}
                            >
                              {rec.priority}
                            </span>
                            <span className="text-xs font-semibold text-[#DDE3E8]">
                              Action: {rec.action_type} on {rec.target_table}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-emerald-400 font-bold">
                            ~{rec.estimated_speedup}x speedup
                          </div>
                        </div>

                        {/* SQL Code Box with Copy */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#170515] border border-[#4D1546] font-mono text-xs sm:text-sm text-[#EAA000]">
                          <code className="overflow-x-auto pr-4">{rec.sql}</code>
                          <button
                            onClick={() => handleCopy(rec.sql)}
                            className="px-3 py-1.5 rounded-lg bg-[#3A0F34] hover:bg-[#4D1546] text-[#DDE3E8] border border-[#631C5B] flex items-center space-x-1.5 transition text-xs shrink-0 font-medium"
                          >
                            {copiedSql === rec.sql ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-[#EAA000]" />
                                <span>Copy SQL</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-[#A0B0BE] leading-relaxed">{rec.reason}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* TAB 2: IMPROVED QUERY PREVIEW */}
            {activeTab === "improved" && (
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-6 shadow-lg space-y-4">
                {!currentUser ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#3A0F34] border border-[#EAA000]/40 flex items-center justify-center text-[#EAA000] mx-auto shadow-lg">
                      <Lock className="h-6 w-6 text-[#EAA000]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#DDE3E8]">
                        Login Required to View Improved Query DDL & Execution Plan
                      </h3>
                      <p className="text-xs text-[#A0B0BE] max-w-md mx-auto">
                        Sign in to view the optimized query rewritten with index usage and expected speedup.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] text-[#170515] font-bold text-xs shadow-md"
                      >
                        Sign In with MongoDB
                      </button>
                      <button
                        onClick={handleDemoQuickLogin}
                        className="px-4 py-2 rounded-xl bg-[#3A0F34] text-[#DDE3E8] border border-[#631C5B] text-xs font-semibold"
                      >
                        1-Click Demo Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#DDE3E8]">Improved Query & Optimization Plan</h3>
                        <p className="text-xs text-[#A0B0BE]">
                          Execute this index DDL in PostgreSQL to achieve the projected ~{result.speedup_ratio}x speedup.
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                        Target Latency: {result.estimated_improved_ms} ms
                      </span>
                    </div>

                    {result.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-[#170515] border border-[#4D1546] font-mono text-xs sm:text-sm text-[#DDE3E8] space-y-2">
                          <div className="text-[#A0B0BE] text-xs">-- 1. Apply Recommended Index Fixes:</div>
                          {result.recommendations.map((r, i) => (
                            <div key={i} className="text-[#EAA000]">
                              {r.sql}
                            </div>
                          ))}
                          <div className="text-[#A0B0BE] text-xs pt-2">-- 2. Original Query (Now accelerated via Index Scan):</div>
                          <div className="text-[#DDE3E8] whitespace-pre-wrap">{result.sql}</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#2B0B27] border border-[#4D1546] text-xs text-[#A0B0BE] space-y-1">
                          <span className="font-semibold text-[#EAA000]">Optimization Mechanism:</span>
                          <p>
                            PostgreSQL&apos;s cost-based planner will replace the expensive Sequential Scan with a
                            B-Tree Index Scan or Bitmap Heap Scan, reducing page reads from thousands of blocks to
                            targeted logarithmic index lookups.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#170515] border border-[#4D1546] text-xs text-[#A0B0BE]">
                        The query already runs at optimal latency ({result.predicted_ms} ms). No schema changes required.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FEATURE IMPORTANCE / BOTTLENECK EXPLANATION */}
            {activeTab === "features" && (
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-6 shadow-lg space-y-6">
                {!currentUser ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#3A0F34] border border-[#EAA000]/40 flex items-center justify-center text-[#EAA000] mx-auto shadow-lg">
                      <Lock className="h-6 w-6 text-[#EAA000]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#DDE3E8]">Login Required for Feature Attributions</h3>
                      <p className="text-xs text-[#A0B0BE] max-w-md mx-auto">
                        SHAP-like attribution scores and query execution bottleneck breakdowns are locked. Sign in to view.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] text-[#170515] font-bold text-xs shadow-md"
                      >
                        Sign In with MongoDB
                      </button>
                      <button
                        onClick={handleDemoQuickLogin}
                        className="px-4 py-2 rounded-xl bg-[#3A0F34] text-[#DDE3E8] border border-[#631C5B] text-xs font-semibold"
                      >
                        1-Click Demo Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-bold text-[#DDE3E8]">Local Feature Attributions</h3>
                      <p className="text-xs text-[#A0B0BE] mt-0.5">
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
                              <span className="font-semibold text-[#DDE3E8]">{feat.label}</span>
                              <span className="font-mono text-[#A0B0BE]">
                                val: {feat.value} · impact: <span className="text-[#EAA000]">+{feat.impact_score}</span>
                              </span>
                            </div>
                            <div className="h-2 w-full bg-[#170515] rounded-full overflow-hidden border border-[#4D1546]">
                              <div
                                className="h-full bg-gradient-to-r from-[#3A0F34] to-[#EAA000] rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottlenecks list */}
                    {result.bottlenecks && result.bottlenecks.length > 0 && (
                      <div className="border-t border-[#4D1546] pt-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#DDE3E8]">
                          Identified Query Execution Bottlenecks
                        </h4>
                        <div className="space-y-2">
                          {result.bottlenecks.map((b, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between p-3.5 rounded-xl bg-[#170515] border border-[#4D1546] text-xs"
                            >
                              <div className="flex items-start space-x-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-0.5 ${
                                    b.severity === "CRITICAL"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                      : "bg-[#EAA000]/20 text-[#EAA000] border border-[#EAA000]/40"
                                  }`}
                                >
                                  {b.node_type}
                                </span>
                                <span className="text-[#DDE3E8]">{b.description}</span>
                              </div>
                              {b.impact_ms > 0 && (
                                <span className="font-mono text-[#A0B0BE] shrink-0 ml-4">{b.impact_ms} ms</span>
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
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-6 shadow-lg space-y-4">
                {!currentUser ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#3A0F34] border border-[#EAA000]/40 flex items-center justify-center text-[#EAA000] mx-auto shadow-lg">
                      <Lock className="h-6 w-6 text-[#EAA000]" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#DDE3E8]">Login Required for Full PostgreSQL Plan Tree</h3>
                      <p className="text-xs text-[#A0B0BE] max-w-md mx-auto">
                        Raw JSON execution plans, buffer cache block reads, and operator trees require authentication.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] text-[#170515] font-bold text-xs shadow-md"
                      >
                        Sign In with MongoDB
                      </button>
                      <button
                        onClick={handleDemoQuickLogin}
                        className="px-4 py-2 rounded-xl bg-[#3A0F34] text-[#DDE3E8] border border-[#631C5B] text-xs font-semibold"
                      >
                        1-Click Demo Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#DDE3E8]">PostgreSQL EXPLAIN Plan Tree</h3>
                        <p className="text-xs text-[#A0B0BE] mt-0.5">
                          Hierarchical node structure returned by database optimizer.
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(JSON.stringify(result.plan, null, 2))}
                        className="px-3 py-1.5 rounded-lg bg-[#3A0F34] hover:bg-[#4D1546] text-[#DDE3E8] border border-[#631C5B] flex items-center space-x-1.5 text-xs font-semibold"
                      >
                        <Copy className="h-3.5 w-3.5 text-[#EAA000]" />
                        <span>Copy JSON</span>
                      </button>
                    </div>

                    <pre className="p-4 rounded-xl bg-[#170515] border border-[#4D1546] overflow-x-auto text-xs font-mono text-[#DDE3E8] max-h-96">
                      {JSON.stringify(result.plan, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* TAB 5: MODEL COMPARISON */}
            {activeTab === "models" && (
              <div className="bg-[#22081F] border border-[#4D1546] rounded-2xl p-6 shadow-lg space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#DDE3E8]">Model Benchmark & Evaluation Metrics</h3>
                  <p className="text-xs text-[#A0B0BE] mt-0.5">
                    Trained across 1,500+ plans with RTX 2050 / Ampere-compatible pipeline.
                  </p>
                </div>

                {modelMetrics ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#3A0F34] text-[#DDE3E8] uppercase font-mono">
                        <tr>
                          <th className="p-3 rounded-l-lg">Model Architecture</th>
                          <th className="p-3">RMSE (ms)</th>
                          <th className="p-3">MAE (ms)</th>
                          <th className="p-3">R² Score / Acc</th>
                          <th className="p-3 rounded-r-lg">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#4D1546]">
                        {Object.entries(modelMetrics).map(([name, m]: [string, any]) => (
                          <tr key={name} className="hover:bg-[#2B0B27]">
                            <td className="p-3 font-semibold text-[#DDE3E8]">{name}</td>
                            <td className="p-3 font-mono text-[#A0B0BE]">{m.rmse ?? "—"}</td>
                            <td className="p-3 font-mono text-[#A0B0BE]">{m.mae ?? "—"}</td>
                            <td className="p-3 font-mono text-[#EAA000] font-bold">{m.r2 ?? m.accuracy ?? "—"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[#EAA000]/15 text-[#EAA000] border border-[#EAA000]/30 font-mono text-[11px] font-bold">
                                Pre-Trained
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-[#A0B0BE]">Loading model benchmarks...</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Auth Modal (Login / Register using MongoDB) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#22081F] border-2 border-[#EAA000]/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1 text-[#A0B0BE] hover:text-[#DDE3E8] rounded-lg hover:bg-[#3A0F34]"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-[#3A0F34] border border-[#EAA000]/40 flex items-center justify-center text-[#EAA000]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#DDE3E8]">MongoDB User Authentication</h3>
                <p className="text-xs text-[#A0B0BE]">Credentials hashed with bcrypt in MongoDB</p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-[#170515] p-1 border border-[#4D1546]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  authMode === "login"
                    ? "bg-[#EAA000] text-[#170515] shadow-md"
                    : "text-[#A0B0BE] hover:text-[#DDE3E8]"
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
                    ? "bg-[#EAA000] text-[#170515] shadow-md"
                    : "text-[#A0B0BE] hover:text-[#DDE3E8]"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#DDE3E8] block">Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. manoj or pes_demo"
                  className="w-full bg-[#170515] border border-[#631C5B] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#DDE3E8] focus:outline-none focus:border-[#EAA000]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#DDE3E8] block">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full bg-[#170515] border border-[#631C5B] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#DDE3E8] focus:outline-none focus:border-[#EAA000]"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#EAA000] to-[#FFB526] hover:from-[#FFB526] hover:to-[#EAA000] text-[#170515] font-bold text-xs shadow-lg shadow-[#EAA000]/25 transition disabled:opacity-50"
              >
                {authLoading
                  ? "Verifying with MongoDB..."
                  : authMode === "login"
                  ? "Sign In to Unlock Features"
                  : "Create Account in MongoDB"}
              </button>
            </form>

            {/* Quick Demo Login Option */}
            <div className="pt-2 border-t border-[#4D1546] text-center">
              <button
                type="button"
                onClick={handleDemoQuickLogin}
                className="text-xs text-[#EAA000] hover:underline flex items-center justify-center space-x-1.5 mx-auto font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#EAA000]" />
                <span>One-Click Class Demo Login (pes_demo)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
