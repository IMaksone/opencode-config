---
description: Сборка и проверки: lint, typecheck, build, tests без суб-агентов
mode: all
model: zai-coding-plan/glm-5.3
steps: 120
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: allow
  - action: edit
    resource: ".env*"
    effect: deny
  - action: edit
    resource: "*.env*"
    effect: deny
  - action: edit
    resource: "*.local"
    effect: deny
  - action: edit
    resource: ".git/*"
    effect: deny
  - action: edit
    resource: ".husky/*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "cat *"
    effect: allow
  - action: shell
    resource: "grep *"
    effect: allow
  - action: shell
    resource: "head *"
    effect: allow
  - action: shell
    resource: "ls *"
    effect: allow
  - action: shell
    resource: "rg *"
    effect: allow
  - action: shell
    resource: "tail *"
    effect: allow
  - action: shell
    resource: "wc *"
    effect: allow
  - action: shell
    resource: "git status *"
    effect: allow
  - action: shell
    resource: "git diff *"
    effect: allow
  - action: shell
    resource: "git log *"
    effect: allow
  - action: shell
    resource: "git show *"
    effect: allow
  - action: shell
    resource: "git branch --show-current"
    effect: allow
  - action: shell
    resource: "pnpm lint *"
    effect: allow
  - action: shell
    resource: "pnpm lint-fix *"
    effect: allow
  - action: shell
    resource: "pnpm typecheck *"
    effect: allow
  - action: shell
    resource: "pnpm build *"
    effect: allow
  - action: shell
    resource: "pnpm test *"
    effect: allow
  - action: shell
    resource: "pnpm test-coverage *"
    effect: allow
  - action: shell
    resource: "pnpm exec vitest *"
    effect: allow
  - action: shell
    resource: "pnpm exec eslint *"
    effect: allow
  - action: shell
    resource: "pnpm exec tsc *"
    effect: allow
  - action: shell
    resource: "pnpm run lint"
    effect: allow
  - action: shell
    resource: "pnpm run typecheck"
    effect: allow
  - action: shell
    resource: "pnpm run build"
    effect: allow
  - action: shell
    resource: "pnpm run test"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: webfetch
    resource: "*"
    effect: deny
  - action: websearch
    resource: "*"
    effect: deny
  - action: delete
    resource: "*"
    effect: deny
  - action: browser_*
    resource: "*"
    effect: deny
  - action: browser_browser_navigate
    resource: "*"
    effect: allow
  - action: browser_browser_navigate_back
    resource: "*"
    effect: allow
  - action: browser_browser_snapshot
    resource: "*"
    effect: allow
  - action: browser_browser_find
    resource: "*"
    effect: allow
  - action: browser_browser_click
    resource: "*"
    effect: allow
  - action: browser_browser_hover
    resource: "*"
    effect: allow
  - action: browser_browser_type
    resource: "*"
    effect: allow
  - action: browser_browser_press_key
    resource: "*"
    effect: allow
  - action: browser_browser_select_option
    resource: "*"
    effect: allow
  - action: browser_browser_fill_form
    resource: "*"
    effect: allow
  - action: browser_browser_wait_for
    resource: "*"
    effect: allow
  - action: browser_browser_console_messages
    resource: "*"
    effect: allow
  - action: browser_browser_network_requests
    resource: "*"
    effect: allow
  - action: browser_browser_network_request
    resource: "*"
    effect: allow
  - action: browser_browser_tabs
    resource: "*"
    effect: allow
---

Load `build` with the `skill` tool and follow it.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
