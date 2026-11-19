import { describe, expect, it } from 'vitest';

import { BACKGROUND_TOOLS, forceForeground, stripBackgroundFromTools } from './policy';

describe('BACKGROUND_TOOLS', () => {
  it('lists the V2 tools and their V1 aliases', () => {
    expect(BACKGROUND_TOOLS).toEqual(['shell', 'bash', 'subagent', 'task']);
  });
});

describe('forceForeground', () => {
  it('rewrites background: true and reports the change', () => {
    const result = forceForeground('shell', { background: true, command: 'pnpm build' });

    expect(result.changed).toBe(true);
    expect(result.input).toEqual({ background: false, command: 'pnpm build' });
  });

  it('returns a copy and leaves the source input untouched', () => {
    const input = { background: true, command: 'pnpm build' };
    const result = forceForeground('shell', input);

    expect(result.input).not.toBe(input);
    expect(input).toEqual({ background: true, command: 'pnpm build' });
  });

  it('keeps neighbouring input fields', () => {
    const result = forceForeground('subagent', {
      background: true,
      subagent_type: 'coder',
      timeout: 0,
    });

    expect(result.input).toEqual({ background: false, subagent_type: 'coder', timeout: 0 });
  });

  it('passes background: false through as the same object', () => {
    const input = { background: false, command: 'pnpm test' };
    const result = forceForeground('shell', input);

    expect(result.changed).toBe(false);
    expect(result.input).toBe(input);
  });

  it('passes a missing background through as the same object', () => {
    const input = { command: 'pnpm test' };
    const result = forceForeground('bash', input);

    expect(result.changed).toBe(false);
    expect(result.input).toBe(input);
  });

  it.each([
    ['true', 'the string true'],
    [1, 'the number one'],
    [null, 'null'],
  ])('passes the non-boolean background %s through', (background) => {
    const input = { background, command: 'pnpm test' };
    const result = forceForeground('shell', input);

    expect(result.changed).toBe(false);
    expect(result.input).toBe(input);
  });

  it('leaves tools that cannot background a run alone', () => {
    const input = { background: true, filePath: 'README.md' };
    const result = forceForeground('read', input);

    expect(result.changed).toBe(false);
    expect(result.input).toBe(input);
  });
});

describe('stripBackgroundFromTools', () => {
  it('removes background only from the background tools', () => {
    const tools = {
      shell: {
        description: 'run a command',
        input: { type: 'object', properties: { background: { type: 'boolean' }, command: { type: 'string' } } },
      },
      subagent: {
        description: 'dispatch a subagent',
        input: { type: 'object', properties: { background: { type: 'boolean' }, subagent_type: {} } },
      },
      read: {
        description: 'read a file',
        input: { type: 'object', properties: { background: { type: 'boolean' }, filePath: {} } },
      },
    };

    stripBackgroundFromTools(tools);

    expect(tools.shell.input.properties).toEqual({ command: { type: 'string' } });
    expect(tools.subagent.input.properties).toEqual({ subagent_type: {} });
    expect(tools.read.input.properties).toEqual({ background: { type: 'boolean' }, filePath: {} });
  });

  it('accepts a flat schema and ignores malformed entries', () => {
    const tools = {
      task: { description: 'v1 dispatch', properties: { background: {}, prompt: {} } },
      bash: {},
      shell: { input: null },
      subagent: { input: { properties: 'nope' } },
    };

    expect(() => stripBackgroundFromTools(tools)).not.toThrow();
    expect(tools.task.properties).toEqual({ prompt: {} });
  });

  it('tolerates a non-record tools map', () => {
    expect(() => stripBackgroundFromTools(undefined as unknown as Record<string, unknown>)).not.toThrow();
    expect(() => stripBackgroundFromTools('nope' as unknown as Record<string, unknown>)).not.toThrow();
  });
});
