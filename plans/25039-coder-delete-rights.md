# 25039 — Право удаления файлов для coder (delete_file)

Status: ready. Открытым планом объявлен этот; `25039-gtm-manual-layout.md`, `25039-plan-tdd-tasks.md`, `25039-gtm-semi-auto-layout.md`, `opencode-v2-config-migration.md` приостанавливаются до его закрытия. Hand off only to `@tdd`.

## Goal

Дать агенту `coder` право удалять файлы с жёсткими ограничениями:

- **Решение принимают `plan` и `tdd`**: план перечисляет точные пути на удаление в задачах, `tdd` передаёт список в промпт `coder`. `coder` сам ничего не выбирает.
- **Удалять можно только существующие файлы `src/**/*.ts` и `src/**/*.tsx`** проекта.
- **Удаление тестовых файлов — только с отдельного разрешения пользователя**: permission-правило `ask` (OpenCode спросит пользователя в момент удаления).
- Остальные агенты (`plan`, `tdd`, `build`, `test-generator`, `git-manager`) удалять файлы не могут вовсе.

Механизм: кастомный инструмент `delete_file` нового плагина `cervart.delete-tool`, который валидирует пути и прогоняет их через `ctx.permission.assert` с собственным action `delete` (встроенного action `delete` в V2 нет: `edit` покрывает только edit/write/patch, удаление иначе шло бы через дырявые shell-`rm` паттерны).

## Affected files

Новые:

- `.opencode/delete-tool/policy.ts` — чистая валидация/классификация путей (без ФС и без `@opencode/plugin`);
- `.opencode/delete-tool/policy.test.ts`;
- `.opencode/delete-tool/plugin.ts` — регистрация инструмента, локальные типы ctx (по образцу `scripts/agent-kit/guard.ts`);
- `.opencode/delete-tool/plugin.test.ts`;
- `.opencode/delete-tool/vitest.config.ts` (копия `foreground/vitest.config.ts`);
- `.opencode/plugins/delete-tool.ts` — тонкий адаптер `Plugin.define({ id: 'cervart.delete-tool', setup: installDeleteTool })`.

Правки:

- `.opencode/opencode.json` — глобальное правило `delete * deny`;
- `.opencode/agents/coder.md` — delete-правила: allow `src/*.ts`, `src/*.tsx`; ask на тестовые паттерны (после allow); остальное — deny;
- `.opencode/agents/plan.md`, `tdd.md`, `build.md`, `test-generator.md`, `git-manager.md` — `delete * deny`;
- `.opencode/skills/plan/SKILL.md` — раздел об удалениях в задачах плана;
- `.opencode/skills/tdd/SKILL.md` — передача списка удалений в coder, тесты через ask;
- `.opencode/skills/implement/SKILL.md` — правила удаления для coder;
- `.opencode/README.md` — документация плагина и smoke-чек.

`src/**` корневого репо не затрагивается (кроме ручных scratch-файлов smoke-проверки T5).

## Tasks

### T1 `delete-tool/policy.ts`: чистая валидация путей

- affected files: `.opencode/delete-tool/policy.ts`, `.opencode/delete-tool/policy.test.ts`, `.opencode/delete-tool/vitest.config.ts`
- steps:
  1. `vitest.config.ts` — скопировать `foreground/vitest.config.ts` (root по `import.meta.url`, `include: ['**/*.test.ts']`, `environment: 'node'`).
  2. `policy.ts` — константы таксономии тестов (зеркало edit-denies в `coder.md`): суффиксы `.test.ts`, `.test.tsx`, `.testHelpers.ts`; префиксы `src/shared/testing/`, `src/shared/api/testing/`.
  3. `normalizeDeletePath(raw: string, root: string)` → `{ ok: true, relative: string, kind: 'production' | 'test' } | { ok: false, reason: string }`: пустая/не-строка → reject; абсолютный путь внутри `root` → относительный, вне `root` → reject; сегменты `..` или результат вне `src/` → reject; расширение не `.ts`/`.tsx` → reject; обратные слэши → прямые; классификация production/test по константам.
  4. Тесты `policy.test.ts`: production-путь; вложенный `src/entities/wells/helper.ts`; абсолютный внутри root; `../outside.ts`, `/etc/x.ts`, `docs/api.md`, `src/x.md`, `src/x.test.ts`, `src/x.test.tsx`, `src/x.testHelpers.ts`, `src/shared/testing/setup.ts`, `src/shared/api/testing/handlers.ts`, пустая строка, директория-суффикс без расширения.
- tests: unit, `policy.test.ts` (node env, по стилю `foreground/policy.test.ts`)
- verify: `pnpm exec vitest run --config .opencode/delete-tool/vitest.config.ts` (из корня; витест берётся из node_modules корневого проекта)

### T2 `delete_file`: инструмент плагина

- affected files: `.opencode/delete-tool/plugin.ts`, `.opencode/delete-tool/plugin.test.ts`, `.opencode/plugins/delete-tool.ts`
- steps:
  1. `plugin.ts` — `installDeleteTool(ctx)` с локально объявленными типами ctx (по образцу `guard.ts`: `tool.transform`, `app.log`, `location.directory`; без импорта `@opencode/plugin`).
  2. Зарегистрировать инструмент: `name: 'delete_file'`, `options: { codemode: false }` (иначе не попадёт в нативный список инструментов), input `{ paths: string[] }` (`required: ['paths']`, `additionalProperties: false`, `maxItems: 50`).
  3. `execute(input, context)`: распаковать `paths` (не массив/пустой/не строки → ошибка); каждый путь: `realpath` → `normalizeDeletePath(raw, ctx.location.directory)`; любой невалидный → all-or-nothing отказ со списком `path — reason`, ничего не удалять; `stat` — не файл/не существует → отказ; затем один `ctx.permission.assert({ sessionID: context.sessionID, agent: context.agent, source: { type: 'tool', messageID: context.messageID, id: context.id }, action: 'delete', resources: <относительные пути>, save: [] })` (ошибки assert пробрасывать, не превращать в вывод инструмента); удаление `fs.rm(abs, { force: false, signal: context.signal })` по одному; отчёт `deleted: <rel> (production|test)` / `failed: <rel> — <error>`; лог в `app.log` с `service: 'delete-tool'` (fallback в `console` как в guard/watchdog).
  4. `plugin.test.ts` — fake ctx (перехват `tools.add`, шпион `permission.assert`) + tempdir (`fs.mkdtemp` в `os.tmpdir()`): allow → файл удалён, отчёт корректный; reject/deny → выброшено, файл на месте; путь вне `src` → отказ до assert; директория → отказ; пустой массив/не-строки → ошибка.
  5. Адаптер `plugins/delete-tool.ts`: `import { Plugin } from '@opencode/plugin'`; `import { installDeleteTool } from '../delete-tool/plugin'`; `export default Plugin.define({ id: 'cervart.delete-tool', setup: installDeleteTool })`.
- tests: unit, `plugin.test.ts` (fake ctx + tempdir)
- verify: `pnpm exec vitest run --config .opencode/delete-tool/vitest.config.ts`

### T3 Permission-правила: `delete` для coder, deny остальным

- affected files: `.opencode/opencode.json`, `.opencode/agents/coder.md`, `.opencode/agents/plan.md`, `.opencode/agents/tdd.md`, `.opencode/agents/build.md`, `.opencode/agents/test-generator.md`, `.opencode/agents/git-manager.md`
- steps:
  1. `opencode.json`: добавить ключ `permissions` с одним правилом `{ "action": "delete", "resource": "*", "effect": "deny" }` (глобальный дефолт; правила агентов аппендятся после и перекрывают его). Схему и прочие поля не трогать.
  2. `agents/coder.md`: после блока `edit`-правил добавить строго в этом порядке (последний матч выигрывает): `delete * deny` → `delete src/*.ts allow` → `delete src/*.tsx allow` → `delete src/*.test.ts ask` → `delete src/*.test.tsx ask` → `delete src/*.testHelpers.ts ask` → `delete src/shared/testing/* ask` → `delete src/shared/api/testing/* ask`. Ask-правила обязательны после allow: `src/*.ts` покрывает и `*.test.ts`.
  3. `plan.md`, `tdd.md`, `build.md`, `test-generator.md`: добавить `- action: delete / resource: "*" / effect: deny` в конец списка прав (в стиле каждого файла); `git-manager.md`: `- { action: delete, resource: "*", effect: deny }`.
  4. Сверить фронтматтер с форматом существующих правил (отступы, кавычки).
- tests: existing suite / manual check (config)
- verify: ревью диффа; после T4 и `opencode service restart` — smoke T5 (в частности: ask-правила не перекрыты allow)

### T4 Skills: решение об удалении принимают plan и tdd

- affected files: `.opencode/skills/plan/SKILL.md`, `.opencode/skills/tdd/SKILL.md`, `.opencode/skills/implement/SKILL.md`, `.opencode/README.md`
- steps:
  1. `plan/SKILL.md` — новый раздел «Deletions»: если задача требует удаления, план перечисляет точные пути в affected files и в steps («удалить `<path>` инструментом `delete_file`»); допустимы только существующие файлы `src/**/*.ts|tsx`; удаление тестовых файлов (таксономия T1) помечать в задаче «требует разрешения пользователя — подтвердится ask-промптом»; удаление вне допустимого набора — не планировать, отметить в Risks/Out of scope; сам план файлы не удаляет.
  2. `tdd/SKILL.md` — в разделе «Task loop»: при наличии удалений в задаче передавать их список в промпт `coder` с указанием «удалить инструментом `delete_file`; shell rm запрещён»; тестовые удаления — с пометкой, что пользователь подтвердит ask-промпт; отказ пользователя → `BLOCKED` задачи; `tdd` сам ничего не удаляет.
  3. `implement/SKILL.md` — раздел «Deletions» для coder: удалять только файлы из списка задачи; только инструментом `delete_file` (shell `rm`, `git rm`, запись пустого файла вместо удаления — запрещены); файл вне списка → `BLOCKED` и вернуть требование `@tdd`; тестовые файлы — только если задача явно разрешает (инструмент сам спросит пользователя); после удаления почистить импорты/экспорты, задача остаётся зелёной.
  4. `README.md` (в `.opencode`): плагин `plugins/delete-tool.ts` (`cervart.delete-tool`) — инструмент `delete_file`, права только у `coder`, `src/**/*.ts|tsx`, тесты через `ask`, `save: []` (разрешение не запоминается, каждый раз спрашивается); строка тестов `npx vitest run --config delete-tool/vitest.config.ts` (из `.opencode`); smoke-чек после рестарта.
- tests: existing suite / manual check (docs/config)
- verify: `rg -n "delete_file" .opencode/skills .opencode/README.md` находит все новые упоминания; тексты согласованы с таксономией T1

### T5 Restart + smoke-проверка права удаления

- affected files: none (ручные проверки; scratch-файлы создавать и убирать руками)
- steps:
  1. `opencode service restart` (вручную; обязателен: снапшот guard привязан к процессу, а T3/T4 меняли agents/skills/opencode.json).
  2. `agent_config_check` → `fresh: true`, `coder` в списке агентов.
  3. Прогнать unit-тесты T1/T2.
  4. Ручной smoke в TUI на scratch-файлах: (a) в сеансе `coder` — `delete_file` на `src/_deleteSmoke.ts` удаляется без промпта; (b) на `src/_deleteSmoke.test.ts` появляется ask-промпт: Allow once → удалён, на новом файле Reject → не удалён; (c) `docs/_deleteSmoke.md` → отказ «forbidden»; (d) путь-директория → отказ; (e) в сеансе `plan` — `delete_file` на `src/_deleteSmoke.ts` отклонён (deny). Scratch-остатки убрать.
- tests: existing suite + manual check
- verify: `agent_config_check` (fresh: true), `pnpm exec vitest run --config .opencode/delete-tool/vitest.config.ts`, чек-лист smoke (a)–(e)

### G git close-out

- affected files: none
- steps: `git status --porcelain` в `/Users/imaksone/burservis/Cervart` (ожидается пусто) и в `.opencode` (ожидаемы только файлы плана: 6 новых `delete-tool/**` + `plugins/delete-tool.ts`, правки `agents/*.md`, `skills/{plan,tdd,implement}/SKILL.md`, `opencode.json`, `README.md`, сам план). Коммит репозитория `.opencode` — вручную после ревью, Conventional Commits (например, `feat: 25039 coder delete_file tool with src-only ts/tsx scope`), push — вручную. В корневом репо коммитов нет.
- tests: manual check
- verify: обе команды `git status --porcelain`; состав изменений соответствует Affected files

## Risks

- **Порядок правил в `coder.md` критичен**: `src/*.ts` покрывает и `*.test.ts` — ask-правила обязательны строго после allow-правил (последний матч выигрывает). Защита: ревью T3 + smoke T5(b).
- **Двойной источник таксономии тестов** (`policy.ts` и `coder.md`) — при изменении списка тест-паттернов менять оба места; smoke T5(b) ловит рассинхрон.
- **`save: []`**: «Allow always» ничего не сохраняет — каждое удаление теста спрашивается заново. Сознательное решение; отразить в README.
- **ask-промпт из субагента** (`coder` под `tdd`): пользователь должен ответить в клиенте; в headless-ранах удаление тестов не выполнять (зависание/отказ).
- **Guard**: T3/T4 меняют снапшот-файлы (agents, skills/SKILL.md, `opencode.json`) → `fresh=false`, dispatch субагентов блокируется до `opencode service restart`. Рестарт между T4 и T5 обязателен.
- **V2 перезагружает плагины при сохранении** — инструмент появится и без рестарта, но полный эффект (правила + guard) только после рестарта.
- **Исполнение**: ни у кого в tdd-цепочки нет edit-прав на `.opencode/**` (`coder` — только `src/*`, `test-generator` — только тесты, `tdd` — `.tmp/contracts/*`, `git-manager` — edit deny). Фактический исполнитель T1–T4 — ручной сеанс `@build` (прецедент: `25039-plan-tdd-tasks.md`); `@tdd` подключается только к T5/G после рестарта.
- **Шелл-обход**: `coder` не имеет `rm` в shell-allowlist — обойти `delete_file` через `rm` он не может; «удаление» записью пустого файла запрещено навыком `implement` (не enforcement — риск принят).
- **vitest** запускается из node_modules корневого проекта — команды через `pnpm exec ... --config .opencode/delete-tool/vitest.config.ts` из корня или `npx vitest run --config delete-tool/vitest.config.ts` из `.opencode`.

## Tests

- Порядок не классический TDD: `test-generator` не имеет прав на `.opencode/**` — юнит-тесты T1/T2 пишет и гоняет ручной сеанс `@build` (red → green внутри одной сессии).
- Focused-команды: `pnpm exec vitest run --config .opencode/delete-tool/vitest.config.ts` (из корня); `npx vitest run --config delete-tool/vitest.config.ts` (из `.opencode`).
- Регрессия основного проекта: `src/**` не меняется; `pnpm typecheck`/`pnpm lint` не затрагивают `.opencode` — по желанию, как sanity.
- Smoke T5 — ручной (чек-лист (a)–(e)).

## Contract data

- **Behavior**: `delete_file` — единственный инструмент удаления файлов; вход `{ paths: string[] }` (1–50); all-or-nothing: любой невалидный путь → отказ без единого удаления; валидный путь = существующий файл внутри `src/` проекта с расширением `.ts`/`.tsx` (абсолютный путь внутри проекта нормализуется); тестовые файлы (`*.test.ts`, `*.test.tsx`, `*.testHelpers.ts`, `src/shared/testing/**`, `src/shared/api/testing/**`) → permission `ask` (отдельное разрешение пользователя в момент удаления); production → `allow` для `coder`; для остальных агентов действие `delete` — `deny` (глобальное правило + фронтматтер каждого агента).
- **API/types**: action `delete`; tool `delete_file` (`options.codemode: false`); `policy.ts`: `normalizeDeletePath`, константы тест-таксономии; plugin id `cervart.delete-tool`.
- **Errors**: невалидный путь/не файл/не существует → отказ со списком `path — reason`; permission deny или Reject пользователя → проброшенная `Tool.Error`; частичная неудача `fs.rm` → список `failed` в отчёте.
- **UI/selectors**: нет.
- **State/URL**: нет.
- **Fixtures/MSW**: нет; тесты plugin — tempdir через `fs.mkdtemp`.
- **Test identifiers**: нет (инструмент серверный).
- **Out of scope**: директории и `recursive`; файлы вне `src/`; расширения кроме `.ts`/`.tsx`; shell-правила `rm` для coder; изменения guard/watchdog/foreground; tsconfig/ESLint для `.opencode`; отправка файлов в корзину/undo.

## Runtime

`agent_config_check` (вызван до планирования): `fresh: true`, `missingModel: []`, `serverStartedAt: 2026-10-27T07:35:51.666Z`.

- `build` → `zai-coding-plan/glm-5.3` (mode all)
- `coder` → `zai-coding-plan/glm-5.3-flash` (mode subagent)
- `git-manager` → `zai-coding-plan/glm-5.3-flash` (mode all)
- `plan` → `zai-coding-plan/glm-5.3` (mode primary)
- `tdd` → `zai-coding-plan/glm-5.3` (mode all)
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high` (mode subagent)

Ограничение исполнения: правки T3/T4 меняют снапшот guard → после них `fresh=false` и dispatch субагентов блокируется до `opencode service restart`. В tdd-цепочке нет агента с edit-правами на `.opencode/**`, поэтому T1–T4 выполняет ручной сеанс `@build`; `@tdd` — только T5/G после рестарта (прецедент `25039-plan-tdd-tasks.md`).

## Git

- branch: `none` — работаем в текущей ветке репозитория `.opencode` (ветку не создаём; решение пользователя: «текущая ветка»); корневой репозиторий не затрагивается
- base: не указана (ветка не создаётся)
- tree: `unknown` — в plan-режиме shell запрещён (permission denied); перед стартом проверить `git status --porcelain` в обоих репозиториях
- sync: `off` — local-only правки `.opencode`, push в рамках плана не выполняется
- switch: не требуется; любые переключения — только вручную пользователем
- commits: вне плана — коммит репозитория `.opencode` вручную после ревью (Conventional Commits); в корневом репо коммитов нет
- commit/push: только вручную
- merge/MR: только вручную (не требуется)
- initials: `km`
- task number: `25039`
