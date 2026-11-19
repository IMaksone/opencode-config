import { describe, expect, it } from 'vitest';

import { allowedTargets, validateMoveTarget } from './policy';

const ROOT = '/tmp/cervart-project';
const WT = '/tmp/cervart-wt/agent';

describe('validateMoveTarget', () => {
  it('accepts the canonical project root as project-root', () => {
    expect(validateMoveTarget({
      rawDirectory: ROOT,
      canonicalRoot: ROOT,
      targetReal: ROOT,
      targetIsDirectory: true,
    })).toEqual({ ok: true, kind: 'project-root', real: ROOT });
  });

  it('normalizes a trailing slash on the root before comparing', () => {
    expect(validateMoveTarget({
      rawDirectory: `${ROOT}/`,
      canonicalRoot: `${ROOT}/`,
      targetReal: `${ROOT}/`,
      targetIsDirectory: true,
    })).toEqual({ ok: true, kind: 'project-root', real: ROOT });
  });

  it('accepts a worktree proven by the gitdir marker and kitted with .opencode', () => {
    expect(validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      dotGitContent: `gitdir: ${ROOT}/.git/worktrees/agent\n`,
      targetKitPresent: true,
    })).toEqual({ ok: true, kind: 'worktree', real: WT });
  });

  it('accepts a worktree listed in the native inventory without a marker, kitted with .opencode', () => {
    expect(validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      worktreeRoots: [WT],
      targetKitPresent: true,
    })).toEqual({ ok: true, kind: 'worktree', real: WT });
  });

  it('refuses a marker-proven worktree without the .opencode agent kit, naming worktree.kit', () => {
    expect(validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      dotGitContent: `gitdir: ${ROOT}/.git/worktrees/agent\n`,
      targetKitPresent: false,
    })).toEqual({
      ok: false,
      reason: 'target worktree has no .opencode agent kit; link it first: git-manager worktree.kit <name>, then opencode service restart',
    });
  });

  it('refuses an inventory-listed worktree without the .opencode agent kit', () => {
    expect(validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      worktreeRoots: [WT],
      targetKitPresent: false,
    })).toEqual({
      ok: false,
      reason: 'target worktree has no .opencode agent kit; link it first: git-manager worktree.kit <name>, then opencode service restart',
    });
  });

  it('ignores the kit fact for the project root — the root is the kit source', () => {
    expect(validateMoveTarget({
      rawDirectory: ROOT,
      canonicalRoot: ROOT,
      targetReal: ROOT,
      targetIsDirectory: true,
      targetKitPresent: false,
    })).toEqual({ ok: true, kind: 'project-root', real: ROOT });
  });

  it.each([
    [`${ROOT}/.git/worktrees/../escape`],
    [`${ROOT}/.git/worktrees/../../..`],
    [`${ROOT}/.git/worktrees/a/b`],
    [`${ROOT}/.git/worktrees/`],
    ['/other/project/.git/worktrees/agent'],
    [`${ROOT}/.git/modules/submodule`],
  ])('refuses the marker %s and falls through to the inventory', (gitdir) => {
    const verdict = validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      dotGitContent: `gitdir: ${gitdir}\n`,
      worktreeRoots: [],
    });

    expect(verdict).toEqual({
      ok: false,
      reason: `target is not the project root or one of its worktrees; allowed: ${ROOT}`,
    });
  });

  it('refuses a foreign directory whose marker points at another repository', () => {
    const foreign = '/tmp/other-project';

    expect(validateMoveTarget({
      rawDirectory: foreign,
      canonicalRoot: ROOT,
      targetReal: foreign,
      targetIsDirectory: true,
      dotGitContent: 'gitdir: /tmp/other-project/.git/worktrees/agent\n',
      worktreeRoots: [WT],
    })).toEqual({
      ok: false,
      reason: `target is not the project root or one of its worktrees; allowed: ${ROOT}, ${WT}`,
    });
  });

  it('refuses garbage marker content without a gitdir line', () => {
    const verdict = validateMoveTarget({
      rawDirectory: WT,
      canonicalRoot: ROOT,
      targetReal: WT,
      targetIsDirectory: true,
      dotGitContent: 'not a gitdir file\n',
    });

    expect(verdict.ok).toBe(false);
  });

  it('refuses an existing directory outside every list, naming the allowed targets', () => {
    expect(validateMoveTarget({
      rawDirectory: '/tmp/somewhere-else',
      canonicalRoot: ROOT,
      targetReal: '/tmp/somewhere-else',
      targetIsDirectory: true,
      worktreeRoots: [WT],
    })).toEqual({
      ok: false,
      reason: `target is not the project root or one of its worktrees; allowed: ${ROOT}, ${WT}`,
    });
  });

  it('refuses a nonexistent target', () => {
    expect(validateMoveTarget({
      rawDirectory: `${WT}/ghost`,
      canonicalRoot: ROOT,
      targetReal: undefined,
      targetIsDirectory: false,
    })).toEqual({ ok: false, reason: `directory does not exist: ${WT}/ghost` });
  });

  it('refuses a target that exists but is not a directory', () => {
    const file = `${ROOT}/src/api.ts`;

    expect(validateMoveTarget({
      rawDirectory: file,
      canonicalRoot: ROOT,
      targetReal: file,
      targetIsDirectory: false,
    })).toEqual({ ok: false, reason: `target is not a directory: ${file}` });
  });

  it.each([
    [null, 'directory must be a non-empty string'],
    [undefined, 'directory must be a non-empty string'],
    [42, 'directory must be a non-empty string'],
    ['', 'directory must be a non-empty string'],
    ['   ', 'directory must be a non-empty string'],
    ['cervart-wt/agent', 'directory must be an absolute path'],
    ['../cervart-wt/agent', 'directory must be an absolute path'],
    ['src', 'directory must be an absolute path'],
  ])('rejects %j with %s', (raw, reason) => {
    expect(validateMoveTarget({
      rawDirectory: raw,
      canonicalRoot: ROOT,
      targetReal: ROOT,
      targetIsDirectory: true,
    })).toEqual({ ok: false, reason });
  });
});

describe('allowedTargets', () => {
  it('is the root plus the unique normalized inventory entries', () => {
    expect(allowedTargets(ROOT, [`${WT}/`, WT, '/tmp/other'])).toEqual([ROOT, WT, '/tmp/other']);
  });
});
