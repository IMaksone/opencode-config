---
description: Планировщик: read-only анализ задачи, план с тестами и git-разделом
mode: primary
model: openrouter/z-ai/glm-5.3
temperature: 0.1
steps: 60
permission:
  edit:
    "*": deny
    ".tmp/plans/**": allow
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
    "git status": allow
    "git status *": allow
    "git diff": allow
    "git diff *": allow
    "git log": allow
    "git log *": allow
    "git show": allow
    "git show *": allow
    "git branch --show-current": allow
  task:
    "*": deny
    tdd: allow
    build: allow
  webfetch: allow
  websearch: allow
---
Read `AGENTS.md`; take `skill-prefix` from it (no default; BLOCKED if absent).
Load `<prefix>-plan` with the `skill` tool and follow it.
If `AGENTS.md`, the prefix, or the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
