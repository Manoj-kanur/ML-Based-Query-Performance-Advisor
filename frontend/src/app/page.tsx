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
  Table,
  ArrowRight,
  RefreshCw,
  Terminal,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp,
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

  // Load samples on mount
  useEffect(() => {
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
                  ML + Heuristics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PES University · DBMS Project · AM125 (K R Manoj) & AM127 (K Ravish Rao)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>XGBoost & LightGBM Active (R²: 0.97)</span>
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
                Analyzes plan tree structure, extracts 22 features, runs XGBoost model & recommendation rules
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
            {/* KPI Cards Row */}
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
                  Reduced by {Math.max(0, Math.round(result.predicted_ms - result.estimated_improved_ms))} ms
                </div>
              </div>
            </div>

            {/* Executive Summary Card */}
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

            {/* Tab 1: Recommendations */}
            {activeTab === "advice" && (
              <div className="space-y-4">
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

                {/* Bottlenecks list */}
                {result.bottlenecks && result.bottlenecks.length > 0 && (
                  <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
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
              </div>
            )}

            {/* Tab 2: Feature Importance */}
            {activeTab === "features" && (
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-6">
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
              </div>
            )}

            {/* Tab 3: Execution Plan Tree */}
            {activeTab === "plan" && (
              <div className="bg-[#0e162a] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4">
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
              </div>
            )}

            {/* Tab 4: Model Comparison */}
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
    </div>
  );
}

