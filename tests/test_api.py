import unittest
from fastapi.testclient import TestClient
from src.api.main import app


class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_samples(self):
        res = self.client.get("/api/workload/samples")
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.json()["samples"]), 0)

    def test_models_comparison(self):
        res = self.client.get("/api/models/comparison")
        self.assertEqual(res.status_code, 200)
        self.assertIn("metrics", res.json())

    def test_analyze_query(self):
        res = self.client.post(
            "/api/analyze",
            json={"sql": "SELECT * FROM orders WHERE status = 'PENDING';"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("predicted_ms", data)
        self.assertIn("recommendations", data)
        self.assertIn("speedup_ratio", data)


if __name__ == "__main__":
    unittest.main()

