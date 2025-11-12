
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const runId = resolvedParams.id;

  if (!BASE_URL) {
    return NextResponse.json(
      { message: "Backend URL is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json(
      { message: "Authorization header is required" },
      { status: 401 }
    );
  }

  try {
    const backendRes = await fetch(`${BASE_URL}/runs/${runId}/`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData?.detail || errorData?.error || "Failed to fetch run" },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}