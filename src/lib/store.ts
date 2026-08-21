import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ValidationRun } from "@/lib/analysis/schemas";

/**
 * Saved reports, so a validation run survives a refresh and can be shared.
 *
 * Writes to .data/runs when the filesystem is writable, and falls back to an
 * in-memory ring buffer when it is not (read-only serverless containers).
 * Both sit behind this interface — swapping in Postgres or Redis later means
 * replacing this file and nothing else.
 */

export type StoredRun = {
  id: string;
  createdAt: string;
  run: ValidationRun;
};

const DIRECTORY = path.join(process.cwd(), ".data", "runs");
const MEMORY = new Map<string, StoredRun>();
const MEMORY_LIMIT = 200;

let filesystemUsable: boolean | null = null;

async function canUseFilesystem(): Promise<boolean> {
  if (filesystemUsable !== null) return filesystemUsable;
  try {
    await mkdir(DIRECTORY, { recursive: true });
    filesystemUsable = true;
  } catch (error) {
    console.warn("[store] filesystem unavailable, using memory store", error);
    filesystemUsable = false;
  }
  return filesystemUsable;
}

export function newRunId(): string {
  return randomBytes(9).toString("base64url");
}

function rememberInMemory(record: StoredRun) {
  if (MEMORY.size >= MEMORY_LIMIT) {
    const oldest = MEMORY.keys().next().value;
    if (oldest) MEMORY.delete(oldest);
  }
  MEMORY.set(record.id, record);
}

export async function saveRun(run: ValidationRun, createdAt: string): Promise<StoredRun> {
  const record: StoredRun = { id: newRunId(), createdAt, run };
  rememberInMemory(record);

  if (await canUseFilesystem()) {
    try {
      await writeFile(
        path.join(DIRECTORY, `${record.id}.json`),
        JSON.stringify(record),
        "utf8",
      );
    } catch (error) {
      console.error("[store] could not persist run", error);
    }
  }
  return record;
}

export async function loadRun(id: string): Promise<StoredRun | null> {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) return null;

  const cached = MEMORY.get(id);
  if (cached) return cached;

  if (await canUseFilesystem()) {
    try {
      const raw = await readFile(path.join(DIRECTORY, `${id}.json`), "utf8");
      const record = JSON.parse(raw) as StoredRun;
      rememberInMemory(record);
      return record;
    } catch {
      return null;
    }
  }
  return null;
}
