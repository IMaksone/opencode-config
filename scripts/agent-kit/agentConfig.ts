/**
 * Pure helpers for the agent config guard.
 *
 * No opencode imports on purpose: this module is unit-testable in isolation and
 * runs both inside the local plugin and in CI.
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export interface AgentModelInfo {
  model?: string;
  variant?: string;
  mode?: string;
}

export interface ConfigFileContent {
  path: string;
  content: string;
}

export type ConfigSnapshot = Record<string, number>;

const AGENTS_KEYS = ['model', 'variant', 'mode'] as const;

const AGENTS_DIR = path.join('.opencode', 'agents');
const SKILLS_DIR = path.join('.opencode', 'skills');
const COMMANDS_DIR = path.join('.opencode', 'commands');

/**
 * Root config candidates are always returned, even when missing: a file created
 * after the snapshot must show up as an addition on the next collection.
 */
const ROOT_CONFIG_FILES = [
  path.join('.opencode', 'opencode.json'),
  'AGENTS.md',
  'local.md',
  'opencode.json',
  'opencode.jsonc',
];

const AGENTS_PATH_PART = `${path.sep}.opencode${path.sep}agents${path.sep}`;

function isAgentKey(key: string): key is (typeof AGENTS_KEYS)[number] {
  return (AGENTS_KEYS as readonly string[]).includes(key);
}

/**
 * Split a V2 model reference (`provider/model#variant`) into its parts. V1 kept
 * the variant in a separate `variant` key; both shapes are accepted.
 */
export function splitModelReference(value: string): { model: string; variant?: string } {
  const hash = value.indexOf('#');

  if (hash <= 0) {
    return { model: value };
  }

  const variant = value.slice(hash + 1).trim();

  return { model: value.slice(0, hash), variant: variant === '' ? undefined : variant };
}

/** Full `provider/model#variant` reference for output and logs. */
export function formatModel(info: AgentModelInfo | undefined): string | undefined {
  if (!info?.model) {
    return undefined;
  }

  return info.variant ? `${info.model}#${info.variant}` : info.model;
}

function unquote(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const first = value[0];
  const last = value[value.length - 1];

  if ((first === '"' || first === '\'') && first === last) {
    return value.slice(1, -1);
  }

  return value;
}

async function listFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  }
  catch {
    return [];
  }

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    }
    else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function listSkillFiles(directory: string): Promise<string[]> {
  const files = await listFiles(directory);

  return files.filter(file => path.basename(file) === 'SKILL.md');
}

/**
 * Parse flat `model` / `variant` / `mode` keys from a markdown frontmatter block.
 * Nested blocks (`permission:` and its indented keys) are ignored.
 */
export function parseAgentFrontmatter(markdown: string): AgentModelInfo {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');

  if (lines[0]?.trim() !== '---') {
    return {};
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');

  if (end === -1) {
    return {};
  }

  const info: AgentModelInfo = {};
  let inlineVariant: string | undefined;

  for (const line of lines.slice(1, end)) {
    if (line.trim() === '' || /^\s/.test(line)) {
      continue;
    }

    const colon = line.indexOf(':');

    if (colon === -1) {
      continue;
    }

    const key = line.slice(0, colon).trim();
    const rawValue = line.slice(colon + 1).trim();

    if (!isAgentKey(key) || rawValue === '') {
      continue;
    }

    const value = unquote(rawValue);

    if (key === 'model') {
      const reference = splitModelReference(value);

      info.model = reference.model;
      inlineVariant = reference.variant;

      continue;
    }

    info[key] = value;
  }

  // V1 files keep the variant in its own key; V2 joins it to the model.
  info.variant ??= inlineVariant;

  if (info.variant === undefined) {
    delete info.variant;
  }

  return info;
}

/**
 * Recursively collect every repository config input that can change agent
 * models. The global `~/.config/opencode/**` tree is intentionally out of scope.
 */
export async function collectConfigFiles(root: string): Promise<string[]> {
  const [agentFiles, skillFiles, commandFiles] = await Promise.all([
    listFiles(path.join(root, AGENTS_DIR)),
    listSkillFiles(path.join(root, SKILLS_DIR)),
    listFiles(path.join(root, COMMANDS_DIR)),
  ]);

  const rootFiles = ROOT_CONFIG_FILES.map(file => path.join(root, file));

  return [...new Set([...agentFiles, ...skillFiles, ...commandFiles, ...rootFiles])].sort();
}

/** Map every existing file to its `mtimeMs`; missing files are skipped. */
export async function snapshot(files: string[]): Promise<ConfigSnapshot> {
  const entries = await Promise.all(files.map(async (file): Promise<[string, number] | null> => {
    try {
      const info = await stat(file);

      return [file, info.mtimeMs];
    }
    catch {
      return null;
    }
  }));

  const result: ConfigSnapshot = {};

  for (const entry of entries) {
    if (entry) {
      result[entry[0]] = entry[1];
    }
  }

  return result;
}

/** Changed, added and removed files, sorted for a stable message. */
export function diffSnapshot(previous: ConfigSnapshot, next: ConfigSnapshot): string[] {
  const files = new Set([...Object.keys(previous), ...Object.keys(next)]);

  return [...files].filter(file => previous[file] !== next[file]).sort();
}

/**
 * Build an `agent → frontmatter` map from markdown files inside
 * `.opencode/agents`. The `agent` key of JSON configs is out of scope.
 */
export function aggregateAgents(files: ConfigFileContent[]): Record<string, AgentModelInfo> {
  const agents: Record<string, AgentModelInfo> = {};

  for (const file of files) {
    if (!file.path.endsWith('.md') || !file.path.includes(AGENTS_PATH_PART)) {
      continue;
    }

    agents[path.basename(file.path, '.md')] = parseAgentFrontmatter(file.content);
  }

  return agents;
}

/** Sorted names of agents without an explicit `model`. */
export function missingModel(agents: Record<string, AgentModelInfo>): string[] {
  return Object.entries(agents)
    .filter(([, info]) => !info.model)
    .map(([name]) => name)
    .sort();
}
