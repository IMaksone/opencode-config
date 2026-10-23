import type { Plugin } from '@opencode-ai/plugin';

import process from 'node:process';

import { createRegistry, readOptions } from '../watchdog/state';

const SERVICE = 'subagent-watchdog';
const TICK_MS = 30_000;

type LogLevel = 'debug' | 'error' | 'info' | 'warn';
type ToastVariant = 'error' | 'info' | 'success' | 'warning';

/**
 * Aborts subagent sessions (`parentID != null`) that stay `busy`/`retry`
 * without any activity for the configured idle timeout.
 */
export const SubagentWatchdog: Plugin = async ({ client }) => {
  const options = readOptions(process.env);

  const log = async (level: LogLevel, message: string, extra?: Record<string, unknown>): Promise<void> => {
    try {
      await client.app.log({ body: { extra, level, message, service: SERVICE } });
    }
    catch {
      // Logging must never break the harness.
    }
  };

  const toast = async (message: string, variant: ToastVariant): Promise<void> => {
    try {
      await client.tui.showToast({ body: { message, title: 'Subagent watchdog', variant } });
    }
    catch {
      // The TUI may be unavailable (headless runs); ignore.
    }
  };

  if (!options.enabled) {
    void log('info', 'watchdog disabled by environment');

    return {};
  }

  const registry = createRegistry({ timeoutMs: options.timeoutMs });

  const abortSession = async (sessionID: string): Promise<void> => {
    try {
      await client.session.abort({ path: { id: sessionID } });
      await log('warn', 'aborted inactive subagent session', {
        sessionID,
        timeoutMs: options.timeoutMs,
      });
      await toast(`Субагент ${sessionID} не подавал признаков активности — сессия прервана`, 'warning');
    }
    catch (error) {
      await log('error', 'failed to abort inactive subagent session', {
        error: String(error),
        sessionID,
      });
      await toast(`Не удалось прервать сессию субагента ${sessionID}`, 'error');
    }
  };

  let ticking = false;

  const tick = async (): Promise<void> => {
    if (ticking) {
      return;
    }

    ticking = true;

    try {
      const sessionIDs = registry.collectAborts(Date.now());

      for (const sessionID of sessionIDs) {
        await abortSession(sessionID);
      }
    }
    finally {
      ticking = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, TICK_MS);

  /**
   * Never await the client before returning the hooks: at plugin load the server
   * is not accepting connections yet, and an awaited call deadlocks the bootstrap.
   * The scan is delayed so the server is up by the time it runs.
   */
  const bootstrap = async (): Promise<void> => {
    try {
      const listed = await client.session.list();

      for (const session of listed.data ?? []) {
        registry.onChildCreated(session);
      }
    }
    catch (error) {
      await log('warn', 'initial session scan failed', { error: String(error) });
    }

    await log('info', 'watchdog started', { tickMs: TICK_MS, timeoutMs: options.timeoutMs });
  };

  const bootstrapTimer = setTimeout(() => {
    void bootstrap();
  }, 1_000);

  return {
    'dispose': async () => {
      clearInterval(timer);
      clearTimeout(bootstrapTimer);
    },
    'event': async ({ event }) => {
      try {
        switch (event.type) {
          case 'session.created': {
            registry.onChildCreated(event.properties.info);
            break;
          }
          case 'session.updated': {
            registry.onActivity(event.properties.info.id);
            break;
          }
          case 'session.deleted': {
            registry.onDeleted(event.properties.info.id);
            break;
          }
          case 'session.status': {
            registry.onStatus(event.properties.sessionID, event.properties.status.type);
            break;
          }
          case 'session.idle': {
            registry.onIdle(event.properties.sessionID);
            break;
          }
          case 'session.diff': {
            registry.onActivity(event.properties.sessionID);
            break;
          }
          case 'message.updated': {
            registry.onActivity(event.properties.info.sessionID);
            break;
          }
          case 'message.part.updated': {
            registry.onActivity(event.properties.part.sessionID);
            break;
          }
          default: {
            break;
          }
        }
      }
      catch (error) {
        await log('error', 'event handling failed', { error: String(error), type: event.type });
      }
    },
    'tool.execute.after': async (input) => {
      try {
        registry.onActivity(input.sessionID);
      }
      catch (error) {
        await log('error', 'tool hook failed', { error: String(error), tool: input.tool });
      }
    },
  };
};
