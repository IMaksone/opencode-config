import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SubagentWatchdog } from '../plugins/subagent-watchdog';

interface FakeClient {
  app: { log: ReturnType<typeof vi.fn> };
  session: { abort: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
  tui: { showToast: ReturnType<typeof vi.fn> };
}

function createClient(list: () => Promise<unknown>): FakeClient {
  return {
    app: { log: vi.fn(async () => ({ data: true })) },
    session: {
      abort: vi.fn(async () => ({ data: true })),
      list: vi.fn(list),
    },
    tui: { showToast: vi.fn(async () => ({ data: true })) },
  };
}

function createHookInput(client: FakeClient) {
  return { client } as unknown as Parameters<typeof SubagentWatchdog>[0];
}

function eventHook(hooks: Awaited<ReturnType<typeof SubagentWatchdog>>) {
  return hooks.event as (input: { event: unknown }) => Promise<void>;
}

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
  it('returns hooks without waiting for the server', async () => {
    // A never-resolving client call must not block plugin bootstrap.
    const client = createClient(() => new Promise(() => {}));
    const hooks = await SubagentWatchdog(createHookInput(client));

    expect(typeof hooks.event).toBe('function');
    expect(typeof hooks['tool.execute.after']).toBe('function');
    expect(typeof hooks.dispose).toBe('function');
  });

  it('aborts an idle busy child on the timer and logs it', async () => {
    const client = createClient(async () => ({ data: [] }));
    const hooks = await SubagentWatchdog(createHookInput(client));
    const emit = eventHook(hooks);

    await emit({ event: { properties: { info: { id: 'child', parentID: 'root' } }, type: 'session.created' } });
    await emit({ event: { properties: { sessionID: 'child', status: { type: 'busy' } }, type: 'session.status' } });
    await vi.advanceTimersByTimeAsync(31_000);

    expect(client.session.abort).toHaveBeenCalledTimes(1);
    expect(client.session.abort).toHaveBeenCalledWith({ path: { id: 'child' } });
    expect(client.app.log).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ level: 'warn', message: 'aborted inactive subagent session' }),
      }),
    );
    expect(client.tui.showToast).toHaveBeenCalledTimes(1);
  });

  it('keeps a child alive while events keep coming', async () => {
    const client = createClient(async () => ({ data: [] }));
    const hooks = await SubagentWatchdog(createHookInput(client));
    const emit = eventHook(hooks);

    await emit({ event: { properties: { info: { id: 'child', parentID: 'root' } }, type: 'session.created' } });
    await emit({ event: { properties: { sessionID: 'child', status: { type: 'busy' } }, type: 'session.status' } });

    await vi.advanceTimersByTimeAsync(900);
    await emit({ event: { properties: { sessionID: 'child' }, type: 'session.diff' } });
    await vi.advanceTimersByTimeAsync(900);

    expect(client.session.abort).not.toHaveBeenCalled();
  });

  it('stops the timer on dispose', async () => {
    const client = createClient(async () => ({ data: [] }));
    const hooks = await SubagentWatchdog(createHookInput(client));
    const emit = eventHook(hooks);

    await emit({ event: { properties: { info: { id: 'child', parentID: 'root' } }, type: 'session.created' } });
    await emit({ event: { properties: { sessionID: 'child', status: { type: 'busy' } }, type: 'session.status' } });

    await hooks.dispose?.();
    await vi.advanceTimersByTimeAsync(31_000);

    expect(client.session.abort).not.toHaveBeenCalled();
  });

  it('does nothing when disabled by environment', async () => {
    vi.stubEnv('OPENCODE_SUBAGENT_WATCHDOG', 'off');

    const client = createClient(async () => ({ data: [] }));
    const hooks = await SubagentWatchdog(createHookInput(client));

    await vi.advanceTimersByTimeAsync(31_000);

    expect(hooks.event).toBeUndefined();
    expect(client.session.abort).not.toHaveBeenCalled();
  });
});
