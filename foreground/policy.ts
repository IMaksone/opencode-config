/**
 * Foreground-only policy.
 *
 * Background tool runs are unreliable in this harness: the completion
 * notification does not resume the caller session often enough, so a
 * backgrounded gate run is lost and the pipeline stalls. The policy keeps the
 * decision pure: which tools can background a run, how to normalize such a
 * call back to foreground, and how to hide the `background` parameter from the
 * tool schemas the model sees.
 */

/** V2 tools are `shell`/`subagent`; `bash`/`task` are their V1 names. */
export const BACKGROUND_TOOLS: readonly string[] = ['shell', 'bash', 'subagent', 'task'];

const BACKGROUND_TOOL_SET = new Set(BACKGROUND_TOOLS);

export interface ForegroundRewrite {
  /** `true` when the input was normalized from a background run. */
  changed: boolean;
  /** `input` itself when nothing changed, a shallow copy otherwise. */
  input: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a `background: true` call back to foreground.
 *
 * Only the four background tools are touched and only the literal `true`
 * counts: `false`, a missing flag, and non-boolean values pass through as the
 * same object reference.
 */
export function forceForeground(tool: string, input: Record<string, unknown>): ForegroundRewrite {
  if (!BACKGROUND_TOOL_SET.has(tool) || input.background !== true) {
    return { changed: false, input };
  }

  return { changed: true, input: { ...input, background: false } };
}

/**
 * Delete the `background` property from the schema of every background tool.
 *
 * V2 passes `{ description, input: <json schema> }` per tool; a flat
 * `{ properties }` schema is accepted too. Nothing else is touched, so foreign
 * tools and unrelated parameters survive unchanged.
 */
export function stripBackgroundFromTools(tools: Record<string, unknown>): void {
  if (!isRecord(tools)) {
    return;
  }

  for (const name of BACKGROUND_TOOLS) {
    const tool = tools[name];

    if (!isRecord(tool)) {
      continue;
    }

    const schema = isRecord(tool.input) ? tool.input : tool;
    const properties = schema.properties;

    if (!isRecord(properties)) {
      continue;
    }

    delete properties.background;
  }
}
