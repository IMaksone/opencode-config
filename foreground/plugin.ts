/**
 * Foreground-only plugin: `background: true` on `shell`/`subagent` (and the V1
 * `bash`/`task` aliases) is normalized back to foreground before execution, and
 * the `background` parameter is stripped from the tool schemas the model sees.
 *
 * The opencode V2 plugin API surface used here is declared locally on purpose:
 * the entrypoint stays a thin `Plugin.define` wrapper, so this module is
 * testable with a fake context and loads without `@opencode/plugin`.
 */

import process from 'node:process';

import { BACKGROUND_TOOLS, forceForeground, stripBackgroundFromTools } from './policy';

const SERVICE = 'foreground-only';

/** Set to `off` (case-insensitive, trimmed) to keep background runs available. */
const ENV_KEY = 'OPENCODE_FOREGROUND_ONLY';

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

export interface ForegroundRegistration {
  dispose: () => Promise<unknown>;
}

export interface ForegroundToolExecuteEvent {
  sessionID?: string;
  tool?: string;
  input?: unknown;
}

export interface ForegroundSessionContextEvent {
  sessionID?: string;
  tools?: unknown;
}

export interface ForegroundContext {
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  session: {
    hook: (
      name: 'context',
      handler: (event: ForegroundSessionContextEvent) => Promise<void> | void,
    ) => Promise<ForegroundRegistration>;
  };
  tool: {
    hook: (
      name: 'execute.before',
      handler: (event: ForegroundToolExecuteEvent) => Promise<void> | void,
    ) => Promise<ForegroundRegistration>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The plugin stays on unless the switch is explicitly set to `off`. */
export function isEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env[ENV_KEY] ?? '').trim().toLowerCase() !== 'off';
}

/**
 * Register the plugin on a plugin context. Returns the cleanup function the V2
 * `setup` hook expects, or `undefined` when the plugin is disabled.
 */
export async function installForegroundOnly(ctx: ForegroundContext): Promise<(() => void) | undefined> {
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
    void log('info', 'foreground-only disabled by environment');

    return undefined;
  }

  const registrations: ForegroundRegistration[] = [];

  registrations.push(await ctx.tool.hook('execute.before', (event) => {
    try {
      const tool = event?.tool;

      if (typeof tool !== 'string' || !isRecord(event.input)) {
        return;
      }

      const rewritten = forceForeground(tool, event.input);

      if (!rewritten.changed) {
        return;
      }

      event.input = rewritten.input;
      void log('info', 'forced foreground', { sessionID: event.sessionID, tool });
    }
    catch (error) {
      // A failure here must never block the tool call: the run continues.
      void log('error', 'hook failed', { error: errorMessage(error), tool: event?.tool ?? 'execute.before' });
    }
  }));

  registrations.push(await ctx.session.hook('context', (event) => {
    try {
      if (!isRecord(event?.tools)) {
        return;
      }

      stripBackgroundFromTools(event.tools);
    }
    catch (error) {
      void log('error', 'hook failed', { error: errorMessage(error), tool: 'context' });
    }
  }));

  await log('info', 'foreground-only started', { enabled: true, tools: BACKGROUND_TOOLS });

  return () => {
    for (const registration of registrations) {
      void registration.dispose();
    }
  };
}
