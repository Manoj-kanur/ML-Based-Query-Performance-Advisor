import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getMongoDb } from "@/lib/mongodb";

// In-memory fallback map if MongoDB is unreachable
const memoryUsers = new Map<string, { username: string; password_hash: string; created_at: string }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const uClean = (username || "").trim().toLowerCase();
    if (!uClean || uClean.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long." },
        { status: 400 }
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    // Try proxying to FastAPI backend first if available
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const backendRes = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uClean, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (backendRes.ok) {
        return NextResponse.json(await backendRes.json());
      }
      if (backendRes.status === 400) {
        const errData = await backendRes.json();
        return NextResponse.json({ error: errData.detail || "Registration error" }, { status: 400 });
      }
    } catch {
      // Backend unavailable; process directly via MongoDB or memory fallback
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const createdAt = new Date().toISOString();

    const db = await getMongoDb();
    if (db) {
      const usersCol = db.collection("users");
      const existing = await usersCol.findOne({ username: uClean });
      if (existing) {
        return NextResponse.json(
          { error: `Username '${uClean}' is already taken.` },
          { status: 400 }
        );
      }
      await usersCol.insertOne({
        username: uClean,
        password_hash: passwordHash,
        created_at: createdAt,
        last_login: createdAt,
      });
    } else {
      if (memoryUsers.has(uClean)) {
        return NextResponse.json(
          { error: `Username '${uClean}' is already taken.` },
          { status: 400 }
        );
      }
      memoryUsers.set(uClean, { username: uClean, password_hash: passwordHash, created_at: createdAt });
    }

    return NextResponse.json({
      success: true,
      user: { username: uClean, created_at: createdAt },
      message: "User registered successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}

