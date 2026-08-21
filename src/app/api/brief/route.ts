import { z } from "zod";
import { NextResponse } from "next/server";
import { buildLaunchBrief } from "@/lib/analysis/brief";
import {
  DataSourceSchema,
  DomainReportSchema,
  ResearchEvidenceSchema,
  StartupIdeaAnalysisSchema,
  ValidationModeSchema,
  ViabilityAnalysisSchema,
} from "@/lib/analysis/schemas";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";

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

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const plan = buildLaunchBrief(body.data, new Date().toISOString().slice(0, 16).replace("T", " "));
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[api/brief]", error);
    return serverError("Could not generate the launch brief.");
  }
}
