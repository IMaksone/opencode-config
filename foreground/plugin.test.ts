import process from 'node:process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ForegroundContext, ForegroundSessionContextEvent, ForegroundToolExecuteEvent } from './plugin';
import { installForegroundOnly } from './plugin';

const ENV_KEY = 'OPENCODE_FOREGROUND_ONLY';

interface LogCall {
  extra?: Record<string, unknown>;
  level: string;
  message: string;
  service: string;
}

type ToolHandler = (event: ForegroundToolExecuteEvent) => Promise<void> | void;
type SessionHandler = (event: ForegroundSessionContextEvent) => Promise<void> | void;

function createContext(): {
  ctx: ForegroundContext;
  disposals: string[];
  logCalls: LogCall[];
  sessionHooks: Map<string, SessionHandler>;
  toolHooks: Map<string, ToolHandler>;
} {
  const toolHooks = new Map<string, ToolHandler>();
  const sessionHooks = new Map<string, SessionHandler>();
  const logCalls: LogCall[] = [];
  const disposals: string[] = [];

  const ctx: ForegroundContext = {
    app: {
      log: async ({ body }) => {
        logCalls.push({ extra: body.extra, level: body.level, message: body.message, service: body.service });
      },
    },
    session: {
      hook: async (name, handler) => {
        sessionHooks.set(name, handler);

        return { dispose: async () => {
          disposals.push(`session:${name}`);
        } };
      },
    },
    tool: {
      hook: async (name, handler) => {
        toolHooks.set(name, handler);

        return { dispose: async () => {
          disposals.push(`tool:${name}`);
        } };
      },
    },
  };

  return { ctx, disposals, logCalls, sessionHooks, toolHooks };
}

function messageOf(logCalls: LogCall[], message: string): LogCall | undefined {
  return logCalls.find(call => call.message === message);
}

let savedEnv: string | undefined;

beforeEach(() => {
  savedEnv = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
});

afterEach(() => {
  if (savedEnv === undefined) {
    delete process.env[ENV_KEY];
  }
  else {
    process.env[ENV_KEY] = savedEnv;
  }
});

describe('installForegroundOnly', () => {
  it('registers both hooks and disposes them in registration order', async () => {
    const { ctx, disposals, sessionHooks, toolHooks } = createContext();

    const cleanup = await installForegroundOnly(ctx);

    expect([...toolHooks.keys()]).toEqual(['execute.before']);
    expect([...sessionHooks.keys()]).toEqual(['context']);
    expect(cleanup).toBeTypeOf('function');

    cleanup?.();
    expect(disposals).toEqual(['tool:execute.before', 'session:context']);
  });

  it('normalizes background: true in place and logs the rewrite', async () => {
    const { ctx, logCalls, toolHooks } = createContext();
    await installForegroundOnly(ctx);

    const event = { input: { background: true, command: 'pnpm build' }, sessionID: 'ses_1', tool: 'shell' };
    await toolHooks.get('execute.before')?.(event);

    expect(event.input).toEqual({ background: false, command: 'pnpm build' });
    expect(messageOf(logCalls, 'forced foreground')).toMatchObject({
      extra: { sessionID: 'ses_1', tool: 'shell' },
      level: 'info',
      service: 'foreground-only',
    });
  });

  it('normalizes the V1 aliases bash and task', async () => {
    const { ctx, logCalls, toolHooks } = createContext();
    await installForegroundOnly(ctx);

    const bash = { input: { background: true, command: 'ls' }, sessionID: 'ses_1', tool: 'bash' };
    const task = { input: { background: true, subagent_type: 'coder' }, sessionID: 'ses_1', tool: 'task' };

    await toolHooks.get('execute.before')?.(bash);
    await toolHooks.get('execute.before')?.(task);

    expect(bash.input.background).toBe(false);
    expect(task.input.background).toBe(false);
    expect(logCalls.filter(call => call.message === 'forced foreground')).toHaveLength(2);
  });

  it('leaves foreground runs and foreign tools untouched', async () => {
    const { ctx, logCalls, toolHooks } = createContext();
    await installForegroundOnly(ctx);

    const foreground = { input: { background: false, command: 'ls' }, sessionID: 'ses_1', tool: 'shell' };
    const foreign = { input: { background: true, filePath: 'README.md' }, sessionID: 'ses_1', tool: 'read' };
    const malformed = { input: 'raw', sessionID: 'ses_1', tool: 'shell' };

    for (const event of [foreground, foreign, malformed]) {
      await toolHooks.get('execute.before')?.(event);
    }

    expect(foreground.input).toEqual({ background: false, command: 'ls' });
    expect(foreign.input).toEqual({ background: true, filePath: 'README.md' });
    expect(malformed.input).toBe('raw');
    expect(messageOf(logCalls, 'forced foreground')).toBeUndefined();
  });

  it('strips background from the background tool schemas in the context hook', async () => {
    const { ctx, sessionHooks } = createContext();
    await installForegroundOnly(ctx);

    const tools = {
      read: { description: 'read', input: { properties: { background: {}, filePath: {} } } },
      shell: { description: 'run', input: { properties: { background: {}, command: {} } } },
      subagent: { description: 'dispatch', input: { properties: { background: {}, subagent_type: {} } } },
    };

    await sessionHooks.get('context')?.({ sessionID: 'ses_1', tools });

    expect(tools.shell.input.properties).toEqual({ command: {} });
    expect(tools.subagent.input.properties).toEqual({ subagent_type: {} });
    expect(tools.read.input.properties).toEqual({ background: {}, filePath: {} });
  });

  it('never throws from a hook: a frozen event is logged and ignored', async () => {
    const { ctx, logCalls, toolHooks } = createContext();
    await installForegroundOnly(ctx);

    const event = Object.freeze({ input: { background: true, command: 'ls' }, sessionID: 'ses_1', tool: 'shell' });

    expect(() => toolHooks.get('execute.before')?.(event)).not.toThrow();
    expect(event.input).toEqual({ background: true, command: 'ls' });

    const failed = messageOf(logCalls, 'hook failed');

    expect(failed).toMatchObject({ extra: { tool: 'shell' }, level: 'error', service: 'foreground-only' });
    expect(failed?.extra?.error).toEqual(expect.any(String));
  });

  it.each([['off'], ['  OFF ']])('stays inert for OPENCODE_FOREGROUND_ONLY=%j', async (value) => {
    process.env[ENV_KEY] = value;

    const { ctx, disposals, logCalls, sessionHooks, toolHooks } = createContext();

    const cleanup = await installForegroundOnly(ctx);

    expect(cleanup).toBeUndefined();
    expect(toolHooks.size).toBe(0);
    expect(sessionHooks.size).toBe(0);
    expect(disposals).toEqual([]);
    expect(messageOf(logCalls, 'foreground-only disabled by environment')).toMatchObject({
      level: 'info',
      service: 'foreground-only',
    });
  });

  it('logs one started line with the guarded tools', async () => {
    const { ctx, logCalls } = createContext();

    await installForegroundOnly(ctx);

    const started = logCalls.filter(call => call.message === 'foreground-only started');

    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      extra: { enabled: true, tools: ['shell', 'bash', 'subagent', 'task'] },
      level: 'info',
      service: 'foreground-only',
    });
  });
});
