import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  GuardContext,
  GuardToolDefinition,
  SessionContextEvent,
  ToolExecuteEvent,
} from './guard';
import { installGuard } from './guard';

interface FakeGuard {
  ctx: GuardContext;
  logs: string[];
  sessionHooks: Map<string, (event: SessionContextEvent) => Promise<void> | void>;
  storage: Map<string, unknown>;
  toolHooks: Map<string, (event: ToolExecuteEvent) => Promise<void> | void>;
  tools: GuardToolDefinition[];
}

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-guard-'));

  temporaryRoots.push(root);

  return root;
}

async function writeFileAt(root: string, relativePath: string, content = ''): Promise<string> {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');

  return absolutePath;
}

async function touch(file: string): Promise<void> {
  const later = new Date(Date.now() + 5_000);

  await utimes(file, later, later);
}

function createContext(
  root: string,
  options: { agentModels?: Record<string, string>; storage?: Map<string, unknown> } = {},
): FakeGuard {
  const storage = options.storage ?? new Map<string, unknown>();
  const agentModels = options.agentModels ?? {};
  const tools: GuardToolDefinition[] = [];
  const logs: string[] = [];
  const toolHooks = new Map<string, (event: ToolExecuteEvent) => Promise<void> | void>();
  const sessionHooks = new Map<string, (event: SessionContextEvent) => Promise<void> | void>();

  const ctx = {
    agent: {
      get: vi.fn(async ({ agentID }: { agentID: string }) => {
        const model = agentModels[agentID];

        return model ? { model } : undefined;
      }),
    },
    app: {
      log: vi.fn(async ({ body }: { body: { message: string } }) => {
        logs.push(body.message);

        return { data: true };
      }),
    },
    location: { directory: root },
    session: {
      hook: vi.fn(async (name: string, handler: (event: SessionContextEvent) => Promise<void> | void) => {
        sessionHooks.set(name, handler);

        return { dispose: () => {} };
      }),
    },
    storage: {
      get: async (key: string) => storage.get(key),
      set: async (key: string, value: unknown) => {
        storage.set(key, value);
      },
    },
    tool: {
      hook: vi.fn(async (name: string, handler: (event: ToolExecuteEvent) => Promise<void> | void) => {
        toolHooks.set(name, handler);

        return { dispose: () => {} };
      }),
      transform: vi.fn(async (editor: (editor: { add: (definition: GuardToolDefinition) => void }) => void) => {
        editor({ add: definition => tools.push(definition) });

        return { dispose: () => {} };
      }),
    },
  } as unknown as GuardContext;

  return { ctx, logs, sessionHooks, storage, toolHooks, tools };
}

async function createAgentFiles(root: string): Promise<{ coder: string }> {
  await writeFileAt(root, '.opencode/opencode.json', '{}');
  await writeFileAt(root, 'AGENTS.md', '# Agents');
  await writeFileAt(root, 'local.md', 'km');
  const coder = await writeFileAt(
    root,
    '.opencode/agents/coder.md',
    '---\nmode: subagent\nmodel: openrouter/deepseek/deepseek-v4.1-flash-1017#low\n---\n',
  );

  await writeFileAt(root, '.opencode/agents/tdd.md', '---\nmode: all\nmodel: openrouter/z-ai/glm-5.3#temp-low\n---\n');
  await writeFileAt(root, '.opencode/agents/broken.md', '---\nmode: subagent\n---\n');

  return { coder };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { force: true, recursive: true })));
});

describe('installGuard', () => {
  it('registers the hooks and the agent_config_check tool', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, logs, sessionHooks, toolHooks, tools } = createContext(root);

    await installGuard(ctx);

    expect(toolHooks.has('execute.before')).toBe(true);
    expect(sessionHooks.has('context')).toBe(true);
    expect(tools.map(tool => tool.name)).toEqual(['agent_config_check']);
    expect(tools[0].options).toEqual({ codemode: false });
    expect(logs).toContain('guard initialized');
  });

  it('falls back to the console when the context has no app.log', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, tools } = createContext(root);

    ctx.app.log = vi.fn(async () => {
      throw new Error('app.log is not available in V2 plugin contexts');
    }) as unknown as GuardContext['app']['log'];

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await installGuard(ctx);

      expect(tools.map(tool => tool.name)).toEqual(['agent_config_check']);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('guard initialized'));
    }
    finally {
      spy.mockRestore();
    }
  });

  it('reports the documented agent_config_check contract', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, tools } = createContext(root);

    await installGuard(ctx);

    const raw = await tools[0].execute({});
    const report = JSON.parse(raw.content) as {
      agents: Record<string, { model?: string }>;
      checked: string[];
      fresh: boolean;
      missingModel: string[];
      serverStartedAt: string;
    };

    expect(report.fresh).toBe(true);
    expect(report.checked).toEqual([]);
    expect(report.missingModel).toEqual(['broken']);
    expect(report.agents.coder.model).toBe('openrouter/deepseek/deepseek-v4.1-flash-1017#low');
    expect(report.agents.tdd.model).toBe('openrouter/z-ai/glm-5.3#temp-low');
    expect(report.agents.broken.model).toBeUndefined();
    expect(new Date(report.serverStartedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('allows a dispatch to a fresh, fully configured subagent', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, toolHooks } = createContext(root);

    await installGuard(ctx);

    await expect(
      toolHooks.get('execute.before')?.({ input: { subagent_type: 'coder' }, tool: 'subagent' }),
    ).resolves.toBeUndefined();
  });

  it('accepts the V1 dispatch tool and argument names', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, toolHooks } = createContext(root);

    await installGuard(ctx);

    await expect(
      toolHooks.get('execute.before')?.({ input: { agent: 'tdd' }, tool: 'task' }),
    ).resolves.toBeUndefined();
  });

  it('blocks a dispatch after the config changed', async () => {
    const root = await createRoot();
    const { coder } = await createAgentFiles(root);

    const { ctx, toolHooks, tools } = createContext(root);

    await installGuard(ctx);
    await touch(coder);

    await expect(
      toolHooks.get('execute.before')?.({ input: { subagent_type: 'coder' }, tool: 'subagent' }),
    ).rejects.toThrow(/agent config changed after opencode start/u);

    const report = JSON.parse((await tools[0].execute({})).content) as { checked: string[]; fresh: boolean };

    expect(report.fresh).toBe(false);
    expect(report.checked).toEqual([path.join('.opencode', 'agents', 'coder.md')]);
  });

  it('blocks a dispatch to a subagent without a model', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, toolHooks } = createContext(root);

    await installGuard(ctx);

    await expect(
      toolHooks.get('execute.before')?.({ input: { subagent_type: 'broken' }, tool: 'subagent' }),
    ).rejects.toThrow(/has no model configured/u);
  });

  it('blocks a dispatch without a target agent', async () => {
    const root = await createRoot();

    await createAgentFiles(root);

    const { ctx, toolHooks } = createContext(root);

    await installGuard(ctx);

    await expect(
      toolHooks.get('execute.before')?.({ input: {}, tool: 'subagent' }),
    ).rejects.toThrow(/without a target agent/u);
  });

  it('ignores tools that are not dispatch tools', async () => {
    const root = await createRoot();
    const { coder } = await createAgentFiles(root);

    const { ctx, toolHooks } = createContext(root);

    await installGuard(ctx);
    await touch(coder);

    await expect(
      toolHooks.get('execute.before')?.({ input: { filePath: 'src/app.ts' }, tool: 'read' }),
    ).resolves.toBeUndefined();
  });

  it('checks the model of guarded agents on every model request', async () => {
    const root = await createRoot();
    const { coder } = await createAgentFiles(root);

    const { ctx, sessionHooks } = createContext(root);

    await installGuard(ctx);

    await expect(sessionHooks.get('context')?.({ agent: 'tdd', sessionID: 'ses_1' })).resolves.toBeUndefined();

    await touch(coder);

    await expect(sessionHooks.get('context')?.({ agent: 'coder' })).rejects.toThrow(/agent config changed/u);
    await expect(sessionHooks.get('context')?.({ agent: 'build' })).resolves.toBeUndefined();
  });

  it('keeps the snapshot bound to the process across plugin reloads', async () => {
    const root = await createRoot();
    const { coder } = await createAgentFiles(root);

    const storage = new Map<string, unknown>();
    const first = createContext(root, { storage });

    await installGuard(first.ctx);
    await touch(coder);

    // A reload must reuse the stored snapshot instead of taking a new one.
    const second = createContext(root, { storage });

    await installGuard(second.ctx);

    const report = JSON.parse((await second.tools[0].execute({})).content) as { checked: string[]; fresh: boolean };

    expect(report.fresh).toBe(false);
    expect(report.checked).toEqual([path.join('.opencode', 'agents', 'coder.md')]);
    expect(storage.size).toBe(1);
  });

  it('prefers the running agent definition over the frontmatter parser', async () => {
    const root = await createRoot();

    await writeFileAt(root, '.opencode/agents/tdd.md', '---\nmode: all\n---\n');

    const { ctx, toolHooks } = createContext(root, { agentModels: { tdd: 'openrouter/z-ai/glm-5.3#temp-low' } });

    await installGuard(ctx);

    await expect(
      toolHooks.get('execute.before')?.({ input: { subagent_type: 'tdd' }, tool: 'subagent' }),
    ).resolves.toBeUndefined();
  });
});
