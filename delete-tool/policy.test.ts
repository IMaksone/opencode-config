import { describe, expect, it } from 'vitest';

import { normalizeDeletePath, TEST_FILE_SUFFIXES, TEST_PATH_PREFIXES } from './policy';

const ROOT = '/tmp/cervart-project';

describe('test taxonomy constants', () => {
  it('mirrors the edit denies in agents/coder.md', () => {
    expect(TEST_FILE_SUFFIXES).toEqual(['.test.ts', '.test.tsx', '.testHelpers.ts']);
    expect(TEST_PATH_PREFIXES).toEqual(['src/shared/testing/', 'src/shared/api/testing/']);
  });
});

describe('normalizeDeletePath', () => {
  it('accepts a production path at the src root', () => {
    expect(normalizeDeletePath('src/api.ts', ROOT)).toEqual({ ok: true, relative: 'src/api.ts', kind: 'production' });
  });

  it('accepts a nested production path', () => {
    expect(normalizeDeletePath('src/entities/wells/helper.ts', ROOT)).toEqual({
      kind: 'production',
      ok: true,
      relative: 'src/entities/wells/helper.ts',
    });
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
    ['src/x.testHelpers.ts', 'test'],
    ['src/shared/testing/setup.ts', 'test'],
    ['src/shared/api/testing/handlers.ts', 'test'],
    ['src/shared/testing/sub/deep.ts', 'test'],
  ])('classifies %s as %s', (relative, kind) => {
    expect(normalizeDeletePath(relative, ROOT)).toEqual({ ok: true, relative, kind });
  });

  it('keeps a production classification for a test-suffixed directory name only', () => {
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
    ['docs/api.md', 'path is outside src/'],
    ['README.md', 'path is outside src/'],
    ['src/x.md', 'only .ts and .tsx files can be deleted'],
    ['src', 'path is outside src/'],
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

  it('rejects the project root itself', () => {
    expect(normalizeDeletePath(ROOT, ROOT)).toEqual({ ok: false, reason: 'path is the project root, not a file' });
  });
});
