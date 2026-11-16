"""
Benchmark Workload Generator and Synthetic Dataset Builder.

Generates realistic SQL queries modeled after the TPC-H decision-support benchmark
and high-concurrency e-commerce database patterns. Synthesizes execution plans and
extracts training datasets for ML model development.
"""

from __future__ import annotations
import json
import random
import os
from pathlib import Path
from typing import Any, Dict, List
import pandas as pd

from src.collector.runner import simulate_explain_analyze
from src.features.plan_parser import extract_features, FEATURE_COLUMNS


# Benchmark query templates covering various performance profiles:
TPCH_TEMPLATES = [
    # Q1-style: Aggregation over lineitem with filter
    """SELECT returnflag, linestatus, sum(quantity) as sum_qty, sum(extendedprice) as sum_base_price,
       avg(quantity) as avg_qty, count(*) as count_order
FROM lineitem
WHERE shipdate <= '1998-09-02'
GROUP BY returnflag, linestatus
ORDER BY returnflag, linestatus;""",

    # Q3-style: 3-table join between customer, orders, lineitem with unindexed date filter
    """SELECT l_orderkey, sum(l_extendedprice * (1 - l_discount)) as revenue, o_orderdate, o_shippriority
FROM customer JOIN orders ON c_custkey = o_custkey JOIN lineitem ON l_orderkey = o_orderkey
WHERE c_mktsegment = 'BUILDING' AND o_orderdate < '1995-03-15' AND l_shipdate > '1995-03-15'
GROUP BY l_orderkey, o_orderdate, o_shippriority
ORDER BY revenue DESC
LIMIT 10;""",

    # Q6-style: Heavy sequential scan on lineitem discarding thousands of rows
    """SELECT sum(extendedprice * discount) as revenue
FROM lineitem
WHERE shipdate >= '1994-01-01' AND shipdate < '1995-01-01'
  AND discount BETWEEN 0.05 AND 0.07 AND quantity < 24;""",

    # Q10-style: Customer returning items
    """SELECT c_custkey, c_name, sum(l_extendedprice * (1 - l_discount)) as revenue, c_acctbal, n_name, c_address, c_phone, c_comment
FROM customer JOIN orders ON c_custkey = o_custkey JOIN lineitem ON l_orderkey = o_orderkey JOIN nation ON c_nationkey = n_nationkey
WHERE o_orderdate >= '1993-10-01' AND o_orderdate < '1994-01-01' AND l_returnflag = 'R'
GROUP BY c_custkey, c_name, c_acctbal, c_phone, n_name, c_address, c_comment
ORDER BY revenue DESC
LIMIT 20;""",

    # Fast PK lookup
    """SELECT * FROM customer WHERE c_custkey = 42;""",

    # Fast indexed order lookup
    """SELECT * FROM orders WHERE o_orderkey = 18450;""",

    # Fast indexed lineitem lookup
    """SELECT * FROM lineitem WHERE l_orderkey = 1290 AND l_linenumber = 1;""",

    # E-commerce slow orders filter
    """SELECT id, customer_id, total_amount, status, created_at
FROM orders
WHERE status = 'PENDING' AND created_at >= '2024-01-01'
ORDER BY created_at DESC;""",

    # Unindexed product category search
    """SELECT p.id, p.name, p.price, p.stock
FROM products p
WHERE p.category_id = 15 AND p.price > 500.00;""",

    # Unindexed reviews join
    """SELECT r.product_id, avg(r.rating) as avg_rating, count(*) as total_reviews
FROM reviews r
WHERE r.is_verified = true
GROUP BY r.product_id
HAVING count(*) > 50;""",
]


def generate_benchmark_workload(count: int = 100) -> List[Dict[str, Any]]:
    """Generates a list of simulated EXPLAIN ANALYZE plans based on benchmark templates."""
    workload = []
    statuses = ["PENDING", "COMPLETED", "CANCELLED", "PROCESSING", "SHIPPED"]
    segments = ["BUILDING", "AUTOMOBILE", "MACHINERY", "HOUSEHOLD", "FURNITURE"]

    for i in range(count):
        tmpl_idx = i % len(TPCH_TEMPLATES)
        sql = TPCH_TEMPLATES[tmpl_idx]

        # Vary query parameters to generate variety in plans and selectivity
        cust_id = random.randint(1, 10000)
        order_id = random.randint(1, 500000)
        status = random.choice(statuses)
        segment = random.choice(segments)

        sql_variant = sql.replace("42", str(cust_id))
        sql_variant = sql_variant.replace("18450", str(order_id))
        sql_variant = sql_variant.replace("'BUILDING'", f"'{segment}'")
        sql_variant = sql_variant.replace("'PENDING'", f"'{status}'")

        plan_res = simulate_explain_analyze(sql_variant)
        # Add realistic noise to actual execution time
        noise = random.uniform(0.85, 1.25)
        plan_res["actual_ms"] = round(plan_res["actual_ms"] * noise, 3)
        if "Execution Time" in plan_res["plan"]:
            plan_res["plan"]["Execution Time"] = plan_res["actual_ms"]

        workload.append(plan_res)

    return workload


def generate_synthetic_dataset(
    sample_count: int = 1200,
    output_dir: str = "data/processed",
) -> str:
    """
    Generates a labelled dataset of query plans and extracts tabular features.
    Saves the dataset as CSV and returns the output file path.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    raw_dir = Path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)

    workload = generate_benchmark_workload(sample_count)
    rows = []

    for item in workload:
        feats = extract_features(item["plan"])
        # Ensure label_ms matches actual measured ms
        feats["label_ms"] = item["actual_ms"]
        # Slow classification threshold: 50ms (or 80th percentile threshold)
        feats["is_slow"] = 1 if feats["label_ms"] > 50.0 else 0
        feats["sql"] = item["sql"]
        rows.append(feats)

    df = pd.DataFrame(rows)
    csv_path = os.path.join(output_dir, "dataset.csv")
    df.to_csv(csv_path, index=False)

    # Save a sample of raw plans for inspection and test fixtures
    with open(raw_dir / "sample_plans.json", "w") as f:
        json.dump(workload[:25], f, indent=2)

    return csv_path


if __name__ == "__main__":
    path = generate_synthetic_dataset(1500)
    print(f"Generated synthetic dataset with 1,500 plans at: {path}")

