import { NextRequest, NextResponse } from "next/server";
import { synthesizePlanAndAnalysis } from "@/lib/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql, conn_str, plan_json, slow_threshold_ms = 50.0 } = body;

    if (!sql || !sql.trim()) {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    // Attempt to proxy to FastAPI backend
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const backendRes = await fetch(`${backendUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, conn_str, plan_json, slow_threshold_ms }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // FastAPI backend offline or timeout: fall back gracefully to integrated TypeScript engine
    }

    // Integrated standalone fallback
    const fallbackResult = synthesizePlanAndAnalysis(sql, slow_threshold_ms);
    return NextResponse.json(fallbackResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
