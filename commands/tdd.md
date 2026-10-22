---
description: TDD mode (contract, tests, red/green, close-out)
agent: tdd
model: openrouter/z-ai/glm-5.3
---
Read `AGENTS.md`; take `skill-prefix` from it (no default; BLOCKED if absent).
Load `<prefix>-tdd` with the `skill` tool and follow it.
If `AGENTS.md` or the skill is missing, return BLOCKED and list what is missing.
$ARGUMENTS
