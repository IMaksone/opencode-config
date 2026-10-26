/**
 * Subagent watchdog: aborts child sessions that stay `busy`/`retry` without any
 * activity for the configured idle timeout.
 *
 * The opencode V2 plugin API surface used here is declared locally on purpose:
 * the entrypoint stays a thin `Plugin.define` wrapper, so this module is
 * testable with a fake context and loads without `@opencode/plugin`.
 */

import process from 'node:process';

import { isSessionEvent, mapEvent } from './events';
import { createRegistry, readOptions } from './state';

const SERVICE = 'subagent-watchdog';
const TICK_MS = 30_000;

type LogLevel = 'debug' | 'error' | 'info' | 'warn';
type ToastVariant = 'error' | 'info' | 'success' | 'warning';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

export interface WatchdogSessionInfo {
  id: string;
  parentID?: string | null;
}

export interface ToolExecuteEvent {
  sessionID?: string;
  tool?: string;
}

export interface WatchdogContext {
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  event: {
    subscribe: (input: { signal: AbortSignal }) => AsyncIterable<unknown>;
  };
  location: {
    directory: string;
  };
  session: {
    interrupt: (input: { sessionID: string; resume: boolean }) => Promise<unknown>;
    list: (input: { directory: string; limit: number }) => Promise<{ data?: WatchdogSessionInfo[] }>;
  };
  tool: {
    hook: (
      name: 'execute.after',
      handler: (event: ToolExecuteEvent) => Promise<void> | void,
    ) => Promise<unknown>;
  };
  tui: {
    showToast: (input: { body: { message: string; title: string; variant: ToastVariant } }) => Promise<unknown>;
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Register the watchdog on a plugin context. Returns the cleanup function the
 * V2 `setup` hook expects, or `undefined` when the watchdog is disabled.
 */
export async function watch(ctx: WatchdogContext): Promise<(() => void) | undefined> {
  const options = readOptions(process.env);

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

  const toast = async (message: string, variant: ToastVariant): Promise<void> => {
    try {
      await ctx.tui.showToast({ body: { message, title: 'Subagent watchdog', variant } });
    }
    catch {
      // The TUI may be unavailable (headless runs); ignore.
    }
  };

  if (!options.enabled) {
    void log('info', 'watchdog disabled by environment');

    return undefined;
  }

  const registry = createRegistry({ timeoutMs: options.timeoutMs });
  const controller = new AbortController();

  const abortSession = async (sessionID: string): Promise<void> => {
    try {
      await ctx.session.interrupt({ resume: false, sessionID });
      await log('warn', 'aborted inactive subagent session', {
        sessionID,
        timeoutMs: options.timeoutMs,
      });
      await toast(`Субагент ${sessionID} не подавал признаков активности — сессия прервана`, 'warning');
    }
    catch (error) {
      await log('error', 'failed to abort inactive subagent session', {
        error: errorMessage(error),
        sessionID,
      });
      await toast(`Не удалось прервать сессию субагента ${sessionID}`, 'error');
    }
  };

  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        const mapped = mapEvent(event);

        if (!mapped) {
          const type = (event as { type?: unknown } | undefined)?.type;

          if (typeof type === 'string' && isSessionEvent(type)) {
            void log('debug', 'unmapped session event', { type });
          }

          continue;
        }

        switch (mapped.type) {
          case 'child-created': {
            registry.onChildCreated(mapped.info);
            break;
          }
          case 'activity': {
            registry.onActivity(mapped.sessionID);
            break;
          }
          case 'deleted': {
            registry.onDeleted(mapped.sessionID);
            break;
          }
          case 'status': {
            registry.onStatus(mapped.sessionID, mapped.status);
            break;
          }
          case 'idle': {
            registry.onIdle(mapped.sessionID);
            break;
          }
        }
      }
    }
    catch (error) {
      if (!controller.signal.aborted) {
        await log('error', 'event subscription failed', { error: errorMessage(error) });
      }
    }
  })();

  await ctx.tool.hook('execute.after', (event) => {
    if (event.sessionID) {
      registry.onActivity(event.sessionID);
    }
  });

  let ticking = false;

  const timer = setInterval(() => {
    if (ticking) {
      return;
    }

    ticking = true;

    void (async () => {
      try {
        for (const sessionID of registry.collectAborts(Date.now())) {
          await abortSession(sessionID);
        }
      }
      finally {
        ticking = false;
      }
    })();
  }, TICK_MS);

  try {
    const page = await ctx.session.list({ directory: ctx.location.directory, limit: 50 });

    for (const session of page.data ?? []) {
      registry.onChildCreated(session);
    }
  }
  catch (error) {
    await log('warn', 'initial session scan failed', { error: errorMessage(error) });
  }

  await log('info', 'watchdog started', { tickMs: TICK_MS, timeoutMs: options.timeoutMs });

  return () => {
    controller.abort();
    clearInterval(timer);
  };
}
