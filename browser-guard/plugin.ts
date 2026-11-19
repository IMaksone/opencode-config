/**
 * Browser-guard plugin: live browser checks may navigate only to the local
 * dev server (`http://localhost:3000` / `http://127.0.0.1:3000`, plus
 * `about:blank`).
 *
 * No permission rule can express a URL allowlist for MCP tools (their
 * resource is always `*`), so the guard hooks `tool.execute.before` and
 * throws on a disallowed navigation — the tool call is blocked and the model
 * sees the reason naming the dev-server URL.
 *
 * The opencode V2 plugin API surface is declared locally on purpose: the
 * entrypoint stays a thin `Plugin.define` wrapper, so this module is
 * testable with a fake context and loads without `@opencode/plugin`.
 */

import process from 'node:process';

import { checkBrowserTool } from './policy';

const SERVICE = 'browser-guard';

/** Set to `off` (case-insensitive, trimmed) to disable the guard. */
const ENV_KEY = 'OPENCODE_BROWSER_GUARD';

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

export interface BrowserGuardRegistration {
  dispose: () => Promise<unknown>;
}

export interface BrowserToolExecuteEvent {
  sessionID?: string;
  tool?: string;
  input?: unknown;
}

export interface BrowserGuardContext {
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  tool: {
    hook: (
      name: 'execute.before',
      handler: (event: BrowserToolExecuteEvent) => Promise<void> | void,
    ) => Promise<BrowserGuardRegistration>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The guard stays on unless the switch is explicitly set to `off`. */
export function isEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env[ENV_KEY] ?? '').trim().toLowerCase() !== 'off';
}

/**
 * Register the guard on a plugin context. Returns the cleanup function the V2
 * `setup` hook expects, or `undefined` when the plugin is disabled.
 */
export async function installBrowserGuard(ctx: BrowserGuardContext): Promise<(() => void) | undefined> {
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
    void log('info', 'browser-guard disabled by environment');

    return undefined;
  }

  const registration = await ctx.tool.hook('execute.before', (event) => {
    const tool = event?.tool;

    if (typeof tool !== 'string') {
      return;
    }

    // A deliberate throw on a denied navigation blocks the tool call; the
    // model sees the reason and can retry with the dev-server URL.
    const verdict = checkBrowserTool(tool, isRecord(event.input) ? event.input : undefined);

    if (verdict.verdict === 'deny') {
      void log('warn', 'navigation refused', { sessionID: event.sessionID, tool, url: verdict.url });

      throw new Error(`browser-guard: ${verdict.reason}`);
    }
  });

  await log('info', 'browser-guard started');

  return () => {
    void registration.dispose();
  };
}
