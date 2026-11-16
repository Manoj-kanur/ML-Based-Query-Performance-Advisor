import unittest
from src.features.plan_parser import extract_features, flatten_plan, parse_explain_json


class TestPlanParser(unittest.TestCase):
    def setUp(self):
        self.sample_plan = {
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
                "Shared Hit Blocks": 420,
                "Shared Read Blocks": 1280,
            },
            "Execution Time": 43.12,
        }

    def test_flatten_plan(self):
        root = self.sample_plan["Plan"]
        flattened = flatten_plan(root)
        self.assertEqual(len(flattened), 1)
        node, depth = flattened[0]
        self.assertEqual(node["Node Type"], "Seq Scan")
        self.assertEqual(depth, 1)

    def test_extract_features(self):
        feats = extract_features(self.sample_plan)
        self.assertEqual(feats["has_seq_scan"], 1)
        self.assertEqual(feats["has_index_scan"], 0)
        self.assertEqual(feats["max_rows_removed_by_filter"], 59500.0)
        self.assertEqual(feats["num_tables"], 1)
        self.assertEqual(feats["label_ms"], 43.12)
        self.assertGreater(feats["shared_read_blocks"], 0)

    def test_multi_node_tree(self):
        nested_plan = {
            "Plan": {
                "Node Type": "Hash Join",
                "Startup Cost": 25.0,
                "Total Cost": 150.0,
                "Plan Rows": 100,
                "Actual Rows": 80,
                "Actual Total Time": 12.5,
                "Plans": [
                    {
                        "Node Type": "Seq Scan",
                        "Relation Name": "orders",
                        "Startup Cost": 0.0,
                        "Total Cost": 45.0,
                        "Plan Rows": 200,
                        "Actual Rows": 200,
                        "Actual Total Time": 3.2,
                    },
                    {
                        "Node Type": "Index Scan",
                        "Relation Name": "customer",
                        "Index Name": "customer_pkey",
                        "Startup Cost": 0.15,
                        "Total Cost": 8.2,
                        "Plan Rows": 1,
                        "Actual Rows": 1,
                        "Actual Total Time": 0.4,
                    },
                ],
            },
            "Execution Time": 14.2,
        }
        feats = extract_features(nested_plan)
        self.assertEqual(feats["has_hash_join"], 1)
        self.assertEqual(feats["has_seq_scan"], 1)
        self.assertEqual(feats["has_index_scan"], 1)
        self.assertEqual(feats["num_tables"], 2)
        self.assertEqual(feats["join_depth"], 2)
        self.assertEqual(feats["tree_node_count"], 3)


if __name__ == "__main__":
    unittest.main()

