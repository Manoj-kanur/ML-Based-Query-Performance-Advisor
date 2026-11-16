"""
SQLite Metadata Store for Query Analysis Runs and Optimization Recommendations.
Persists execution benchmarks, model predictions, and recommended index actions.
"""

from __future__ import annotations
import hashlib
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


DB_PATH = Path("data/advisor_history.db")


def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes schema for query_runs and recommendations tables."""
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS query_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sql_text TEXT,
                sql_hash TEXT,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actual_ms REAL,
                predicted_ms REAL,
                was_slow INTEGER,
                recs_applied INTEGER DEFAULT 0,
                speedup_ratio REAL DEFAULT 1.0,
                plan_summary TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER,
                rec_sql TEXT,
                rec_type TEXT,
                priority TEXT,
                reason TEXT,
                estimated_speedup REAL,
                applied_at TIMESTAMP,
                FOREIGN KEY (run_id) REFERENCES query_runs(id) ON DELETE CASCADE
            );
        """)
    conn.close()


def log_analysis_run(
    sql_text: str,
    predicted_ms: float,
    actual_ms: float,
    was_slow: bool,
    speedup_ratio: float,
    recommendations: List[Dict[str, Any]],
    plan_summary: str = "",
) -> int:
    """Logs an analysis run and associated recommendations into SQLite."""
    init_db()
    sql_hash = hashlib.sha256(sql_text.encode("utf-8")).hexdigest()[:16]
    conn = get_db_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO query_runs (sql_text, sql_hash, actual_ms, predicted_ms, was_slow, speedup_ratio, plan_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sql_text,
                sql_hash,
                actual_ms,
                predicted_ms,
                1 if was_slow else 0,
                speedup_ratio,
                plan_summary,
            ),
        )
        run_id = cursor.lastrowid

        for rec in recommendations:
            cursor.execute(
                """
                INSERT INTO recommendations (run_id, rec_sql, rec_type, priority, reason, estimated_speedup)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    rec.get("sql", ""),
                    rec.get("action_type", "CREATE_INDEX"),
                    rec.get("priority", "HIGH"),
                    rec.get("reason", ""),
                    float(rec.get("estimated_speedup", 1.0)),
                ),
            )
    conn.close()
    return run_id or 0


def fetch_recent_runs(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns recent query runs along with recommendation counts."""
    init_db()
    conn = get_db_connection()
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT qr.id, qr.sql_text, qr.sql_hash, qr.run_at, qr.actual_ms,
                   qr.predicted_ms, qr.was_slow, qr.speedup_ratio, qr.plan_summary,
                   COUNT(r.id) as rec_count
            FROM query_runs qr
            LEFT JOIN recommendations r ON qr.id = r.run_id
            GROUP BY qr.id
            ORDER BY qr.run_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

