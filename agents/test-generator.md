---
description: Генератор тестов: пишет тесты по контракту, не меняет production
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017
temperature: 0.1
steps: 50
permission:
  edit:
    "*": deny
    "src/**/*.test.ts": allow
    "src/**/*.test.tsx": allow
    "src/**/*.testHelpers.ts": allow
    "src/shared/testing/**": allow
    "src/shared/api/testing/**": allow
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
    "pnpm exec vitest run *": allow
  task: deny
  webfetch: deny
  websearch: deny
---
Read `AGENTS.md`; take `skill-prefix` from it (no default; BLOCKED if absent).
Load `<prefix>-test-first` with the `skill` tool and follow it.
If `AGENTS.md`, the prefix, or the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
