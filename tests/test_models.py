import unittest
from src.models.trainer import load_active_model
from src.features.plan_parser import FEATURE_COLUMNS


class TestModels(unittest.TestCase):
    def test_model_registry_predict(self):
        registry = load_active_model()
        dummy_feats = {col: 0.0 for col in FEATURE_COLUMNS}
        dummy_feats["has_seq_scan"] = 1.0
        dummy_feats["max_rows_removed_by_filter"] = 50000.0
        dummy_feats["total_estimated_cost"] = 3500.0

        pred_ms, is_slow, attributions = registry.predict(dummy_feats)
        self.assertGreater(pred_ms, 0.0)
        self.assertIsInstance(is_slow, bool)
        self.assertTrue(len(attributions) > 0)


if __name__ == "__main__":
    unittest.main()

