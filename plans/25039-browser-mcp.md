# 25039-browser-mcp — браузерный инструмент для «живого» тестирования агентами

## Goal

Дать агентам OpenCode (`build`, `tdd` через свои verify-проверки) возможность тестировать код на «живом» dev-сервере: открывать страницы в реальном Chrome, делать accessibility-снапшоты, кликать/вводить текст, читать ошибки консоли и сетевые запросы. Инструмент — официальный Playwright MCP (`@playwright/mcp@0.0.83`), локальный stdio-сервер, headed-режим с персистентным профилем (одноразовый ручной логин в Keycloak, дальше агенты переиспользуют сессию). Кастомный плагин, Chrome DevTools MCP и headless-режим — out of scope.

Все изменения — в git-репозитории `.opencode` (вложенный репозиторий), код `src/` проекта Cervart не затрагивается.

Ключевые проектные решения (по итогам аудита 2026-10-27):

- **`codemode: false` у сервера `browser`.** У `build`/`tdd` первым правилом стоит `execute * deny`; Code Mode (дефолт для MCP) при этом отключается, и работоспособность браузерных инструментов повисала бы на неоднозначной семантике «nested tools enforce their rules». Прямые инструменты + правила `browser_*` работают без двусмысленности.
- **Глобальный deny `browser_*` в top-level `permissions` `opencode.json` с первого шага (T1).** Базовая политика OpenCode — `{ "action": "*", "resource": "*", "effect": "allow" }`: без этого все агенты (`coder`, `git-manager`, `test-generator`, `plan`) и обычные сессии получают полный доступ, включая `browser_evaluate` (произвольный JS в контексте страницы с живой Keycloak-сессией) и `browser_install`. Deny скрывает инструменты у агентов без allow (контекст не расходуется), а агентские allow (`build`/`tdd`) применяются после общих правил и перекрывают их (last matching rule wins).

## Affected files

- `.opencode/opencode.json` — MCP-сервер `browser` в `mcp.servers` + deny `browser_*` в top-level `permissions`
- `.opencode/agents/build.md` — permissions: allow браузерных инструментов
- `.opencode/agents/tdd.md` — permissions: allow браузерных инструментов
- `.opencode/skills/build/SKILL.md` — секция live-check (T2)
- `.opencode/skills/tdd/SKILL.md` — опциональный live-check в verify (T2)

Файлы уже несут несвязанные активные правки конфигурации (см. Git → tree); план пишется поверх по явному решению пользователя.

## Tasks

### T1 Пилот: MCP-сервер `browser` + права агентов

- affected files: `.opencode/opencode.json`, `.opencode/agents/build.md`, `.opencode/agents/tdd.md`
- steps:
  1. В `.opencode/opencode.json` внутрь `mcp.servers` (рядом с `figma`) добавить сервер:
     ```jsonc
     "browser": {
       "type": "local",
       "command": ["npx", "-y", "@playwright/mcp@0.0.83", "--browser", "chrome"],
       "codemode": false,
       "timeout": { "startup": 120000 }
     }
     ```
     Версия `0.0.83` зафиксирована (актуальная в npm на 2026-10-27); `@latest` не использовать. `codemode: false` — инструменты попадают на нативный список и подчиняются правилам `browser_*` напрямую, без зависимости от `execute * deny` агентов. `startup` 120 с — запас на первый запуск `npx` (скачивание пакета; дефолт 30 с может не хватить).
  2. Там же, в top-level `permissions` (рядом с существующим `delete` → deny), добавить:
     ```jsonc
     { "action": "browser_*", "resource": "*", "effect": "deny" }
     ```
     Правило общее для всего проекта: закрывает браузерный доступ всем, у кого нет явного агентского allow (`coder`, `git-manager`, `test-generator`, `plan`, обычные сессии). Deny скрывает инструменты без отключения сервера — контекст остальных агентов не растёт.
  3. В `.opencode/agents/build.md` в `permissions`, после существующих правил, добавить:
     ```yaml
     - action: browser_*
       resource: "*"
       effect: allow
     ```
     Имена MCP-инструментов нормализуются как `<server>_<tool>` (`browser_navigate`, `browser_snapshot`, …), поэтому `browser_*` покрывает весь сервер. Агентские правила применяются после общих, last matching rule wins → allow перекрывает deny из шага 2. На время пилота (до ужесточения в T2) разрешён весь набор — окно полного доступа сознательно ограничено агентами `build`/`tdd`.
  4. То же правило добавить в `.opencode/agents/tdd.md`.
  5. Перед первым запуском проверить предположение про registry: `cat .npmrc` в корне Cervart — GitLab-registry должен покрывать только scope `@burservice/*`, остальные пакеты идут в публичный npm. Если registry подменён глобально, `npx` не найдёт `@playwright/mcp` — остановиться и решить с пользователем.
  6. Перечитать конфигурацию: предпочтительно `opencode service restart` (снапшот `agent_config_check` привязан к процессу — `/reload` перезагружает плагин без переснятия снапшота), затем `agent_config_check` → `fresh: true`.
  7. Ручной шаг пользователя (предусловие smoke-проверки): запустить `pnpm run-dev`, дождаться готовности Vite на `http://localhost:3000`.
  8. Smoke-проверка live — выполняет агент `build` (не `coder` и не обычная сессия: после шага 2 у них прав нет). Первый вызов инструмента открывает headed Chrome: `browser_navigate` → `http://localhost:3000`, пройти ручной логин в Keycloak (одноразово, сессия сохранится в персистентном профиле), затем `browser_snapshot` + `browser_console_messages`. Критерий: снапшот читаем; ошибки консоли — зафиксировать фактический базовый список (dev-варнинги MUI/deck.gl допустимы); далее «нет ошибок» трактуется как «нет новых относительно базового списка». Фактический путь персистентного профиля проверить по факту (например, `ls ~/Library/Caches/ms-playwright`) и записать в отчёт — заранее путь не утверждается.
- tests: manual check (задача конфигурации, автотестов нет)
- verify: `agent_config_check` → `fresh: true`; `/mcps` (или `opencode mcp list`) показывает `browser` в состоянии connected; у агента `build` инструменты `browser_*` видимы и работают при его `execute * deny`; smoke-проверка из шага 8 успешна; у агента без allow (например, `coder`) браузерные инструменты скрыты

### T2 Ужесточение прав + live-check в скиллах

- affected files: `.opencode/agents/build.md`, `.opencode/agents/tdd.md`, `.opencode/skills/build/SKILL.md`, `.opencode/skills/tdd/SKILL.md`
- steps:
  1. Получить фактический список инструментов подключённого сервера `browser` (из `/mcps`, `opencode mcp list` или лога opencode) — имена уточнить по живому серверу, не по памяти.
  2. В `agents/build.md` и `agents/tdd.md` заменить широкий allow из T1 на схему deny-всё + точечные allow (правила файла агента идут после общего deny из T1; внутри списка — last matching rule wins, поэтому deny первым, allow после):
     ```yaml
     - action: browser_*
       resource: "*"
       effect: deny
     - action: browser_navigate
       resource: "*"
       effect: allow
     - action: browser_snapshot
       resource: "*"
       effect: allow
     - action: browser_click
       resource: "*"
       effect: allow
     - action: browser_type
       resource: "*"
       effect: allow
     - action: browser_console_messages
       resource: "*"
       effect: allow
     - action: browser_network_requests
       resource: "*"
       effect: allow
     ```
     Итоговый набор allow сформировать по списку из шага 1: интеракция + наблюдение (snapshot/console/network/tabs); `browser_install`, `browser_evaluate`, pdf/vision-инструменты — под deny (общий deny из T1 уже закрывает их для всех остальных агентов).
  3. В `.opencode/skills/build/SKILL.md` добавить секцию «live-check»: предусловие (пользователь запустил `pnpm run-dev`, Keycloak-сессия активна; если сервер не запущен — live-check просто пропускается, это не BLOCKED), шаги (`browser_navigate` → целевой URL → `browser_snapshot` → `browser_console_messages`), критерий успеха (нет новых ошибок консоли относительно базового списка, ожидаемые элементы в снапшоте), предупреждение о токенах (не запрашивать снапшот повторно без изменений). Секцию вписать так, чтобы не сломать существующее правило «Do not start long-running dev servers» — агент никогда не запускает dev-сервер сам.
  4. В `.opencode/skills/tdd/SKILL.md` добавить опциональный live-check в verify-шаг итерации: только для задач, меняющих UI, и только если dev-сервер уже запущен пользователем.
  5. `opencode service restart`, `agent_config_check` → `fresh: true`, повторить smoke-проверку T1 с ужесточёнными правами агентом `build`: разрешённые инструменты работают, `browser_install`/`browser_evaluate` скрыты.
  6. Прогнать строку матрицы verify из build-скилла для случая «конфигурация/docs без изменений в `src/`»: `pnpm lint` → `pnpm typecheck` → `pnpm test`.
- tests: manual check (Markdown/конфигурация, автотестов нет)
- verify: `agent_config_check` → `fresh: true`; smoke: `browser_navigate` + `browser_snapshot` + `browser_console_messages` на `http://localhost:3000` проходят под новым набором прав; инструменты вне allow-списка скрыты у `build`/`tdd` и у всех агентов без allow; `pnpm lint` / `pnpm typecheck` / `pnpm test` — exit code 0

### G git close-out

- affected files: нет (проверка и, по подтверждению, коммит)
- steps:
  1. `git status --porcelain` в обоих репозиториях: `Cervart` (ожидается: чисто, задача его не трогала) и `.opencode` (ожидается: только плановые правки целевых файлов поверх исходного активного состояния).
  2. Показать пользователю дифф целевых файлов: `opencode.json`, `agents/build.md`, `agents/tdd.md`, `skills/build/SKILL.md`, `skills/tdd/SKILL.md`.
  3. По явному подтверждению пользователя — один коммит в текущей ветке `ts-react-modules-slices` репо `.opencode` (только целевые файлы) через `git-manager`. Без push.
  4. Без подтверждения — изменения остаются некоммиченными, факт фиксируется в отчёте.
- tests: manual check
- verify: `git status --porcelain` в `Cervart` и `.opencode`; состояние дерева соответствует решению из шагов 3–4

## Risks

- **Code Mode × `execute` deny**: у `build`/`tdd` Code Mode отключён их же правилом `execute * deny`; семантика «nested tools enforce their rules» неоднозначна. Митигация: `codemode: false` у сервера (T1, шаг 1) — инструменты прямые, правила `browser_*` применяются однозначно. Если smoke покажет обратное — вернуться к решению вместе с пользователем.
- **Окно полного доступа между T1 и T2**: агенты `build`/`tdd` временно имеют весь набор инструментов (включая `browser_evaluate`). Митигация: общий deny из T1 ограничивает окно только этими двумя агентами; T2 выполняется сразу после T1.
- **Токены**: снапшот страниц с deck.gl/echarts может быть очень большим. Митигация: не включать `--caps vision/pdf`, запрашивать снапшот один раз на проверку; `codemode: false` не раздувает контекст остальных агентов — deny скрывает от них инструменты целиком.
- **Keycloak**: истечение сессии mid-run → перелогин вручную (headed). Персистентный профиль один на инстанс — параллельные клиенты конфликтуют; при необходимости позже добавить `--user-data-dir` (абсолютный машинный путь в коммитимом конфиге — только по отдельному решению пользователя) или `--isolated`.
- **Свежесть конфига**: правки `opencode.json` и агентов делают работающий инстанс устаревшим — `opencode service restart` (предпочтительно; `/reload` не переснимает снапшот плагина `agent_config_check`) и `agent_config_check` → `fresh: true` перед продолжением (шаг 6 в T1, шаг 5 в T2).
- **Первый запуск npx**: скачивание пакета из публичного npm; предположение «GitLab-registry касается только `@burservice/*`» проверяется шагом 5 в T1 (`cat .npmrc`); Chrome должен быть установлен. Недоступность сети → `browser` не подключится, `/mcps` покажет ошибку.
- **Приватность**: содержимое страниц (включая данные dev/test API и состояние Keycloak-сессии) уходит в LLM-провайдер. Только dev/test окружения, prod запрещён.
- **Смешение коммитов**: целевые файлы уже содержат несвязанные активные правки — коммит G зафиксирует их суммарное состояние (принято пользователем).
- **Оркестрация через tdd**: Git preparation скилла `tdd` смотрит на репо Cervart (чисто); грязное дерево `.opencode` разруливается задачей G. Если `tdd` всё же блокируется на состоянии `.opencode` — исполнять правки через `build`.

## Tests

Задача конфигурации и Markdown-документации: автотесты не пишутся (`manual check`). Общая TDD-порядок не применяется; проверка — ручной smoke-сценарий после каждой задачи:

1. `pnpm run-dev` (пользователь) → Vite на `http://localhost:3000`.
2. `/mcps` → `browser` connected.
3. Агент `build`: открыть `http://localhost:3000`, снапшот, ошибки консоли — зафиксировать базовый список, новых нет.
4. T2 дополнительно: инструменты вне allow-списка скрыты у `build`/`tdd` и у агентов без allow.
5. Финальная матрица build-скилла (изменения без `src/`): `pnpm lint` → `pnpm typecheck` → `pnpm test`.

Focused-команды: `agent_config_check` (свежесть после правок конфигов), `git status --porcelain` в обоих репо, `opencode mcp list`, `cat .npmrc`.

## Contract data

- **Behavior**: агенты `build`/`tdd` открывают страницы на `http://localhost:3000` в headed Chrome через MCP-инструменты сервера `browser` (прямые инструменты, без Code Mode); получают a11y-снапшот вместо скриншота; кликают/вводят текст по ref из снапшота; читают `browser_console_messages` и `browser_network_requests`. Остальные агенты браузерных инструментов не видят. Keycloak-сессия переиспользуется из персистентного профиля после одноразового ручного логина.
- **API/types**: `mcp.servers.browser` = `{ "type": "local", "command": ["npx", "-y", "@playwright/mcp@0.0.83", "--browser", "chrome"], "codemode": false, "timeout": { "startup": 120000 } }`. В top-level `permissions` проекта: deny `browser_*`. Права `build`/`tdd`: deny `browser_*` + точечные allow (финальный список — по фактическому каталогу инструментов сервера).
- **Errors**: сервер не стартует (npx/сеть/registry) → `browser` disconnected в `/mcps`; Chrome не найден → флаг `--executable-path`; Keycloak-сессия истекла → ручной перелогин; инструмент вне allow-списка → скрыт правами у всех агентов, кроме точечных allow.
- **UI/selectors**: селекторы из a11y-снапшота (ref); data-testid проекта читаются штатно.
- **State/URL**: dev-сервер строго `http://localhost:3000` (strictPort); запуск — только вручную пользователем (`pnpm run-dev`).
- **Fixtures/MSW**: не используются — проверка идёт против реального dev API.
- **Out of scope**: E2E-тесты в CI, кастомный плагин cervart.*, Chrome DevTools MCP, headless-режим, `--extension`-режим, prod-окружения, изменения кода в `src/`.

## Runtime

`agent_config_check` (2026-10-27, до записи плана): `fresh: true`, `serverStartedAt: 2026-10-27T08:55:20.621Z`, `missingModel: []`.

- `build` → `zai-coding-plan/glm-5.3` (mode: all)
- `coder` → `zai-coding-plan/glm-5.3-flash` (mode: subagent)
- `git-manager` → `zai-coding-plan/glm-5.3-flash` (mode: all)
- `plan` → `zai-coding-plan/glm-5.3` (mode: primary)
- `tdd` → `zai-coding-plan/glm-5.3` (mode: all)
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high` (mode: subagent)

Исполнение: правки конфигов/скиллов — агент `build` (или `coder` под `tdd`; для Markdown/config-задач с `tests: manual check` диспатчи test-generator по скиллу пропускаются). Smoke-проверки браузера — только агенты `build`/`tdd`: у `coder`, `git-manager` и обычных сессий прав нет (общий deny из T1).

После каждой правки конфигов (T1/T2) — `opencode service restart` (предпочтительно) или `/reload` и повторный `agent_config_check` перед следующим шагом.

## Git

- `branch`: `none` — по явному решению пользователя новая ветка не создаётся, работа в текущих ветках: `Cervart` → `km_feat/25039-model-settings` (не затрагивается), `.opencode` → `ts-react-modules-slices` (все правки сюда).
- `base`: не назначается — новая ветка не создаётся; пользователь явно отказался от выбора `test`/`main`/`develop`.
- `tree`:
  - `Cervart` — clean;
  - `.opencode` — modified: `README.md`, `agents/{build,coder,git-manager,plan,tdd,test-generator}.md`, `opencode.json`, `skills/{build,figma,implement,plan,tdd}/SKILL.md`; untracked: `delete-tool/`, `foreground/`, `plans/{25039-coder-delete-rights,25039-gtm-manual-layout,25039-gtm-settings-ui-refactor,foreground-only-plugin,suggestions-input-popper-portal}.md`, `plugins/{delete-tool,foreground-only}.ts`. Правки плана ложатся поверх этого состояния (решение пользователя).
- `sync`: `off` — работа поверх активного некоммиченного состояния конфигурации в существующих ветках; автоматическая синхронизация могла бы подтянуть/подтолкнуть несвязанные изменения.
- `switch`: не требуется — работаем в текущих ветках, переключений нет.
- `commits`: `single` — один коммит только целевых файлов (`opencode.json`, `agents/build.md`, `agents/tdd.md`, `skills/build/SKILL.md`, `skills/tdd/SKILL.md`) в `ts-react-modules-slices` репо `.opencode`, по явному подтверждению пользователя в close-out через `git-manager`. Push не делается. Несвязанные активные правки в тех же файлах уйдут в коммит вместе — принято пользователем.
- `commit/push`: только вручную через `git-manager` или подтверждённый close-out (G, шаги 3–4).
- `merge/MR`: вручную только пользователем.
- `initials`: `km`; `task number`: `25039`.
