import { NextResponse } from "next/server";

import { fetchIfsc } from "@/lib/directory-api";

export const revalidate = 300;

/**
 * Website BFF for live IFSC lookups:
 * /api/directory/ifsc/{code} -> GET /v1/ifsc/{code}
 * The server API key stays here; browsers only ever see this route.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await fetchIfsc(decodeURIComponent(code));
  if (!data) {
    return NextResponse.json(
      { error: { code: "IFSC_UNAVAILABLE", message: "Live IFSC lookup failed." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ data });
}
