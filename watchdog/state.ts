/**
 * Pure watchdog state for subagent sessions.
 *
 * No opencode imports on purpose: this module is unit-testable in isolation.
 */

export const DEFAULT_TIMEOUT_MS = 600_000;

export const WATCHDOG_ENV = 'OPENCODE_SUBAGENT_WATCHDOG';
export const TIMEOUT_ENV = 'OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS';

export interface WatchdogOptions {
  enabled: boolean;
  timeoutMs: number;
}

export interface RegistryOptions {
  timeoutMs: number;
  now?: () => number;
}

export interface SessionInfo {
  id: string;
  parentID?: string | null;
}

export type SessionActivityStatus = 'busy' | 'idle' | 'retry';

interface Entry {
  id: string;
  parentID?: string;
  lastActivity: number;
  status: SessionActivityStatus;
}

/**
 * Resolve watchdog options from an environment map.
 *
 * - `OPENCODE_SUBAGENT_WATCHDOG=off` disables the watchdog completely.
 * - `OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS` overrides the idle timeout; anything
 *   that is not a positive finite number falls back to the default.
 */
export function readOptions(env: Record<string, string | undefined>): WatchdogOptions {
  const enabled = env[WATCHDOG_ENV]?.trim().toLowerCase() !== 'off';
  const raw = env[TIMEOUT_ENV]?.trim() ?? '';
  const parsed = raw === '' ? Number.NaN : Number(raw);
  const timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;

  return { enabled, timeoutMs };
}

export function createRegistry(options: RegistryOptions) {
  const { timeoutMs } = options;
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, Entry>();

  const depthOf = (entry: Entry): number => {
    let depth = 0;
    let current = entries.get(entry.parentID ?? '');

    const seen = new Set<string>([entry.id]);

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      depth += 1;
      current = current.parentID ? entries.get(current.parentID) : undefined;
    }

    return depth;
  };

  /** Refresh activity on the session itself and on every known ancestor. */
  const touch = (sessionID: string, at: number): void => {
    const seen = new Set<string>();
    let current = entries.get(sessionID);

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      current.lastActivity = at;
      current = current.parentID ? entries.get(current.parentID) : undefined;
    }
  };

  const onChildCreated = (info: SessionInfo): void => {
    if (!info.parentID) {
      return;
    }

    const existing = entries.get(info.id);

    if (existing) {
      existing.parentID = info.parentID;
      return;
    }

    entries.set(info.id, {
      id: info.id,
      parentID: info.parentID,
      lastActivity: now(),
      status: 'idle',
    });
  };

  const onActivity = (sessionID: string): void => {
    touch(sessionID, now());
  };

  const onStatus = (sessionID: string, status: SessionActivityStatus): void => {
    const entry = entries.get(sessionID);

    if (entry) {
      entry.status = status;
    }
  };

  const onIdle = (sessionID: string): void => {
    const entry = entries.get(sessionID);

    if (entry) {
      entry.status = 'idle';
    }
  };

  const onDeleted = (sessionID: string): void => {
    entries.delete(sessionID);
  };

  /**
   * Pick sessions to abort in one tick.
   *
   * Only `busy`/`retry` sessions idle for at least `timeoutMs` qualify. A session
   * is skipped when one of its known descendants qualifies in the same tick, so
   * children are aborted first and a parent gets a chance to handle the failure.
   */
  const collectAborts = (at: number): string[] => {
    const candidates = [...entries.values()].filter(
      entry => (entry.status === 'busy' || entry.status === 'retry') && at - entry.lastActivity >= timeoutMs,
    );

    if (candidates.length === 0) {
      return [];
    }

    const candidateIDs = new Set(candidates.map(entry => entry.id));
    const parentsOfCandidates = new Set<string>();

    for (const candidate of candidates) {
      const seen = new Set<string>([candidate.id]);
      let parentID = candidate.parentID;

      while (parentID && !seen.has(parentID)) {
        seen.add(parentID);

        if (candidateIDs.has(parentID)) {
          parentsOfCandidates.add(parentID);
        }

        parentID = entries.get(parentID)?.parentID;
      }
    }

    const aborts = candidates
      .filter(entry => !parentsOfCandidates.has(entry.id))
      .sort((left, right) => depthOf(right) - depthOf(left) || left.id.localeCompare(right.id));

    for (const entry of aborts) {
      entries.delete(entry.id);

      if (entry.parentID) {
        touch(entry.parentID, at);
      }
    }

    return aborts.map(entry => entry.id);
  };

  return { collectAborts, onActivity, onChildCreated, onDeleted, onIdle, onStatus };
}
