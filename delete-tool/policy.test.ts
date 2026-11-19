import { describe, expect, it } from 'vitest';

import {
  normalizeDeletePath,
  TEST_FILE_BASENAMES,
  TEST_FILE_SUFFIXES,
  TEST_NAME_MARKERS,
  TEST_NAME_PREFIX_SUFFIXES,
  TEST_PATH_SEGMENTS,
} from './policy';

const ROOT = '/tmp/kit-project';

describe('test taxonomy constants', () => {
  it('mirrors the edit denies in agents/coder.md', () => {
    expect(TEST_NAME_MARKERS).toEqual(['.test.', '.spec.']);
    expect(TEST_FILE_SUFFIXES).toEqual(['_test.go', '_test.py', '_test.rs', 'Test.java', 'Tests.java', '.snap']);
    expect(TEST_FILE_BASENAMES).toEqual(['conftest.py']);
    expect(TEST_NAME_PREFIX_SUFFIXES).toEqual([['test_', '.py']]);
    expect(TEST_PATH_SEGMENTS).toEqual(['__tests__', '__snapshots__']);
  });
});

describe('normalizeDeletePath', () => {
  it('accepts a production path at the repo root', () => {
    expect(normalizeDeletePath('src/api.ts', ROOT)).toEqual({ ok: true, relative: 'src/api.ts', kind: 'production' });
  });

  it('accepts a nested production path', () => {
    expect(normalizeDeletePath('src/entities/wells/helper.ts', ROOT)).toEqual({
      kind: 'production',
      ok: true,
      relative: 'src/entities/wells/helper.ts',
    });
  });

  it('accepts a production path outside any src layout', () => {
    expect(normalizeDeletePath('docs/api.md', ROOT)).toEqual({ ok: true, relative: 'docs/api.md', kind: 'production' });
    expect(normalizeDeletePath('README.md', ROOT)).toEqual({ ok: true, relative: 'README.md', kind: 'production' });
    expect(normalizeDeletePath('src/x.md', ROOT)).toEqual({ ok: true, relative: 'src/x.md', kind: 'production' });
  });

  it('normalizes an absolute path inside the root to a relative one', () => {
    expect(normalizeDeletePath(`${ROOT}/src/entities/wells/api.ts`, ROOT)).toEqual({
      kind: 'production',
      ok: true,
      relative: 'src/entities/wells/api.ts',
    });
  });

  it('converts backslashes to forward slashes', () => {
    expect(normalizeDeletePath('src\\entities\\wells\\api.ts', ROOT)).toEqual({
      kind: 'production',
      ok: true,
      relative: 'src/entities/wells/api.ts',
    });
  });

  it('collapses dot segments', () => {
    expect(normalizeDeletePath('src/./x.ts', ROOT)).toEqual({ ok: true, relative: 'src/x.ts', kind: 'production' });
  });

  it.each([
    ['src/x.test.ts', 'test'],
    ['src/x.test.tsx', 'test'],
    ['src/x.spec.js', 'test'],
    ['pkg/x_test.go', 'test'],
    ['tests/test_x.py', 'test'],
    ['pkg/x_test.py', 'test'],    ['tests/conftest.py', 'test'],
    ['com/foo/BarTest.java', 'test'],
    ['com/foo/BarTests.java', 'test'],
    ['lib/x_test.rs', 'test'],
    ['src/__tests__/helper.ts', 'test'],
    ['src/deep/__snapshots__/a.snap', 'test'],
  ])('classifies %s as %s', (relative, kind) => {
    expect(normalizeDeletePath(relative, ROOT)).toEqual({ ok: true, relative, kind });
  });

  it('keeps a production classification for a test-named directory without markers', () => {
    expect(normalizeDeletePath('src/testing/dir.ts', ROOT)).toEqual({
      kind: 'production',
      ok: true,
      relative: 'src/testing/dir.ts',
    });
  });

  it.each([
    ['../outside.ts', 'path must not contain ".." segments'],
    ['src/../src/x.ts', 'path must not contain ".." segments'],
    [`${ROOT}/src/../sneaky.ts`, 'path must not contain ".." segments'],
    ['/etc/x.ts', 'path is outside the project root'],
    [`${ROOT}elsewhere/x.ts`, 'path is outside the project root'],
    ['src/x/', 'path is a directory, not a file'],
    ['/', 'path is a directory, not a file'],
    ['', 'path must be a non-empty string'],
    ['   ', 'path must be a non-empty string'],
    [null, 'path must be a non-empty string'],
    [undefined, 'path must be a non-empty string'],
    [42, 'path must be a non-empty string'],
  ])('rejects %j with %s', (raw, reason) => {
    expect(normalizeDeletePath(raw, ROOT)).toEqual({ ok: false, reason });
  });

  it.each([
    ['.env'],
    ['.env.local'],
    ['config.env'],
    ['secrets.local'],
    ['.git/config'],
    ['.git/hooks/pre-commit'],
  ])('protects %s from deletion', (relative) => {
    expect(normalizeDeletePath(relative, ROOT)).toEqual({
      ok: false,
      reason: 'path is protected (.env*, *.local, VCS internals) and cannot be deleted',
    });
  });

  it('accepts a bare directory name at policy level — the plugin rejects it as not a file', () => {
    expect(normalizeDeletePath('src', ROOT)).toEqual({ ok: true, relative: 'src', kind: 'production' });
  });

  it('rejects the project root itself', () => {
    expect(normalizeDeletePath(ROOT, ROOT)).toEqual({ ok: false, reason: 'path is the project root, not a file' });
  });
});
