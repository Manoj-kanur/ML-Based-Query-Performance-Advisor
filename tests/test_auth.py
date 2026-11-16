import unittest
import uuid
from src.advisor.auth import authenticate_user, register_user


class TestAuth(unittest.TestCase):
    def test_register_and_authenticate(self):
        uname = f"test_{uuid.uuid4().hex[:6]}"
        pw = "validpassword123"

        reg = register_user(uname, pw)
        self.assertEqual(reg["username"], uname)

        # Authenticate with correct password
        auth = authenticate_user(uname, pw)
        self.assertIsNotNone(auth)
        self.assertEqual(auth["username"], uname)

        # Reject with incorrect password
        bad = authenticate_user(uname, "wrongpassword")
        self.assertIsNone(bad)

    def test_short_password(self):
        with self.assertRaises(ValueError):
            register_user("shortpw_user", "12")

    def test_duplicate_user(self):
        uname = f"dup_{uuid.uuid4().hex[:6]}"
        register_user(uname, "password123")
        with self.assertRaises(ValueError):
            register_user(uname, "password123")


if __name__ == "__main__":
    unittest.main()
