import { describe, expect, it } from 'vitest';

import { createRegistry, DEFAULT_TIMEOUT_MS, readOptions } from './state';

const TIMEOUT_MS = 1_000;

function setup() {
  const clock = { value: 0 };
  const registry = createRegistry({ now: () => clock.value, timeoutMs: TIMEOUT_MS });

  return { clock, registry };
}

describe('readOptions', () => {
  it('uses the default timeout when the variable is missing', () => {
    expect(readOptions({})).toEqual({ enabled: true, timeoutMs: DEFAULT_TIMEOUT_MS });
  });

  it('parses a valid timeout override', () => {
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS: '60000' })).toEqual({
      enabled: true,
      timeoutMs: 60_000,
    });
  });

  it('falls back to the default for garbage values', () => {
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS: 'soon' }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS: '0' }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS: '-5' }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS: '' }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('disables the watchdog with off', () => {
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG: 'off' }).enabled).toBe(false);
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG: ' OFF ' }).enabled).toBe(false);
    expect(readOptions({ OPENCODE_SUBAGENT_WATCHDOG: 'on' }).enabled).toBe(true);
  });
});

describe('registry tracking', () => {
  it('tracks a session with a parent and ignores a root session', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onChildCreated({ id: 'root' });
    registry.onStatus('child', 'busy');
    registry.onStatus('root', 'busy');

    clock.value = TIMEOUT_MS;

    expect(registry.collectAborts(clock.value)).toEqual(['child']);
  });

  it('tracks any subagent without an allowlist', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'build-child', parentID: 'plan' });
    registry.onChildCreated({ id: 'tdd-child', parentID: 'plan' });
    registry.onStatus('build-child', 'busy');
    registry.onStatus('tdd-child', 'busy');

    clock.value = TIMEOUT_MS;

    expect(registry.collectAborts(clock.value).sort()).toEqual(['build-child', 'tdd-child']);
  });
});

describe('activity', () => {
  it('extends the deadline on every activity event', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');

    clock.value = 900;
    registry.onActivity('child');

    clock.value = 1_800;
    expect(registry.collectAborts(clock.value)).toEqual([]);

    clock.value = 1_900;
    expect(registry.collectAborts(clock.value)).toEqual(['child']);
  });

  it('bubbles child activity to ancestors across two levels', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'level-1', parentID: 'root' });
    registry.onChildCreated({ id: 'level-2', parentID: 'level-1' });
    registry.onChildCreated({ id: 'level-3', parentID: 'level-2' });
    registry.onStatus('level-1', 'busy');
    registry.onStatus('level-2', 'busy');
    registry.onStatus('level-3', 'busy');

    clock.value = 1_000;
    registry.onActivity('level-3');

    expect(registry.collectAborts(clock.value)).toEqual([]);

    clock.value = 2_000;

    expect(registry.collectAborts(clock.value)).toEqual(['level-3']);
  });

  it('does not extend the deadline on a status update', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');

    clock.value = 500;
    registry.onStatus('child', 'retry');
    registry.onStatus('child', 'busy');

    clock.value = TIMEOUT_MS;

    expect(registry.collectAborts(clock.value)).toEqual(['child']);
  });
});

describe('abort decisions', () => {
  it('aborts exactly at the timeout, not before', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');

    clock.value = TIMEOUT_MS - 1;
    expect(registry.collectAborts(clock.value)).toEqual([]);

    clock.value = TIMEOUT_MS;
    expect(registry.collectAborts(clock.value)).toEqual(['child']);
  });

  it('never aborts an idle session', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');
    registry.onIdle('child');

    clock.value = TIMEOUT_MS * 10;

    expect(registry.collectAborts(clock.value)).toEqual([]);
  });

  it('aborts at most once per session', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');

    clock.value = TIMEOUT_MS;

    expect(registry.collectAborts(clock.value)).toEqual(['child']);
    expect(registry.collectAborts(clock.value)).toEqual([]);
  });

  it('forgets a deleted session for good', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'child', parentID: 'root' });
    registry.onStatus('child', 'busy');

    clock.value = TIMEOUT_MS;
    registry.onDeleted('child');

    expect(registry.collectAborts(clock.value)).toEqual([]);

    registry.onActivity('child');

    expect(registry.collectAborts(clock.value)).toEqual([]);
  });

  it('aborts the child first and refreshes the parent', () => {
    const { clock, registry } = setup();

    registry.onChildCreated({ id: 'parent', parentID: 'root' });
    registry.onChildCreated({ id: 'child', parentID: 'parent' });
    registry.onStatus('parent', 'busy');
    registry.onStatus('child', 'busy');

    clock.value = TIMEOUT_MS;

    expect(registry.collectAborts(clock.value)).toEqual(['child']);
    expect(registry.collectAborts(clock.value)).toEqual([]);

    clock.value = TIMEOUT_MS + 999;
    expect(registry.collectAborts(clock.value)).toEqual([]);

    clock.value = TIMEOUT_MS * 2;
    expect(registry.collectAborts(clock.value)).toEqual(['parent']);
  });
});
