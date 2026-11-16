"""
PostgreSQL EXPLAIN ANALYZE JSON Plan Tree Parser.

Transforms recursive plan trees produced by:
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <sql>
into structured tabular features suitable for ML model training and inference.
"""

from __future__ import annotations
import json
import math
from typing import Any, Dict, List, Optional, Tuple, Union


def parse_explain_json(raw_input: Union[str, dict, list]) -> dict:
    """Normalize EXPLAIN JSON input into a standard dict containing 'Plan'."""
    if isinstance(raw_input, str):
        parsed = json.loads(raw_input)
    else:
        parsed = raw_input

    # PostgreSQL EXPLAIN output is usually [{ "Plan": ... }]
    if isinstance(parsed, list):
        if len(parsed) > 0 and isinstance(parsed[0], dict):
            return parsed[0]
        return {}
    elif isinstance(parsed, dict):
        return parsed
    return {}


def flatten_plan(plan_node: dict, current_depth: int = 1) -> List[Tuple[dict, int]]:
    """
    Traverse the plan tree via DFS and return a flat list of (node, depth) tuples.
    """
    if not plan_node or not isinstance(plan_node, dict):
        return []

    nodes: List[Tuple[dict, int]] = [(plan_node, current_depth)]
    for child in plan_node.get("Plans", []):
        nodes.extend(flatten_plan(child, current_depth + 1))
    return nodes


def extract_features(plan_data: Union[str, dict, list]) -> Dict[str, Any]:
    """
    Extracts tabular features from an EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output.

    Returns a dictionary of numerical features and categorical indicators.
    """
    normalized = parse_explain_json(plan_data)
    root = normalized.get("Plan", normalized)

    flat_nodes_with_depth = flatten_plan(root)
    nodes = [n for n, _ in flat_nodes_with_depth]
    depths = [d for _, d in flat_nodes_with_depth] if flat_nodes_with_depth else [0]

    node_types = [n.get("Node Type", "") for n in nodes]
    relations = [n.get("Relation Name") for n in nodes if n.get("Relation Name")]

    # Scan types
    has_seq_scan = int(any("Seq Scan" in nt for nt in node_types))
    has_index_scan = int(any("Index Scan" in nt or "Index Only Scan" in nt for nt in node_types))
    has_index_only_scan = int(any("Index Only Scan" in nt for nt in node_types))
    has_bitmap_scan = int(any("Bitmap" in nt for nt in node_types))

    # Join types
    has_hash_join = int(any("Hash Join" in nt for nt in node_types))
    has_nested_loop = int(any("Nested Loop" in nt for nt in node_types))
    has_merge_join = int(any("Merge Join" in nt for nt in node_types))

    # Other operations
    has_sort = int(any("Sort" in nt for nt in node_types))
    has_aggregate = int(any("Aggregate" in nt for nt in node_types))

    # Filter metrics
    rows_removed_list = [
        float(n.get("Rows Removed by Filter", 0) or 0) for n in nodes
    ]
    max_rows_removed_by_filter = max(rows_removed_list) if rows_removed_list else 0.0
    total_filter_rows_removed = sum(rows_removed_list)

    # Cardinality estimation ratio: actual / plan
    ratios = []
    for n in nodes:
        actual = n.get("Actual Rows")
        plan_rows = n.get("Plan Rows", 1)
        if actual is not None and plan_rows > 0:
            ratios.append(actual / max(plan_rows, 1))
    est_vs_actual_ratio = max(ratios) if ratios else 1.0
    # Bound ratio to prevent extreme outliers
    est_vs_actual_ratio = min(max(est_vs_actual_ratio, 0.001), 1000.0)

    # Tree metrics
    join_depth = max(depths) if depths else 1
    tree_node_count = len(nodes)
    num_tables = len(set(relations))

    # Cost metrics from root
    total_estimated_cost = float(root.get("Total Cost", 0.0) or 0.0)
    startup_cost = float(root.get("Startup Cost", 0.0) or 0.0)
    plan_rows = float(root.get("Plan Rows", 0.0) or 0.0)
    actual_rows = float(root.get("Actual Rows", 0.0) or 0.0)

    # Buffer cache metrics
    shared_hit_blocks = sum(
        float(n.get("Shared Hit Blocks", 0) or 0) for n in nodes
    )
    shared_read_blocks = sum(
        float(n.get("Shared Read Blocks", 0) or 0) for n in nodes
    )
    total_blocks = shared_hit_blocks + shared_read_blocks
    shared_hit_ratio = (
        (shared_hit_blocks / total_blocks) if total_blocks > 0 else 1.0
    )

    # Execution time label if present
    exec_time = (
        normalized.get("Execution Time")
        or normalized.get("Total Runtime")
        or root.get("Actual Total Time", 0.0)
    )
    label_ms = float(exec_time or 0.0)

    features = {
        "has_seq_scan": has_seq_scan,
        "has_index_scan": has_index_scan,
        "has_index_only_scan": has_index_only_scan,
        "has_bitmap_scan": has_bitmap_scan,
        "has_hash_join": has_hash_join,
        "has_nested_loop": has_nested_loop,
        "has_merge_join": has_merge_join,
        "has_sort": has_sort,
        "has_aggregate": has_aggregate,
        "max_rows_removed_by_filter": max_rows_removed_by_filter,
        "total_filter_rows_removed": total_filter_rows_removed,
        "est_vs_actual_ratio": round(est_vs_actual_ratio, 4),
        "join_depth": join_depth,
        "tree_node_count": tree_node_count,
        "num_tables": num_tables,
        "total_estimated_cost": total_estimated_cost,
        "startup_cost": startup_cost,
        "plan_rows": plan_rows,
        "actual_rows": actual_rows,
        "shared_hit_blocks": shared_hit_blocks,
        "shared_read_blocks": shared_read_blocks,
        "shared_hit_ratio": round(shared_hit_ratio, 4),
        "label_ms": round(label_ms, 3),
    }

    return features


FEATURE_COLUMNS = [
    "has_seq_scan",
    "has_index_scan",
    "has_index_only_scan",
    "has_bitmap_scan",
    "has_hash_join",
    "has_nested_loop",
    "has_merge_join",
    "has_sort",
    "has_aggregate",
    "max_rows_removed_by_filter",
    "total_filter_rows_removed",
    "est_vs_actual_ratio",
    "join_depth",
    "tree_node_count",
    "num_tables",
    "total_estimated_cost",
    "startup_cost",
    "plan_rows",
    "actual_rows",
    "shared_hit_blocks",
    "shared_read_blocks",
    "shared_hit_ratio",
]

