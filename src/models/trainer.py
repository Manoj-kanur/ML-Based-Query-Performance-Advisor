"""
Model Training and Registration Pipeline.

Trains XGBoost, LightGBM, Random Forest, and Ridge models on query plan features.
Evaluates metrics (RMSE, R2, Accuracy, F1) and serializes artifacts for production serving.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMRegressor

from src.features.plan_parser import FEATURE_COLUMNS
from src.models.evaluator import evaluate_model
from src.models.explainer import ModelExplainer


MODELS_DIR = Path("models")


class ModelRegistry:
    """Manages loaded models and in-memory inference."""

    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.regressor = None
        self.classifier = None
        self.metrics: Dict[str, Any] = {}
        self.explainer: Optional[ModelExplainer] = None
        self._load()

    def _load(self):
        xgb_reg_path = self.models_dir / "xgboost_regressor.json"
        rf_reg_path = self.models_dir / "random_forest_regressor.joblib"
        xgb_clf_path = self.models_dir / "xgboost_classifier.json"
        metrics_path = self.models_dir / "metrics_summary.json"

        # Load regressor
        if xgb_reg_path.exists():
            model = XGBRegressor()
            model.load_model(str(xgb_reg_path))
            self.regressor = model
        elif rf_reg_path.exists():
            self.regressor = joblib.load(rf_reg_path)

        # Load classifier
        if xgb_clf_path.exists():
            clf = XGBClassifier()
            clf.load_model(str(xgb_clf_path))
            self.classifier = clf

        # Load metrics
        if metrics_path.exists():
            with open(metrics_path, "r") as f:
                self.metrics = json.load(f)

        if self.regressor:
            self.explainer = ModelExplainer(self.regressor, FEATURE_COLUMNS)

    def predict(self, features: Dict[str, Any]) -> Tuple[float, bool, List[Dict[str, Any]]]:
        """
        Runs inference on extracted features dict.
        Returns: (predicted_ms, is_slow, top_attributions)
        """
        X = np.array([[float(features.get(col, 0.0) or 0.0) for col in FEATURE_COLUMNS]])

        if self.regressor:
            pred_val = float(self.regressor.predict(X)[0])
            pred_ms = max(round(pred_val, 2), 0.1)
        else:
            # Fallback heuristic if models not trained yet
            cost = float(features.get("total_estimated_cost", 10.0))
            discarded = float(features.get("max_rows_removed_by_filter", 0.0))
            pred_ms = round(cost * 0.04 + discarded * 0.002, 2)

        if self.classifier:
            is_slow = bool(self.classifier.predict(X)[0] == 1)
        else:
            is_slow = bool(pred_ms > 50.0)

        attributions = []
        if self.explainer:
            attributions = self.explainer.explain_instance(features, pred_ms)

        return pred_ms, is_slow, attributions


_REGISTRY_INSTANCE: Optional[ModelRegistry] = None


def load_active_model() -> ModelRegistry:
    global _REGISTRY_INSTANCE
    if _REGISTRY_INSTANCE is None:
        _REGISTRY_INSTANCE = ModelRegistry()
    return _REGISTRY_INSTANCE


def train_all_models(
    csv_path: str = "data/processed/dataset.csv",
    models_dir: str = "models",
    use_gpu: bool = False,
) -> Dict[str, Any]:
    """
    Trains XGBoost, LightGBM, Random Forest, and Ridge models.
    Saves trained models, evaluation metrics, and feature lists.
    """
    out_dir = Path(models_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not os.path.exists(csv_path):
        from src.collector.workload_gen import generate_synthetic_dataset
        csv_path = generate_synthetic_dataset()

    df = pd.read_csv(csv_path)

    # Prepare features and targets
    X = df[FEATURE_COLUMNS].fillna(0.0).values
    y_reg = df["label_ms"].values
    y_clf = df["is_slow"].values

    X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
        X, y_reg, y_clf, test_size=0.2, random_state=42
    )

    results = {}

    # 1. XGBoost Regressor
    xgb_params = {
        "n_estimators": 350,
        "learning_rate": 0.04,
        "max_depth": 5,
        "random_state": 42,
    }
    if use_gpu:
        xgb_params["tree_method"] = "hist"
        xgb_params["device"] = "cuda"

    try:
        xgb_reg = XGBRegressor(**xgb_params)
        xgb_reg.fit(X_train, y_reg_train)
    except Exception:
        # Fallback to CPU if GPU flag fails
        xgb_params.pop("device", None)
        xgb_reg = XGBRegressor(**xgb_params)
        xgb_reg.fit(X_train, y_reg_train)

    xgb_reg_metrics = evaluate_model(xgb_reg, X_test, y_reg_test, is_classifier=False)
    xgb_reg.save_model(str(out_dir / "xgboost_regressor.json"))
    results["XGBoost (Regressor)"] = xgb_reg_metrics

    # 2. LightGBM Regressor
    lgb_reg = LGBMRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        random_state=42,
        verbose=-1,
    )
    lgb_reg.fit(X_train, y_reg_train)
    lgb_metrics = evaluate_model(lgb_reg, X_test, y_reg_test, is_classifier=False)
    results["LightGBM (Regressor)"] = lgb_metrics

    # 3. Random Forest Regressor (Baseline)
    rf_reg = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42)
    rf_reg.fit(X_train, y_reg_train)
    rf_metrics = evaluate_model(rf_reg, X_test, y_reg_test, is_classifier=False)
    joblib.dump(rf_reg, str(out_dir / "random_forest_regressor.joblib"))
    results["Random Forest (Baseline)"] = rf_metrics

    # 4. Ridge Regressor (Linear Baseline)
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train, y_reg_train)
    ridge_metrics = evaluate_model(ridge, X_test, y_reg_test, is_classifier=False)
    results["Ridge Regression (Baseline)"] = ridge_metrics

    # 5. XGBoost Classifier (Fast vs Slow Classification)
    xgb_clf = XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        random_state=42,
    )
    xgb_clf.fit(X_train, y_clf_train)
    xgb_clf_metrics = evaluate_model(xgb_clf, X_test, y_clf_test, is_classifier=True)
    xgb_clf.save_model(str(out_dir / "xgboost_classifier.json"))
    results["XGBoost (Classifier - Fast/Slow)"] = xgb_clf_metrics

    # Save metrics and feature definitions
    with open(out_dir / "metrics_summary.json", "w") as f:
        json.dump(results, f, indent=2)

    with open(out_dir / "feature_columns.json", "w") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)

    # Refresh global registry
    global _REGISTRY_INSTANCE
    _REGISTRY_INSTANCE = ModelRegistry(str(out_dir))

    return results


if __name__ == "__main__":
    print("Training models...")
    summary = train_all_models()
    print("Training complete! Model Performance Summary:")
    print(json.dumps(summary, indent=2))

