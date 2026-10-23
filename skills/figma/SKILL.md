---
name: figma
description: Use when reading a Figma design for implementation: choosing between the Figma MCP and the read-only REST dump, authorization, asset handling and secret rules.
---

# Figma access

Two independent paths. For view-only files use the read-only REST dump; MCP tools require edit access to the file.

## Inputs

- A Figma URL in the form `figma.com/design/<fileKey>/...?node-id=22-100`.
- The access level to the file (edit or view-only).

## Process

1. Determine access. If you have edit access, the remote MCP is available; otherwise use the dump.
2. **MCP path.** The `figma` server is configured in the tracked project `.opencode/opencode.json` (`mcp.figma`), not in a personal global config:

```json
"mcp": {
  "figma": {
    "type": "remote",
    "url": "https://mcp.figma.com/mcp",
    "oauth": { "redirectUri": "http://127.0.0.1:19876/callback" },
    "timeout": 60000
  }
}
```

The single-segment `/callback` is required: Figma's DCR endpoint rejects the default nested path (`400 invalid_redirect_uri`). Authorize with `opencode mcp auth figma`, check with `opencode mcp auth list`, diagnose with `opencode mcp debug figma`. The OAuth window waits about 5 minutes. 3. **Dump path.** Export a personal access token with the `file_content:read` scope as `FIGMA_API_KEY` in the shell profile, then:

```bash
node .opencode/scripts/figma-dump.js 'https://www.figma.com/design/<fileKey>/Name?node-id=22-100'
node .opencode/scripts/figma-dump.js <fileKey> 22:100
```

Files land in `.tmp/figma/` as `<fileKey>-<nodeId>.{json,md,png}` (`22:100` becomes `22-100`). Pass `--no-images` to skip the PNG. The token goes in the `X-Figma-Token` header; `Authorization: Bearer` is rejected with 401 for PATs. 4. Read `.tmp/figma/<nodeId>.md` first; open the `.json` only for details of a specific node. Re-run the dump after the design changes.

## Rules

- Never commit `FIGMA_API_KEY` and never put it into `.env*`, `*.local`, or repository config. The token lives only in the shell profile.
- `.tmp/figma/**` is gitignored; do not add dumps to git.
- Read `.tmp/figma/**` with the regular read tools; no extra permissions are needed.
- MCP tools are not `webfetch`/`websearch`, so the agent's web rules stay as configured (the `plan` profile allows web, the others deny it). Tool names are `<server>_<tool>`, for example `figma_get_metadata`. If a tool is blocked, add a rule to the agent's `permission`, not to the web rules.
- Start from the `.md` tree; use `figma_get_metadata` for structure and `figma_get_design_context` only for the node being implemented.
- The `mcp` block lives in the tracked `.opencode/opencode.json`; change it only in a dedicated config task with the user's confirmation.

## Output

The referenced node tree (`.md`), the node details (`.json`), and an optional PNG render, plus a short summary of the layout, texts, fonts, colors, and component ids that the implementation needs.

## BLOCKED

- MCP returns `Looks like you don't have edit access to this file` and no REST token is available.
- `FIGMA_API_KEY` is missing or lacks the `file_content:read` scope.
- The URL has no `node-id` and the task needs a specific node.
- The dump fails on a network or authorization error: report it, do not retry blindly.

## Out of scope

Changing the Figma file, generating designs, OAuth setup on someone else's machine, and committing tokens or dumps.
