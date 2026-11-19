import { describe, expect, it } from 'vitest';

import {
  checkBrowserTool,
  denyReason,
  extraOriginsFromEnv,
  NAVIGATE_TOOL,
  TABS_TOOL,
} from './policy';

describe('checkBrowserTool', () => {
  describe('browser_browser_navigate allows only loopback dev-server origins', () => {
    it.each([
      'http://localhost:3000',
      'http://localhost:3000/',
      'http://localhost:3000/main',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:3000/spaces?x=1',
      'http://127.0.0.1:8080',
      'http://[::1]:5173',
      'http://localhost',
      'about:blank',
    ])('allows %s', (url) => {
      expect(checkBrowserTool(NAVIGATE_TOOL, { url })).toEqual({ verdict: 'allow' });
    });

    it.each([
      'http://192.168.0.10:3000',
      'http://10.0.0.2:5173',
      'http://example.com',
      'https://staging.example.com',
      'file:///Users/me/secret.html',
      'chrome://settings',
    ])('denies %s', (url) => {
      const verdict = checkBrowserTool(NAVIGATE_TOOL, { url });

      expect(verdict.verdict).toBe('deny');

      if (verdict.verdict === 'deny') {
        expect(verdict.url).toBe(url);
        expect(verdict.reason).toContain(url);
        expect(verdict.reason).toContain('http://localhost:<port>');
      }
    });

    it('allows an extra origin supplied by the operator', () => {
      const extras = ['https://staging.example.com'];

      expect(checkBrowserTool(NAVIGATE_TOOL, { url: 'https://staging.example.com/app' }, extras))
        .toEqual({ verdict: 'allow' });
      expect(checkBrowserTool(NAVIGATE_TOOL, { url: 'https://other.example.com' }, extras).verdict).toBe('deny');
    });

    it.each([
      ['missing url', undefined],
      ['non-string url', 3000],
      ['empty url', '   '],
    ])('denies a malformed call: %s', (_name, url) => {
      const verdict = checkBrowserTool(NAVIGATE_TOOL, { url });

      expect(verdict.verdict).toBe('deny');
    });

    it('denies navigate without any input object', () => {
      const verdict = checkBrowserTool(NAVIGATE_TOOL, undefined);

      expect(verdict.verdict).toBe('deny');
    });
  });

  describe('browser_browser_tabs navigates only via action new with a url', () => {
    it('allows a new tab on a loopback origin', () => {
      expect(checkBrowserTool(TABS_TOOL, { action: 'new', url: 'http://localhost:3000/main' })).toEqual({ verdict: 'allow' });
    });

    it('denies a new tab outside loopback', () => {
      const verdict = checkBrowserTool(TABS_TOOL, { action: 'new', url: 'http://example.com' });

      expect(verdict.verdict).toBe('deny');

      if (verdict.verdict === 'deny') {
        expect(verdict.url).toBe('http://example.com');
      }
    });

    it('allows a new tab without a url (blank tab)', () => {
      expect(checkBrowserTool(TABS_TOOL, { action: 'new' })).toEqual({ verdict: 'allow' });
    });

    it('allows non-new tab actions regardless of the url field', () => {
      expect(checkBrowserTool(TABS_TOOL, { action: 'list' })).toEqual({ verdict: 'allow' });
      expect(checkBrowserTool(TABS_TOOL, { action: 'select', index: 1 })).toEqual({ verdict: 'allow' });
    });
  });

  describe('other tools pass through untouched', () => {
    it.each([
      'browser_browser_snapshot',
      'browser_browser_find',
      'browser_browser_click',
      'browser_browser_console_messages',
      'browser_browser_network_requests',
      'read',
      'shell',
    ])('allows %s with any input', (tool) => {
      expect(checkBrowserTool(tool, { anything: 'http://example.com' })).toEqual({ verdict: 'allow' });
      expect(checkBrowserTool(tool, undefined)).toEqual({ verdict: 'allow' });
    });
  });

  describe('extraOriginsFromEnv', () => {
    it('parses comma-separated origins with trimming', () => {
      expect(extraOriginsFromEnv(' https://a.example , http://b.example ')).toEqual(['https://a.example', 'http://b.example']);
    });

    it('drops empty entries and accepts an undefined value', () => {
      expect(extraOriginsFromEnv(',, ,')).toEqual([]);
      expect(extraOriginsFromEnv(undefined)).toEqual([]);
    });
  });

  it('deny reason names the allowed origins', () => {
    expect(denyReason('http://example.com', ['https://staging.example.com'])).toBe(
      'browser checks are allowed only on local dev-server origins '
      + '(http://localhost:<port>, https://staging.example.com); refused URL: http://example.com',
    );
  });
});
