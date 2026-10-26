# 25039 — таски в скиллах `plan` и `tdd`

Status: ready (ревизия 26.10). Not executed. Исполнение — один ручной сеанс `@build` (шаги 1–2, 4–7 и 8.1–8.2): у `coder` права только на `src/**`, у `tdd` — на `.tmp/contracts/**`, а guard блокирует dispatch после первой правки `.opencode/**`. `@tdd` участвует только в smoke dry-run (8.3). Config/markdown-only: юнит-тестов нет, верификация — ревью-чек-лист + smoke после перезапуска opencode.

- Task: `25039`
- Branch: `none` — остаёмся на текущей `km_feat/25039-model-settings`, новая не создаётся
- Base: `none` — пользователь указал «ветка та же»; переключения и синка нет
- Initials: `km`
- Sync: off — правки локальные (`.opencode/` в gitignore корня), git-операции не выполняются

## Принятые решения

1. Пауза в `tdd` — всегда после каждой задачи; мелочи объединяются в плане (гранулярность решает `plan`).
2. TDD-цикл внутри каждой задачи: тесты → red → green per task; контракт — один на план.
3. Коммиты — на усмотрение плана: per-task, один на всё или группы; привязка к таскам не обязательна. Механизм — новая команда `коммит <task-number>` (коммит без push); push остаётся в `закрыть`.
4. Прогресс — `.tmp/contracts/<slug>.progress.md` (покрыт правами `edit` агента `tdd`; permissions не меняем).
5. Гранулярность задач по объёму/сложности — ориентиры из Contract data (подтверждены).
6. Задача `25039`, ветка текущая, новая не создаётся.
7. Git-блок плана — один общий; список задач всегда заканчивается обязательной задачей `G: git close-out`.
8. Файлы скиллов локальные (`.opencode/` в gitignore корня) — коммитов нет; для local-only планов `tdd` пропускает git-подготовку и close-out, задача G сводится к проверке `git status`.
9. Исполнение плана — один ручной сеанс `@build` (mode all, edit `*` allow): правки `.opencode/**` недоступны ни `coder` (только `src/**`), ни `tdd` (только `.tmp/contracts/**`); кроме того, guard снапшотит конфиги и блокирует любой dispatch после первой правки. `@tdd` участвует только в smoke (8.3).
10. Green в задачном цикле нового `tdd` — `pnpm typecheck` вместо текущего `pnpm build` (ускорение цикла; production build остаётся в проверке 8.2). Подтверждено пользователем.
11. План `25039-agent-context-p1` удалён по решению пользователя (26.10) — пересечения по `tdd/SKILL.md`/`plan/SKILL.md` больше нет.
12. Каталог планов — только `.opencode/plans/`. Ссылки в скиллах `plan`/`tdd`/`build` и право `edit` агента `plan` переведены 26.10; старого текста `.tmp/plans/` в скиллах не остаётся.

## Goal

Научить `plan` декомпозировать работу на небольшие задачи (Tasks) по объёму и сложности, а `tdd` — выполнять их по одной с TDD-циклом, паузами и отчётом «что сделано / что осталось» между задачами. Git-блок остаётся общим на план; коммиты группируются на усмотрение плана; закрытие — обязательная финальная задача каждого плана (для local-only планов — проверка без git-операций).

## Affected files

Все пути — внутри `.opencode/` (gitignored в корне): изменения локальные, коммит в корневой репозиторий не требуется.

- `.opencode/skills/plan/SKILL.md` — формат Tasks, гранулярность, Git-блок (`commits`, обязательная задача G). Путь каталога планов уже переведён на `.opencode/plans/` (26.10).
- `.opencode/skills/tdd/SKILL.md` — цикл по задачам, паузы с отчётом, прогресс-файл, коммиты по стратегии плана, правило local-only. Путь каталога планов уже переведён (26.10).
- `.opencode/skills/git-policy/SKILL.md` — команда `коммит <task-number>` (коммит без push).
- `.opencode/agents/tdd.md` — только frontmatter `description` (permissions не меняем).
- `.opencode/commands/tdd.md` — опционально `description` (синхронизация формулировки).

Применено 26.10 (шаг 3 и указание пользователя):

- `.opencode/skills/build/SKILL.md` — каталог планов `.opencode/plans/`, запрет «never to `.opencode/plans/`» снят (строка 27).
- `.opencode/agents/plan.md` — permission `edit`: `.opencode/plans/**` вместо `.tmp/plans/**`; также добавлен запуск `node .opencode/scripts/figma-dump.js`.

Не меняем: остальные permissions-фронтматтеры агентов (кроме пути планов и figma-dump в `agents/plan.md`), `opencode.jsonc`, скиллы `testing`/`implement`/`test-first`/`architecture`/`figma`, `src/**`, `docs/`, watchdog-плагин.

## Steps

> Порядок: 1–2 (`plan`) → 3 (проверка путей) → 4–5 (`tdd`) → 6 (`git-policy`) → 7 (описания) → 8 (проверка). Шаги 1–2, 4–7 и 8.1–8.2 — в одном ручном сеансе `@build`; шаг 3 применён 26.10, при исполнении — только проверка. 8.3 — после полного перезапуска opencode.

### 1. `plan/SKILL.md` — формат «Tasks»

В **Plan format** заменить буллет `- **Steps** — small, ordered, no placeholders` на:

- **Tasks** — small ordered units of work. Each task: `id` (`T1`, `T2`, …), goal, affected files, steps (small, no placeholders), tests, verify (focused commands). Granularity depends on the volume and complexity of the whole job:
  - a mechanical change in 1–2 files may share a task with other small changes;
  - each coherent behaviour, component, or layer gets its own task;
  - risky and complex parts are split smaller;
  - every task leaves the tree green (tests, lint, typecheck pass) and is verified by its own tests; config/docs tasks say `tests: existing suite / manual check`;
  - a trivial job may be a single task.

Буллет `Tests` переформулировать: `**Tests** — overall TDD order across tasks and shared focused commands; per-task test scope lives inside each task`. В **Output** добавить количество задач в саммари. Остальные буллеты формата (включая **Contract data** — общий на план) не менять.

### 2. `plan/SKILL.md` — Git-блок

В секцию **Git** добавить два правила (остальные буллеты без изменений):

- `commits`: the grouping is up to the plan — `per-task`, `single`, or explicit groups (e.g. `T1–T3 → one commit`). Commits do not have to match tasks 1:1.
- The task list always ends with a mandatory git task: `G: git close-out` — коммиты по стратегии `commits` и `закрыть <task-number>` по этому разделу. Для local-only планов (`branch: none`, файлы в gitignore) G сводится к проверке `git status` без git-операций. Подготовка ветки (создание/переключение) остаётся шагом 1 в `tdd`, до цикла задач.

### 3. Каталог планов — `.opencode/plans/` (применено 26.10)

Все ссылки на каталог планов переведены: `plan/SKILL.md` (строки 8, 22, 28, 54), `tdd/SKILL.md` (строка 14), `build/SKILL.md` (строка 27) и права `agents/plan.md` (`edit`: `.opencode/plans/**`). Планы пишутся и читаются только в `.opencode/plans/<slug>.md`; старый каталог не используется. Контракты и прогресс остаются в `.tmp/contracts/**` (права `tdd`, решение 4); ссылок на старый каталог в скиллах не остаётся. Plan-мод opencode — внешний слой (в репозитории его нет); фактическое поведение подтверждено существующими планами в `.opencode/plans/` и повторно проверяется smoke-шагом 8.3. При исполнении шаг сводится к проверке `rg -n "tmp/plans" .opencode/skills .opencode/agents` — совпадений быть не должно.

### 4. `tdd/SKILL.md` — цикл по задачам

Переписать **Process** после контракта:

- Шаг 2 (Contract) — один раз на план, как сейчас.
- Шаг 3 «Task loop» — по задачам плана по порядку, для каждой:
  1. `agent_config_check` перед каждым dispatch (правило остаётся);
  2. Tests: `test-generator` с контрактом и объёмом задачи; для `tests: existing suite / manual check` dispatch пропускается;
  3. Red: `coder` stage 1 (skeleton) — падения на assert, `pnpm lint` + `pnpm typecheck`;
  4. Green: новый `coder` session stage 2 — `pnpm exec vitest run <paths>`, `pnpm lint`, `pnpm typecheck` (осознанно вместо текущего `pnpm build` — решение 10);
  5. Отметить задачу в прогресс-файле;
  6. **Пауза с отчётом**: что сделано / что осталось / следующая задача. Если стратегия `commits` требует коммит — предложить его и выполнить `коммит <task-number>` через `git-manager` только после явного подтверждения. Ждать явного «продолжи» перед следующей задачей.
- Шаг 4 «Final review and close-out» — после последней задачи: ревью `git diff` против контракта; для git-планов `закрыть <task-number>` после подтверждения; для local-only планов — только проверка `git status`, без git-операций; MR/merge — вручную. Задача `G` выполняется здесь; пауза после неё не требуется.
- Правило local-only: план с `branch: none` и файлами в gitignore — git-подготовка (шаг 1) и close-out пропускаются, dirty tracked файлы чужой работы не блокируют.
- Legacy: план без секции Tasks = одна задача (сегодняшнее поведение целиком).
- Watchdog-правила (снапшот `git diff --stat` до dispatch, ≤2 рестартов на стадию) — без изменений, применяются к каждому dispatch цикла.

### 5. `tdd/SKILL.md` — прогресс-файл

Описать `.tmp/contracts/<slug>.progress.md` (место выбрано, чтобы не менять permissions):

```markdown
# Progress: <slug>
- [x] T1 — <goal>
- [ ] T2 — <goal>
- [ ] G — git close-out
Last: <что сделано / что осталось / предложенный коммит>
```

Правила: обновлять после каждой задачи, до паузы; при старте читать и продолжать с первой незакрытой задачи; если файл есть, но список задач не совпадает с планом — `BLOCKED` и вопрос пользователю.

### 6. `git-policy/SKILL.md` — команда `коммит <task-number>`

В «Modes → Dispatched by tdd» добавить `коммит <task-number>`: коммит без push — stage только явных путей (или `git add -u`), Conventional Commits `<type>: <task-number> <summary>`, pre-commit hooks обязательны, push запрещён. Итоговый список tdd-команд: `branch.create`, `branch.switch`, `коммит`, `закрыть`. Секцию **Commit** дополнить: один коммит может группировать несколько задач плана (стратегия `commits`). Секцию **Close-out** не менять.

### 7. Описания

`agents/tdd.md`, frontmatter `description`: «TDD-оркестратор: контракт, тесты и red/green по задачам плана, паузы с отчётом, git-подготовка и close-out». Permissions не трогать. Опционально синхронизировать `description` в `commands/tdd.md`.

### 8. Проверка

1. Ревью-чек-лист (см. Tests) — в том же сеансе `@build`.
2. `pnpm lint && pnpm typecheck && pnpm test` — контроль, что репозиторий не задет (изменения вне `src/`); все три команды разрешены `@build`.
3. Smoke после полного перезапуска opencode: `agent_config_check` (`fresh: true`, `missingModel: []`), `rg -n "tmp/plans" .opencode/skills .opencode/agents` без совпадений, mini-прогон формы плана (2–3 задачи в `.opencode/plans/`, задачи с `tests: existing suite / manual check`), dry-run `tdd` (первая задача + пауза с отчётом).

## Risks

- **Применение только после перезапуска opencode** — guard снапшотит скиллы/агентов на старте; до рестарта работает старый текст.
- **Plan-мод** — allowlist каталога планов живёт в opencode (внешний слой), в репозитории его нет; скиллы и права агента `plan` теперь указывают на `.opencode/plans/`, фактическое поведение повторно проверяется smoke 8.3.
- **Дерево (обновлено 26.10)**: корневой репозиторий чист — наработка SettingsMode закоммичена 26.10 09:58 (`4db04194 feat: layout first tab`, включая `GTMTab/`). Правило local-only остаётся из-за `.opencode/` в gitignore корня. `.opencode/` — отдельный git-репозиторий (клон `opencode-config`, ветка `ts-react-modules-slices`): скиллы версионируются там; после исполнения он станет dirty — коммит в нём пользователь делает вручную (вне скоупа).
- **Bootstrapping**: правки шагов 1–2 и 4–7 делает ручной `@build`, а не `tdd`: у `coder` нет прав на `.opencode/**`, а guard блокирует dispatch после первой правки конфигов. Новый текст `tdd` проверяется только smoke dry-run (8.3) после рестарта.
- **Прогресс-файл в `.tmp/contracts/`** — семантически каталог контрактов; выбран осознанно (permissions), зафиксировано в шаге 5.
- **Legacy-планы** без секции Tasks должны продолжать работать (fallback — одна задача).
- **P1-план** удалён 26.10 (решение 11); при необходимости создавать заново от актуального текста скиллов.

## Tests

Автотестов нет: изменения только в markdown/opencode-конфиге, `src/` не затрагивается. `test-generator` не диспатчить; red/green неприменим — вместо них ревью-чек-лист после каждого шага; правки делает ручной сеанс `@build` (шаги 1–2, 4–7 и 8.1–8.2 в одном сеансе) или пользователь вручную. `@tdd` в правках не участвует — только smoke dry-run на 8.3 после рестарта.

Ревью-чек-лист (роль тестов):

- `plan`: Tasks-формат (`id`, goal, files, steps, tests, verify), гранулярность, общий Git-блок + обязательная задача G (с local-вариантом), `commits` на усмотрение плана, ссылок на удалённую секцию `Steps` не осталось; каталог планов — `.opencode/plans/`;
- `tdd`: per-task цикл тесты→red→green, пауза после каждой задачи с отчётом «сделано / осталось», прогресс-файл пишется/читается/возобновляет, правило local-only, legacy-план = одна задача, Green с `pnpm typecheck`;
- `git-policy`: `коммит` коммитит без push, `закрыть` не изменился;
- `build`/`agents/plan.md`: каталог планов `.opencode/plans/`, ссылок на `.tmp/plans/` нет; `edit` на `.opencode/plans/**` и запуск `node .opencode/scripts/figma-dump.js`.

TDD-порядок: шаги 1–2 → 3 (проверка) → 4–5 → 6 → 7 → 8 (верификация). Focused commands: `pnpm lint`, `pnpm typecheck`, `pnpm test` (разрешены `@build`).

## Contract data

- Behavior: `plan` декомпозирует работу на Tasks по объёму и сложности (ориентиры: механические мелочи в 1–2 файлах объединяются; каждое связное поведение/компонент/слой — своя задача; рискованное и сложное — мельче; каждая задача оставляет дерево зелёным и проверяется своими тестами; config/docs — `tests: existing suite / manual check`; тривиальная работа — одна задача). `tdd` выполняет задачи по одной: тесты → red → green per task; между задачами пауза и отчёт «что сделано / что осталось», продолжение по явному подтверждению. Коммиты — по стратегии `commits` плана (per-task / single / группы), механизм `коммит <task-number>` (без push); push и close-out — `закрыть <task-number>` в обязательной задаче G. Local-only план (`branch: none`, файлы в gitignore): git-подготовка и close-out пропускаются, G = проверка `git status`.
- API/types: n/a — Markdown. Схемы: план — поля Tasks (`id`, goal, files, steps, tests, verify) + Git `commits` + обязательная задача `G: git close-out`; каталог планов — `.opencode/plans/<slug>.md`; прогресс-файл `.tmp/contracts/<slug>.progress.md` — чекбоксы `T1..Tn`, `G` + строка `Last:`; git-policy — команда `коммит <task-number>`.
- Errors: `tdd` — прогресс-файл рассинхронизирован с задачами плана → `BLOCKED` и вопрос; пауза с незакрытыми задачами — норма, не ошибка. `plan` — задача без goal/steps/tests/verify → дописать план перед выдачей. Legacy: план без Tasks → одна задача.
- UI/selectors: n/a.
- State/URL: план — `.opencode/plans/<slug>.md`; прогресс — `.tmp/contracts/<slug>.progress.md` (пишет `tdd`, permissions уже позволяют).
- Fixtures/MSW: n/a.
- Test identifiers: n/a.
- Out of scope: `src/**`, `docs/`, `opencode.jsonc`, остальные permissions-фронтматтеры агентов, plan-мод opencode (внешний слой), скиллы `testing`/`implement`/`test-first`/`architecture`/`figma`, watchdog-плагин, MR/merge, коммит вложенного `.opencode`-репозитория, чекбоксы прогресса в плане (отклонены в пользу прогресс-файла).

## Runtime

- `agent_config_check` (26.10, текущий инстанс): `fresh: true`, `missingModel: []`, `serverStartedAt: 2026-10-26T08:15:32.744Z`
- `build` → openrouter/deepseek/deepseek-v4.1-flash-1017
- `coder` → openrouter/deepseek/deepseek-v4.1-flash-1017 (variant low)
- `git-manager` → openrouter/deepseek/deepseek-v4.1-flash-1017 (variant low)
- `plan` → openrouter/xiaomi/mimo-v2.6-pro
- `tdd` → openrouter/z-ai/glm-5.3
- `test-generator` → openrouter/deepseek/deepseek-v4.1-flash-1017 (variant high)

## Git

- `branch`: `none` — остаёмся на `km_feat/25039-model-settings`, новая не создаётся
- `base`: `none` — пользователь: «ветка та же»; переключений и синка нет
- `tree`: `clean` (26.10; `git status --porcelain` пуст; наработка SettingsMode закоммичена в `4db04194 feat: layout first tab`)
- `sync`: `off` — git-операции не выполняются (`.opencode/`, `.tmp/` в gitignore корня)
- `switch`: none
- `commit/push`: none — изменяемые файлы в gitignore корневого репозитория; вложенный `.opencode`-репозиторий (клон `opencode-config`) после исполнения станет dirty — коммит в нём вручную, вне скоупа
- `merge/MR`: n/a
- `initials`: `km`
- `task number`: `25039`
