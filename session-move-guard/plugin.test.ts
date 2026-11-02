import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  SessionMoveGuardContext,
  SessionMoveInput,
  SessionMovePermissionInput,
  SessionMoveToolDefinition,
  SessionMoveToolExecuteContext,
  ToolEditor,
} from './plugin';
import { installSessionMoveGuard, isEnabled } from './plugin';

interface LogCall {
  extra?: Record<string, unknown>;
  level: string;
  message: string;
  service: string;
}

type PermissionBehavior = 'allow' | 'deny';

function createContext(directory: string): {
  added: SessionMoveToolDefinition[];
  assertCalls: SessionMovePermissionInput[];
  ctx: SessionMoveGuardContext;
  logCalls: LogCall[];
  moveCalls: SessionMoveInput[];
  setPermission: (behavior: PermissionBehavior) => void;
  setWorktreeRoots: (roots: string[]) => void;
  worktreeCalls: { count: number };
} {
  const added: SessionMoveToolDefinition[] = [];
  const assertCalls: SessionMovePermissionInput[] = [];
  const logCalls: LogCall[] = [];
  const moveCalls: SessionMoveInput[] = [];
  const worktreeCalls = { count: 0 };
  let permission: PermissionBehavior = 'allow';
  let worktreeRoots: string[] = [];

  const ctx: SessionMoveGuardContext = {
    app: {
      log: async ({ body }) => {
        logCalls.push({ extra: body.extra, level: body.level, message: body.message, service: body.service });
      },
    },
    location: { directory, project: { canonical: directory, id: 'prj_1' } },
    permission: {
      assert: async (input) => {
        assertCalls.push(input);

        if (permission === 'deny') {
          throw new Error('permission denied: session_move');
        }
      },
    },
    session: {
      move: async (input) => {
        moveCalls.push(input);
      },
    },
    tool: {
      transform: async (editor: (tools: ToolEditor) => void) => {
        editor({ add: (definition) => {
          added.push(definition);
        } });
      },
    },
    worktree: {
      list: async () => {
        worktreeCalls.count += 1;

        return worktreeRoots.map(root => ({ directory: root }));
      },
    },
  };

  return {
    added,
    assertCalls,
    ctx,
    logCalls,
    moveCalls,
    setPermission: (behavior) => {
      permission = behavior;
    },
    setWorktreeRoots: (roots) => {
      worktreeRoots = roots;
    },
    worktreeCalls,
  };
}

async function install(directory: string): Promise<ReturnType<typeof createContext> & { tool: SessionMoveToolDefinition }> {
  const harness = createContext(directory);

  await installSessionMoveGuard(harness.ctx);

  const tool = harness.added[0];

  if (!tool) {
    throw new Error('session_move was not registered');
  }

  return { ...harness, tool };
}

const TDD: SessionMoveToolExecuteContext = { agent: 'tdd', id: 'call_1', messageID: 'msg_1', sessionID: 'ses_1' };

describe('installSessionMoveGuard', () => {
  let project: string;
  let projectReal: string;
  let worktree: string;
  let foreign: string;
  let inventory: string;

  beforeEach(async () => {
    delete process.env.OPENCODE_SESSION_MOVE_GUARD;

    project = await mkdtemp(path.join(tmpdir(), 'session-move-'));
    projectReal = await realpath(project);

    // A shell worktree (created by `git worktree add`): a directory whose
    // `.git` is a file pointing into the main repository's worktrees store.
    worktree = await mkdtemp(path.join(tmpdir(), 'session-move-wt-'));
    await writeFile(path.join(worktree, '.git'), `gitdir: ${projectReal}/.git/worktrees/agent\n`);

    // A directory of another repository: the marker points somewhere else.
    foreign = await mkdtemp(path.join(tmpdir(), 'session-move-foreign-'));
    await writeFile(path.join(foreign, '.git'), 'gitdir: /tmp/other-project/.git/worktrees/agent\n');

    // An inventory-only worktree: known to the native list, no marker file.
    inventory = await mkdtemp(path.join(tmpdir(), 'session-move-inv-'));
  });

  afterEach(async () => {
    delete process.env.OPENCODE_SESSION_MOVE_GUARD;

    await rm(project, { force: true, recursive: true });
    await rm(worktree, { force: true, recursive: true });
    await rm(foreign, { force: true, recursive: true });
    await rm(inventory, { force: true, recursive: true });
  });

  it('registers session_move with codemode disabled and a strict schema', async () => {
    const { added, logCalls, tool } = await install(project);

    expect(added).toHaveLength(1);
    expect(tool.name).toBe('session_move');
    expect(tool.options).toEqual({ codemode: false });
    expect(tool.input.required).toEqual(['directory']);
    expect(tool.input.additionalProperties).toBe(false);
    expect(tool.input.properties.directory).toMatchObject({ type: 'string' });
    expect(logCalls.some(call => call.message === 'session-move-guard started' && call.service === 'session-move-guard')).toBe(true);
  });

  it('moves the session back to the project root as project-root', async () => {
    const { moveCalls, tool } = await install(project);

    const result = await tool.execute({ directory: project }, TDD);

    expect(result.content).toBe(`session moved to ${projectReal} (project-root)`);
    expect(moveCalls).toEqual([{ sessionID: 'ses_1', directory: projectReal }]);
  });

  it('moves the session into a worktree proven by its gitdir marker', async () => {
    const { assertCalls, logCalls, moveCalls, tool } = await install(project);
    const worktreeReal = await realpath(worktree);

    const result = await tool.execute({ directory: worktree }, TDD);

    expect(result.content).toBe(`session moved to ${worktreeReal} (worktree)`);
    expect(assertCalls[0]).toMatchObject({
      action: 'session_move',
      agent: 'tdd',
      resources: [worktreeReal],
      save: [],
      sessionID: 'ses_1',
      source: { id: 'call_1', messageID: 'msg_1', type: 'tool' },
    });
    expect(moveCalls).toEqual([{ sessionID: 'ses_1', directory: worktreeReal }]);
    expect(logCalls.some(call => call.message === 'move executed' && call.extra?.kind === 'worktree')).toBe(true);
  });

  it('moves the session into a worktree known only to the native inventory', async () => {
    const { moveCalls, setWorktreeRoots, tool, worktreeCalls } = await install(project);
    const inventoryReal = await realpath(inventory);

    setWorktreeRoots([inventory]);

    const result = await tool.execute({ directory: inventory }, TDD);

    expect(result.content).toBe(`session moved to ${inventoryReal} (worktree)`);
    expect(moveCalls).toEqual([{ sessionID: 'ses_1', directory: inventoryReal }]);
    expect(worktreeCalls.count).toBe(1);
  });

  it('refuses a relative path before any permission or fs work', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ directory: 'cervart-wt/agent' }, TDD))
      .rejects.toThrow('session_move: directory must be an absolute path');

    expect(assertCalls).toHaveLength(0);
  });

  it('refuses a nonexistent directory after the permission check', async () => {
    const { assertCalls, logCalls, moveCalls, tool } = await install(project);

    await expect(tool.execute({ directory: path.join(project, 'ghost') }, TDD))
      .rejects.toThrow(/session_move: directory does not exist/);

    expect(assertCalls).toHaveLength(1);
    expect(moveCalls).toHaveLength(0);
    expect(logCalls.some(call => call.message === 'move refused')).toBe(true);
  });

  it('refuses a foreign directory with a foreign gitdir marker, naming the allowed targets', async () => {
    const { logCalls, moveCalls, setWorktreeRoots, tool } = await install(project);

    setWorktreeRoots([inventory]);

    await expect(tool.execute({ directory: foreign }, TDD))
      .rejects.toThrow(/session_move: target is not the project root or one of its worktrees; allowed: .*/);

    expect(moveCalls).toHaveLength(0);

    const refused = logCalls.filter(call => call.message === 'move refused');

    expect(refused).toHaveLength(1);
    expect(String(refused[0]?.extra?.reason)).toContain(projectReal);
    expect(String(refused[0]?.extra?.reason)).toContain(inventory);
  });

  it('refuses a marker with a traversal after worktrees/', async () => {
    const escape = await mkdtemp(path.join(tmpdir(), 'session-move-escape-'));

    try {
      await writeFile(path.join(escape, '.git'), `gitdir: ${projectReal}/.git/worktrees/../escape\n`);

      const { moveCalls, tool } = await install(project);

      await expect(tool.execute({ directory: escape }, TDD))
        .rejects.toThrow('session_move: target is not the project root or one of its worktrees');

      expect(moveCalls).toHaveLength(0);
    }
    finally {
      await rm(escape, { force: true, recursive: true });
    }
  });

  it('refuses an existing directory outside every list', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'session-move-outside-'));

    try {
      const { assertCalls, moveCalls, tool } = await install(project);

      await expect(tool.execute({ directory: outside }, TDD))
        .rejects.toThrow(/session_move: target is not the project root or one of its worktrees; allowed: /);

      expect(assertCalls).toHaveLength(1);
      expect(moveCalls).toHaveLength(0);
    }
    finally {
      await rm(outside, { force: true, recursive: true });
    }
  });

  it('propagates a permission deny before validation, without the allowed list', async () => {
    const { assertCalls, logCalls, moveCalls, setPermission, tool } = await install(project);

    setPermission('deny');

    // A foreign directory that validation would refuse: the permission error
    // wins, so assert ran before any target details (including `.git` reads).
    let denial: unknown;

    try {
      await tool.execute({ directory: foreign }, { ...TDD, agent: 'build' });
      denial = new Error('the permission deny did not reject the move');
    }
    catch (error) {
      denial = error;
    }

    const message = denial instanceof Error ? denial.message : String(denial);

    expect(message).toBe('permission denied: session_move');
    expect(message).not.toMatch(/allowed:/);

    expect(assertCalls).toHaveLength(1);
    expect(assertCalls[0]?.agent).toBe('build');
    expect(moveCalls).toHaveLength(0);
    expect(logCalls.some(call => call.message === 'move denied')).toBe(true);
  });

  it('checks the permission before reporting a nonexistent directory', async () => {
    const { setPermission, tool } = await install(project);

    setPermission('deny');

    await expect(tool.execute({ directory: path.join(project, 'ghost') }, TDD))
      .rejects.toThrow('permission denied: session_move');
  });

  it('quotes a session.move failure in the error and the log', async () => {
    const harness = await install(project);

    harness.ctx.session.move = async () => {
      throw new Error('directory not part of the project');
    };

    await expect(harness.tool.execute({ directory: project }, TDD))
      .rejects.toThrow('session_move: session.move failed — directory not part of the project');

    const failed = harness.logCalls.filter(call => call.message === 'move failed');

    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ extra: { error: 'directory not part of the project' }, level: 'error' });
  });

  it('survives a failing worktree inventory by treating it as empty', async () => {
    const harness = await install(project);

    harness.ctx.worktree = {
      list: async () => {
        throw new Error('inventory down');
      },
    };

    // The root move needs no inventory at all.
    await expect(harness.tool.execute({ directory: project }, TDD))
      .resolves.toMatchObject({ content: `session moved to ${projectReal} (project-root)` });
  });

  it.each([
    [undefined, /input must be an object with a non-empty "directory" string/],
    [{}, /input must be an object with a non-empty "directory" string/],
    [{ directory: 42 }, /input must be an object with a non-empty "directory" string/],
    [{ directory: '' }, /input must be an object with a non-empty "directory" string/],
  ])('rejects malformed input %j', async (input, pattern) => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute(input, TDD)).rejects.toThrow(pattern);

    expect(assertCalls).toHaveLength(0);
  });

  it('registers nothing when disabled through the environment', async () => {
    process.env.OPENCODE_SESSION_MOVE_GUARD = 'off';

    const harness = createContext(project);

    await installSessionMoveGuard(harness.ctx);

    expect(harness.added).toHaveLength(0);
    expect(harness.logCalls).toEqual([{
      level: 'info',
      message: 'session-move-guard disabled by environment',
      service: 'session-move-guard',
    }]);
  });
});

describe('isEnabled', () => {
  it.each([['off'], ['OFF'], [' off ']])('is false for %s', (value) => {
    expect(isEnabled({ OPENCODE_SESSION_MOVE_GUARD: value })).toBe(false);
  });

  it('is true when unset or set to anything else', () => {
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ OPENCODE_SESSION_MOVE_GUARD: 'on' })).toBe(true);
  });
});
