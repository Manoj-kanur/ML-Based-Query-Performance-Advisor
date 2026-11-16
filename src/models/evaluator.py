"""
Model evaluation module for query execution time prediction and classification.
Computes RMSE, MAE, R2, Accuracy, Precision, Recall, and F1.
"""

from __future__ import annotations
import math
from typing import Any, Dict
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)


def evaluate_regression(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Computes regression metrics: RMSE, MAE, R-squared."""
    mse = mean_squared_error(y_true, y_pred)
    rmse = math.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)

    return {
        "rmse": round(float(rmse), 4),
        "mae": round(float(mae), 4),
        "r2": round(float(r2), 4),
        "mean_actual": round(float(np.mean(y_true)), 3),
        "mean_predicted": round(float(np.mean(y_pred)), 3),
    }


def evaluate_classification(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Computes binary classification metrics for fast vs slow queries."""
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
    }


def evaluate_model(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    is_classifier: bool = False,
) -> Dict[str, float]:
    """Runs model prediction on test set and returns comprehensive metrics."""
    y_pred = model.predict(X_test)
    if is_classifier:
        # If output probabilities, threshold at 0.5
        if y_pred.ndim > 1 and y_pred.shape[1] > 1:
            y_pred = np.argmax(y_pred, axis=1)
        elif np.issubdtype(y_pred.dtype, np.floating):
            y_pred = (y_pred > 0.5).astype(int)
        return evaluate_classification(y_test, y_pred)
    else:
        # Clip negative predictions to 0.0 ms
        y_pred = np.maximum(y_pred, 0.0)
        return evaluate_regression(y_test, y_pred)

