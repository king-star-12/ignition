import { z } from "zod";
import { NextResponse } from "next/server";
import { StartupIdeaAnalysisSchema } from "@/lib/analysis/schemas";
import { findDomains } from "@/lib/domains/namecom";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ analysis: StartupIdeaAnalysisSchema });

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 45, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const domains = await findDomains(body.data.analysis);
    return NextResponse.json({ domains });
  } catch (error) {
    console.error("[api/domains]", error);
    return serverError("Domain lookup failed.");
  }
}
