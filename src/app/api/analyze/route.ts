import { z } from "zod";
import { NextResponse } from "next/server";
import { analyzeIdea } from "@/lib/analysis/pipeline";
import { ValidationModeSchema } from "@/lib/analysis/schemas";
import { enforceRateLimit, readBody, serverError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  idea: z.string().trim().min(12, "Describe the idea in at least a few words.").max(2000),
  mode: ValidationModeSchema.default("validate"),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const body = await readBody(request, BodySchema);
  if (!body.ok) return body.response;

  try {
    const result = await analyzeIdea(body.data.idea, body.data.mode);
    return NextResponse.json({
      analysis: result.data,
      dataSource: result.dataSource,
      notes: result.notes,
    });
  } catch (error) {
    console.error("[api/analyze]", error);
    return serverError("Could not structure this idea. Try again.");
  }
}
