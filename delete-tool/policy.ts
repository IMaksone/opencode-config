/**
 * Delete policy for the `delete_file` tool.
 *
 * Pure path validation and classification: no filesystem access and no
 * `@opencode/plugin` dependency, so the rules are unit-testable in isolation.
 * The test taxonomy mirrors the `edit` denies in `.opencode/agents/coder.md` —
 * keep the two lists in sync.
 */

import path from 'node:path';

/** File suffixes that mark a test file; mirrored in `agents/coder.md`. */
export const TEST_FILE_SUFFIXES: readonly string[] = ['.test.ts', '.test.tsx', '.testHelpers.ts'];

/** Directory prefixes whose whole subtree counts as test support; mirrored in `agents/coder.md`. */
export const TEST_PATH_PREFIXES: readonly string[] = ['src/shared/testing/', 'src/shared/api/testing/'];

/** Deletions are limited to TypeScript sources of the project. */
const ALLOWED_EXTENSIONS: readonly string[] = ['.ts', '.tsx'];

/** Deletions are limited to the project `src/` tree. */
const REQUIRED_PREFIX = 'src/';

export type DeletePathKind = 'production' | 'test';

export type NormalizedDeletePath =
  | { ok: true; relative: string; kind: DeletePathKind }
  | { ok: false; reason: string };

/** Drops empty and `.` segments; `..` segments are rejected by the caller. */
function cleanSegments(slashed: string): string[] {
  const segments: string[] = [];

  for (const segment of slashed.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }

    segments.push(segment);
  }

  return segments;
}

function isTestPath(relative: string): boolean {
  if (TEST_PATH_PREFIXES.some(prefix => relative.startsWith(prefix))) {
    return true;
  }

  const file = relative.split('/').pop() ?? '';

  return TEST_FILE_SUFFIXES.some(suffix => file.endsWith(suffix));
}

/**
 * Validate and normalize one candidate deletion path.
 *
 * `raw` may be absolute (inside `root`) or relative to `root`; backslashes are
 * accepted and converted to slashes. Any `..` segment, an escape from `root`,
 * a target outside `src/`, a non-TypeScript extension, or a directory-shaped
 * path is rejected with a short reason.
 */
export function normalizeDeletePath(raw: unknown, root: string): NormalizedDeletePath {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, reason: 'path must be a non-empty string' };
  }

  const slashed = raw.replaceAll('\\', '/');

  if (slashed.split('/').includes('..')) {
    return { ok: false, reason: 'path must not contain ".." segments' };
  }

  if (slashed.endsWith('/')) {
    return { ok: false, reason: 'path is a directory, not a file' };
  }

  let relative: string;

  if (slashed.startsWith('/')) {
    const resolved = path.resolve(root, slashed);

    if (resolved === root) {
      return { ok: false, reason: 'path is the project root, not a file' };
    }

    if (!resolved.startsWith(`${root}/`)) {
      return { ok: false, reason: 'path is outside the project root' };
    }

    relative = path.relative(root, resolved);
  }
  else {
    relative = cleanSegments(slashed).join('/');
  }

  if (relative === '') {
    return { ok: false, reason: 'path is the project root, not a file' };
  }

  if (!relative.startsWith(REQUIRED_PREFIX)) {
    return { ok: false, reason: 'path is outside src/' };
  }

  const file = relative.split('/').pop() ?? '';

  if (!ALLOWED_EXTENSIONS.some(extension => file.endsWith(extension))) {
    return { ok: false, reason: 'only .ts and .tsx files can be deleted' };
  }

  return { ok: true, relative, kind: isTestPath(relative) ? 'test' : 'production' };
}
