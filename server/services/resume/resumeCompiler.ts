import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { logger } from '../../utils/logger';
import { BadGatewayError } from '../../types';

const CACHE_DIR = path.join(process.cwd(), 'server', '.resume-cache');

/**
 * Sprint 11: "compile only when content changes" — the cache key is a
 * hash of the exact .tex source, so an unchanged variant is a filesystem
 * read (no process spawn) on every request after the first, and any data
 * edit (which changes the generated .tex string) automatically busts the
 * cache without any explicit invalidation logic. Cache is a plain
 * directory of files, not in-memory, so it also survives a server
 * restart — the first request after a redeploy with unchanged content
 * still skips recompilation.
 */
function cacheKeyFor(variantId: string, texSource: string): string {
  const hash = createHash('sha256').update(texSource).digest('hex').slice(0, 16);
  return `${variantId}-${hash}`;
}

function runTectonic(texPath: string, outDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tectonic', ['--outdir', outDir, texPath]);
    logger.info('[Resume] tectonic process spawned', { tectonicPid: proc.pid, texPath });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      // ENOENT here specifically means the `tectonic` binary isn't on PATH —
      // a missing-dependency failure, not a bad .tex source, so it gets the
      // same "upstream dependency" treatment as a real compile error below.
      reject(new BadGatewayError(`Failed to launch tectonic: ${err.message}`));
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new BadGatewayError(`tectonic exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

/** Sprint 11.3: runtime execution trace only — no behavior change. */
function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Compiles `texSource` to PDF bytes, or returns the cached PDF from a prior
 * compile of the exact same source. Never throws for "content changed" —
 * only for a genuine compiler failure (missing binary, bad .tex).
 */
export async function compileResumePdf(variantId: string, texSource: string): Promise<Buffer> {
  const cacheKey = cacheKeyFor(variantId, texSource);
  const pdfPath = path.join(CACHE_DIR, `${cacheKey}.pdf`);

  try {
    const cached = await readFile(pdfPath);
    logger.info('[Resume] Cache hit', { variantId, cacheKey, pdfPath });
    logger.info('[Resume] PDF size', { bytes: cached.length });
    logger.info('[Resume] SHA-256', { sha256: sha256Hex(cached) });
    return cached;
  } catch {
    logger.info('[Resume] Cache miss', { variantId, cacheKey });
  }

  await mkdir(CACHE_DIR, { recursive: true });
  const texPath = path.join(CACHE_DIR, `${cacheKey}.tex`);
  await writeFile(texPath, texSource, 'utf-8');

  logger.info('[Resume] Compile started', { variantId, cacheKey, texPath, pid: process.pid });
  const start = Date.now();
  await runTectonic(texPath, CACHE_DIR);
  logger.info('[Resume] Compile completed', { variantId, cacheKey, durationMs: Date.now() - start, pid: process.pid });

  const pdf = await readFile(pdfPath);
  logger.info('[Resume] PDF path', { pdfPath });
  logger.info('[Resume] PDF size', { bytes: pdf.length });
  logger.info('[Resume] SHA-256', { sha256: sha256Hex(pdf) });
  return pdf;
}
