import { z } from "zod";
import { NextResponse } from "next/server";
import { synthesizeEvidence } from "@/lib/analysis/pipeline";
import {
  ResearchEvidenceSchema,
  StartupIdeaAnalysisSchema,
  ValidationModeSchema,
} from "@/lib/analysis/schemas";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const BodySchema = z.object({
  analysis: StartupIdeaAnalysisSchema,
  evidence: ResearchEvidenceSchema,
  mode: ValidationModeSchema.default("validate"),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const result = await synthesizeEvidence(
      body.data.analysis,
      body.data.evidence,
      body.data.mode,
    );
    return NextResponse.json({
      synthesis: result.data,
      dataSource: result.dataSource,
      notes: result.notes,
    });
  } catch (error) {
    console.error("[api/synthesize]", error);
    return serverError("Synthesis failed.");
  }
}
