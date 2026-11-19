import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ToolExecuteEvent, WatchdogContext } from './plugin';
import { watch } from './plugin';

interface FakeStream {
  emit: (event: unknown) => Promise<void>;
  subscribe: WatchdogContext['event']['subscribe'];
}

interface FakeContext {
  ctx: WatchdogContext;
  hooks: Map<string, (event: ToolExecuteEvent) => Promise<void> | void>;
  stream: FakeStream;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

function createStream(): FakeStream {
  const pending: unknown[] = [];
  let wake: (() => void) | undefined;

  return {
    async emit(event) {
      pending.push(event);
      wake?.();
      wake = undefined;
      await settle();
    },
    async *subscribe() {
      while (true) {
        if (pending.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }

        const next = pending.shift();

        if (next !== undefined) {
          yield next;
        }
      }
    },
  };
}

function createContext(list: () => Promise<unknown> = async () => ({ data: [] })): FakeContext {
  const stream = createStream();
  const hooks = new Map<string, (event: ToolExecuteEvent) => Promise<void> | void>();

  const ctx: WatchdogContext = {
    app: { log: vi.fn(async () => ({ data: true })) },
    event: { subscribe: stream.subscribe },
    location: { directory: '/repo' },
    session: {
      interrupt: vi.fn(async () => ({ data: true })),
      list: vi.fn(list),
    },
    tool: {
      hook: vi.fn(async (name: string, handler: (event: ToolExecuteEvent) => Promise<void> | void) => {
        hooks.set(name, handler);

        return { dispose: () => {} };
      }),
    },
    tui: { showToast: vi.fn(async () => ({ data: true })) },
  } as unknown as WatchdogContext;

  return { ctx, hooks, stream };
}

const childCreated = { properties: { info: { id: 'child', parentID: 'root' } }, type: 'session.created' };
const childBusy = { properties: { sessionID: 'child', status: { type: 'busy' } }, type: 'session.status' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('OPENCODE_SUBAGENT_WATCHDOG', 'on');
  vi.stubEnv('OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS', '1000');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('subagentWatchdog plugin', () => {
  it('registers the tool hook, scans known sessions and returns a cleanup', async () => {
    const { ctx, hooks } = createContext(async () => ({ data: [{ id: 'child', parentID: 'root' }] }));
    const cleanup = await watch(ctx);

    expect(hooks.has('execute.after')).toBe(true);
    expect(ctx.session.list).toHaveBeenCalledWith({ directory: '/repo', limit: 50 });
    expect(typeof cleanup).toBe('function');
    expect(ctx.app.log).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: 'watchdog started', service: 'subagent-watchdog' }),
      }),
    );
  });

  it('aborts an idle busy child on the tick and reports it', async () => {
    const { ctx, stream } = createContext();
    await watch(ctx);

    await stream.emit(childCreated);
    await stream.emit(childBusy);
    await vi.advanceTimersByTimeAsync(31_000);

    expect(ctx.session.interrupt).toHaveBeenCalledTimes(1);
    expect(ctx.session.interrupt).toHaveBeenCalledWith({ resume: false, sessionID: 'child' });
    expect(ctx.app.log).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ level: 'warn', message: 'aborted inactive subagent session' }),
      }),
    );
    expect(ctx.tui.showToast).toHaveBeenCalledTimes(1);
  });

  it('keeps a child alive while activity keeps coming', async () => {
    const { ctx, stream } = createContext();
    await watch(ctx);

    await stream.emit(childCreated);
    await stream.emit(childBusy);

    await vi.advanceTimersByTimeAsync(900);
    await stream.emit({ properties: { sessionID: 'child' }, type: 'session.diff' });
    await vi.advanceTimersByTimeAsync(900);

    expect(ctx.session.interrupt).not.toHaveBeenCalled();
  });

  it('counts a finished tool call as activity', async () => {
    const { ctx, hooks, stream } = createContext();
    await watch(ctx);

    await stream.emit(childCreated);
    await stream.emit(childBusy);

    await vi.advanceTimersByTimeAsync(900);
    await hooks.get('execute.after')?.({ sessionID: 'child', tool: 'read' });
    await vi.advanceTimersByTimeAsync(900);

    expect(ctx.session.interrupt).not.toHaveBeenCalled();
  });

  it('never tracks a root session', async () => {
    const { ctx, stream } = createContext();
    await watch(ctx);

    await stream.emit({ properties: { info: { id: 'root' } }, type: 'session.created' });
    await stream.emit({ properties: { sessionID: 'root', status: { type: 'busy' } }, type: 'session.status' });
    await vi.advanceTimersByTimeAsync(31_000);

    expect(ctx.session.interrupt).not.toHaveBeenCalled();
  });

  it('stops the interval on cleanup', async () => {
    const { ctx, stream } = createContext();
    const cleanup = await watch(ctx);

    await stream.emit(childCreated);
    await stream.emit(childBusy);

    cleanup?.();
    await vi.advanceTimersByTimeAsync(31_000);

    expect(ctx.session.interrupt).not.toHaveBeenCalled();
  });

  it('does nothing when disabled by environment', async () => {
    vi.stubEnv('OPENCODE_SUBAGENT_WATCHDOG', 'off');

    const { ctx } = createContext();
    const cleanup = await watch(ctx);

    await vi.advanceTimersByTimeAsync(31_000);

    expect(cleanup).toBeUndefined();
    expect(ctx.session.list).not.toHaveBeenCalled();
    expect(ctx.session.interrupt).not.toHaveBeenCalled();
    expect(ctx.app.log).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ message: 'watchdog disabled by environment' }),
      }),
    );
  });
});
