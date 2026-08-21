import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResearchResult } from "@/lib/analysis/schemas";

/**
 * Search results change slowly; a demo rehearsal changes nothing at all.
 * Caching by query is what turns a 250-search monthly allowance into an
 * unlimited number of practice runs.
 */

const DIRECTORY = path.join(process.cwd(), ".data", "search-cache");
const TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MEMORY = new Map<string, { at: number; results: ResearchResult[] }>();
const MEMORY_LIMIT = 500;

let filesystemUsable: boolean | null = null;

async function canUseFilesystem(): Promise<boolean> {
  if (filesystemUsable !== null) return filesystemUsable;
  try {
    await mkdir(DIRECTORY, { recursive: true });
    filesystemUsable = true;
  } catch {
    filesystemUsable = false;
  }
  return filesystemUsable;
}

export function cacheKey(provider: string, query: string): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(`${provider}:${normalized}`).digest("hex").slice(0, 32);
}

export async function readCache(
  provider: string,
  query: string,
  ttlMs = TTL_MS,
  now = Date.now(),
): Promise<ResearchResult[] | null> {
  const key = cacheKey(provider, query);

  const hot = MEMORY.get(key);
  if (hot && now - hot.at < ttlMs) return hot.results;

  if (await canUseFilesystem()) {
    try {
      const raw = await readFile(path.join(DIRECTORY, `${key}.json`), "utf8");
      const entry = JSON.parse(raw) as { at: number; results: ResearchResult[] };
      if (now - entry.at < ttlMs) {
        remember(key, entry);
        return entry.results;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function writeCache(
  provider: string,
  query: string,
  results: ResearchResult[],
  now = Date.now(),
): Promise<void> {
  // Never cache an empty answer — that would persist a transient failure.
  if (results.length === 0) return;

  const key = cacheKey(provider, query);
  const entry = { at: now, results };
  remember(key, entry);

  if (await canUseFilesystem()) {
    try {
      await writeFile(path.join(DIRECTORY, `${key}.json`), JSON.stringify(entry), "utf8");
    } catch (error) {
      console.warn("[search-cache] could not persist", error);
    }
  }
}

function remember(key: string, entry: { at: number; results: ResearchResult[] }) {
  if (MEMORY.size >= MEMORY_LIMIT) {
    const oldest = MEMORY.keys().next().value;
    if (oldest) MEMORY.delete(oldest);
  }
  MEMORY.set(key, entry);
}

/** Exposed for tests. */
export function resetSearchCache() {
  MEMORY.clear();
  filesystemUsable = null;
}
