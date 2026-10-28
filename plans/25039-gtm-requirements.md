# 25039 — доработка вкладки «ГТМ» по требованиям ТЗ «Настройка и управление ГТМ» (без интеграции с API)

- Task: `25039`
- Branch: текущая `km_feat/25039-model-settings` — новая не создаётся (пользователь: «текущая»)
- Base: текущая ветка задачи 25039 (пользователь). Скилл `plan` допускает `test`/`main`/`develop` — фиксируем осознанное отклонение, как в соседних планах серии (`25039-gtm-manual-layout.md`, `25039-gtm-semi-auto-layout.md`)
- Initials: `km`
- Источник требований: ТЗ «Norilsk #20993: Добавление модуля настройки и управления ГТМ в разделе "Настройки модели"» — текст передан пользователем в чат (PDF моделью не читается). Ревизия 27.10.2026
- Решения пользователя (27.10.2026):
  - импорт `.xlsx/.xls` (п. 2.4.7, TC-16) — **отложить до интеграции API**, кнопку «Загрузить файл» не трогаем (заглушка `TODO(25039)` остаётся);
  - иконки «i» (п. 2.1.3) — **следовать ТЗ**: тултип у каждого из трёх режимов всегда (отменяет прошлое Figma-решение «иконки только в auto», зафиксированное тестами).
- Аудит плана (27.10.2026, ревью по коду), правки приняты пользователем: реэкспорт типа `GtmPlanningMode` через `sessionState/index.ts` (обязателен — баррель реэкспортирует только `SelectedMap`); `enumValues` для валидации ключа; механика сброса фильтра «Сбросить» → «Применить» (`MultiSelectWithSearch` не вызывает `onChange` на «Сбросить»); селектор триггера `within(columnheader).getByRole('combobox')`; `handleSort` сортирует отфильтрованный набор; подсказка про плейсхолдерные `row` в `getBodyCellClassName`.

## Goal

Довести вкладку «ГТМ» (`src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`) до соответствия переданному ТЗ в части, не требующей API:

1. п. 2.1.3 — кнопка «i» справа от **каждого** режима (сейчас — только в auto-режиме);
2. п. 2.1.4 — выбранный режим сохраняется автоматически при переключении radio (frontend-часть: персистентность в `sessionStorage` через `sessionState`; серверное сохранение — вне скоупа);
3. раздел 1 / 4.1.1 — при переключении режимов введённые данные текущего режима не сохраняются и не восстанавливаются при возврате (уже обеспечено анмаунтом контента — зафиксировать регресс-тестами);
4. п. 3.5 — валидация уникальности «Скважина + Вид ГТМ + календарный месяц» в ручном режиме: повторная запись выделяется, выводится сообщение, «Сохранить» заблокирована (TC-11/TC-12/TC-13);
5. п. 2.4.6 — фильтрация (мультивыбор с поиском/сбросом/применением) и сортировка по колонкам «Скважина» и «Вид ГТМ» ручной таблицы (TC-14/TC-15; сортировка уже реализована — добавить фильтр).

Остальные пункты ТЗ (2.1.1–2.1.2, 2.2, 2.3, 2.4.1–2.4.5, 2.4.8–2.4.10, 3.1–3.4, TC-01/02/04/05/06/07/08/09/10/17) уже реализованы предыдущими планами серии (`25039-gtm-settings-tab`, `25039-gtm-semi-auto-layout`, `25039-gtm-manual-layout`, `25039-gtm-settings-ui-refactor` — все исполнены, код и тесты в дереве) — существующие тесты остаются регресс-гардом и не переписываются, кроме кейсов, фиксирующих отменённые решения (иконки только в auto).

## Affected files

### New

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.tsx` — триггер+поповер фильтра колонки на базе `MultiSelectWithSearch`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/index.ts`

### Edit

- `src/shared/sessionState/domains/gtms.ts` — ключ, объект enum-значений и хук `useGtmPlanningMode`
- `src/shared/sessionState/index.ts` — реэкспорт типа `GtmPlanningMode` из барреля (сейчас из типов реэкспортируется только `SelectedMap`)
- `src/shared/sessionState/index.test.ts` — `useGtmPlanningMode` в списке representative hooks
- `src/shared/sessionState/domains/common.test.ts` — тесты нового хука (describe `gtms`)
- `src/shared/components/table/_ui/DataTables/types.ts` — `HeaderElementOfDataTable.filter?: ReactNode`
- `src/shared/components/table/_ui/DataTables/_ui/StyledTable.tsx` — рендер опционального слота `filter` в ячейке шапки
- `src/shared/components/table/_ui/DataTables/_ui/StyledTable.test.tsx` — кейс слота
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.types.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/manualRows.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/manualRows.test.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`

### Not changed

- `GtmSemiAutoContent` (включая заглушку «Сохранить»), `DictionaryInput`, `helpers/plannedCounts.*`
- `SettingsMode.tsx/.test.tsx`, `SettingsForm.tsx`, `SettingsTabs`, остальные вкладки настроек
- `MultiSelectWithSearch` (используется как есть, без правок API)
- API-слой: `ModelSettings`, RTK Query, MSW, `testFixtures.ts` (интеграции с API нет)

## Tasks

### T1 Кнопка «i» у каждого из трёх режимов (п. 2.1.3)

- affected files: `GTMTab/GTMTab.tsx`, `GTMTab/GTMTab.test.tsx`
- steps:
  1. `GTMTab.tsx`: убрать условие `mode === 'auto'` у блока `Tooltip` с иконкой `info.svg` — рендерить для каждого `option` из `GTM_MODE_OPTIONS` безусловно (тултип `option.description` справа от лейбла радио).
  2. `GTMTab.test.tsx`: переписать кейсы фиксации старого решения: «hides radio tooltips … semi automatic/manual mode» → ожидают 3 `[data-code-id="tooltip-component"]` в любом режиме; кейс «keeps the automatic content when the mode switch is disabled…» — проверка 3 тултипов остаётся корректной; добавить кейс: в manual-режиме тултипы у всех трёх радио.
- tests: тултип-триггеры (3 шт.) присутствуют в auto, semiAuto и manual; текст тултипа каждого режима соответствует описанию этой же опции из `GTM_MODE_OPTIONS`.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`, `pnpm lint`, `pnpm typecheck`

### T2 Автосохранение выбранного режима + сброс данных при переключении (пп. 2.1.4, 1, 4.1.1 — frontend-часть)

- affected files: `src/shared/sessionState/domains/gtms.ts`, `src/shared/sessionState/index.ts`, `src/shared/sessionState/index.test.ts`, `src/shared/sessionState/domains/common.test.ts`, `GTMTab/GTMTab.tsx`, `GTMTab/GTMTab.types.ts`, `GTMTab/GTMTab.test.tsx`
- steps:
  1. `gtms.ts`: экспортировать `export type GtmPlanningMode = 'auto' | 'semiAuto' | 'manual';` (тип живёт в shared — shared не может импортировать из pages по FSD), константу `GTM_PLANNING_MODE_KEY = 'GTMS_PLANNING_MODE'`, объект `GTM_PLANNING_MODE_VALUES: Record<string, GtmPlanningMode> = { auto: 'auto', semiAuto: 'semiAuto', manual: 'manual' }` и хук по образцу `useIsAllPeriod` (nonNullable, plain string, без `json`): `useGtmPlanningMode(): { gtmPlanningMode: GtmPlanningMode; setGtmPlanningMode: (value: GtmPlanningMode) => void }` с `defaultValue: 'auto'` и `enumValues: GTM_PLANNING_MODE_VALUES` — `createEnumParser` принимает `Record<string, TValue>`, неизвестное/устаревшее значение в storage парсится в `null` и заменяется на `defaultValue` (docs/sessionState.md, «Граничные случаи»), режим не «пропадает» молча.
  2. `sessionState/index.ts`: добавить `export type { GtmPlanningMode } from './domains/gtms';` — баррель сейчас реэкспортирует только тип `SelectedMap`, без этого шага импорт типа из `@/shared/sessionState` не скомпилируется, а deep-import из `domains/gtms` нарушает публичный API. Хук в объект `sessionState` попадает спредом домена `gtms` автоматически (домен уже включён). В `index.test.ts` дополнить список representative hooks строкой `useGtmPlanningMode`.
  3. `GTMTab.types.ts`: `GtmPlanningMode` больше не объявляется локально — импорт типа из `@/shared/sessionState` (pages → shared разрешён; становится возможным после шага 2), локальный экспорт заменить на реэкспорт или поправить относительные импорты внутри GTM-модуля (`GTMTab.tsx`, `_ui/*` используют относительные пути — заменить только объявление типа).
  4. `GTMTab.tsx`: `useState<GtmPlanningMode>('auto')` → `const { gtmPlanningMode: mode, setGtmPlanningMode: setMode } = sessionState.useGtmPlanningMode();` — импорт `import { sessionState } from '@/shared/sessionState';` (docs/sessionState.md, правило 1: в pages — только через `sessionState.use*()`; именованного экспорта хука из барреля нет). Выбор радио вызывает `setMode` — значение пишется в `sessionStorage` автоматически, отдельной кнопки не появляется (п. 2.1.4).
  5. `common.test.ts` (describe `gtms`): кейсы `useGtmPlanningMode` — по умолчанию `'auto'` и записывается в storage при монтировании (`GTMS_PLANNING_MODE === 'auto'`); `setGtmPlanningMode('manual')` персистит `'manual'`; после `clearSessionState()` — снова `'auto'`; кейс валидации enum: `window.sessionStorage.setItem('GTMS_PLANNING_MODE', 'legacy-value')` до монтирования → `gtmPlanningMode === 'auto'`.
  6. `GTMTab.test.tsx`: **обязательный** сброс ключа между кейсами (`beforeEach(() => window.sessionStorage.removeItem('GTMS_PLANNING_MODE'))`) — иначе персистенный режим протекает в остальные тесты. Новые кейсы: (a) после `unmount` и повторного рендера выбранный режим сохранён (radio `Ручное` всё ещё checked); (b) режим по умолчанию в чистой сессии — `Автоматическое`.
  7. Регресс-тесты раздела 1 ТЗ (данные не сохраняются/не восстанавливаются при переключении): (a) semiAuto: ввести «5» в поле «ГРП» → переключить auto → вернуть semiAuto → все поля «0», итог «Суммарно планируемых мероприятий: 0»; (b) manual: заполнить строку → переключить на другой режим → вернуть → таблица снова с одной пустой строкой, «Всего строк: 1».
- tests: см. steps 5–7; существующие кейсы переключения режимов — регресс-гард.
- verify: `pnpm exec vitest run src/shared/sessionState`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`, `pnpm lint`, `pnpm typecheck`

### T3 Валидация уникальности «Скважина + Вид ГТМ + календарный месяц» (п. 3.5, TC-11/12/13)

- affected files: `GTMTab/helpers/manualRows.ts`, `GTMTab/helpers/manualRows.test.ts`, `GTMTab/GTMTab.types.ts`, `GTMTab/GTMTab.const.ts`, `GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
- steps:
  1. `GTMTab.const.ts`: `GTM_MANUAL_ERROR_DUPLICATE = 'Для выбранной скважины данный вид ГТМ уже запланирован в указанном месяце.'` (текст из п. 3.5.3, с точкой).
  2. `manualRows.ts`: чистая функция `findDuplicateManualRowIds(rows: ManualRow[]): Set<number>` — ключ `well|gtmType|год.месяц` (дата парсится существующим `parseGtmDate`; участвуют только полностью валидные строки: `isRowComplete` + словари + дата); обход в порядке массива `rows`; первое вхождение ключа — валидно, каждое последующее — id строки попадает в Set (по ТЗ ошибочна «повторная запись»). Исходный массив не мутирует.
  3. `GtmManualContent.tsx`: `const duplicateIds = useMemo(() => findDuplicateManualRowIds(rows), [rows]);` — `canSave` дополнительно требует `duplicateIds.size === 0` (п. 3.5.3: до устранения ошибки сохранение недоступно). Строка с `id ∈ duplicateIds`: визуальное выделение — красная подсветка ячеек строки (`bg-[#fff8f8]` на `td`, согласуется с существующей палитрой ошибок) + под строкой дополнительный `<tr>` с `<td colSpan={5}>` и текстом `GTM_MANUAL_ERROR_DUPLICATE` (`text-[13px] text-[#ff2a2a] text-left`). Внутренние компоненты (`SimpleTable`) не меняются: выделение — через `getBodyCellClassName`, строка сообщения — `renderBodyCell` не подходит (нужна отдельная строка) → рендер сообщения одной строкой под таблицей для первой дублирующей записи **или** переходом обеих дубликатов в error-стайл ячеек; финальную механику выбирает `coder` по фактическому API `SimpleTable` (если добавить `<tr>` внутрь нельзя — вывести сообщение в футере под «Всего строк» для каждой дублирующей записи, выделение строк через `getBodyCellClassName`). Главный контракт: текст константы виден, строки визуально выделены, «Сохранить» disabled. NB: `data` ручной таблицы состоит из плейсхолдеров `[index+1, '', '', '', '']` — в `getBodyCellClassName` дубликат определяется только через `rowIndex → displayedRows[rowIndex].id ∈ duplicateIds` (по значениям `row` нельзя — тот же приём, что в `renderBodyCell`).
  4. `manualRows.test.ts`: TC-11 — `1023+ГРП+15.03.2027` и `1023+ГРП+20.03.2027` → id второй строки в Set, первой нет; TC-12 — `15.03.2027` и `10.04.2027` → Set пуст; TC-13 — `1023+ГРП+март` и `1023+ОПЗ+март` → Set пуст; невалидные/неполные строки в ключ не попадают (`1023+ГРП+32.06.2027` и дубль — не дубликат); три одинаковые строки → в Set две (вторая и третья).
  5. `GtmManualContent.test.tsx`: дубликат → текст `GTM_MANUAL_ERROR_DUPLICATE` в документе, «Сохранить» disabled, хинт `GTM_MANUAL_SAVE_HINT` виден; правка даты повторной строки на другой месяц → ошибка исчезла, «Сохранить» enabled; удаление первой строки-дубликата → ошибка исчезла (Set пересчитывается по `rows`).
- tests: см. steps 4–5 (юнит `manualRows.test.ts` — red до реализации; компонентные — red до правки `GtmManualContent`).
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent`, `pnpm lint`, `pnpm typecheck`

### T4 Фильтр колонок «Скважина» и «Вид ГТМ» ручной таблицы (п. 2.4.6, TC-14)

- affected files: `src/shared/components/table/_ui/DataTables/types.ts`, `src/shared/components/table/_ui/DataTables/_ui/StyledTable.tsx`, `src/shared/components/table/_ui/DataTables/_ui/StyledTable.test.tsx`, `GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.tsx`, `…/ColumnFilter.test.tsx`, `…/ColumnFilter/index.ts`, `GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`, `GTMTab/GTMTab.const.ts`
- steps:
  1. Расширение shared-таблицы (аддитивно, прецедент — опциональная пропса `onPaste` у инпутов в плане `25039-gtm-settings-ui-refactor`): `HeaderElementOfDataTable` получает `filter?: ReactNode`; `StyledTable` рендеряет `{cell.filter}` в ячейке шапки рядом с заголовком/иконкой сортировки (до существующего `FilterButton` — числовой фильтр варианта WithStats не затрагивается: у `SimpleTable` в `state` нет `filters`, у остальных потребителей `filter` просто не задан). `StyledTable.test.tsx`: кейс «renders custom filter node inside the column header when provided» + «does not render filter controls for a plain column» остаётся зелёным.
  2. `ColumnFilter` (локальный компонент GTM, паттерн `DictionaryInput`): пропсы `{ title: string; options: string[]; selectedValues: string[]; onApply: (values: string[]) => void; disabled?: boolean }`. Внутри — `MultiSelectWithSearch` (`options`, `value` — индексы выбранных в `options`, `onChange` маппит индексы обратно в строки; `label=""` — скрывает подпись, `fullWidth={false}`, `variant="small"`, `disabled`); триггер — собственный триггер `MultiSelectWithSearch` (`div role="combobox"`), рендерится прямо в ячейке шапки. `aria-label={`Фильтр по столбцу «${title}»`}` вешается на корневой элемент `ColumnFilter` — сам `MultiSelectWithSearch` не принимает `aria-label`/`id`, и у combobox нет имени; текст заголовка колонки остаётся в `columnheader`, поэтому существующие regex-селекторы (`new RegExp(title)`) продолжают работать. Селектор триггера в тестах — `within(columnheader).getByRole('combobox')`, не `getByRole('combobox', { name: … })`.
  3. `GtmManualContent.tsx`: состояние `filters: { well: string[]; gtmType: string[] }` (применённые значения-строки; пустой массив = фильтр не активен). Опции фильтра — уникальные непустые значения колонки по текущим `rows` (фильтруем то, что есть в таблице). `GTM_MANUAL_TABLE_HEADER` собирается в `useMemo`: колонкам «Скважина» и «Вид ГТМ» добавляется `filter: <ColumnFilter …>`.
  4. Комбинирование с сортировкой (снимок `visibleIds`): базовый набор = `rows`, из которого исключены строки, не прошедшие фильтры; `displayedRows` = базовый набор в порядке `visibleIds` (если сортировка активна). Пересчёт снимка — по явным действиям: применить/сбросить фильтр (`sort ? sortManualRows(filteredRows, sort.column, sort.direction).map(id) : filteredRows.map(id)`) и клик сортировки — `handleSort` обязан сортировать **отфильтрованный** базовый набор, а не полный `rows` (текущая реализация сортирует `rows` и затёрла бы фильтр). Добавление строки: новый `id` в конец снимка (строка видна, даже если не проходит фильтр — как «новая пустая», иначе её не заполнить; если фильтр активен и строка не проходит — дописывать всё равно, пользователь снимет фильтр). Удаление строки и «Очистить таблицу»: существующая логика; «Очистить таблицу» дополнительно сбрасывает `filters` (и `sort` — уже сбрасывает). «Всего строк: N» показывает `rows.length` (общее число строк плана, не число видимых) — фильтр не удаляет данные.
  5. `disabled` из `SettingsFormContext` проксируется в `ColumnFilter` (триггер неактивен).
  6. `ColumnFilter.test.tsx`: рендер триггера (`within(колонка).getByRole('combobox')`); открытие поповера; поиск сужает список; выбор двух значений → «Применить» → `onApply(['1001','1002'])`; сброс — «Сбросить» **и затем «Применить»** → `onApply([])` («Сбросить» в `MultiSelectWithSearch` чистит только draft и не вызывает `onChange` — наружу значение выходит исключительно кнопкой «Применить»); закрытие поповера без «Применить» → `onApply` не вызывался; `disabled` — триггер неактивен.
  7. `GtmManualContent.test.tsx` (TC-14): три строки с разными скважинами → открыть фильтр «Скважина», поиск `10`, выбрать два значения, «Применить» → видны только отфильтрованные строки (по aria-label видимых инпутов), «Всего строк» не меняется; сброс фильтра («Сбросить» + «Применить») → все строки; фильтр + сортировка вместе: фильтр по виду ГТМ, сортировка по дате → порядок календарный внутри отфильтрованных; повторный клик сортировки при активном фильтре фильтр не сбрасывает; «Очистить таблицу» сбрасывает фильтры; `disabled` — фильтр-триггер disabled. Попутно удалить протухшие комментарии «GTM_MANUAL_TABLE_HEADER появляется в T4» в `GtmManualContent.test.tsx` и `GTMTab.test.tsx` (константа давно в `GTMTab.const.ts`).
- tests: см. steps 1, 6, 7 (red до реализации).
- verify: `pnpm exec vitest run src/shared/components/table`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`, `pnpm lint`, `pnpm typecheck`

### T5 Полная проверка и ручной QA

- affected files: нет
- steps:
  1. Полная матрица: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`.
  2. Ручной прогон в `pnpm run-dev` по применимым сценариям ТЗ: TC-01/02 (auto/semiAuto — регресс), TC-04 (вставка из Excel), TC-05/06/07/08/09/10 (ручной режим, валидации), TC-11/12/13 (дубли по месяцу — новое), TC-14/15 (фильтр и сортировка — новое), TC-17 (удаление строки), TC-18 (активация/блокировка «Сохранить» — без серверного сохранения). TC-03/TC-16 — вне скоупа (заглушки до API): проверить только доступность кнопок.
  3. Проверить: тултипы «i» у всех трёх радио во всех режимах; режим переживает уход с вкладки и возврат (sessionStorage), данные режимов при этом сбрасываются; поповер фильтра не обрезается контейнерами (`ProjectPage` — `overflow-x-hidden`, риск как у панели `DictionaryInput`); сообщение дубликата читаемо, подсветка строк видна; сброс фильтра в QA — «Сбросить» и затем «Применить» (один «Сбросить» ничего не применяет — поведение `MultiSelectWithSearch`).
- tests: existing suite / manual check
- verify: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`

### G: git close-out

- affected files: нет (git)
- steps:
  1. `git status --porcelain` — в дереве только файлы плана (3 new + 15 edit); посторонних изменений нет. `git branch --show-current` → `km_feat/25039-model-settings`. (На момент планирования дерево `unknown` — shell в plan-режиме недоступен; проверить перед хендоффом.)
  2. Коммит по стратегии `commits` (`single`) — только через `git-manager` после явного подтверждения пользователя.
  3. Push и MR — не выполняются.
- tests: existing suite / manual check
- verify: `git status --porcelain`, `git log --oneline -1`

## Risks

- **Расширение shared-таблицы** (`HeaderElementOfDataTable.filter`): аддитивная опциональная пропса; остальные потребители `DataTables` не задают `filter` — поведение не меняется; регресс через `StyledTable.test.tsx`. Если ревью забракует слот — альтернатива без правок shared: панель фильтров над таблицей (отклонение от TC-14 «открыть фильтр в столбце»).
- **FSD-перенос типа `GtmPlanningMode`**: shared не импортирует из pages; тип объявляется в `shared/sessionState/domains/gtms.ts`, pages импортирует из `@/shared/sessionState`. Хук попадает в объект `sessionState` спредом домена `gtms` (уже включён), а тип — только через явный реэкспорт в `sessionState/index.ts` (сейчас из типов реэкспортируется лишь `SelectedMap`) — шаг 2 в T2 обязателен: без него typecheck падает, deep-import из `domains/gtms` нарушает публичный API.
- **Утечка `GTMS_PLANNING_MODE` между тестами**: `GTMTab.test.tsx` обязан сбрасывать ключ в `beforeEach` — иначе персистентный режим меняет дефолт «Автоматическое» в чужих кейсах (в т.ч. соседних файлов при общем `sessionStorage` happy-dom).
- **`MultiSelectWithSearch` работает с индексами** (`value: number[]`): применённый фильтр хранится строками-значениями, индексы пересчитываются на каждом рендере — при изменении `rows` (удаление строки меняет набор уникальных значений) фильтр не «съезжает» на другие значения. Кроме того, «Сбросить» чистит только draft и **не вызывает** `onChange` — применённый сброс это всегда «Сбросить» → «Применить»; тесты T4 и QA T5 это учитывают. Компонент не принимает `aria-label`/`id` — имя вешается на корень `ColumnFilter`, триггер ищется через `within(columnheader).getByRole('combobox')`.
- **Фильтр + снимок сортировки (`visibleIds`)**: пересчёт снимка только по явным действиям (применить/сбросить фильтр, клик сортировки, add/delete/clear) — не на каждый ввод, иначе порядок будет «прыгать» (урок T3 прошлого плана). `handleSort` при активном фильтре сортирует отфильтрованный базовый набор — текущая реализация сортирует полный `rows` и затёрла бы фильтр.
- **Поповер фильтра в шапке** может обрезаться `overflow` контейнеров — тот же класс риска, что панель «Возможные варианты» (Risks прошлого плана); при обрезке — портал/fixed.
- **Строка-сообщение дубликата**: `SimpleTable` не предусматривает дополнительные `<tr>`; если вставка невозможна без правок shared — сообщение выводится под таблицей (футер) для каждой дублирующей записи, выделение строк — `getBodyCellClassName`. Контракт (текст + подсветка + блокировка «Сохранить») не меняется.
- **Отступ от прошлых Figma-решений**: иконки «i» только в auto (план `25039-gtm-manual-layout`, D-решения) отменяются ТЗ — соответствующие тест-кейсы переписываются в T1.
- **Заглушки до API**: «Сохранить» (semiAuto/manual), «Загрузить файл» (xlsx-парсер), серверное сохранение режима, файлы `b02337***.bss`/`b03337***.nkd` и удаление данных режимов на бэкенде (раздел 4 ТЗ) — вне скоупа; справочники `GTM_WELL_NAMES`/`GTM_TYPE_NAMES` остаются статическими моками.
- **Соседние планы в `.opencode/plans/`**: планы серии 25039 (`gtm-settings-ui-refactor`, `gtm-manual-layout`, `gtm-semi-auto-layout`) реализованы — закрыты по факту; `25039-plan-tdd-tasks.md`, `opencode-v2-config-migration.md`, `suggestions-input-popper-portal.md`, `foreground-only-plugin.md` — другие задачи, по файлам с настоящим планом не пересекаются.
- **Дерево**: `unknown` на момент планирования (shell недоступен в plan-режиме) — `git status --porcelain` обязателен перед хендоффом; чужие правки — блокер (правило скилла).

## Tests

Общий TDD-порядок: T1 (иконки «i», перепись кейсов) → T2 (sessionState-хук red → green; интеграция в `GTMTab`; регресс-кейсы сброса данных) → T3 (`manualRows.test.ts` red → helper green → `GtmManualContent` дубликаты) → T4 (`StyledTable` слот → `ColumnFilter` → интеграция фильтров в `GtmManualContent`) → T5 (полная матрица + QA) → G. Существующие кейсы `auto`/`semiAuto`/`manual` — регресс-гард; переписываются только фиксации отменённых решений (тултипы только в auto — T1).

Фокусные прогоны:

```bash
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter
pnpm exec vitest run src/shared/sessionState
pnpm exec vitest run src/shared/components/table
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode
```

Контроль: `pnpm lint`, `pnpm typecheck` (после каждой задачи), `pnpm build` + `pnpm test` (T5).

## Contract data

- **Behavior**: (1) тултип «i» с описанием режима отображается справа от каждого из трёх радио во всех режимах; (2) выбранный режим планирования персистится в sessionStorage при переключении radio (default `'auto'`), переживает размонтирование вкладки, данные режимов при переключении сбрасываются и при возврате не восстанавливаются; (3) в ручном плане повторная (вторая и далее в порядке строк) комбинация «Скважина + Вид ГТМ + календарный месяц» — ошибка: текст «Для выбранной скважины данный вид ГТМ уже запланирован в указанном месяце.», визуальное выделение записей, «Сохранить» disabled и хинт «Сохранение недоступно при наличии ошибок» до устранения; разные месяцы или разные виды ГТМ в том же месяце — допустимы; (4) колонки «Скважина»/«Вид ГТМ» ручной таблицы: фильтр-мультивыбор (поиск, выбор, сброс, применение) поверх значений, присутствующих в таблице; фильтр скрывает строки, не удаляя; комбинируется с сортировкой; сбрасывается «Очистить таблицу».
- **API/types**: `useGtmPlanningMode(): { gtmPlanningMode: GtmPlanningMode; setGtmPlanningMode(v: GtmPlanningMode): void }`, `GtmPlanningMode = 'auto' | 'semiAuto' | 'manual'` + `GTM_PLANNING_MODE_VALUES: Record<string, GtmPlanningMode>` (shared, `enumValues`; тип реэкспортируется из `@/shared/sessionState` через `sessionState/index.ts`); `HeaderElementOfDataTable.filter?: ReactNode` (shared); `findDuplicateManualRowIds(rows: ManualRow[]): Set<number>` (GTMTab helpers); `ColumnFilterProps { title: string; options: string[]; selectedValues: string[]; onApply(values: string[]): void; disabled?: boolean }` (GTMTab local).
- **Errors**: `GTM_MANUAL_ERROR_DUPLICATE = 'Для выбранной скважины данный вид ГТМ уже запланирован в указанном месяце.'`; существующие тексты ошибок 3.1–3.4 не меняются.
- **UI/selectors**: радио — `getByRole('radio', { name: 'Автоматическое'|'Полуавтоматическое'|'Ручное' })`; тултипы — `container.querySelectorAll('[data-code-id="tooltip-component"]')` ×3 в любом режиме; фильтр — корень `ColumnFilter` с aria-label `` `Фильтр по столбцу «Скважина»` `` / `` `Фильтр по столбцу «Вид ГТМ»` `` внутри `columnheader` (regex-селекторы заголовков сохраняются — текст заголовка остаётся), триггер — `within(columnheader).getByRole('combobox')` (combobox без имени); кнопки поповера — `getByRole('button', { name: 'Применить' })` / `{ name: 'Сбросить' }` (применённый сброс — «Сбросить» → «Применить»: `handleReset` не вызывает `onChange`); сообщение дубликата — текст `GTM_MANUAL_ERROR_DUPLICATE`; «Сохранить» (manual) — disabled при `duplicateIds.size > 0`.
- **State/URL**: sessionStorage-ключ `GTMS_PLANNING_MODE` (значения `auto|semiAuto|manual`, default `auto`; неизвестное значение в storage через `enumValues` трактуется как отсутствующее → `auto`); фильтры и сортировка ручной таблицы — локальный стейт `GtmManualContent` (не в sessionState — по разделу 1 ТЗ данные режимов не переживают переключение).
- **Fixtures/MSW**: новых MSW-хендлеров нет; в `GTMTab.test.tsx`/`GtmManualContent.test.tsx` остаётся фабричный мок `@/entities/files` → `useDownloadPattern`.
- **Test identifiers**: aria-labels из UI/selectors; ключ sessionStorage `GTMS_PLANNING_MODE`.
- **Out of scope**: интеграция API (сохранение планов/режима на сервер, загрузка файла на сервер, удаление бинарных файлов режимов по разделу 4 ТЗ, справочники скважин/видов ГТМ из API), клиентский xlsx-парсинг и реализация «Загрузить файл» (отложено пользователем до API), «Скачать шаблон» (уже работает через `useDownloadPattern`), замена глифов на svg, responsive <1280px, вкладки настроек вне ГТМ.

## Runtime

- `agent_config_check` (27.10.2026, перепроверен при аудите плана): `fresh: true`, `checked: []`, `missingModel: []`, `serverStartedAt: 2026-10-27T11:57:17.898Z` (инстанс перезапускался после первой записи — карта моделей не изменилась)
- `build` → `zai-coding-plan/glm-5.3`
- `coder` → `zai-coding-plan/glm-5.3-flash`
- `git-manager` → `zai-coding-plan/glm-5.3-flash`
- `plan` → `zai-coding-plan/glm-5.3`
- `tdd` → `zai-coding-plan/glm-5.3`
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`

## Git

- `branch`: текущая `km_feat/25039-model-settings` — новая не создаётся
- `base`: текущая ветка задачи 25039 (пользователь: «текущая»); переключения нет
- `tree`: `unknown` (shell недоступен в plan-режиме) — проверить `git status --porcelain` перед хендоффом; ожидаемо чистое, либо только новые файлы `ColumnFilter/*`
- `sync`: `off` — работа продолжается в текущей ветке задачи, sync с `test`/`main`/`develop` не выполняется
- `switch`: только через `git-manager` после явного подтверждения пользователя; `plan` git-команды не выполняет
- `commits`: `single` — один коммит на весь план (`feat: 25039 …`), по образцу соседних планов серии
- `commit/push`: только вручную через `git-manager` или подтверждённый close-out; push не выполняется
- `merge/MR`: вручную
- `initials`: `km`
- `task number`: `25039`
