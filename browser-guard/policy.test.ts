import { describe, expect, it } from 'vitest';

import { ALLOWED_ORIGINS, checkBrowserTool, NAVIGATE_TOOL, TABS_TOOL } from './policy';

describe('checkBrowserTool', () => {
  describe('browser_browser_navigate allows only the dev server', () => {
    it.each([
      'http://localhost:3000',
      'http://localhost:3000/',
      'http://localhost:3000/main',
      'http://localhost:3000/project?space=1&field=2',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3000/spaces?x=1',
      'about:blank',
    ])('allows %s', (url) => {
      expect(checkBrowserTool(NAVIGATE_TOOL, { url })).toEqual({ verdict: 'allow' });
    });

    it.each([
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      'http://localhost:3001',
      'http://localhost:30000',
      'https://localhost:3000',
      'http://192.168.0.10:3000',
      'http://example.com',
      'file:///Users/me/secret.html',
    ])('denies %s', (url) => {
      const verdict = checkBrowserTool(NAVIGATE_TOOL, { url });

      expect(verdict.verdict).toBe('deny');

      if (verdict.verdict === 'deny') {
        expect(verdict.url).toBe(url);
        expect(verdict.reason).toContain(url);
        expect(verdict.reason).toContain('http://localhost:3000');
      }
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
    it('allows a new tab on the dev server', () => {
      expect(checkBrowserTool(TABS_TOOL, { action: 'new', url: 'http://localhost:3000/main' })).toEqual({ verdict: 'allow' });
    });

    it('denies a new tab outside the dev server', () => {
      const verdict = checkBrowserTool(TABS_TOOL, { action: 'new', url: 'http://localhost:5173' });

      expect(verdict.verdict).toBe('deny');

      if (verdict.verdict === 'deny') {
        expect(verdict.url).toBe('http://localhost:5173');
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

  it('exposes the allowed origins for logging and docs', () => {
    expect(ALLOWED_ORIGINS).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000']);
  });
});
