import { z } from "zod";
import { NextResponse } from "next/server";
import { StartupIdeaAnalysisSchema, ValidationModeSchema } from "@/lib/analysis/schemas";
import { researchIdea } from "@/lib/research/engine";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  analysis: StartupIdeaAnalysisSchema,
  mode: ValidationModeSchema.default("validate"),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const evidence = await researchIdea(body.data.analysis, body.data.mode);
    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("[api/research]", error);
    return serverError("Web research failed.");
  }
}
