"""
PostgreSQL Rule- & Model-Assisted Index Recommendation Engine.

Identifies query execution bottlenecks from execution plans and query syntax:
- High-cost Sequential Scans with selective predicates
- Missing indexes on JOIN foreign keys (causing expensive nested loops / hash joins)
- In-memory/disk Sort operations on unindexed ORDER BY keys
- Cardinality misestimations requiring ANALYZE
- Estimates speedup and execution time post-index creation
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from src.features.plan_parser import flatten_plan, parse_explain_json


@dataclass
class Recommendation:
    action_type: str  # "CREATE_INDEX", "RUN_ANALYZE", "QUERY_REWRITE"
    sql: str
    target_table: str
    target_columns: List[str]
    reason: str
    priority: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    estimated_speedup: float  # e.g. 3.5 for 3.5x faster


@dataclass
class Bottleneck:
    node_type: str
    table: Optional[str]
    severity: str  # "CRITICAL", "WARNING", "INFO"
    description: str
    impact_ms: float = 0.0


@dataclass
class AdvisorResult:
    predicted_ms: float
    is_slow: bool
    slow_threshold_ms: float
    recommendations: List[Recommendation]
    bottlenecks: List[Bottleneck]
    estimated_improved_ms: float
    speedup_ratio: float
    summary: str


class QueryRecommender:
    def __init__(self, slow_threshold_ms: float = 50.0):
        self.slow_threshold_ms = slow_threshold_ms

    def _extract_columns_from_filter(self, filter_expr: str) -> List[str]:
        """
        Extract probable column names from a PostgreSQL filter expression.
        Examples:
            "(l_shipdate <= '1998-09-02'::date)" -> ['l_shipdate']
            "((o_orderstatus = 'O'::bpchar) AND (o_totalprice > 1000))" -> ['o_orderstatus', 'o_totalprice']
            "((status = 'PENDING') AND (created_at >= '2024-01-01'))" -> ['status', 'created_at']
        """
        if not filter_expr:
            return []

        # Remove string literals and types
        cleaned = re.sub(r"'[^']*'", "", filter_expr)
        cleaned = re.sub(r"::[a-zA-Z_0-9]+", "", cleaned)

        # Match column identifiers on left side of comparison operators
        pattern = r"([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|<=|>=|<|>|<>|!=|ILIKE|LIKE|IN|IS\s+NOT|IS)"
        matches = re.findall(pattern, cleaned, re.IGNORECASE)

        # Filter out SQL reserved keywords
        keywords = {
            "and", "or", "not", "null", "true", "false", "case", "when", "then",
            "else", "end", "between", "exists", "any", "all", "select", "from", "where"
        }
        cols = [m for m in matches if m.lower() not in keywords]
        return list(dict.fromkeys(cols))

    def _extract_table_and_columns_from_sql(self, sql: str) -> List[Tuple[str, List[str]]]:
        """Fallback extractor directly from SQL text when plan tree lacks filter strings."""
        if not sql:
            return []
        
        where_match = re.search(r"\bWHERE\b\s+(.*?)(?:\bGROUP\b|\bORDER\b|\bLIMIT\b|;|\Z)", sql, re.IGNORECASE | re.DOTALL)
        if not where_match:
            return []
        
        where_clause = where_match.group(1)
        # Find table name from FROM clause
        from_match = re.search(r"\bFROM\b\s+([a-zA-Z_][a-zA-Z0-9_]*)", sql, re.IGNORECASE)
        table = from_match.group(1) if from_match else "target_table"
        
        cols = self._extract_columns_from_filter(where_clause)
        if cols:
            return [(table, cols)]
        return []

    def analyze(
        self,
        plan_data: Optional[Dict[str, Any]] = None,
        sql: Optional[str] = None,
        predicted_ms: float = 0.0,
    ) -> AdvisorResult:
        recommendations: List[Recommendation] = []
        bottlenecks: List[Bottleneck] = []
        seen_indexes: Set[str] = set()

        root = {}
        nodes = []
        if plan_data:
            normalized = parse_explain_json(plan_data)
            root = normalized.get("Plan", normalized)
            nodes = [n for n, _ in flatten_plan(root)]

        max_speedup = 1.0

        for node in nodes:
            node_type = node.get("Node Type", "")
            table = node.get("Relation Name")
            filter_str = node.get("Filter", "") or node.get("Index Cond", "")
            rows_removed = float(node.get("Rows Removed by Filter", 0) or 0)
            actual_rows = float(node.get("Actual Rows", 0) or 0)
            plan_rows = float(node.get("Plan Rows", 1) or 1)
            actual_time = float(node.get("Actual Total Time", 0.0) or 0.0)

            # Check 1: Expensive Sequential Scan with high filtered rows
            if node_type == "Seq Scan" and table:
                if rows_removed > 500 or (rows_removed > 50 and rows_removed > actual_rows * 2):
                    cols = self._extract_columns_from_filter(filter_str)
                    if not cols and sql:
                        for tbl, sql_cols in self._extract_table_and_columns_from_sql(sql):
                            if tbl.lower() == table.lower():
                                cols = sql_cols
                                break

                    col_str = ", ".join(cols) if cols else "filter_column"
                    idx_name = f"idx_{table}_{'_'.join(cols[:2]) if cols else 'lookup'}"
                    rec_sql = f"CREATE INDEX {idx_name} ON {table}({col_str});"

                    if rec_sql not in seen_indexes:
                        seen_indexes.add(rec_sql)
                        # Estimate speedup based on selectivity ratio
                        speedup = min(max(round(rows_removed / max(actual_rows, 1) * 0.15, 1), 2.5), 18.0)
                        max_speedup = max(max_speedup, speedup)

                        recommendations.append(
                            Recommendation(
                                action_type="CREATE_INDEX",
                                sql=rec_sql,
                                target_table=table,
                                target_columns=cols,
                                reason=(
                                    f"Sequential scan on '{table}' examined and discarded {int(rows_removed):,} rows "
                                    f"using filter {filter_str or 'predicates'}. A B-tree index on ({col_str}) "
                                    f"will convert this into an efficient Index Scan."
                                ),
                                priority="CRITICAL" if rows_removed > 5000 else "HIGH",
                                estimated_speedup=speedup,
                            )
                        )

                    bottlenecks.append(
                        Bottleneck(
                            node_type="Seq Scan",
                            table=table,
                            severity="CRITICAL" if rows_removed > 5000 else "WARNING",
                            description=f"Full table scan on '{table}' discarded {int(rows_removed):,} non-matching rows.",
                            impact_ms=actual_time,
                        )
                    )

            # Check 2: Nested Loop with large table join
            if node_type == "Nested Loop":
                loop_rows = actual_rows
                if loop_rows > 1000 or actual_time > 100:
                    bottlenecks.append(
                        Bottleneck(
                            node_type="Nested Loop",
                            table=None,
                            severity="WARNING",
                            description=(
                                f"Nested Loop processed {int(loop_rows):,} rows. If join columns lack indexes, "
                                f"this causes O(N*M) worst-case scan amplification."
                            ),
                            impact_ms=actual_time,
                        )
                    )

            # Check 3: External Sort / Memory spilling
            if node_type == "Sort":
                sort_space_type = node.get("Sort Space Type", "")
                sort_keys = node.get("Sort Key", [])
                if sort_space_type == "Disk":
                    bottlenecks.append(
                        Bottleneck(
                            node_type="Sort (Disk Spill)",
                            table=None,
                            severity="CRITICAL",
                            description="Sort spilled to temporary disk files. Increase 'work_mem' or add an index matching the ORDER BY clause.",
                            impact_ms=actual_time,
                        )
                    )
                elif actual_rows > 2000 and sort_keys:
                    rec_sql = f"-- Consider adding index matching sort keys: {', '.join(sort_keys)}"
                    if rec_sql not in seen_indexes:
                        seen_indexes.add(rec_sql)
                        recommendations.append(
                            Recommendation(
                                action_type="CREATE_INDEX",
                                sql=f"CREATE INDEX idx_sort_{node.get('Relation Name', 'table')} ON {node.get('Relation Name', 'table')}({', '.join(sort_keys)});",
                                target_table=node.get("Relation Name", "table"),
                                target_columns=sort_keys if isinstance(sort_keys, list) else [str(sort_keys)],
                                reason=f"Ordering on {sort_keys} requires an explicit Sort node on {int(actual_rows):,} rows.",
                                priority="MEDIUM",
                                estimated_speedup=1.8,
                            )
                        )

            # Check 4: Severe Cardinality Misestimation
            if actual_rows > 0 and plan_rows > 0:
                ratio = actual_rows / plan_rows
                if (ratio > 10.0 or ratio < 0.1) and table:
                    rec_sql = f"ANALYZE {table};"
                    if rec_sql not in seen_indexes:
                        seen_indexes.add(rec_sql)
                        recommendations.append(
                            Recommendation(
                                action_type="RUN_ANALYZE",
                                sql=rec_sql,
                                target_table=table,
                                target_columns=[],
                                reason=(
                                    f"Planner estimated {int(plan_rows):,} rows for '{table}', but actually processed "
                                    f"{int(actual_rows):,} rows (error factor: {ratio:.1f}x). Outdated statistics cause poor join/scan choices."
                                ),
                                priority="MEDIUM",
                                estimated_speedup=1.4,
                            )
                        )

        # Fallback if no plan or no plan recommendations were triggered, but SQL exists
        if not recommendations and sql:
            extracted = self._extract_table_and_columns_from_sql(sql)
            for table, cols in extracted:
                col_str = ", ".join(cols)
                idx_name = f"idx_{table}_{'_'.join(cols[:2])}"
                rec_sql = f"CREATE INDEX {idx_name} ON {table}({col_str});"
                if rec_sql not in seen_indexes:
                    seen_indexes.add(rec_sql)
                    recommendations.append(
                        Recommendation(
                            action_type="CREATE_INDEX",
                            sql=rec_sql,
                            target_table=table,
                            target_columns=cols,
                            reason=f"WHERE predicate column(s) detected in query: ({col_str}). Creating an index optimizes filter evaluation.",
                            priority="HIGH",
                            estimated_speedup=3.0,
                        )
                    )
                    max_speedup = 3.0

        is_slow = (predicted_ms > self.slow_threshold_ms) or (any(b.severity == "CRITICAL" for b in bottlenecks))
        speedup_ratio = max(max_speedup, 1.0)
        improved_ms = max(round(predicted_ms / speedup_ratio, 2), 0.5) if predicted_ms > 0 else 5.0

        # Construct executive summary
        if not recommendations and not bottlenecks:
            summary = "Query execution plan is healthy. Optimal index paths and join strategies are utilized."
        elif is_slow:
            rec_count = len(recommendations)
            summary = (
                f"Query exhibits performance degradation (latency: {predicted_ms:.1f}ms). "
                f"Found {len(bottlenecks)} bottleneck(s). Applying {rec_count} recommended index/optimization change(s) "
                f"is projected to achieve a ~{speedup_ratio:.1f}x speedup ({predicted_ms:.1f}ms -> {improved_ms:.1f}ms)."
            )
        else:
            summary = f"Query executes within acceptable latency thresholds ({predicted_ms:.1f}ms), but {len(recommendations)} proactive optimization(s) can reduce resource overhead."

        return AdvisorResult(
            predicted_ms=round(predicted_ms, 2),
            is_slow=is_slow,
            slow_threshold_ms=self.slow_threshold_ms,
            recommendations=recommendations,
            bottlenecks=bottlenecks,
            estimated_improved_ms=improved_ms,
            speedup_ratio=round(speedup_ratio, 2),
            summary=summary,
        )


def recommend_indexes(
    plan_data: Optional[Dict[str, Any]] = None,
    sql: Optional[str] = None,
    predicted_ms: float = 0.0,
    slow_threshold_ms: float = 50.0,
) -> AdvisorResult:
    recommender = QueryRecommender(slow_threshold_ms=slow_threshold_ms)
    return recommender.analyze(plan_data=plan_data, sql=sql, predicted_ms=predicted_ms)

