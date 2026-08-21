import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SharedReport } from "@/components/shared-report";
import { loadRun } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/r/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await loadRun(id);
  if (!record) return { title: "Report not found — LaunchPilot" };

  const { synthesis, analysis } = record.run;
  return {
    title: `${synthesis.verdict} · ${synthesis.viability.overall}/100 — LaunchPilot`,
    description: `${analysis.idea} — ${synthesis.verdictReason}`,
  };
}

export default async function SharedReportPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  const record = await loadRun(id);
  if (!record) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <div className="lp-no-print border-b border-line bg-paper-raised/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-2.5">
          <span className="lp-margin-note">
            Shared case file · read only
          </span>
          <Link
            href="/"
            className="rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 text-xs font-medium text-forest transition-colors hover:border-forest/35 hover:bg-emerald-soft"
          >
            Validate your own idea
          </Link>
        </div>
      </div>
      <SharedReport
        run={record.run}
        filedAt={new Date(record.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      />
    </main>
  );
}
