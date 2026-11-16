import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getMongoDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const uClean = (username || "").trim().toLowerCase();
    if (!uClean || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    // Proxy to FastAPI backend if available
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const backendRes = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uClean, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (backendRes.ok) {
        return NextResponse.json(await backendRes.json());
      }
      if (backendRes.status === 401) {
        return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
      }
    } catch {
      // Backend unavailable; authenticate directly via MongoDB
    }

    const db = await getMongoDb();
    if (db) {
      const usersCol = db.collection("users");
      const userDoc = await usersCol.findOne({ username: uClean });
      if (!userDoc) {
        return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
      }

      const match = await bcrypt.compare(password, userDoc.password_hash);
      if (!match) {
        return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
      }

      await usersCol.updateOne({ _id: userDoc._id }, { $set: { last_login: new Date().toISOString() } });

      return NextResponse.json({
        success: true,
        user: { username: userDoc.username, created_at: userDoc.created_at },
        message: "Login successful.",
      });
    }

    // Default demo login for offline presentation
    if (password === "pes1234" || password === "demo123") {
      return NextResponse.json({
        success: true,
        user: { username: uClean, created_at: new Date().toISOString() },
        message: "Login successful.",
      });
    }

    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}

