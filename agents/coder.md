---
description: Разработчик: реализует production-код по контракту до green
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017
temperature: 0.1
variant: low
steps: 120
permission:
  edit:
    "*": deny
    "src/**": allow
    "src/**/*.test.ts": deny
    "src/**/*.test.tsx": deny
    "src/**/*.testHelpers.ts": deny
    "src/shared/testing/**": deny
    "src/shared/api/testing/**": deny
  bash:
    "*": deny
    cat: allow
    "cat *": allow
    grep: allow
    "grep *": allow
    head: allow
    "head *": allow
    ls: allow
    "ls *": allow
    rg: allow
    "rg *": allow
    tail: allow
    "tail *": allow
    wc: allow
    "wc *": allow
    "pnpm lint": allow
    "pnpm typecheck": allow
    "pnpm build": allow
    "pnpm exec vitest run *": allow
  task: deny
  webfetch: deny
  websearch: deny
---

Load `implement` with the `skill` tool and follow it.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
