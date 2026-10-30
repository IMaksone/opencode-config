# Plan: foreground-only plugin for `.opencode` (Cervart)

Status: closed (30.10.2026)

## Goal

Перенести плагин `foreground-only` из `/Users/imaksone/projects/expense_management_frontend/.opencode/`
в `.opencode/` текущего проекта: каждый запрос `background: true` на инструментах
`shell`/`subagent` (и V1-алиасах `bash`/`task`) нормализуется обратно в foreground до
исполнения, а параметр `background` вырезается из схем инструментов, которые видит модель —
фоновые уведомления о завершении ненадёжно возобновляют сессии. Идентификатор —
`cervart.foreground-only` (конвенция репозитория), тесты — Vitest, документация — README `.opencode`.

Решения (по ответам пользователя):

- **Тестовый раннер — Vitest**: `foreground/vitest.config.ts`, исходные `node:test`-тесты
  переписываются в стиле `watchdog/*.test.ts` (единая конвенция `.opencode` в Cervart).
- **Git — local-only**: `branch: none`, без коммитов; задача G — только проверка `git status`
  в каждом затронутом репозитории.
- **Base** (справочно, ветка не создаётся): `ts-react-modules-slices`.
- **Соседние планы не блокируют** (решение пользователя, аудит 27.10):
  `25039-plan-tdd-tasks.md` (скиллы/агенты), `25039-gtm-manual-layout.md` (`src/**`),
  `opencode-v2-config-migration.md` (реструктуризация `plugins/*.ts`) — пересечений по файлам
  настоящего плана нет.

Ревью 27.10 (аудит): обновлён `Git.tree` фактическим состоянием (команды `git status`
разрешены `agents/plan.md`), уточнён Risk про резолв `vitest`, дописаны ожидания задачи G,
добавлен Risk о соседнем плане миграции.

## Affected files

Все пути — внутри `/Users/imaksone/burservis/Cervart/.opencode/` (вложенный репозиторий конфига;
основной репозиторий Cervart его игнорирует — `.gitignore:35`). Новые файлы, если не указано иное:

| Файл | Действие | Источник |
| --- | --- | --- |
| `foreground/policy.ts` | создать | `expense/.opencode/foreground/policy.ts` (дословно) |
| `foreground/policy.test.ts` | создать | `expense/.opencode/foreground/policy.test.ts` (node:test → vitest) |
| `foreground/vitest.config.ts` | создать | копия `watchdog/vitest.config.ts` |
| `foreground/plugin.ts` | создать | `expense/.opencode/foreground/plugin.ts` (дословно) |
| `foreground/plugin.test.ts` | создать | `expense/.opencode/foreground/plugin.test.ts` (node:test → vitest) |
| `plugins/foreground-only.ts` | создать | wrapper в стиле `plugins/subagent-watchdog.ts`, id `cervart.foreground-only` |
| `README.md` | изменить | раздел OpenCode V2: буллет плагина, env, команды тестов |

Источник: `/Users/imaksone/projects/expense_management_frontend/.opencode/foreground/` и
`/Users/imaksone/projects/expense_management_frontend/.opencode/plugins/foreground-only.ts`
(версии, прочитанные 26.10 и сверенные 27.10: `policy.ts` 62 строки, `policy.test.ts` 124,
`plugin.ts` 170, `plugin.test.ts` 225, wrapper 8 — расхождений нет).

## Tasks

### T1 Политика foreground-only: чистая нормализация + тесты

- affected files: `foreground/policy.ts`, `foreground/policy.test.ts`, `foreground/vitest.config.ts`
- steps:
  1. Скопировать `watchdog/vitest.config.ts` → `foreground/vitest.config.ts` (root — каталог `foreground/`, environment: node).
  2. Перенести `foreground/policy.ts` дословно: `BACKGROUND_TOOLS = ['shell','bash','subagent','task']`;
     `forceForeground` — при нормализации возвращает копию входа с `background: false`, иначе тот же объект;
     `stripBackgroundFromTools` — удаляет только свойство `background` у четырёх инструментов, остальное не трогает.
  3. Переписать `policy.test.ts` с `node:test`/`assert` на vitest (`describe`/`it`/`expect`), сохранив все кейсы:
     состав `BACKGROUND_TOOLS`; rewrite + `changed: true` + копия объекта; passthrough для `false`,
     отсутствующего и нетиповых значений (`'true'`, `1`, `null`); неизвестный инструмент; сохранение
     соседних полей входа; strip только у background-инструментов (по образцу карты `tools` из исходного теста);
     записи без `properties`/некорректные; не-record карта инструментов.
  4. Если vitest недоступен в окружении `.opencode/` — `npm i -D vitest` в `.opencode/` (см. Risks).
- tests: три describe-блока исходника (1 + 7 + 3 кейса), ожидания идентичны (deep equal по объектам инструментов,
  ссылочная идентичность passthrough-результата, исходный вход не мутируется).
- verify: `cd .opencode && npx vitest run --config foreground/vitest.config.ts`

### T2 Плагин: хуки + wrapper-регистрация + тесты

- affected files: `foreground/plugin.ts`, `foreground/plugin.test.ts`, `plugins/foreground-only.ts`
- steps:
  1. Перенести `foreground/plugin.ts` дословно: структурные типы `ForegroundContext` / событий
     (без импорта `@opencode/plugin` в модуле), `isEnabled` c ключом `OPENCODE_FOREGROUND_ONLY`,
     хук `tool.hook('execute.before')` с нормализацией in place, `session.hook('context')` со strip схем,
     fallback-логирование, cleanup с dispose.
  2. Переписать `plugin.test.ts` на vitest: fake-контекст (карты `toolHooks`/`sessionHooks`, `logCalls`,
     `disposals`), ручной save/restore `process.env` (как в источнике) — все 8 кейсов исходника.
  3. Создать `plugins/foreground-only.ts` по образцу `plugins/subagent-watchdog.ts`:
     `import { Plugin } from '@opencode/plugin'` + `Plugin.define({ id: 'cervart.foreground-only', setup: installForegroundOnly })`.
- tests: регистрация обоих хуков + cleanup вызывает dispose в порядке `tool:execute.before`, `session:context`;
  нормализация `background: true` in place + лог `forced foreground` с `{sessionID, tool}`; алиасы `bash`/`task`;
  foreground-входы и чужие инструменты не трогаются (логов нет); strip `background` в `context`-хуке
  (чужие инструменты целы); исключение не пробрасывается из хука (замороженный вход → лог `hook failed`, error);
  отключение по `OPENCODE_FOREGROUND_ONLY=off` и `'  OFF '` (хуки не регистрируются, cleanup `undefined`,
  лог `foreground-only disabled by environment`); стартовый лог `foreground-only started` с `{enabled: true, tools}`.
- verify: `cd .opencode && npx vitest run --config foreground/vitest.config.ts && npx vitest run --config watchdog/vitest.config.ts`

### T3 Документация и smoke-чек-лист

- affected files: `README.md` (`.opencode/`)
- steps:
  1. В разделе OpenCode V2 добавить буллет о третьем плагине: id `cervart.foreground-only`, назначение
     (force foreground + strip `background` из схем), отключение `OPENCODE_FOREGROUND_ONLY=off`,
     строки лога (`service=foreground-only`).
  2. Добавить команду тестов модуля: `npx vitest run --config foreground/vitest.config.ts`.
  3. Упомянуть рядом с плагином требование рестарта: правки `.opencode/**` требуют `opencode service restart`.
  4. Smoke-чек-лист (выполнить вручную после `opencode service restart`): в логе сервера одна строка
     `foreground-only started` (info, `{enabled: true, tools}`); пробный `shell` с `background: true`
     исполняется в foreground (результат приходит только по завершении, строка `forced foreground`);
     в схеме `shell`/`subagent` у модели нет параметра `background`; `agent_config_check` → `fresh: true`.
  5. Правка точечная: в `README.md` уже есть несохранённые изменения другого workstream (см. `Git.tree`) —
     их не откатывать и не переформатировать, трогать только перечисленные абзацы.
- tests: `existing suite / manual check`
- verify: `cd .opencode && npx vitest run --config foreground/vitest.config.ts` (зелёный) + smoke-чек-лист

### G git close-out

- affected files: нет (только проверка)
- steps:
  1. `git status --porcelain` в `/Users/imaksone/burservis/Cervart` — состав не меняется относительно
     `Git.tree` (изменения `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/**` от задачи 25039,
     к настоящему плану не относятся).
  2. `git status --porcelain` в `/Users/imaksone/burservis/Cervart/.opencode` — ожидаются новые
     `foreground/policy.ts`, `foreground/policy.test.ts`, `foreground/vitest.config.ts`,
     `foreground/plugin.ts`, `foreground/plugin.test.ts`, `plugins/foreground-only.ts`;
     изменённые `README.md` и `plans/foreground-only-plugin.md`; плюс ранее существовавшие
     `agents/plan.md`, `skills/figma/SKILL.md`, `skills/plan/SKILL.md`,
     `plans/25039-gtm-manual-layout.md` — это норма, чужие правки не трогать;
     при срабатывании T1.4 дополнительно `package.json` и `package-lock.json`.
     Никаких git write-команд, коммит не делается (решение пользователя: local-only).
- tests: `manual check`
- verify: обе команды `git status --porcelain` отработали; git-операции записи не выполнялись

## Risks

1. **vitest и его резолв** — в `.opencode/package.json` только `@opencode/plugin`; `.opencode/node_modules/.bin`
   содержит только npm-утилиты и `@opencode/plugin`, `vitest` там нет. `npx` поднимается по дереву каталогов
   и находит `Cervart/node_modules/.bin/vitest` (корневой devDependency, pnpm), т. е. verify-команды в T1/T2
   выполняются без установки (как гоняли `watchdog`-тесты, план миграции, строка 404). Побочный эффект:
   версия vitest наследуется от корневого репозитория, а не фиксируется в `.opencode/`; при обновлении корня
   поведение может измениться. Если `npx vitest` не найден — `npm i -D vitest` в `.opencode/` (шаг T1.4).
2. **Автозагрузка плагинов V2** — `plugins/*.ts` подхватываются без записи в `opencode.json`
   (прецедент: `agent-config-guard`, `subagent-watchdog` работают без `plugin`-ключа; в `opencode.json`
   такого ключа нет). Если версия opencode потребует явной регистрации — добавить путь в `plugin`-массив.
3. **Соседний план `opencode-v2-config-migration.md`** — он предусматривает реструктуризацию
   `plugins/<id>.ts` → `plugins/<id>/index.ts`, но не исполнен (в `plugins/` по-прежнему
   `subagent-watchdog.ts` и `agent-config-guard.ts`, `skills/tdd/SKILL.md:108` ссылается на плоский путь).
   Настоящий план сознательно следует текущему прецеденту — плоский `plugins/foreground-only.ts`.
   Пересечений по файлам нет (решение пользователя, аудит 27.10); если миграцию запустят позже,
   `foreground-only` переносится в каталог тем же шагом, что и остальные плагины.
4. **Стиль импортов** — исходник импортирует с расширением (`'./policy.ts'`), wrapper watchdog — без
   (`'../watchdog/plugin'`). Переносим как в источнике; если загрузчик отвергнет `.ts`-расширения — убрать их.
5. **Поведенческое изменение харнесса** — фоновые запуски `shell`/`subagent` станут foreground для всех
   агентов: длинные команды обязаны задавать явный `timeout` (мс, `0` — без таймаута); длинные сборки
   блокируют вызывающую сессию (это цель плагина).
6. **Правки `.opencode/**` требуют `opencode service restart`** — до рестарта плагин не активен;
   между правками и рестартом не запускать прогоны `tdd`.
7. **Дрейф источника** — при расхождении между прочитанными версиями и текущим состоянием
   `expense_management_frontend` брать актуальное содержимое источника (сверка 27.10: без расхождений).
8. **Node-раннер** — выбранный Vitest-вариант не зависит от версии Node; исходный `node --test`
   (Node ≥ 22.18) не используется.

## Tests

Общий TDD-порядок: T1 (policy — чистые функции) → T2 (plugin — хуки на fake-контексте) → T3 (docs, manual)
→ G. Focused-команды:

- `cd .opencode && npx vitest run --config foreground/vitest.config.ts`
- регресс соседнего модуля: `cd .opencode && npx vitest run --config watchdog/vitest.config.ts`

`npx` резолвит `vitest` из `node_modules/.bin` корневого репозитория (см. Risks 1).
Ожидания по задачам — внутри Tasks (`tests:`). Smoke-чек-лист — T3.4. Корневой набор приложения
(`pnpm test`, `include: src/**`) этот модуль не затрагивает и не проверяет.

## Contract data

- **behavior**: `background: true` на `shell`/`bash`/`subagent`/`task` → переписывается в `background: false`
  на месте до исполнения; параметр `background` удаляется из схем этих четырёх инструментов в `context`-хуке
  сессии; всё остальное проходит без изменений (те же ссылки на объекты); ошибки в хуках логируются
  и никогда не пробрасываются.
- **API/types**: `BACKGROUND_TOOLS: readonly string[]` (`['shell','bash','subagent','task']`);
  `forceForeground(tool: string, input: Record<string, unknown>): { changed: boolean; input: Record<string, unknown> }`
  (копия входа при изменении, иначе исходный объект); `stripBackgroundFromTools(tools: Record<string, unknown>): void`;
  `installForegroundOnly(ctx: ForegroundContext): Promise<(() => void) | undefined>`;
  `isEnabled(env: Record<string, string | undefined> = process.env): boolean`;
  структурные типы `ForegroundContext`, `ForegroundToolExecuteEvent`, `ForegroundSessionContextEvent`
  (импорт `@opencode/plugin` — только в wrapper `plugins/foreground-only.ts`).
- **errors**: исключение в хуке → лог `hook failed` (level error, `{error, tool}`) + продолжение работы;
  отказ `ctx.app.log` → fallback в `console`, затем полное игнорирование любых сбоев логирования.
- **state/URL**: env `OPENCODE_FOREGROUND_ONLY` — значение `off` (trim, case-insensitive) отключает
  плагин (лог `foreground-only disabled by environment`, возврат `undefined`); любое иное — включён.
  Состояния/URL приложения не используются.
- **logs**: service `foreground-only`; `foreground-only started` (info, `{enabled: true, tools}`),
  `foreground-only disabled by environment` (info), `forced foreground` (info, `{sessionID, tool}`),
  `hook failed` (error, `{error, tool}`).
- **UI/selectors**: нет (плагин харнесса, не UI).
- **fixtures/MSW**: fake-`ForegroundContext` в `plugin.test.ts` (карты хуков, `logCalls`, `disposals`);
  MSW не нужен (environment: node). Общие фикстуры приложения не используются.
- **test identifiers**: id плагина `cervart.foreground-only`; имена хуков `execute.before`, `context`;
  env-ключ `OPENCODE_FOREGROUND_ONLY`.
- **out of scope**: `src/**` и корневые тесты/конфиги приложения (typecheck, lint, `pnpm test`);
  корневой `AGENTS.md`, `docs/`; `opencode.json`; `package.json` `.opencode/` (кроме вынужденной
  установки vitest — Risks 1); плагины `subagent-watchdog`/`agent-config-guard`; реструктуризация
  `plugins/` из `opencode-v2-config-migration.md`; коммиты, теги и push репозитория конфига;
  исполнение планов `25039-plan-tdd-tasks.md` и `opencode-v2-config-migration.md`.

## Runtime

- `agent → model` (по `agent_config_check` 27.10):
  - build → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`
  - coder → `openrouter/deepseek/deepseek-v4.1-flash-1017#low`
  - git-manager → `openrouter/deepseek/deepseek-v4.1-flash-1017#low`
  - plan → `openrouter/xiaomi/mimo-v2.6-pro`
  - tdd → `openrouter/z-ai/glm-5.3`
  - test-generator → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`
- `fresh`: `true`; `missingModel`: `[]`
- `serverStartedAt`: `2026-10-26T14:40:35.908Z`
- Перед dispatch в `@tdd` повторить `agent_config_check`: любая правка `.opencode/**` делает снапшот
  устаревшим (`fresh !== true` → `BLOCKED` + `opencode service restart`). Настоящий план правит
  `plans/` (не конфиг), поэтому рестарт не требуется до реализации.

## Git

- branch: `none` — local-only, решение пользователя
- base: `ts-react-modules-slices` — названа пользователем, справочно (ветка не создаётся)
- tree: dirty в обоих репозиториях (проверено 27.10 командами `git status --porcelain`,
  разрешёнными `agents/plan.md`):
  - корень `/Users/imaksone/burservis/Cervart`, ветка `km_feat/25039-model-settings` — изменены
    `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`,
    `GTMTab.test.tsx`, `GTMTab.tsx`, `GTMTab.types.ts`; untracked
    `GTMTab/_ui/DictionaryInput/`, `GTMTab/_ui/GtmManualContent/`,
    `GTMTab/helpers/manualRows.test.ts`, `GTMTab/helpers/manualRows.ts` — работа задачи 25039,
    к плану не относится, не трогать;
  - `.opencode` (вложенный репозиторий), ветка `ts-react-modules-slices` — изменены `README.md`
    (`T3` правит его же точечно), `agents/plan.md`, `skills/figma/SKILL.md`,
    `skills/plan/SKILL.md`; untracked `plans/25039-gtm-manual-layout.md`,
    `plans/foreground-only-plugin.md` — чужие правки, не откатывать.
- sync: `off` — локальная работа только в `.opencode/` (gitignored в корне), git-операции записи не выполняются
- switch: не требуется; при необходимости — только через `git-manager` после явного подтверждения пользователя
- commits: `none` — коммиты не делаются (local-only)
- commit/push: нет
- merge/MR: нет
- initials: `km`; task number: нет (local-only)
