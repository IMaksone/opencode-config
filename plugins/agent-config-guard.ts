import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AgentModelInfo } from '../scripts/agent-kit/agentConfig';
import {
  aggregateAgents,
  collectConfigFiles,
  diffSnapshot,
  missingModel,
  snapshot,
} from '../scripts/agent-kit/agentConfig';

const SERVICE = 'agent-config-guard';

/**
 * Subagents that must carry an explicit model: a missing model silently falls
 * back to the parent model inside the task tool.
 */
const GUARDED_SUBAGENTS = new Set(['tdd', 'build', 'coder', 'test-generator', 'git-manager']);

type LogLevel = 'debug' | 'error' | 'info' | 'warn';

function formatMissingModelMessage(agent: string): string {
  return `subagent "${agent}" has no model configured in .opencode/agents/${agent}.md; `
    + 'dispatch blocked to avoid a silent fallback to the parent model. '
    + 'Fix the agent config, restart opencode and retry.';
}

/**
 * Blocks `task` dispatch when any agent config input changed after opencode
 * started, or when the target subagent has no explicit model.
 */
export const AgentConfigGuard: Plugin = async ({ client, directory }) => {
  const log = async (level: LogLevel, message: string, extra?: Record<string, unknown>): Promise<void> => {
    try {
      await client.app.log({ body: { extra, level, message, service: SERVICE } });
    }
    catch {
      // Logging must never break the harness.
    }
  };

  const serverStartedAt = new Date().toISOString();
  const initialSnapshot = await snapshot(await collectConfigFiles(directory));

  // Never await the client before returning hooks: the server is not accepting
  // connections during plugin bootstrap, so this call runs in the background.
  void log('info', 'guard initialized', {
    files: Object.keys(initialSnapshot).length,
    checkedAt: serverStartedAt,
  });

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
        return { path: file, content: await readFile(file, 'utf8') };
      }
      catch {
        return null;
      }
    }));

    return aggregateAgents(contents.filter(file => file !== null));
  };

  const assertAgentModel = async (agent: string): Promise<void> => {
    const agents = await readAgents();

    if (!agents[agent]?.model) {
      throw new Error(formatMissingModelMessage(agent));
    }
  };

  return {
    'tool.execute.before': async (input, output) => {
      if (input.tool !== 'task') {
        return;
      }

      await assertFreshConfig();

      const subagent: unknown = output.args?.subagent_type;

      if (typeof subagent !== 'string' || subagent === '') {
        throw new Error('task dispatch without subagent_type is blocked by agent-config-guard.');
      }

      await assertAgentModel(subagent);
    },
    'chat.params': async (input) => {
      await log('info', 'agent model', {
        agent: input.agent,
        model: input.model?.id,
        sessionID: input.sessionID,
      });

      if (!GUARDED_SUBAGENTS.has(input.agent)) {
        return;
      }

      await assertFreshConfig();
      await assertAgentModel(input.agent);
    },
    'tool': {
      'agent_config_check': tool({
        description: 'Report whether the agent config is still in sync with the running opencode instance',
        args: {},
        async execute() {
          const checked = await collectChangedFiles();
          const agents = await readAgents();

          return JSON.stringify({
            fresh: checked.length === 0,
            checked: checked.map(toRelative),
            serverStartedAt,
            agents,
            missingModel: missingModel(agents),
          }, null, 2);
        },
      }),
    },
  };
};
