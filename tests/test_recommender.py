import unittest
from src.advisor.recommender import QueryRecommender, recommend_indexes


class TestRecommender(unittest.TestCase):
    def setUp(self):
        self.recommender = QueryRecommender(slow_threshold_ms=50.0)

    def test_seq_scan_index_recommendation(self):
        plan = {
            "Plan": {
                "Node Type": "Seq Scan",
                "Relation Name": "lineitem",
                "Startup Cost": 0.0,
                "Total Cost": 3824.5,
                "Plan Rows": 1000,
                "Actual Rows": 50,
                "Actual Total Time": 42.15,
                "Rows Removed by Filter": 59500,
                "Filter": "(l_shipdate <= '1998-09-02'::date)",
            },
            "Execution Time": 43.12,
        }
        res = self.recommender.analyze(plan_data=plan, predicted_ms=43.12)
        self.assertTrue(len(res.recommendations) > 0)
        top_rec = res.recommendations[0]
        self.assertEqual(top_rec.action_type, "CREATE_INDEX")
        self.assertEqual(top_rec.target_table, "lineitem")
        self.assertIn("l_shipdate", top_rec.target_columns)
        self.assertIn("CREATE INDEX", top_rec.sql)
        self.assertGreater(top_rec.estimated_speedup, 1.0)

    def test_fast_query_no_critical_recommendations(self):
        plan = {
            "Plan": {
                "Node Type": "Index Scan",
                "Relation Name": "customer",
                "Index Name": "customer_pkey",
                "Startup Cost": 0.15,
                "Total Cost": 8.2,
                "Plan Rows": 1,
                "Actual Rows": 1,
                "Actual Total Time": 0.42,
                "Index Cond": "(c_custkey = 42)",
            },
            "Execution Time": 0.45,
        }
        res = self.recommender.analyze(plan_data=plan, predicted_ms=0.45)
        self.assertFalse(res.is_slow)
        self.assertEqual(len(res.bottlenecks), 0)

    def test_extract_columns_from_filter(self):
        cols = self.recommender._extract_columns_from_filter(
            "((status = 'PENDING') AND (created_at >= '2024-01-01'::date))"
        )
        self.assertIn("status", cols)
        self.assertIn("created_at", cols)


if __name__ == "__main__":
    unittest.main()

