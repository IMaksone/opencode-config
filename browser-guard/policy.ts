/**
 * Browser-guard policy.
 *
 * Live browser checks in this project always target the local Vite dev server
 * (`http://localhost:3000`, pinned in `vite.config.ts` with `strictPort`).
 * Agents used to guess Vite defaults (5173/4173) because the port was not part
 * of any instruction, and no permission rule can express a URL allowlist for
 * MCP tools (their resource is always `*`). The guard makes the rule
 * mechanical: navigation may open only the dev-server origins plus
 * `about:blank`, everything else is denied with a reason the model sees.
 *
 * Pure decision functions: no filesystem access and no `@opencode/plugin`
 * dependency, so the rules are unit-testable in isolation. The allowed origins
 * are mirrored in the root `AGENTS.md`.
 */

/** Dev-server origins allowed for navigation; mirrored in `AGENTS.md`. */
export const ALLOWED_ORIGINS: readonly string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/** Neutral page that navigates nowhere; the browser opens it by default. */
const ALLOWED_EXACT: readonly string[] = ['about:blank'];

/** Tool that navigates the page; the URL lives in its `url` input. */
export const NAVIGATE_TOOL = 'browser_browser_navigate';

/** Tab tool; it navigates only when a new tab carries a `url`. */
export const TABS_TOOL = 'browser_browser_tabs';

export type NavigationVerdict =
  | { verdict: 'allow' }
  | { verdict: 'deny'; reason: string; url: string };

/** Denial reason shown to the model; names the only allowed URL. */
export function denyReason(url: string): string {
  return `browser checks are only allowed on the dev server http://localhost:3000 `
    + `(pinned in vite.config.ts, strictPort); refused URL: ${url}`;
}

function isAllowedUrl(url: string): boolean {
  if (ALLOWED_EXACT.includes(url)) {
    return true;
  }

  return ALLOWED_ORIGINS.some(origin =>
    url === origin || url.startsWith(`${origin}/`) || url.startsWith(`${origin}?`),
  );
}

/**
 * Decide whether a browser tool call may run.
 *
 * `browser_browser_navigate` must carry an allowed string `url` (a missing or
 * non-string `url` is denied: the call is malformed anyway).
 * `browser_browser_tabs` is checked only for `action: "new"` with a non-empty
 * `url`. Every other tool passes through: the guard never blocks inspection
 * (snapshot, find, click, console, network).
 */
export function checkBrowserTool(
  tool: string,
  input: Record<string, unknown> | undefined | null,
): NavigationVerdict {
  if (tool === NAVIGATE_TOOL) {
    const url = input?.url;

    if (typeof url !== 'string' || url.trim() === '') {
      return { verdict: 'deny', reason: 'browser_browser_navigate requires a non-empty string url', url: String(url) };
    }

    if (!isAllowedUrl(url)) {
      return { verdict: 'deny', reason: denyReason(url), url };
    }

    return { verdict: 'allow' };
  }

  if (tool === TABS_TOOL) {
    const url = input?.url;

    if (input?.action === 'new' && typeof url === 'string' && url.trim() !== '' && !isAllowedUrl(url)) {
      return { verdict: 'deny', reason: denyReason(url), url };
    }

    return { verdict: 'allow' };
  }

  return { verdict: 'allow' };
}
