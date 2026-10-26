/**
 * Agent config guard for opencode V2.
 *
 * Blocks subagent dispatch when any agent config input changed after the
 * opencode process started, or when the target subagent has no explicit model.
 *
 * The opencode context is declared locally on purpose: this module stays free of
 * `@opencode/plugin` so it is unit-testable with a fake context.
 */

import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';

import type { AgentModelInfo, ConfigSnapshot } from './agentConfig';
import {
  aggregateAgents,
  collectConfigFiles,
  diffSnapshot,
  formatModel,
  missingModel,
  snapshot,
} from './agentConfig';

const SERVICE = 'agent-config-guard';

/** One snapshot is kept per boot, so the storage cannot grow across restarts. */
const STORAGE_KEY = 'snapshot/boot';

/** V2 dispatch tool is `subagent`; `task` is its V1 name. */
const DISPATCH_TOOLS = new Set(['subagent', 'task']);

/**
 * Subagents that must carry an explicit model: a missing model silently falls
 * back to the parent model inside the subagent tool.
 */
export const GUARDED_SUBAGENTS: readonly string[] = ['tdd', 'coder', 'test-generator', 'git-manager'];

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

interface LogBody {
  extra?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  service: string;
}

interface StoredSnapshot {
  bootId: string;
  snapshot: ConfigSnapshot;
}

export interface GuardStorage {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
}

export interface ToolExecuteEvent {
  input?: unknown;
  tool?: string;
}

export interface GuardToolDefinition {
  description: string;
  execute: (input: unknown) => Promise<{ content: string }>;
  input: {
    additionalProperties: boolean;
    properties: Record<string, unknown>;
    required: string[];
    type: 'object';
  };
  name: string;
  options?: {
    codemode?: boolean;
  };
}

export interface ToolEditor {
  add: (definition: GuardToolDefinition) => void;
}

export interface SessionContextEvent {
  agent?: string;
  model?: { id?: string };
  sessionID?: string;
}

export interface GuardContext {
  agent: {
    get: (input: { agentID: string }) => Promise<unknown>;
  };
  app: {
    log: (input: { body: LogBody }) => Promise<unknown>;
  };
  location: {
    directory: string;
  };
  session: {
    hook: (
      name: 'context',
      handler: (event: SessionContextEvent) => Promise<void> | void,
    ) => Promise<unknown>;
  };
  storage: GuardStorage;
  tool: {
    hook: (
      name: 'execute.before',
      handler: (event: ToolExecuteEvent) => Promise<void> | void,
    ) => Promise<unknown>;
    transform: (editor: (tools: ToolEditor) => void) => Promise<unknown>;
  };
}

function formatMissingModelMessage(agent: string): string {
  return `subagent "${agent}" has no model configured in .opencode/agents/${agent}.md; `
    + 'dispatch blocked to avoid a silent fallback to the parent model. '
    + 'Fix the agent config, restart opencode and retry.';
}

/** Identifies the running process, not the plugin load. */
function bootID(): string {
  return `${process.pid}:${Math.round(performance.timeOrigin)}`;
}

/** V2 sends `subagent_type`, V1 sent `subagent_type` or `agent`. */
function subagentNameOf(input: unknown): string | undefined {
  const args = typeof input === 'object' && input !== null ? input as Record<string, unknown> : undefined;
  const raw = args?.subagent_type ?? args?.agent;

  return typeof raw === 'string' && raw !== '' ? raw : undefined;
}

/**
 * Register the guard on a plugin context. Returns nothing: the V2 `setup` hook
 * accepts an empty cleanup.
 */
export async function installGuard(ctx: GuardContext): Promise<void> {
  const { directory } = ctx.location;

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

  const bootId = bootID();
  const serverStartedAt = new Date(performance.timeOrigin).toISOString();
  const stored = await ctx.storage.get(STORAGE_KEY) as StoredSnapshot | undefined;
  const reused = stored?.bootId === bootId && stored.snapshot !== undefined;
  const initialSnapshot = reused && stored ? stored.snapshot : await snapshot(await collectConfigFiles(directory));

  /*
   * V2 reloads plugins on every config save. A snapshot taken at plugin load
   * would therefore be re-taken right after the edit and the guard would report
   * `fresh: true` forever, so it is bound to the process instead.
   */
  if (!reused) {
    await ctx.storage.set(STORAGE_KEY, { bootId, snapshot: initialSnapshot } satisfies StoredSnapshot);
  }

  const toRelative = (file: string): string => path.relative(directory, file) || file;

  const collectChangedFiles = async (): Promise<string[]> => {
    const current = await snapshot(await collectConfigFiles(directory));

    return diffSnapshot(initialSnapshot, current);
  };

  const assertFreshConfig = async (): Promise<void> => {
    const changed = await collectChangedFiles();

    if (changed.length > 0) {
      throw new Error(
        `agent config changed after opencode start: ${changed.map(toRelative).join(', ')}. `
        + 'Restart opencode and retry.',
      );
    }
  };

  const agentsDirectory = `${path.join(directory, '.opencode', 'agents')}${path.sep}`;

  const readAgents = async (): Promise<Record<string, AgentModelInfo>> => {
    const files = (await collectConfigFiles(directory))
      .filter(file => file.startsWith(agentsDirectory) && file.endsWith('.md'));

    const contents = await Promise.all(files.map(async file => {
      try {
        return { content: await readFile(file, 'utf8'), path: file };
      }
      catch {
        return null;
      }
    }));

    return aggregateAgents(contents.filter(file => file !== null));
  };

  /** Native V2 agent lookup first, file frontmatter as the fallback. */
  const modelOf = async (agent: string): Promise<string | undefined> => {
    try {
      const info = await ctx.agent.get({ agentID: agent }) as { model?: unknown } | undefined;
      const model = typeof info?.model === 'string' ? info.model : undefined;

      if (model) {
        return model;
      }
    }
    catch {
      // Unknown agents fall back to the frontmatter parser.
    }

    const agents = await readAgents();

    return formatModel(agents[agent]);
  };

  const assertAgentModel = async (agent: string): Promise<void> => {
    if (!(await modelOf(agent))) {
      throw new Error(formatMissingModelMessage(agent));
    }
  };

  const report = async (): Promise<string> => {
    const changed = await collectChangedFiles();
    const agents = await readAgents();
    const resolved: Record<string, AgentModelInfo> = {};

    for (const [name, info] of Object.entries(agents)) {
      resolved[name] = { ...info, model: formatModel(info) };
    }

    return JSON.stringify({
      fresh: changed.length === 0,
      checked: changed.map(toRelative),
      serverStartedAt,
      agents: resolved,
      missingModel: missingModel(resolved),
    }, null, 2);
  };

  await ctx.tool.hook('execute.before', async (event) => {
    if (!event.tool || !DISPATCH_TOOLS.has(event.tool)) {
      return;
    }

    await assertFreshConfig();

    const subagent = subagentNameOf(event.input);

    if (!subagent) {
      throw new Error(`${event.tool} dispatch without a target agent is blocked by agent-config-guard.`);
    }

    await assertAgentModel(subagent);
  });

  await ctx.session.hook('context', async (event) => {
    await log('info', 'agent model', {
      agent: event.agent,
      model: event.model?.id,
      sessionID: event.sessionID,
    });

    if (!event.agent || !GUARDED_SUBAGENTS.includes(event.agent)) {
      return;
    }

    await assertFreshConfig();
    await assertAgentModel(event.agent);
  });

  await ctx.tool.transform((tools) => {
    tools.add({
      name: 'agent_config_check',
      description: 'Report whether the agent config is still in sync with the running opencode instance',
      input: { type: 'object', properties: {}, required: [], additionalProperties: false },
      // Without `codemode: false` the tool is registered as a Code Mode tool and
      // never appears in the model's native tool list.
      options: { codemode: false },
      execute: async () => ({ content: await report() }),
    });
  });

  await log('info', 'guard initialized', {
    bootId,
    checkedAt: serverStartedAt,
    files: Object.keys(initialSnapshot).length,
    reused,
  });
}
