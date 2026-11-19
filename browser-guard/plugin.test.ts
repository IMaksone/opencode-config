import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { BrowserGuardContext, BrowserToolExecuteEvent } from './plugin';
import { installBrowserGuard, isEnabled } from './plugin';

interface LogCall {
  extra?: Record<string, unknown>;
  level: string;
  message: string;
  service: string;
}

type HookHandler = (event: BrowserToolExecuteEvent) => Promise<void> | void;

interface Harness {
  ctx: BrowserGuardContext;
  fire: (event: BrowserToolExecuteEvent) => Promise<void>;
  logCalls: LogCall[];
  registered: number;
}

function createHarness(): Harness {
  const logCalls: LogCall[] = [];
  const state: { handler?: HookHandler; registered: number } = { registered: 0 };

  const ctx: BrowserGuardContext = {
    app: {
      log: async ({ body }) => {
        logCalls.push({ extra: body.extra, level: body.level, message: body.message, service: body.service });
      },
    },
    tool: {
      hook: async (_name, handler) => {
        state.handler = handler;
        state.registered += 1;

        return { dispose: async () => undefined };
      },
    },
  };

  return {
    ctx,
    logCalls,
    get registered() {
      return state.registered;
    },
    fire: async (event) => {
      if (!state.handler) {
        throw new Error('execute.before handler was not registered');
      }

      await state.handler(event);
    },
  };
}

describe('installBrowserGuard', () => {
  beforeEach(() => {
    delete process.env.OPENCODE_BROWSER_GUARD;
  });

  afterEach(() => {
    delete process.env.OPENCODE_BROWSER_GUARD;
  });

  it('registers exactly one execute.before hook, logs the start, returns a cleanup', async () => {
    const harness = createHarness();

    const cleanup = await installBrowserGuard(harness.ctx);

    expect(typeof cleanup).toBe('function');
    expect(harness.registered).toBe(1);
    expect(harness.logCalls).toEqual([{ level: 'info', message: 'browser-guard started', service: 'browser-guard' }]);
  });

  it('does not throw on a navigation to the dev server or on inspection tools', async () => {
    const harness = createHarness();

    await installBrowserGuard(harness.ctx);

    await expect(harness.fire({ tool: 'browser_browser_navigate', input: { url: 'http://localhost:3000/main' } }))
      .resolves.toBeUndefined();
    await expect(harness.fire({ tool: 'browser_browser_navigate', input: { url: 'http://127.0.0.1:3000' } }))
      .resolves.toBeUndefined();
    await expect(harness.fire({ tool: 'browser_browser_tabs', input: { action: 'list' } })).resolves.toBeUndefined();
    await expect(harness.fire({ tool: 'browser_browser_snapshot' })).resolves.toBeUndefined();
  });

  it('throws with the dev-server reason on a navigation to 5173 and logs the refusal', async () => {
    const harness = createHarness();

    await installBrowserGuard(harness.ctx);

    await expect(harness.fire({
      sessionID: 'ses_1',
      tool: 'browser_browser_navigate',
      input: { url: 'http://localhost:5173' },
    })).rejects.toThrow(/browser-guard: browser checks are only allowed on the dev server http:\/\/localhost:3000/);

    const refused = harness.logCalls.filter(call => call.message === 'navigation refused');

    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({
      extra: { sessionID: 'ses_1', tool: 'browser_browser_navigate', url: 'http://localhost:5173' },
      level: 'warn',
      service: 'browser-guard',
    });
  });

  it('throws on a navigate call without input (malformed)', async () => {
    const harness = createHarness();

    await installBrowserGuard(harness.ctx);

    await expect(harness.fire({ tool: 'browser_browser_navigate' }))
      .rejects.toThrow('browser-guard: browser_browser_navigate requires a non-empty string url');
  });

  it('ignores events without a tool name', async () => {
    const harness = createHarness();

    await installBrowserGuard(harness.ctx);

    await expect(harness.fire({})).resolves.toBeUndefined();
    await expect(harness.fire({ tool: 42 })).resolves.toBeUndefined();
  });

  it('registers nothing when disabled through the environment', async () => {
    process.env.OPENCODE_BROWSER_GUARD = 'off';

    const harness = createHarness();

    const cleanup = await installBrowserGuard(harness.ctx);

    expect(cleanup).toBeUndefined();
    expect(harness.registered).toBe(0);
    expect(harness.logCalls).toEqual([{
      level: 'info',
      message: 'browser-guard disabled by environment',
      service: 'browser-guard',
    }]);
  });
});

describe('isEnabled', () => {
  it.each([['off'], ['OFF'], [' off ']])('is false for %s', (value) => {
    expect(isEnabled({ OPENCODE_BROWSER_GUARD: value })).toBe(false);
  });

  it('is true when unset or set to anything else', () => {
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ OPENCODE_BROWSER_GUARD: 'on' })).toBe(true);
  });
});
