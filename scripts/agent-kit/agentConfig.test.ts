import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  aggregateAgents,
  collectConfigFiles,
  diffSnapshot,
  formatModel,
  missingModel,
  parseAgentFrontmatter,
  snapshot,
  splitModelReference,
} from './agentConfig';

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-kit-'));

  temporaryRoots.push(root);

  return root;
}

async function writeFileAt(root: string, relativePath: string, content = ''): Promise<string> {
  const absolutePath = path.join(root, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');

  return absolutePath;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { force: true, recursive: true })));
});

describe('parseAgentFrontmatter', () => {
  it('reads flat model, variant and mode keys', () => {
    const markdown = [
      '---',
      'description: demo agent',
      'mode: subagent',
      'model: openrouter/deepseek/deepseek-v4.1-flash-1017',
      'variant: high',
      '---',
      'Body text',
    ].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({
      model: 'openrouter/deepseek/deepseek-v4.1-flash-1017',
      mode: 'subagent',
      variant: 'high',
    });
  });

  it('ignores nested permission blocks and their keys', () => {
    const markdown = [
      '---',
      'model: openrouter/demo',
      'permission:',
      '  edit:',
      '    "*": deny',
      '    model: nested',
      '---',
    ].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({ model: 'openrouter/demo' });
  });

  it('returns empty info when model is missing', () => {
    const markdown = ['---', 'mode: all', 'temperature: 0.1', '---'].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({ mode: 'all' });
  });

  it('returns empty info without frontmatter', () => {
    expect(parseAgentFrontmatter('# Agent\n\nmodel: openrouter/demo')).toEqual({});
  });

  it('strips quotes around values', () => {
    const markdown = ['---', 'model: "openrouter/demo"', 'variant: \'low\'', '---'].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({ model: 'openrouter/demo', variant: 'low' });
  });

  it('splits the V2 variant suffix into model and variant', () => {
    const markdown = ['---', 'model: openrouter/z-ai/glm-5.3#temp-low', '---'].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({
      model: 'openrouter/z-ai/glm-5.3',
      variant: 'temp-low',
    });
  });

  it('keeps the explicit variant key of a mixed V1 and V2 frontmatter', () => {
    const markdown = [
      '---',
      'description: demo',
      'model: openrouter/deepseek/deepseek-v4.1-flash-1017#low',
      'variant: high',
      'mode: subagent',
      'temperature: 0.1',
      'permissions:',
      '  - action: edit',
      '    resource: "*"',
      '    effect: deny',
      '---',
    ].join('\n');

    expect(parseAgentFrontmatter(markdown)).toEqual({
      model: 'openrouter/deepseek/deepseek-v4.1-flash-1017',
      mode: 'subagent',
      variant: 'high',
    });
  });

  it('ignores a trailing hash without a variant name', () => {
    expect(parseAgentFrontmatter(['---', 'model: openrouter/demo#', '---'].join('\n')))
      .toEqual({ model: 'openrouter/demo' });
  });
});

describe('model references', () => {
  it('splits a reference with and without a variant', () => {
    expect(splitModelReference('openrouter/xiao/mimo#temp-low'))
      .toEqual({ model: 'openrouter/xiao/mimo', variant: 'temp-low' });
    expect(splitModelReference('openrouter/xiao/mimo')).toEqual({ model: 'openrouter/xiao/mimo' });
    expect(splitModelReference('#low')).toEqual({ model: '#low' });
  });

  it('formats the full reference back', () => {
    expect(formatModel({ model: 'openrouter/demo', variant: 'high' })).toBe('openrouter/demo#high');
    expect(formatModel({ model: 'openrouter/demo' })).toBe('openrouter/demo');
    expect(formatModel({})).toBeUndefined();
    expect(formatModel(undefined)).toBeUndefined();
  });
});

describe('collectConfigFiles', () => {
  it('collects every agent config input and ignores unrelated files', async () => {
    const root = await createRoot();

    const coder = await writeFileAt(root, '.opencode/agents/coder.md');
    const nestedAgent = await writeFileAt(root, '.opencode/agents/team/reviewer.md');
    const skill = await writeFileAt(root, '.opencode/skills/tdd/SKILL.md');
    const skillReadme = await writeFileAt(root, '.opencode/skills/tdd/reference.md');
    const command = await writeFileAt(root, '.opencode/commands/close.md');
    const opencodeConfig = await writeFileAt(root, '.opencode/opencode.json');
    const agentsFile = await writeFileAt(root, 'AGENTS.md');
    const localFile = await writeFileAt(root, 'local.md');
    const opencodeJsonc = await writeFileAt(root, 'opencode.jsonc');
    const unrelated = await writeFileAt(root, 'README.md');
    const plugin = await writeFileAt(root, '.opencode/plugins/guard.ts');

    const files = await collectConfigFiles(root);

    expect(files).toEqual(expect.arrayContaining([
      coder,
      nestedAgent,
      skill,
      command,
      opencodeConfig,
      agentsFile,
      localFile,
      opencodeJsonc,
      path.join(root, 'opencode.json'),
    ]));
    expect(files).not.toContain(skillReadme);
    expect(files).not.toContain(unrelated);
    expect(files).not.toContain(plugin);
  });
});

describe('snapshot diff', () => {
  it('reports a changed file', async () => {
    const root = await createRoot();
    const changed = await writeFileAt(root, 'AGENTS.md', 'one');
    const untouched = await writeFileAt(root, 'local.md', 'two');
    const files = [changed, untouched];

    const before = await snapshot(files);
    const later = new Date(Date.now() + 5_000);

    await utimes(changed, later, later);

    expect(diffSnapshot(before, await snapshot(files))).toEqual([changed]);
  });

  it('reports an added file', async () => {
    const root = await createRoot();
    const existing = await writeFileAt(root, 'AGENTS.md', 'one');

    const before = await snapshot([existing]);
    const added = await writeFileAt(root, 'local.md', 'two');

    expect(diffSnapshot(before, await snapshot([existing, added]))).toEqual([added]);
  });

  it('reports a removed file', async () => {
    const root = await createRoot();
    const existing = await writeFileAt(root, 'AGENTS.md', 'one');
    const removed = await writeFileAt(root, 'local.md', 'two');
    const files = [existing, removed];

    const before = await snapshot(files);

    await rm(removed);

    expect(diffSnapshot(before, await snapshot(files))).toEqual([removed]);
  });

  it('skips missing files in the snapshot', async () => {
    const root = await createRoot();

    expect(await snapshot([path.join(root, 'missing.md')])).toEqual({});
  });
});

describe('aggregateAgents', () => {
  it('parses only markdown agent files and reports agents without a model', () => {
    const agents = aggregateAgents([
      {
        path: path.join('/repo', '.opencode', 'agents', 'coder.md'),
        content: '---\nmodel: openrouter/deepseek/deepseek-v4.1-flash-1017\nvariant: low\n---',
      },
      {
        path: path.join('/repo', '.opencode', 'agents', 'test-generator.md'),
        content: '---\nmode: subagent\n---',
      },
      {
        path: path.join('/repo', '.opencode', 'opencode.json'),
        content: '{"agent":{"coder":{"model":"openrouter/demo"}}}',
      },
      {
        path: path.join('/repo', '.opencode', 'skills', 'tdd', 'SKILL.md'),
        content: '---\nmodel: openrouter/demo\n---',
      },
    ]);

    expect(agents).toEqual({
      'coder': { model: 'openrouter/deepseek/deepseek-v4.1-flash-1017', variant: 'low' },
      'test-generator': { mode: 'subagent' },
    });
    expect(missingModel(agents)).toEqual(['test-generator']);
  });
});
