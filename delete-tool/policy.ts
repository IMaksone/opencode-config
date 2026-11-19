/**
 * Delete policy for the `delete_file` tool.
 *
 * Pure path validation and classification: no filesystem access and no
 * `@opencode/plugin` dependency, so the rules are unit-testable in isolation.
 * The test taxonomy mirrors the `edit` denies in `.opencode/agents/coder.md` —
 * keep the two lists in sync.
 *
 * Stack-agnostic by design: a path is classified as a test by its name alone
 * (`.test.`/`.spec.` infix, `__tests__`/`__snapshots__` directories, the usual
 * language-specific suffixes), production is everything else inside the
 * project root, and protected files (`.env*`, `*.local`, `.git` internals)
 * are never deletable. Project-specific test layout belongs to variant
 * branches — see the README adaptation guide.
 */

import path from 'node:path';

/** Basename markers that make a file count as a test; mirrored in `agents/coder.md`. */
export const TEST_NAME_MARKERS: readonly string[] = [
  '.test.',
  '.spec.',
];

/** Basename suffixes that make a file count as a test; mirrored in `agents/coder.md`. */
export const TEST_FILE_SUFFIXES: readonly string[] = [
  '_test.go',
  '_test.py',
  '_test.rs',
  'Test.java',
  'Tests.java',
  '.snap',
];

/** Exact basenames that count as test support files. */
export const TEST_FILE_BASENAMES: readonly string[] = ['conftest.py'];

/** Basename prefix+suffix pairs that make a file count as a test (e.g. Python `test_*.py`). */
export const TEST_NAME_PREFIX_SUFFIXES: readonly [prefix: string, suffix: string][] = [
  ['test_', '.py'],
];

/** Path segments whose whole subtree counts as test support; mirrored in `agents/coder.md`. */
export const TEST_PATH_SEGMENTS: readonly string[] = ['__tests__', '__snapshots__'];

/** Directory prefixes inside the project that are never deletable. */
const PROTECTED_PREFIXES: readonly string[] = ['.git/', '.hg/', '.svn/'];

/** Basename suffixes of protected files. */
const PROTECTED_SUFFIXES: readonly string[] = ['.env', '.local'];

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
  const segments = relative.split('/');
  const file = segments.pop() ?? '';

  if (TEST_PATH_SEGMENTS.some(segment => segments.includes(segment))) {
    return true;
  }

  if (TEST_FILE_BASENAMES.includes(file)) {
    return true;
  }

  if (TEST_NAME_MARKERS.some(marker => file.includes(marker))) {
    return true;
  }

  if (TEST_NAME_PREFIX_SUFFIXES.some(([prefix, suffix]) => file.startsWith(prefix) && file.endsWith(suffix))) {
    return true;
  }

  return TEST_FILE_SUFFIXES.some(suffix => file.endsWith(suffix));
}

function isProtectedPath(relative: string): boolean {
  if (PROTECTED_PREFIXES.some(prefix => relative.startsWith(prefix))) {
    return true;
  }

  const file = relative.split('/').pop() ?? '';

  return file === '.env' || PROTECTED_SUFFIXES.some(suffix => file.endsWith(suffix));
}

/**
 * Validate and normalize one candidate deletion path.
 *
 * `raw` may be absolute (inside `root`) or relative to `root`; backslashes are
 * accepted and converted to slashes. Any `..` segment, an escape from `root`,
 * the project root itself, a protected file, or a directory-shaped path is
 * rejected with a short reason.
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

  if (isProtectedPath(relative)) {
    return { ok: false, reason: 'path is protected (.env*, *.local, VCS internals) and cannot be deleted' };
  }

  return { ok: true, relative, kind: isTestPath(relative) ? 'test' : 'production' };
}
