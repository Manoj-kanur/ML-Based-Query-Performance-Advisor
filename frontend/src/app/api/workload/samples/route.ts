import { NextResponse } from "next/server";
import { SAMPLE_QUERIES } from "@/lib/engine";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const backendRes = await fetch(`${backendUrl}/api/workload/samples`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (backendRes.ok) {
      return NextResponse.json(await backendRes.json());
    }
  } catch {
    // Fall back to built-in samples
  }

  return NextResponse.json({ samples: SAMPLE_QUERIES });
}
