/**
 * `delete_file` tool for opencode V2: the only sanctioned way for an agent to
 * delete files.
 *
 * Every path is validated first (an existing file inside the project `src/`,
 * `.ts`/`.tsx` only); one invalid path cancels the whole request before
 * anything is touched. The surviving paths go through a single
 * `permission.assert` with the dedicated `delete` action — `coder` allows
 * production files and routes test files through an `ask` prompt, every other
 * agent denies. Only then are the files removed one by one.
 *
 * The opencode context is declared locally on purpose: this module stays free
 * of `@opencode/plugin` so it is unit-testable with a fake context.
 */

import { realpath, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { normalizeDeletePath, type DeletePathKind } from './policy';

const SERVICE = 'delete-tool';

/** Hard cap enforced in code beside the schema's `maxItems`. */
const MAX_PATHS = 50;

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

/** Tool execution context as passed by the V2 harness to `execute`. */
export interface DeleteToolExecuteContext {
  /** Agent the tool runs for; decides the `delete` permission outcome. */
  agent?: string;
  /** Tool call id inside the assistant message, used in the permission source. */
  id?: string;
  /** Assistant message carrying the tool call, used in the permission source. */
  messageID?: string;
  sessionID?: string;
  signal?: AbortSignal;
}

export interface DeletePermissionInput {
  action: string;
  agent?: string;
  resources: string[];
  /**
   * Empty on purpose: the permission is never remembered, so a test file asks
   * for confirmation again on every deletion.
   */
  save: string[];
  source: { id?: string; messageID?: string; type: string };
  sessionID?: string;
}

export interface DeletePermission {
  assert: (input: DeletePermissionInput) => Promise<unknown>;
}

export interface DeleteToolDefinition {
  description: string;
  execute: (input: unknown, context: DeleteToolExecuteContext) => Promise<{ content: string }>;
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
  add: (definition: DeleteToolDefinition) => void;
}

export interface DeleteToolContext {
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  location: {
    directory: string;
  };
  permission: DeletePermission;
  tool: {
    transform: (editor: (tools: ToolEditor) => void) => Promise<unknown>;
  };
}

interface ValidatedPath {
  kind: DeletePathKind;
  real: string;
  relative: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string | undefined {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  return typeof code === 'string' ? code : undefined;
}

/**
 * Register the `delete_file` tool on a plugin context. Returns nothing: the V2
 * `setup` hook accepts an empty cleanup.
 */
export async function installDeleteTool(ctx: DeleteToolContext): Promise<void> {
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

  const execute = async (input: unknown, context: DeleteToolExecuteContext): Promise<{ content: string }> => {
    if (!isRecord(input) || !Array.isArray(input.paths)) {
      throw new Error('delete_file: input must be an object with a "paths" array');
    }

    const paths: unknown[] = input.paths;

    if (paths.length === 0) {
      throw new Error('delete_file: paths must not be empty');
    }

    if (paths.length > MAX_PATHS) {
      throw new Error(`delete_file: at most ${MAX_PATHS} paths per call`);
    }

    for (const [index, raw] of paths.entries()) {
      if (typeof raw !== 'string' || raw.trim() === '') {
        throw new Error(`delete_file: paths[${index}] must be a non-empty string`);
      }
    }

    // The project directory may itself be reached through a symlink (for
    // example /tmp on macOS), so both sides are compared in real space.
    const projectRoot = await realpath(ctx.location.directory);
    const reasons: string[] = [];
    const validated: ValidatedPath[] = [];

    for (const raw of paths as string[]) {
      try {
        const requested = path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
        const real = await realpath(requested);
        const normalized = normalizeDeletePath(real, projectRoot);

        if (!normalized.ok) {
          reasons.push(`${raw} — ${normalized.reason}`);
          continue;
        }

        const stats = await stat(real);

        if (!stats.isFile()) {
          reasons.push(`${raw} — not a file`);
          continue;
        }

        validated.push({ kind: normalized.kind, real, relative: normalized.relative });
      }
      catch (error) {
        const reason = errorCode(error) === 'ENOENT' ? 'file does not exist' : errorMessage(error);

        reasons.push(`${raw} — ${reason}`);
      }
    }

    if (reasons.length > 0) {
      await log('warn', 'delete refused', { reasons });

      throw new Error(`delete_file refused, nothing was deleted:\n${reasons.map(reason => `- ${reason}`).join('\n')}`);
    }

    const resources = validated.map(item => item.relative);

    try {
      await ctx.permission.assert({
        action: 'delete',
        agent: context.agent,
        resources,
        save: [],
        source: { id: context.id, messageID: context.messageID, type: 'tool' },
        sessionID: context.sessionID,
      });
    }
    catch (error) {
      await log('warn', 'delete denied', { error: errorMessage(error), resources });

      throw error;
    }

    const report: string[] = [];

    for (const item of validated) {
      try {
        await rm(item.real, { force: false, signal: context.signal });
        report.push(`deleted: ${item.relative} (${item.kind})`);
      }
      catch (error) {
        report.push(`failed: ${item.relative} — ${errorMessage(error)}`);
      }
    }

    await log('info', 'delete executed', {
      deleted: report.filter(line => line.startsWith('deleted: ')).length,
      failed: report.filter(line => line.startsWith('failed: ')).length,
      resources,
    });

    return { content: report.join('\n') };
  };

  await ctx.tool.transform((tools) => {
    tools.add({
      name: 'delete_file',
      description: 'Delete existing project files under src/ (.ts/.tsx only). '
        + 'Every listed path is validated first; one invalid path cancels the whole request. '
        + 'Test files require the user to accept an ask prompt.',
      input: {
        type: 'object',
        properties: {
          paths: {
            description: 'Absolute or project-relative paths of the files to delete (1–50), inside src/, .ts/.tsx only',
            items: { type: 'string' },
            maxItems: MAX_PATHS,
            minItems: 1,
            type: 'array',
          },
        },
        required: ['paths'],
        additionalProperties: false,
      },
      // Without `codemode: false` the tool is registered as a Code Mode tool
      // and never appears in the model's native tool list.
      options: { codemode: false },
      execute,
    });
  });

  await log('info', 'delete-tool started', { directory: ctx.location.directory });
}
