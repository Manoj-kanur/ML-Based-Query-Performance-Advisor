"""
FastAPI Server for ML-Based Query Performance Advisor.

Exposes RESTful endpoints for:
- Query plan analysis and latency prediction
- AI/Rule-based missing index recommendations
- Bottleneck and cardinality misestimation detection
- Model performance metrics and feature importance
- Query run history persistence
"""

from __future__ import annotations
import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.advisor.db import fetch_recent_runs, init_db, log_analysis_run
from src.advisor.recommender import QueryRecommender
from src.collector.runner import collect_explain_analyze, simulate_explain_analyze
from src.features.plan_parser import extract_features, parse_explain_json
from src.models.trainer import load_active_model


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    load_active_model()
    yield

app = FastAPI(
    title="ML-Based Query Performance Advisor API",
    description="Machine Learning & Rule-Assisted Database Query Performance Tuning Advisor",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    sql: str = Field(..., description="SQL Query text to analyze")
    conn_str: Optional[str] = Field(None, description="Optional PostgreSQL connection string")
    plan_json: Optional[Any] = Field(None, description="Optional raw EXPLAIN JSON plan")
    slow_threshold_ms: float = Field(50.0, description="Latency threshold in ms to classify as slow")


class ParsePlanRequest(BaseModel):
    plan_json: Any = Field(..., description="Raw PostgreSQL EXPLAIN ANALYZE JSON")


# Curated sample benchmark queries for instant UI testing
CURATED_SAMPLES = [
    {
        "id": "tpch_q6",
        "title": "TPC-H Q6 — Unindexed Lineitem Scan (Critical Bottleneck)",
        "difficulty": "Slow (~145 ms)",
        "sql": """SELECT sum(l_extendedprice * l_discount) AS revenue
FROM lineitem
WHERE l_shipdate >= '1994-01-01'
  AND l_shipdate < '1995-01-01'
  AND l_discount BETWEEN 0.05 AND 0.07
  AND l_quantity < 24;""",
        "description": "Scans 6M lineitem rows discarding ~98.5% of rows due to lack of composite index on (l_shipdate, l_discount, l_quantity).",
    },
    {
        "id": "tpch_q3",
        "title": "TPC-H Q3 — 3-Table Shipping Priority Join",
        "difficulty": "Slow (~180 ms)",
        "sql": """SELECT l.l_orderkey, sum(l.l_extendedprice * (1 - l.l_discount)) AS revenue, o.o_orderdate, o.o_shippriority
FROM customer c
JOIN orders o ON c.c_custkey = o.o_custkey
JOIN lineitem l ON l.l_orderkey = o.o_orderkey
WHERE c.c_mktsegment = 'BUILDING'
  AND o.o_orderdate < '1995-03-15'
  AND l.l_shipdate > '1995-03-15'
GROUP BY l.l_orderkey, o.o_orderdate, o.o_shippriority
ORDER BY revenue DESC
LIMIT 10;""",
        "description": "Multi-table join bottlenecked by unindexed foreign key lookups and sorting.",
    },
    {
        "id": "ecom_orders",
        "title": "E-Commerce — Unindexed Orders Filter by Status & Date",
        "difficulty": "Slow (~120 ms)",
        "sql": """SELECT id, customer_id, total_amount, status, created_at
FROM orders
WHERE status = 'PENDING' AND created_at >= '2024-01-01'
ORDER BY created_at DESC;""",
        "description": "Common production query where an unindexed status column forces a full table scan.",
    },
    {
        "id": "pk_lookup",
        "title": "Customer Primary Key Lookup (Optimal)",
        "difficulty": "Fast (~0.4 ms)",
        "sql": """SELECT * FROM customer WHERE c_custkey = 42;""",
        "description": "Executes optimal B-Tree Index Scan on primary key in sub-millisecond time.",
    },
    {
        "id": "orders_idx_scan",
        "title": "Orders Indexed Range Scan",
        "difficulty": "Moderate (~15 ms)",
        "sql": """SELECT o_orderkey, o_custkey, o_orderdate, o_totalprice
FROM orders
WHERE o_orderdate BETWEEN '1995-01-01' AND '1995-01-31';""",
        "description": "Uses existing index or bitmap scan for moderate range selection.",
    },
]


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ML-Based Query Performance Advisor", "version": "1.0.0"}


@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "ML-Based Query Performance Advisor", "version": "1.0.0"}


@app.get("/api/workload/samples")
def get_sample_queries():
    """Returns benchmark query templates to quickly test in the advisor UI."""
    return {"samples": CURATED_SAMPLES}


@app.post("/api/parse-plan")
def parse_plan_endpoint(req: ParsePlanRequest):
    """Parses raw EXPLAIN JSON and extracts tabular ML features."""
    try:
        features = extract_features(req.plan_json)
        return {"features": features}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse plan JSON: {str(e)}")


@app.get("/api/models/comparison")
def get_model_comparison():
    """Returns evaluation metrics across trained models."""
    registry = load_active_model()
    return {"metrics": registry.metrics}


@app.get("/api/models/feature-importance")
def get_feature_importance():
    """Returns global feature importance ranked descending."""
    registry = load_active_model()
    if not registry.explainer:
        return {"importances": []}
    return {"importances": registry.explainer.get_global_importance()}


@app.get("/api/history")
def get_analysis_history(limit: int = 50):
    """Fetches persistent history of analyzed queries from SQLite."""
    try:
        runs = fetch_recent_runs(limit=limit)
        return {"history": runs}
    except Exception as e:
        return {"history": [], "error": str(e)}


@app.post("/api/analyze")
def analyze_query(req: AnalyzeRequest):
    """
    Core Advisor Endpoint:
    1. Collects or simulates EXPLAIN ANALYZE JSON plan tree.
    2. Extracts 20+ plan features.
    3. Predicts execution time using trained XGBoost/LightGBM model.
    4. Computes fast vs. slow classification.
    5. Runs rule- & model-assisted recommendation engine for CREATE INDEX.
    6. Calculates local feature attributions and projected speedup.
    7. Persists run in SQLite metadata store.
    """
    sql = req.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query text cannot be empty.")

    # 1. Obtain Plan
    plan_wrapper = None
    if req.plan_json:
        plan_dict = parse_explain_json(req.plan_json)
        exec_ms = plan_dict.get("Execution Time") or plan_dict.get("Plan", {}).get("Actual Total Time", 0.0)
        plan_wrapper = {
            "sql": sql,
            "plan": plan_dict,
            "actual_ms": float(exec_ms or 0.0),
        }
    elif req.conn_str:
        try:
            plan_wrapper = collect_explain_analyze(req.conn_str, sql)
        except Exception as e:
            # Fallback to simulator if connection failed
            plan_wrapper = simulate_explain_analyze(sql)
            plan_wrapper["warning"] = f"Database connection failed ({str(e)}). Used optimizer simulator."
    else:
        plan_wrapper = simulate_explain_analyze(sql)

    plan_dict = plan_wrapper["plan"]
    actual_ms = plan_wrapper.get("actual_ms", 0.0)

    # 2. Extract features
    features = extract_features(plan_dict)
    if actual_ms > 0:
        features["label_ms"] = actual_ms

    # 3. Model Inference & Attributions
    registry = load_active_model()
    predicted_ms, model_is_slow, top_features = registry.predict(features)

    # Use measured execution time if real plan has it, or predicted ms
    display_predicted = predicted_ms if predicted_ms > 0 else actual_ms

    # 4. Recommendation Engine
    recommender = QueryRecommender(slow_threshold_ms=req.slow_threshold_ms)
    advisor_result = recommender.analyze(
        plan_data=plan_dict,
        sql=sql,
        predicted_ms=display_predicted,
    )

    # 5. Persist run to SQLite
    recs_serialized = [
        {
            "action_type": r.action_type,
            "sql": r.sql,
            "target_table": r.target_table,
            "target_columns": r.target_columns,
            "reason": r.reason,
            "priority": r.priority,
            "estimated_speedup": r.estimated_speedup,
        }
        for r in advisor_result.recommendations
    ]

    bottlenecks_serialized = [
        {
            "node_type": b.node_type,
            "table": b.table,
            "severity": b.severity,
            "description": b.description,
            "impact_ms": b.impact_ms,
        }
        for b in advisor_result.bottlenecks
    ]

    try:
        run_id = log_analysis_run(
            sql_text=sql,
            predicted_ms=advisor_result.predicted_ms,
            actual_ms=actual_ms,
            was_slow=advisor_result.is_slow,
            speedup_ratio=advisor_result.speedup_ratio,
            recommendations=recs_serialized,
            plan_summary=advisor_result.summary,
        )
    except Exception:
        run_id = 0

    return {
        "run_id": run_id,
        "sql": sql,
        "predicted_ms": advisor_result.predicted_ms,
        "actual_ms": actual_ms,
        "is_slow": advisor_result.is_slow,
        "slow_threshold_ms": advisor_result.slow_threshold_ms,
        "estimated_improved_ms": advisor_result.estimated_improved_ms,
        "speedup_ratio": advisor_result.speedup_ratio,
        "summary": advisor_result.summary,
        "recommendations": recs_serialized,
        "bottlenecks": bottlenecks_serialized,
        "top_features": top_features,
        "features": features,
        "plan": plan_dict,
    }
