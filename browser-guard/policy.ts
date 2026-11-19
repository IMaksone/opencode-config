/**
 * Browser-guard policy.
 *
 * Live browser checks target the local dev server, and no permission rule can
 * express a URL allowlist for MCP tools (their resource is always `*`). The
 * guard makes the rule mechanical: navigation may open only loopback origins
 * (`http://localhost:<port>`, `http://127.0.0.1:<port>`, `http://[::1]:<port>`
 * — any port, so no stack or dev-server pinning is baked in) plus about:blank
 * and any extra origins passed by the operator; everything else is denied with
 * a reason the model sees.
 *
 * Pure decision functions: no filesystem access and no `@opencode/plugin`
 * dependency, so the rules are unit-testable in isolation. Extra origins for a
 * specific project (a pinned dev-server port, a staging host) are supplied via
 * the `OPENCODE_BROWSER_GUARD_ALLOWED_ORIGINS` environment variable — see the
 * README adaptation guide.
 */

/** Neutral page that navigates nowhere; the browser opens it by default. */
const ALLOWED_EXACT: readonly string[] = ['about:blank'];

/** Hostnames whose every port is a local dev server. */
const LOOPBACK_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '[::1]'];

/** Environment key with comma-separated extra origins. */
export const EXTRA_ORIGINS_ENV_KEY = 'OPENCODE_BROWSER_GUARD_ALLOWED_ORIGINS';

/** Tool that navigates the page; the URL lives in its `url` input. */
export const NAVIGATE_TOOL = 'browser_browser_navigate';

/** Tab tool; it navigates only when a new tab carries a `url`. */
export const TABS_TOOL = 'browser_browser_tabs';

export type NavigationVerdict =
  | { verdict: 'allow' }
  | { verdict: 'deny'; reason: string; url: string };

/** Parse the extra-origins environment value: comma-separated, trimmed, empty entries dropped. */
export function extraOriginsFromEnv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin !== '');
}

/** Human-readable origin of a URL (`scheme://host:port`), best effort. */
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  }
  catch {
    return url;
  }
}

/** Loopback http(s) origin: `http://localhost:<port>` and friends, any port. */
function isLoopbackOrigin(origin: string): boolean {
  const match = /^https?:\/\/(\[[^\]]+\]|[^/:]+)(?::\d+)?$/.exec(origin);

  return match !== null && LOOPBACK_HOSTS.includes(match[1]);
}

function isAllowedUrl(url: string, extraOrigins: readonly string[]): boolean {
  if (ALLOWED_EXACT.includes(url)) {
    return true;
  }

  const origin = originOf(url);

  if (isLoopbackOrigin(origin)) {
    return true;
  }

  return extraOrigins.some(allowed =>
    url === allowed || url.startsWith(`${allowed}/`) || url.startsWith(`${allowed}?`));
}

/** Denial reason shown to the model; names the allowed origins. */
export function denyReason(url: string, extraOrigins: readonly string[] = []): string {
  const extras = extraOrigins.length > 0 ? `, ${extraOrigins.join(', ')}` : '';

  return `browser checks are allowed only on local dev-server origins (http://localhost:<port>${extras}); refused URL: ${url}`;
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
  extraOrigins: readonly string[] = [],
): NavigationVerdict {
  if (tool === NAVIGATE_TOOL) {
    const url = input?.url;

    if (typeof url !== 'string' || url.trim() === '') {
      return { verdict: 'deny', reason: 'browser_browser_navigate requires a non-empty string url', url: String(url) };
    }

    if (!isAllowedUrl(url, extraOrigins)) {
      return { verdict: 'deny', reason: denyReason(url, extraOrigins), url };
    }

    return { verdict: 'allow' };
  }

  if (tool === TABS_TOOL) {
    const url = input?.url;

    if (input?.action === 'new' && typeof url === 'string' && url.trim() !== '' && !isAllowedUrl(url, extraOrigins)) {
      return { verdict: 'deny', reason: denyReason(url, extraOrigins), url };
    }

    return { verdict: 'allow' };
  }

  return { verdict: 'allow' };
}
