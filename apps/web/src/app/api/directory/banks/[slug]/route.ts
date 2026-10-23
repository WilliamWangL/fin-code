import { NextResponse } from "next/server";

import { decodeSlug, fetchBankBySlug } from "@/lib/directory-api";

export const revalidate = 300;

/**
 * Website BFF for live directory records:
 * /api/directory/banks/{slug} -> GET /v1/banks/by-slug/{slug}
 * The server API key stays here; browsers only ever see this route.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Route params arrive percent-encoded (CJK slugs); normalize like the pages.
  const detail = await fetchBankBySlug(decodeSlug(slug));
  if (!detail) {
    return NextResponse.json(
      { error: { code: "DIRECTORY_UNAVAILABLE", message: "Live directory lookup failed." } },
      { status: 502 },
    );
  }
  return NextResponse.json({ data: detail });
}
