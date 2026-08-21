import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <Logo />
      <FileQuestion className="mt-10 size-7 text-ink-subtle" />
      <h1 className="lp-display mt-5 text-[26px] text-forest">That report isn&apos;t here</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
        Shared reports can expire if the server restarted since the link was created. The idea
        behind it can be validated again in about ten seconds.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex h-12 items-center rounded-xl border border-forest-deep/60 bg-forest px-6 text-sm font-medium text-paper transition-colors hover:bg-forest-mid"
      >
        Validate an idea
      </Link>
    </main>
  );
}
