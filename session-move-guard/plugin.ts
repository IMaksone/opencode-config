/**
 * `session_move` tool for opencode V2: the sanctioned way to move the session
 * working directory.
 *
 * Order of checks in `execute`: light input shape first, then the dedicated
 * `session_move` permission (`permission.assert` with `save: []` — the rules
 * in config decide, no prompt is ever shown), and only then the full target
 * validation. The allowed-target list is revealed in refusal messages only,
 * so an agent that failed `assert` never sees it.
 *
 * Validated targets: the canonical project root (return to the main folder)
 * and git worktrees of the project — proven by the linked-worktree marker
 * `<wt>/.git` → `gitdir: <root>/.git/worktrees/<name>` or by the native
 * opencode worktree inventory, and each worktree must carry the agent kit
 * (`<wt>/.opencode`; a missing or broken kit is refused before the move, so
 * the session never lands in a location without the project agents). The
 * move itself is `ctx.session.move` — the confirmation is the tool message
 * in chat plus the server log.
 *
 * The opencode context is declared locally on purpose: this module stays free
 * of `@opencode/plugin` so it is unit-testable with a fake context.
 */

import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { validateMoveTarget } from './policy';

const SERVICE = 'session-move-guard';

/** Set to `off` (case-insensitive, trimmed) to disable the tool. */
const ENV_KEY = 'OPENCODE_SESSION_MOVE_GUARD';

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

/** Tool execution context as passed by the V2 harness to `execute`. */
export interface SessionMoveToolExecuteContext {
  /** Agent the tool runs for; decides the `session_move` permission outcome. */
  agent?: string;
  /** Tool call id inside the assistant message, used in the permission source. */
  id?: string;
  /** Assistant message carrying the tool call, used in the permission source. */
  messageID?: string;
  sessionID?: string;
  signal?: AbortSignal;
}

export interface SessionMovePermissionInput {
  action: string;
  agent?: string;
  resources: string[];
  /**
   * Empty on purpose: the permission is never remembered. The config rules
   * (global `deny`, `tdd` allow) decide, so no prompt can appear.
   */
  save: string[];
  source: { id?: string; messageID?: string; type: string };
  sessionID?: string;
}

export interface SessionMovePermission {
  assert: (input: SessionMovePermissionInput) => Promise<unknown>;
}

export interface SessionMoveToolDefinition {
  description: string;
  execute: (input: unknown, context: SessionMoveToolExecuteContext) => Promise<{ content: string }>;
  input: {
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
    type: 'object';
  };
  name: string;
  options?: {
    codemode?: boolean;
  };
}

export interface ToolEditor {
  add: (definition: SessionMoveToolDefinition) => void;
}

/** Input of `ctx.session.move` — `SessionMoveInput` per the installed SDK. */
export interface SessionMoveInput {
  sessionID: string;
  directory: string;
}

export interface SessionMoveGuardContext {
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  location: {
    directory: string;
    /** `canonical` and `id` are required by the installed schema types; the
     * fallbacks below guard against a type/runtime drift. */
    project?: { canonical?: string; id?: string };
  };
  permission: SessionMovePermission;
  session: {
    move: (input: SessionMoveInput) => Promise<unknown>;
  };
  tool: {
    transform: (editor: (tools: ToolEditor) => void) => Promise<unknown>;
  };
  /** Native worktree inventory; knows only worktrees recorded by opencode. */
  worktree?: {
    list: (input: { projectID: string }) => Promise<readonly { directory: string }[]>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The tool stays on unless the switch is explicitly set to `off`. */
export function isEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env[ENV_KEY] ?? '').trim().toLowerCase() !== 'off';
}

/**
 * Register the `session_move` tool on a plugin context. Returns nothing: the
 * V2 `setup` hook accepts an empty cleanup. When disabled through the
 * environment, nothing is registered at all.
 */
export async function installSessionMoveGuard(ctx: SessionMoveGuardContext): Promise<void> {
  const log = async (level: LogLevel, message: string, extra?: Record<string, unknown>): Promise<void> => {
    try {
      await ctx.app.log({ body: { extra, level, message, service: SERVICE } });
    }
    catch {
      // V2 plugin contexts expose no app.log: the server captures console
      // output into its own log instead. Logging must never break the harness.
      try {
        const suffix = extra === undefined ? '' : ` ${JSON.stringify(extra)}`;

        if (level === 'error' || level === 'warn') {
          console.error(`${SERVICE} ${level}: ${message}${suffix}`);
        }
        else {
          console.log(`${SERVICE} ${level}: ${message}${suffix}`);
        }
      }
      catch {
        // Ignore logging failures entirely.
      }
    }
  };

  if (!isEnabled()) {
    void log('info', 'session-move-guard disabled by environment');

    return;
  }

  // Real (symlink-resolved) path of the canonical project root. The declared
  // `ctx.location.project.canonical` wins; `ctx.location.directory` +
  // realpath is the fallback protecting against a type/runtime drift.
  const canonicalRootReal = async (): Promise<string> => {
    const declared = ctx.location.project?.canonical;

    return realpath(typeof declared === 'string' && declared !== '' ? declared : ctx.location.directory);
  };

  // Directories of the native worktree inventory; empty on any problem — the
  // gitdir marker check is the primary proof, the inventory only adds more.
  const inventoryRoots = async (): Promise<string[]> => {
    const projectID = ctx.location.project?.id;
    const list = ctx.worktree?.list;

    if (typeof projectID !== 'string' || projectID === '' || typeof list !== 'function') {
      return [];
    }

    try {
      const entries = await list({ projectID });
      const roots: string[] = [];

      for (const entry of entries) {
        try {
          // Real-space comparison: on macOS the inventory may record
          // `/var/...` while the resolved target is `/private/var/...`.
          roots.push(await realpath(entry.directory));
        }
        catch {
          roots.push(entry.directory);
        }
      }

      return roots;
    }
    catch (error) {
      await log('debug', 'worktree inventory unavailable', { error: errorMessage(error) });

      return [];
    }
  };

  const execute = async (input: unknown, context: SessionMoveToolExecuteContext): Promise<{ content: string }> => {
    if (!isRecord(input) || typeof input.directory !== 'string' || input.directory.trim() === '') {
      throw new Error('session_move: input must be an object with a non-empty "directory" string');
    }

    const raw = input.directory;

    if (!path.isAbsolute(raw)) {
      throw new Error('session_move: directory must be an absolute path');
    }

    const requested = path.normalize(raw);
    let targetReal: string | undefined;

    try {
      targetReal = await realpath(requested);
    }
    catch {
      targetReal = undefined;
    }

    // Rights before details: a denied agent must not learn the allowed list.
    try {
      await ctx.permission.assert({
        action: 'session_move',
        agent: context.agent,
        resources: [targetReal ?? requested],
        save: [],
        source: { id: context.id, messageID: context.messageID, type: 'tool' },
        sessionID: context.sessionID,
      });
    }
    catch (error) {
      await log('warn', 'move denied', { directory: requested, error: errorMessage(error) });

      throw error;
    }

    let canonicalRoot: string;

    try {
      canonicalRoot = await canonicalRootReal();
    }
    catch (error) {
      await log('error', 'move failed', { directory: requested, error: errorMessage(error) });

      throw error;
    }

    let targetIsDirectory = false;
    let dotGitContent: string | undefined;
    let targetKitPresent: boolean | undefined;

    if (targetReal !== undefined) {
      try {
        targetIsDirectory = (await stat(targetReal)).isDirectory();
      }
      catch {
        targetIsDirectory = false;
      }

      if (targetIsDirectory) {
        const dotGitPath = path.join(targetReal, '.git');

        try {
          if ((await stat(dotGitPath)).isFile()) {
            dotGitContent = await readFile(dotGitPath, 'utf8');
          }
        }
        catch {
          dotGitContent = undefined;
        }

        // The agent kit of the target: `<target>/.opencode` as a directory or
        // a symlink to one (`stat` follows symlinks). A missing or broken
        // link means no kit — a session moved there cannot resolve the
        // project agents. The fact gates worktree verdicts only; the project
        // root is the kit source and ignores it.
        try {
          targetKitPresent = (await stat(path.join(targetReal, '.opencode'))).isDirectory();
        }
        catch {
          targetKitPresent = false;
        }
      }
    }

    const verdict = validateMoveTarget({
      rawDirectory: raw,
      canonicalRoot,
      targetReal,
      targetIsDirectory,
      dotGitContent,
      targetKitPresent,
      worktreeRoots: await inventoryRoots(),
    });

    if (!verdict.ok) {
      await log('warn', 'move refused', { directory: requested, reason: verdict.reason });

      throw new Error(`session_move: ${verdict.reason}`);
    }

    if (typeof context.sessionID !== 'string' || context.sessionID === '') {
      throw new Error('session_move: tool context carries no sessionID');
    }

    try {
      await ctx.session.move({ sessionID: context.sessionID, directory: verdict.real });
    }
    catch (error) {
      // Quote the server message: the model sees the actual failure cause.
      await log('error', 'move failed', { directory: verdict.real, error: errorMessage(error) });

      throw new Error(`session_move: session.move failed — ${errorMessage(error)}`);
    }

    await log('info', 'move executed', { directory: verdict.real, kind: verdict.kind });

    return { content: `session moved to ${verdict.real} (${verdict.kind})` };
  };

  await ctx.tool.transform((tools) => {
    tools.add({
      name: 'session_move',
      description: 'Move the session working directory to the project root or one of its git worktrees; '
        + 'any other directory is refused. The move is reported in chat and logged; no prompt is shown.',
      input: {
        type: 'object',
        properties: {
          directory: {
            description: 'Absolute path of the move target: the project root or one of its git worktrees',
            type: 'string',
          },
        },
        required: ['directory'],
        additionalProperties: false,
      },
      // Without `codemode: false` the tool is registered as a Code Mode tool
      // and never appears in the model's native tool list.
      options: { codemode: false },
      execute,
    });
  });

  await log('info', 'session-move-guard started', { directory: ctx.location.directory });
}
