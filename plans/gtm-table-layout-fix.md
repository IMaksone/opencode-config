# План: правка вёрстки ГТМ-таблиц по макетам (задача 25039)

## Goal

Привести таблицы вкладки «ГТМ» (Настройки модели) к макетам Figma 22-100 / 25-329 / 31-1036 и починить сортировку ручной таблицы:

1. Пропорции колонок авто-таблицы — 5 / 50 / 45 (по макету 22-100: 74/720/649 из 1443).
2. `ColumnFilter` — рерайт: вместо всегда развёрнутого `MultiSelectWithSearch` в шапке — `DropDown` с иконкой-триггером и поповером (поиск + чекбоксы + «Применить/Сбросить»). Шапка ручной таблицы становится компактной (~40px вместо ~70px).
3. Сортировка ручной таблицы — «как во всех таблицах»: стандартный `SortSwitcher` (ArrowButton variant="sort") с корректным отображением состояния и циклом `NEXT_SORT_TYPE` asc → desc → сброс.
4. `ColumnFilter` для колонки «Дата ГТМ».
5. Инпуты `size="small"` в ручной таблице (Скважина, Вид ГТМ, Дата ГТМ) и полуавтоматической (NumberInput «Количество планируемых мероприятий»).

Решения пользователя: фильтр — с поиском; сортировка — стандартный цикл (переключение колонки после asc даёт desc); small — ручная + полуавто таблицы.

## Affected files

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmSemiAutoContent/GtmSemiAutoContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.tsx`
- `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.tsx`
- `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx`

Общих компонентов касаемся один раз и только аддитивно (`SuggestionsInput` + проп `size`).

## Tasks

### T1 Пропорции колонок авто-таблицы

- affected files: `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- steps:
  1. В `GTM_TABLE_HEADER` добавить `style: { percentWidth: 5 }` для `#`, `{ percentWidth: 50 }` для «Вид ГТМ», `{ percentWidth: 45 }` для «Количество фактических мероприятий».
  2. `GTM_TABLE_HEADER_SEMI_AUTO` (4/27/37/32) и `GTM_MANUAL_TABLE_HEADER` (4/30/30/30/6) не трогать — они уже соответствуют макетам.
- tests: existing suite (`GTMTab.test.tsx`)
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx` → `pnpm lint` → `pnpm typecheck`

### T2 ColumnFilter на DropDown (с поиском)

- affected files: `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.tsx`, `…/ColumnFilter.test.tsx`
- steps:
  1. Рерайт тестов `ColumnFilter.test.tsx` под новый UI (см. Contract data).
  2. Переписать `ColumnFilter.tsx`: обёртка `shared DropDown`, `canOpen={!disabled}`, `contentClassName="!top-[18px] w-[200px] !max-h-fit !p-2 shadow-md"` (по образцу `FilterButton` в `StyledTable.tsx`).
  3. Триггер: кнопка с `aria-label="Фильтр по столбцу «{title}»"`, `aria-expanded={opened}`, иконка `filterTable.svg` 13×13, при активном фильтре — `filterTableActive.svg`, при `disabled` — opacity.
  4. Контент — отдельный внутренний компонент, монтируется при открытии (стейт черновика живёт до закрытия): `TextInput size="small"` с плейсхолдером «Начните вводить для поиска» (фильтрует список), чекбоки `shared Checkbox` по опциям, счётчик «Выбрано: N из M», кнопки «Сбросить» (`variant="minimal"`, чистит только черновик) и «Применить» (`variant="minimalSubmit"`, вызывает `onApply(values)` и закрывает поповер).
  5. Убрать зависимость от `MultiSelectWithSearch` и маппинг «значение ↔ индекс».
- tests: новый комплект в `ColumnFilter.test.tsx`: закрытый по умолчанию триггер; открытие по клику (aria-expanded, список опций, поиск, счётчик); фильтрация списка по поисковой строке; «Применить» коммитит значения в порядке опций и закрывает; «Сбросить» чистит только черновик (без onApply), затем «Применить» → `onApply([])`; закрытие по Escape отбрасывает черновик; `disabled` — поповер не открывается.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.test.tsx` → `pnpm lint` → `pnpm typecheck`

### T3 Сортировка ручной таблицы — как во всех таблицах

- affected files: `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `…/GtmManualContent.test.tsx`
- steps:
  1. Обновить тест «sorts by another column ascending when a different column was sorted before»: после сортировки колонки A по возрастанию клик по колонке B сортирует B **по убыванию** (стандартный цикл `NEXT_SORT_TYPE`); остальные ~20 сценариев сортировки/фильтра не менять (календарный порядок дат, asc → desc → исходный порядок, пустые строки в конце, сохранение порядка при правке ячейки, добавлении/удалении строки).
  2. Мемоизировать `data` по количеству строк: `useMemo(() => displayedRows.map((_row, index) => [index + 1, '', '', '', '']), [displayedRows.length])` — внутренний стейт `SimpleTable` (`useMemo(…, [props.data])`) перестаёт сбрасываться на каждый рендер, стрелка `SortSwitcher` показывает состояние.
  3. Упростить `handleSort`: доверять направлению из события — `''` → `setSort(null)` + `setVisibleIds(null)`; `'ascending' | 'descending'` → `sortManualRows(filteredRows, column, direction)`. Удалить собственный вывод направления и комментарий-хак про пересоздание стейта.
  4. Зафиксировать в комментарии: при изменении количества строк (добавление/удаление/фильтр) стрелка сбрасывается в нейтраль, порядок строк сохраняется отсортированным — как в остальных таблицах при refetch.
- tests: обновлённый `GtmManualContent.test.tsx` (сортировка)
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx` → `pnpm lint` → `pnpm typecheck`

### T4 Фильтр «Дата ГТМ»

- affected files: `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `…/GtmManualContent.test.tsx`
- steps:
  1. Тесты (red): фильтр по колонке «Дата ГТМ» скрывает строки с другими датами и сохраняет «Всего строк»; сброс фильтра возвращает все строки; совместная работа с фильтрами «Скважина»/«Вид ГТМ»; «Очистить таблицу» сбрасывает и его.
  2. Расширить стейт `filters` полем `date: string[]`, `matchesFilters` — условием по `row.date`, `applyFilter` — вариантом `'date'`.
  3. В мемо `headerData` добавить третью ветку для `column.title === 'Дата ГТМ'`: слот `filter` с `ColumnFilter` (опции — уникальные непустые `row.date`).
- tests: новые сценарии в `GtmManualContent.test.tsx`
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx` → `pnpm lint` → `pnpm typecheck`

### T5 Инпуты size small (ручная + полуавто таблицы)

- affected files: `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.tsx`, `…/SuggestionsInput.test.tsx`, `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.tsx`, `…/DictionaryInput.test.tsx`, `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmSemiAutoContent/GtmSemiAutoContent.tsx`
- steps:
  1. Тест (red): `SuggestionsInput` пробрасывает `size="small"` в `TextInput`.
  2. `SuggestionsInput`: добавить аддитивный проп `size?: 'small' | 'medium'`, передать в `TextInput`.
  3. `DictionaryInput`: добавить и пробросить `size`.
  4. `GtmManualContent`: `size="small"` для «Скважина» и «Вид ГТМ» (DictionaryInput) и «Дата ГТМ» (TextInput).
  5. `GtmSemiAutoContent`: `NumberInput` → `size="small"` (проп у NumberInput уже есть).
- tests: `SuggestionsInput.test.tsx` (проброс size), existing suite остальными
- verify: `pnpm exec vitest run src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab` → `pnpm lint` → `pnpm typecheck` → `pnpm build` → `pnpm test` (полная матрица — последняя кодовая задача)

### G: git close-out

- affected files: —
- steps:
  1. `git status --porcelain` — убедиться, что изменились только файлы из Affected files.
  2. Итоговые коммиты per-task через git-manager (без push), сообщения — conventional commits.
  3. Живая проверка в браузере (если dev-сервер запущен): три режима ГТМ — пропорции авто-таблицы, компактная шапка, фильтры с поиском по трём колонкам, стрелка сортировки (asc/desc/нейтраль, цикл, переключение колонки), small-инпуты в ручной и полуавто таблицах.
- tests: existing suite
- verify: `git status --porcelain` + `pnpm test`

## Risks

- `SuggestionsInput` — общий компонент: только аддитивный проп `size`, существующие потребители не затрагиваются; контролируется `SuggestionsInput.test.tsx` и полным прогоном.
- Мемоизация `data` по `displayedRows.length` — тонкое место: порядок строк идёт из `renderBodyCell`/`displayedRows`, а не из `data`; ошибки поймают тесты сортировки/фильтра (правка ячейки после сортировки, добавление/удаление строк).
- Косметика (принимаем): стрелка сортировки сбрасывается в нейтраль при добавлении/удалении строки и применении фильтра — как в остальных таблицах при refetch; порядок строк остаётся отсортированным.
- Тест «sorts by another column ascending…» меняет ожидание на desc-first — осознанное изменение UX на стандартный цикл таблиц.
- Позиционирование поповера `DropDown` в шапке (`!top-[18px]`) — сверить с `FilterButton`; при наложении скорректировать `contentClassName`.
- Удалений файлов нет; тестовые файлы переписываются, не удаляются.

## Tests

Порядок TDD внутри задач: red (новые/обновлённые тесты) → green (реализация) → refactor. Полный прогон в конце (T5).

- `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.test.tsx`
- `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
- `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
- `pnpm exec vitest run src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx`
- `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm test`

## Contract data

- Behavior:
  - Авто-таблица: колонки 5 / 50 / 45 %.
  - Фильтр колонки: триггер-иконка в шапке; поповер с поиском, чекбоксами уникальных непустых значений колонки, счётчиком «Выбрано: N из M»; «Сбросить» чистит только черновик; «Применить» → `onApply(values)` (пустой массив = фильтр выключен) и закрывает поповер; закрытие (Escape/клик вне) отбрасывает черновик; `disabled` — не открывается.
  - Фильтр скрывает строки, но не меняет `rows` и счётчик «Всего строк»; «Очистить таблицу» сбрасывает все три фильтра.
  - Сортировка: клики по стрелке колонки — asc → desc → исходный порядок; клик по другой колонке продолжает глобальный цикл (после asc → desc); пустые значения — в конце; даты — в календарном порядке; сортируются только отфильтрованные строки, фильтр при сортировке сохраняется.
  - Инпуты: ручная таблица (Скважина/Вид ГТМ/Дата ГТМ) и NumberInput полуавто — `size="small"`.
- API/types: `SuggestionsInputProps + size?: 'small' | 'medium'` (проброс в `TextInput`); `DictionaryInputProps + size?`; `NumberInput size="small"` в `GtmSemiAutoContent`; `GTM_TABLE_HEADER` — `style.percentWidth` 5/50/45.
- Errors: без изменений (валидация строк, ошибки справочников, дубликаты — не трогаются).
- UI/selectors: триггер фильтра — `aria-label="Фильтр по столбцу «Скважина» | «Вид ГТМ» | «Дата ГТМ»"`, `aria-expanded`; поиск — плейсхолдер «Начните вводить для поиска»; кнопки «Применить» / «Сбросить»; чекбоксы с accessible name = значение опции.
- State/URL: без изменений (`sessionState` `gtmPlanningMode`, URL-параметры страницы).
- Fixtures/MSW: не требуются — данные таблиц из констант `GTMTab.const.ts`.
- Out of scope: размер радио-кнопок и раскладка радио-строки; i-иконки у радио; синий текст инфо-блока ручного режима; итоги авто-режима в одну строку; шрифт Inter; импорт xlsx и API сохранения программы ГТМ (TODO 25039); `MultiSelectWithSearch` (остаётся в других местах).

## Runtime

- `agent_config_check`: `fresh: true`, `missingModel: []`, `checked: []`, `serverStartedAt: 2026-10-27T14:42:12.814Z`.
- agents: `build → zai-coding-plan/glm-5.3`; `coder → zai-coding-plan/glm-5.3-flash`; `git-manager → zai-coding-plan/glm-5.3-flash`; `plan → zai-coding-plan/glm-5.3`; `tdd → zai-coding-plan/glm-5.3`; `test-generator → openrouter/deepseek/deepseek-v4.1-flash-1017#high`.

## Git

- branch: `none` — работа продолжается в существующей ветке `km_feat/25039-model-settings`, переключение не требуется.
- base: не назначается (пользователь выбрал текущую ветку).
- tree: `clean` (`git status --porcelain` пуст).
- sync: `on`.
- switch: только через git-manager после явного подтверждения пользователем; plan git-команды записи не выполняет.
- commits: `per-task` (T1–T5 — по коммиту на задачу, conventional commits), push в коммит не входит.
- commit/push: вручную через git-manager или через подтверждённый close-out.
- merge/MR: вручную.
- initials: `km`.
- task number: `25039`.
