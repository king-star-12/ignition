import { z } from "zod";
import { NextResponse } from "next/server";
import {
  DataSourceSchema,
  DomainReportSchema,
  ResearchEvidenceSchema,
  StartupIdeaAnalysisSchema,
  ValidationModeSchema,
  ViabilityAnalysisSchema,
} from "@/lib/analysis/schemas";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";
import { saveRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  mode: ValidationModeSchema,
  analysis: StartupIdeaAnalysisSchema,
  evidence: ResearchEvidenceSchema,
  synthesis: ViabilityAnalysisSchema,
  domains: DomainReportSchema,
  sources: z.object({
    llm: DataSourceSchema,
    research: DataSourceSchema,
    domains: DataSourceSchema,
  }),
});

/** Persists a completed run so it survives a refresh and can be shared. */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const record = await saveRun(body.data, new Date().toISOString());
    return NextResponse.json({ id: record.id, createdAt: record.createdAt });
  } catch (error) {
    console.error("[api/runs]", error);
    return serverError("Could not save this report.");
  }
}
