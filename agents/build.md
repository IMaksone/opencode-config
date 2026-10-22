---
description: Сборка и проверки: lint, typecheck, build, tests без суб-агентов
mode: all
model: openrouter/deepseek/deepseek-v4.1-flash-1017
temperature: 0.1
steps: 120
permission:
  edit:
    "*": allow
    ".env*": deny
    "**/.env*": deny
    "*.local": deny
    "**/*.local": deny
    ".git/**": deny
    "**/.git/**": deny
    ".husky/**": deny
    "**/.husky/**": deny
  bash:
    "*": deny
    ls: allow
    "ls *": allow
    cat: allow
    "cat *": allow
    grep: allow
    "grep *": allow
    head: allow
    "head *": allow
    rg: allow
    "rg *": allow
    tail: allow
    "tail *": allow
    wc: allow
    "wc *": allow
    "git status": allow
    "git status *": allow
    "git diff": allow
    "git diff *": allow
    "git log": allow
    "git log *": allow
    "git show": allow
    "git show *": allow
    "git branch --show-current": allow
    "pnpm lint": allow
    "pnpm lint-fix": allow
    "pnpm typecheck": allow
    "pnpm build": allow
    "pnpm test": allow
    "pnpm test-coverage": allow
    "pnpm exec vitest *": allow
    "pnpm exec eslint *": allow
  task: deny
  webfetch: deny
  websearch: deny
---
Read `AGENTS.md`; take `skill-prefix` from it (no default; BLOCKED if absent).
Load `<prefix>-build` with the `skill` tool and follow it.
If `AGENTS.md`, the prefix, or the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
