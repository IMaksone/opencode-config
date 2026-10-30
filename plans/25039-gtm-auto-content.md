# 25039 — вынести auto-контент ГТМ в `_ui/GtmAutoContent`

Status: closed (30.10.2026)

## Goal

В `GTMTab.tsx` контент режимов `semiAuto` и `manual` уже вынесен в `_ui` (`GtmSemiAutoContent`, `GtmManualContent`), а контент режима `auto` (таблица + итоги) остался инлайн-блоком (строки 77–96). Вынести его в `_ui/GtmAutoContent/GtmAutoContent.tsx` по образцу `GtmSemiAutoContent`. Чистый рефакторинг без изменения поведения и DOM.

## Affected files

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmAutoContent/GtmAutoContent.tsx` — новый
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmAutoContent/index.ts` — новый
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.tsx` — правка

Тесты не меняются: auto-контент полностью покрыт существующим `GTMTab.test.tsx` (рендер таба в дефолтном режиме `auto`: заголовки таблицы, подсветка строк, итоги).

## Tasks

### T1 Вынести auto-контент ГТМ в `_ui/GtmAutoContent`

- affected files:
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmAutoContent/GtmAutoContent.tsx`
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmAutoContent/index.ts`
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.tsx`
- steps:
  1. Создать `GtmAutoContent.tsx`: компонент без пропсов и без контекста (auto-блок не использует `disabled`); перенести без изменений JSX из `GTMTab.tsx` строки 78–95 (фрагмент: `ComponentWrapper componentId="gtm-table"` c `DataTables.SimpleTable` + блок итогов «Всего видов ГТМ» / «Суммарно фактических мероприятий»).
  2. Перенести в новый файл константу `GTM_HIGHLIGHTED_ROW_CLASS = 'bg-[#EAF3FF]'`; импорты: `ComponentWrapper, DataTables` из `@/shared/components`; `GTM_TABLE_HEADER, GTM_TABLE_ROWS, GTM_TOTAL_MEASURES, GTM_TOTAL_TYPES` из `'../../GTMTab.const'` (образец — `GtmSemiAutoContent.tsx`).
  3. Создать `index.ts`: `export { GtmAutoContent } from './GtmAutoContent';`.
  4. В `GTMTab.tsx`: добавить `import { GtmAutoContent } from './_ui/GtmAutoContent';` (в порядке сортировки импортов — перед `./_ui/GtmManualContent`); заменить инлайн-блок на `{mode === 'auto' && <GtmAutoContent />}`.
  5. Почистить `GTMTab.tsx`: убрать `DataTables` из импорта `@/shared/components` (ComponentWrapper/Image/RadioButtton/Tooltip остаются); сузить импорт констант до `GTM_MODE_NAME, GTM_MODE_OPTIONS, GTM_TABLE_NOTE`; удалить локальную `GTM_HIGHLIGHTED_ROW_CLASS`.
- tests: existing suite — `GTMTab.test.tsx` без изменений (auto-контент проверяется рендером всего таба)
- verify:
  - `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
  - `pnpm lint`
  - `pnpm typecheck`
- commit: `refactor: 25039 вынести auto-контент ГТМ в _ui/GtmAutoContent`

### G git close-out

- Финальный обзор диффа, план-wide проверки: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- Дерево должно быть чистым (коммит T1 уже сделан на его паузе); грязное дерево на G — `BLOCKED` с перечнем путей.
- После явного подтверждения пользователя — `закрыть 25039`.

## Risks

- Низкий: чистое перемещение JSX; поведение и DOM не меняются (компонент возвращает тот же фрагмент).
- `ComponentWrapper componentId="gtm-table"` и тексты итогов обязаны сохраниться дословно — на них опираются тесты и селекторы.
- После правки `GTMTab.tsx` неиспользованные импорты уронят lint/typecheck — шаг 5 закрывает это.
- `git status`/`git diff` в plan-режиме недоступны (shell denied): состояние дерева неизвестно — TDD-агент проверяет дерево до старта T1.

## Tests

Порядок TDD для всего плана: новые тесты не пишутся (рефакторинг под прикрытием существующего suite). T1: red не нужен — проверка «зелёного» прогона `GTMTab.test.tsx` до и после правки.

- Focused: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
- План-wide (на G): `pnpm lint`, `pnpm typecheck`, `pnpm test`

## Contract data

- **Behavior**: рендер режима `auto` идентичен до/после: та же таблица `SimpleTable` (`headerData=GTM_TABLE_HEADER`, `data=GTM_TABLE_ROWS`, `virtualization={false}`, подсветка строк с `Number(row[2]) > 0` классом `bg-[#EAF3FF]`, выравнивание `cellIndex === 1` — влево, остальные — по центру) + итоги `Всего видов ГТМ: 10` и `Суммарно фактических мероприятий: 341`.
- **API/types**: новый внутренний компонент `GtmAutoContent()` — без пропсов, без контекста; наружу GTMTab не экспортируется (приватный `_ui`).
- **UI/selectors**: `componentId="gtm-table"` сохраняется; тексты итогов — единственные text-ноды.
- **State/URL**: нет — компонент статичный, состояние режима (`sessionState.useGtmPlanningMode`) остаётся в `GTMTab`.
- **Fixtures/MSW**: не нужны (данных с сервера нет).
- **Out of scope**: `GtmSemiAutoContent`/`GtmManualContent`, новые тесты, изменения поведения, `GTM_TABLE_NOTE` (остаётся в инфо-блоке `GTMTab`), константы `GTMTab.const.ts`, работа с реальными данными API (пока заглушки по 25039).

## Runtime

`agent_config_check` (2026-10-28): `fresh: true`, `missingModel: []`, `serverStartedAt: 2026-10-28T09:26:06.299Z`.

- `build` → `zai-coding-plan/glm-5.3`
- `coder` → `zai-coding-plan/glm-5.3-flash`
- `git-manager` → `zai-coding-plan/glm-5.3-flash`
- `plan` → `zai-coding-plan/glm-5.3`
- `tdd` → `zai-coding-plan/glm-5.3`
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`

Ограничение окружения: в plan-режиме запрещён shell — git-состояние не проверялось (`tree: unknown`).

## Git

- `branch`: `none` — по явному указанию пользователя работаем в текущей ветке, новую не создаём
- `base`: текущая ветка (имя неизвестно — shell недоступен в plan-режиме; зафиксировать при git-подготовке T1)
- `tree`: `unknown`
- `sync`: `on`
- `switch`: не планируется (остаёмся в текущей ветке)
- `commits`: `per-task` — коммит каждой задачи на её паузе после подтверждения пользователем; push не входит в коммит
- `commit/push`: коммит T1 через `git-manager` на паузе задачи; push — только через подтверждённый close-out (`G`)
- `merge/MR`: вручную
- `initials`: `km`
- `task number`: `25039`
