import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  DeletePermissionInput,
  DeleteToolContext,
  DeleteToolDefinition,
  DeleteToolExecuteContext,
  ToolEditor,
} from './plugin';
import { installDeleteTool } from './plugin';

interface LogCall {
  extra?: Record<string, unknown>;
  level: string;
  message: string;
  service: string;
}

type PermissionBehavior = 'allow' | 'deny';

function createContext(directory: string): {
  added: DeleteToolDefinition[];
  assertCalls: DeletePermissionInput[];
  ctx: DeleteToolContext;
  logCalls: LogCall[];
  setPermission: (behavior: PermissionBehavior) => void;
} {
  const added: DeleteToolDefinition[] = [];
  const assertCalls: DeletePermissionInput[] = [];
  const logCalls: LogCall[] = [];
  let permission: PermissionBehavior = 'allow';

  const ctx: DeleteToolContext = {
    app: {
      log: async ({ body }) => {
        logCalls.push({ extra: body.extra, level: body.level, message: body.message, service: body.service });
      },
    },
    location: { directory },
    permission: {
      assert: async (input) => {
        assertCalls.push(input);

        if (permission === 'deny') {
          throw new Error('permission denied: delete');
        }
      },
    },
    tool: {
      transform: async (editor: (tools: ToolEditor) => void) => {
        editor({ add: (definition) => {
          added.push(definition);
        } });
      },
    },
  };

  return {
    added,
    assertCalls,
    ctx,
    logCalls,
    setPermission: (behavior) => {
      permission = behavior;
    },
  };
}

async function install(directory: string): Promise<ReturnType<typeof createContext> & { tool: DeleteToolDefinition }> {
  const harness = createContext(directory);

  await installDeleteTool(harness.ctx);

  const tool = harness.added[0];

  if (!tool) {
    throw new Error('delete_file was not registered');
  }

  return { ...harness, tool };
}

const CODER: DeleteToolExecuteContext = { agent: 'coder', id: 'call_1', messageID: 'msg_1', sessionID: 'ses_1' };

describe('installDeleteTool', () => {
  let project: string;

  beforeEach(async () => {
    project = await mkdtemp(path.join(tmpdir(), 'delete-tool-'));

    await mkdir(path.join(project, 'src/entities/wells'), { recursive: true });
    await mkdir(path.join(project, 'src/shared/testing'), { recursive: true });
    await mkdir(path.join(project, 'docs'), { recursive: true });
    // A directory whose name passes the extension check: only `stat` catches it.
    await mkdir(path.join(project, 'src/weird.ts'), { recursive: true });

    await writeFile(path.join(project, 'src/a.ts'), 'export const a = 1;\n');
    await writeFile(path.join(project, 'src/entities/wells/helper.ts'), 'export const helper = 1;\n');
    await writeFile(path.join(project, 'src/b.test.ts'), 'export const b = 1;\n');
    await writeFile(path.join(project, 'src/shared/testing/setup.ts'), 'export {};\n');
    await writeFile(path.join(project, 'docs/note.md'), 'note\n');
  });

  afterEach(async () => {
    await rm(project, { force: true, recursive: true });
  });

  const exists = async (relative: string): Promise<boolean> => {
    try {
      await stat(path.join(project, relative));

      return true;
    }
    catch {
      return false;
    }
  };

  it('registers delete_file with codemode disabled and a strict schema', async () => {
    const { added, tool } = await install(project);

    expect(added).toHaveLength(1);
    expect(tool.name).toBe('delete_file');
    expect(tool.options).toEqual({ codemode: false });
    expect(tool.input.required).toEqual(['paths']);
    expect(tool.input.additionalProperties).toBe(false);
    expect(tool.input.properties.paths).toMatchObject({ maxItems: 50, minItems: 1, type: 'array' });
  });

  it('deletes listed production files and reports each one', async () => {
    const { assertCalls, logCalls, tool } = await install(project);

    const result = await tool.execute({ paths: ['src/a.ts', 'src/entities/wells/helper.ts'] }, CODER);

    expect(result.content.split('\n')).toEqual([
      'deleted: src/a.ts (production)',
      'deleted: src/entities/wells/helper.ts (production)',
    ]);
    expect(await exists('src/a.ts')).toBe(false);
    expect(await exists('src/entities/wells/helper.ts')).toBe(false);
    expect(assertCalls).toHaveLength(1);
    expect(assertCalls[0]).toEqual({
      action: 'delete',
      agent: 'coder',
      resources: ['src/a.ts', 'src/entities/wells/helper.ts'],
      save: [],
      source: { id: 'call_1', messageID: 'msg_1', type: 'tool' },
      sessionID: 'ses_1',
    });
    expect(logCalls.some(call => call.message === 'delete executed' && call.service === 'delete-tool')).toBe(true);
  });

  it('accepts an absolute path inside the project', async () => {
    const { tool } = await install(project);

    const result = await tool.execute({ paths: [path.join(project, 'src/a.ts')] }, CODER);

    expect(result.content).toEqual('deleted: src/a.ts (production)');
    expect(await exists('src/a.ts')).toBe(false);
  });

  it('deletes a test file when the permission allows, as kind test', async () => {
    const { assertCalls, tool } = await install(project);

    const result = await tool.execute({ paths: ['src/b.test.ts'] }, CODER);

    expect(result.content).toEqual('deleted: src/b.test.ts (test)');
    expect(assertCalls[0]?.resources).toEqual(['src/b.test.ts']);
    expect(await exists('src/b.test.ts')).toBe(false);
  });

  it('classifies the shared testing subtree as test', async () => {
    const { assertCalls, tool } = await install(project);

    const result = await tool.execute({ paths: ['src/shared/testing/setup.ts'] }, CODER);

    expect(result.content).toEqual('deleted: src/shared/testing/setup.ts (test)');
    expect(assertCalls[0]?.resources).toEqual(['src/shared/testing/setup.ts']);
  });

  it('propagates a permission deny and deletes nothing', async () => {
    const { assertCalls, setPermission, tool } = await install(project);

    setPermission('deny');

    await expect(tool.execute({ paths: ['src/a.ts'] }, { ...CODER, agent: 'git-manager' }))
      .rejects.toThrow('permission denied: delete');

    expect(await exists('src/a.ts')).toBe(true);
    expect(assertCalls).toHaveLength(1);
    expect(assertCalls[0]?.agent).toBe('git-manager');
  });

  it('refuses the whole request when one path is invalid and touches nothing', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ paths: ['src/a.ts', 'docs/note.md'] }, CODER))
      .rejects.toThrow(/docs\/note\.md — path is outside src\//);

    expect(await exists('src/a.ts')).toBe(true);
    expect(await exists('docs/note.md')).toBe(true);
    expect(assertCalls).toHaveLength(0);
  });

  it('refuses an existing file outside the project before asking for permission', async () => {
    // `realpath` runs before the policy check, so the escape attempt must point
    // at a real file to reach the "outside the project root" rejection.
    const outside = await mkdtemp(path.join(tmpdir(), 'delete-tool-outside-'));
    const file = path.join(outside, 'other.ts');

    await writeFile(file, 'export const other = 1;\n');

    try {
      const { assertCalls, tool } = await install(project);

      await expect(tool.execute({ paths: [file] }, CODER)).rejects.toThrow('path is outside the project root');

      expect(assertCalls).toHaveLength(0);
    }
    finally {
      await rm(outside, { force: true, recursive: true });
    }
  });

  it('refuses a missing dot-dot path as nonexistent, before the policy sees it', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ paths: [`${project}/../outside.ts`] }, CODER))
      .rejects.toThrow(/outside\.ts — file does not exist/);

    expect(assertCalls).toHaveLength(0);
  });

  it('refuses a missing file before asking for permission', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ paths: ['src/ghost.ts'] }, CODER))
      .rejects.toThrow(/src\/ghost\.ts — file does not exist/);

    expect(assertCalls).toHaveLength(0);
  });

  it('refuses a directory that passes the extension check', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ paths: ['src/weird.ts'] }, CODER)).rejects.toThrow(/src\/weird\.ts — not a file/);

    expect(await exists('src/weird.ts')).toBe(true);
    expect(assertCalls).toHaveLength(0);
  });

  it('refuses a project path that is not .ts/.tsx', async () => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute({ paths: ['docs/note.md'] }, CODER)).rejects.toThrow(/docs\/note\.md — path is outside src\//);

    expect(await exists('docs/note.md')).toBe(true);
    expect(assertCalls).toHaveLength(0);
  });

  it('reports a partial fs.rm failure instead of throwing', async () => {
    const { tool } = await install(project);

    // The same file twice: validation passes both, the first rm succeeds, the
    // second one hits the now-missing file and lands in `failed`.
    const result = await tool.execute({ paths: ['src/a.ts', 'src/a.ts'] }, CODER);

    const lines = result.content.split('\n');

    expect(lines[0]).toEqual('deleted: src/a.ts (production)');
    expect(lines[1]).toMatch(/^failed: src\/a\.ts — ENOENT/);
  });

  it.each([
    [undefined, /input must be an object with a "paths" array/],
    [{}, /input must be an object with a "paths" array/],
    [{ paths: 'src/a.ts' }, /input must be an object with a "paths" array/],
    [{ paths: [] }, /paths must not be empty/],
    [{ paths: [1] }, /paths\[0\] must be a non-empty string/],
    [{ paths: ['src/a.ts', ''] }, /paths\[1\] must be a non-empty string/],
    [{ paths: Array.from({ length: 51 }, (_, index) => `src/f${index}.ts`) }, /at most 50 paths per call/],
  ])('rejects malformed input %j', async (input, pattern) => {
    const { assertCalls, tool } = await install(project);

    await expect(tool.execute(input, CODER)).rejects.toThrow(pattern);
    expect(assertCalls).toHaveLength(0);
  });

  it('logs refusals with the delete-tool service', async () => {
    const { logCalls, tool } = await install(project);

    await expect(tool.execute({ paths: ['docs/note.md'] }, CODER)).rejects.toThrow();

    const refused = logCalls.filter(call => call.message === 'delete refused');

    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ extra: { reasons: [expect.stringContaining('docs/note.md')] }, level: 'warn', service: 'delete-tool' });
  });

  it('logs a denial with the delete-tool service before rethrowing', async () => {
    const { logCalls, setPermission, tool } = await install(project);

    setPermission('deny');

    await expect(tool.execute({ paths: ['src/a.ts'] }, CODER)).rejects.toThrow('permission denied: delete');

    const denied = logCalls.filter(call => call.message === 'delete denied');

    expect(denied).toHaveLength(1);
    expect(denied[0]).toMatchObject({
      extra: { error: 'permission denied: delete', resources: ['src/a.ts'] },
      level: 'warn',
      service: 'delete-tool',
    });
  });
});
