"""
Explainability engine for query performance predictions.
Provides both global feature importance and instance-level SHAP-like attribution scores.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
import numpy as np
from src.features.plan_parser import FEATURE_COLUMNS


FEATURE_DESCRIPTIONS = {
    "has_seq_scan": "Sequential Scan Present",
    "has_index_scan": "Index Scan Present",
    "has_index_only_scan": "Index-Only Scan Present",
    "has_bitmap_scan": "Bitmap Scan Present",
    "has_hash_join": "Hash Join Present",
    "has_nested_loop": "Nested Loop Present",
    "has_merge_join": "Merge Join Present",
    "has_sort": "Sort Operation Present",
    "has_aggregate": "Aggregate Operation Present",
    "max_rows_removed_by_filter": "Max Filter Discarded Rows",
    "total_filter_rows_removed": "Total Filter Discarded Rows",
    "est_vs_actual_ratio": "Cardinality Misestimation Ratio",
    "join_depth": "Query Plan Tree Depth",
    "tree_node_count": "Total Plan Tree Nodes",
    "num_tables": "Number of Relations Joined",
    "total_estimated_cost": "Postgres Optimizer Estimated Cost",
    "startup_cost": "Startup Cost Before First Row",
    "plan_rows": "Estimated Row Count",
    "actual_rows": "Actual Output Row Count",
    "shared_hit_blocks": "Buffer Cache Hit Blocks",
    "shared_read_blocks": "Disk Read Blocks",
    "shared_hit_ratio": "Cache Hit Ratio",
}


class ModelExplainer:
    def __init__(self, model: Any, feature_names: Optional[List[str]] = None):
        self.model = model
        self.feature_names = feature_names or FEATURE_COLUMNS

    def get_global_importance(self) -> List[Dict[str, Any]]:
        """Extracts normalized global feature importance from trained model."""
        importances = None

        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
        elif hasattr(self.model, "coef_"):
            importances = np.abs(self.model.coef_)

        if importances is None:
            # Fallback equal importance
            importances = np.ones(len(self.feature_names))

        total = float(np.sum(importances)) or 1.0
        normalized = (importances / total).tolist()

        result = []
        for name, weight in zip(self.feature_names, normalized):
            result.append({
                "feature": name,
                "label": FEATURE_DESCRIPTIONS.get(name, name),
                "importance": round(float(weight), 4),
                "percentage": round(float(weight) * 100.0, 2),
            })

        # Sort descending
        result.sort(key=lambda x: x["importance"], reverse=True)
        return result

    def explain_instance(self, feature_dict: Dict[str, Any], predicted_ms: float) -> List[Dict[str, Any]]:
        """
        Computes local feature contribution scores for a specific query plan.
        Approximates attribution: weight * normalized feature impact.
        """
        global_imp = {item["feature"]: item["importance"] for item in self.get_global_importance()}
        contributions = []

        for feat in self.feature_names:
            val = float(feature_dict.get(feat, 0.0) or 0.0)
            imp = global_imp.get(feat, 0.01)

            # Heuristic sensitivity scaling per feature scale
            if feat in ("max_rows_removed_by_filter", "total_filter_rows_removed"):
                raw_score = imp * min(val / 1000.0, 50.0)
            elif feat == "has_seq_scan":
                raw_score = imp * (val * 25.0)
            elif feat in ("has_hash_join", "has_nested_loop"):
                raw_score = imp * (val * 15.0)
            elif feat == "est_vs_actual_ratio":
                raw_score = imp * max(val - 1.0, 0.0) * 5.0
            elif feat == "total_estimated_cost":
                raw_score = imp * min(val / 500.0, 30.0)
            else:
                raw_score = imp * val

            contributions.append({
                "feature": feat,
                "label": FEATURE_DESCRIPTIONS.get(feat, feat),
                "value": val,
                "impact_score": round(float(raw_score), 3),
            })

        # Sort by highest impact score
        contributions.sort(key=lambda x: x["impact_score"], reverse=True)
        return contributions[:8]

