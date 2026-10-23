---
description: "Разработчик: реализует production-код по контракту до green, тесты не трогает"
mode: subagent
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
    "**/*.test.*": deny
    "**/*.spec.*": deny
    "**/__tests__/**": deny
    "**/tests/**": deny
    "**/test/**": deny
    "**/testdata/**": deny
    "**/*_test.go": deny
    "**/test_*.py": deny
    "**/*_test.py": deny
    "**/conftest.py": deny
    "**/*Test.java": deny
    "**/*Tests.java": deny
    "**/*_test.rs": deny
    "**/snapshots/**": deny
    "**/*.snap": deny
  bash:
    "*": ask
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
    "git diff": allow
    "git log": allow
  task: deny
  webfetch: deny
  websearch: deny
---

Load `implement` with the `skill` tool and follow it.
If the contract is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
