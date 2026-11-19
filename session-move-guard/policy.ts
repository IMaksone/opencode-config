/**
 * Move policy for the `session_move` tool.
 *
 * Pure classification of a move target: no filesystem access and no
 * `@opencode/plugin` dependency, so the rules are unit-testable in isolation.
 * All facts are read by the plugin and passed in already resolved.
 *
 * Allowed targets: the canonical project root (`project-root`, the way back to
 * the main folder) and any git worktree of that project (`worktree`) — either
 * proven by the linked-worktree marker `<wt>/.git` → `gitdir:
 * <root>/.git/worktrees/<name>` or listed in the native opencode worktree
 * inventory. A proven worktree must also carry the agent kit
 * (`<wt>/.opencode`, a directory or a symlink to one): without it the session
 * would land in a location whose config knows none of the project agents.
 * Everything else is refused with the allowed list.
 */

import path from 'node:path';

export type MoveTargetKind = 'project-root' | 'worktree';

/**
 * Refusal for a proven worktree without the agent kit. Names the recovery
 * action (`worktree.kit`) and the restart: linking the kit alone is not
 * enough, the config snapshot is bound to the running process.
 */
const MISSING_KIT_REASON = 'target worktree has no .opencode agent kit; '
  + 'link it first: git-manager worktree.kit <name>, then opencode service restart';

export type MoveTargetVerdict =
  | { ok: true; kind: MoveTargetKind; real: string }
  | { ok: false; reason: string };

/** Facts about one move request, gathered by the plugin before validation. */
export interface MoveTargetFacts {
  /** Raw `directory` input exactly as the model passed it. */
  rawDirectory: unknown;
  /** Real (symlink-resolved) path of the project canonical root. */
  canonicalRoot: string;
  /** Real path of the target when it exists, `undefined` otherwise. */
  targetReal?: string;
  /** Whether the target exists and is a directory. */
  targetIsDirectory: boolean;
  /** Content of `<target>/.git` when it is a file (linked worktree marker). */
  dotGitContent?: string;
  /** Directories from the native opencode worktree inventory (may be empty). */
  worktreeRoots?: readonly string[];
  /**
   * Whether `<target>/.opencode` exists as a directory (a symlink counts —
   * the fact is gathered with `stat`, which follows symlinks; a broken
   * symlink means no kit). Required for `worktree` verdicts; ignored for
   * `project-root` — the root is the kit source.
   */
  targetKitPresent?: boolean;
}

/**
 * Normalized form of a directory path: no `.`/`..` segments and no trailing
 * slash (`path.normalize` alone keeps one), so list comparisons and the
 * `worktrees/` prefix check cannot be fooled by spelling differences.
 */
function normalizeDirectory(value: string): string {
  const normalized = path.normalize(value);

  return normalized.length > 1 && normalized.endsWith('/') ? normalized.replace(/\/+$/, '') : normalized;
}

/**
 * Name of the worktree recorded in a linked-worktree `.git` marker file, when
 * the marker points into `<canonicalRoot>/.git/worktrees/` of this project.
 *
 * Exactly one plain segment may follow `worktrees/`: no nesting, no `.`, no
 * `..` — otherwise `worktrees/../../..`-style escapes would pass as worktrees.
 */
function worktreeNameFromGitdir(content: string, canonicalRoot: string): string | undefined {
  const gitdirLine = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.startsWith('gitdir:'));

  if (!gitdirLine) {
    return undefined;
  }

  const gitdir = normalizeDirectory(gitdirLine.slice('gitdir:'.length).trim());
  const prefix = `${normalizeDirectory(canonicalRoot)}/.git/worktrees/`;

  if (!gitdir.startsWith(prefix)) {
    return undefined;
  }

  const name = normalizeDirectory(gitdir.slice(prefix.length));

  if (name === '' || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    return undefined;
  }

  return name;
}

/** Unique allowed targets for refusal messages: the root plus the inventory. */
export function allowedTargets(canonicalRoot: string, worktreeRoots: readonly string[]): string[] {
  const root = normalizeDirectory(canonicalRoot);
  const allowed = [root];

  for (const entry of worktreeRoots) {
    const normalized = normalizeDirectory(entry);

    if (!allowed.includes(normalized)) {
      allowed.push(normalized);
    }
  }

  return allowed;
}

/**
 * Validate one move request against the gathered facts.
 *
 * The order is deliberate: input shape first, then the project root (the
 * return-to-main case), then the worktree proof (gitdir marker or inventory)
 * with the kit gate applied only to a proven worktree, and only then the
 * refusal that names every allowed target. Without a proof the kit fact is
 * not consulted: garbage and foreign markers keep the generic refusal.
 */
export function validateMoveTarget(facts: MoveTargetFacts): MoveTargetVerdict {
  const { rawDirectory } = facts;

  if (typeof rawDirectory !== 'string' || rawDirectory.trim() === '') {
    return { ok: false, reason: 'directory must be a non-empty string' };
  }

  if (!path.isAbsolute(rawDirectory)) {
    return { ok: false, reason: 'directory must be an absolute path' };
  }

  const canonicalRoot = normalizeDirectory(facts.canonicalRoot);

  if (facts.targetReal === undefined) {
    return { ok: false, reason: `directory does not exist: ${rawDirectory}` };
  }

  const targetReal = normalizeDirectory(facts.targetReal);

  if (!facts.targetIsDirectory) {
    return { ok: false, reason: `target is not a directory: ${targetReal}` };
  }

  if (targetReal === canonicalRoot) {
    return { ok: true, kind: 'project-root', real: targetReal };
  }

  const worktreeRoots = (facts.worktreeRoots ?? []).map(root => normalizeDirectory(root));

  const provenWorktree = (typeof facts.dotGitContent === 'string'
    && worktreeNameFromGitdir(facts.dotGitContent, canonicalRoot) !== undefined)
    || worktreeRoots.includes(targetReal);

  if (provenWorktree) {
    return facts.targetKitPresent === true
      ? { ok: true, kind: 'worktree', real: targetReal }
      : { ok: false, reason: MISSING_KIT_REASON };
  }

  return {
    ok: false,
    reason: `target is not the project root or one of its worktrees; allowed: ${allowedTargets(canonicalRoot, worktreeRoots).join(', ')}`,
  };
}
