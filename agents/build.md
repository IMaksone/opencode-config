---
description: "Сборка и проверки: lint, typecheck, build, tests; команды берутся из проекта"
mode: all
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
    "**/secrets/**": deny
  bash:
    "*": ask
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
  task: deny
  webfetch: deny
  websearch: deny
---

Load `build` with the `skill` tool and follow it.
If the project has no discoverable verification commands, return `BLOCKED` and list what is missing.
Answer the user in Russian.
