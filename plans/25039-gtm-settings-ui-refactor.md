# 25039 — Доработка новых интерфейсов SettingsMode: только UI-элементы проекта

Status: closed (30.10.2026)

## Goal

Рефакторинг новых интерфейсов вкладки «ГТМ» в `src/pages/ProjectPage/_ui/SettingsMode`: заменить сырые `<input>`, `<button>`, `<table>` и индивидуальные стили на существующие UI-элементы проекта (shared/ui-kit): `Button`, `TextInput`, `NumberInput`, `SuggestionsInput`, `DataTables.SimpleTable`. Новых UI-элементов не создавать. Поведенческие контракты (валидация строк, сортировка, вставка из Excel, disabled-режим, загрузка шаблона) сохранить.

Решения пользователя (2026-10-27):
- объём — только вкладка ГТМ (`GTMTab`, `GtmManualContent`, `GtmSemiAutoContent`, `DictionaryInput`, `PlannedCountInput`);
- «Дата ГТМ» — `TextInput` + иконка `calendar.svg` (через `labelAdornment`), ввод ДД.ММ.ГГГГ вручную;
- справочник (Скважина/Вид ГТМ) — `SuggestionsInput`;
- планируемые мероприятия — `NumberInput type="integer"` + новая опциональная пропса `onPaste` у общих инпутов (расширение API существующего элемента, не новый элемент);
- макет Figma не используется — рефакторинг существующего кода;
- задача 25039, новая ветка не нужна (работа в текущей ветке).

## Affected files

Общие инпуты (расширение API, аддитивно):
- `src/shared/components/_ui/inputs/inputs.types.ts`
- `src/shared/components/_ui/inputs/TextInput/TextInput.tsx`, `TextInput.test.tsx`
- `src/shared/components/_ui/inputs/NumberInput/NumberInput.tsx`, `NumberInput.test.tsx`
- `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.tsx`, `SuggestionsInput.test.tsx`

Потребители `SuggestionsInput` без своего `placeholder` и без `typeFilter` (получают явный `placeholder="ДД.ММ.ГГГГ"`, чтобы поведение не изменилось):
- `src/features/results/ChooseRegimsDateButtonWithPopover/_ui/ChooseRegimsDateContent/ChooseRegimsDateContent.tsx`
- `src/features/maps/ChooseMapDatePopover/_ui/ChooseMapDateContent/ChooseMapDateContent.tsx`
- `src/features/maps/ChooseTopMapDatePopover/_ui/ChooseTopMapDateContent/ChooseTopMapDateContent.tsx`

Вкладка ГТМ:
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.tsx`, `DictionaryInput.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput/PlannedCountInput.tsx`, `PlannedCountInput.test.tsx` (удалить)
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `GtmManualContent.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmSemiAutoContent/GtmSemiAutoContent.tsx`

Не трогать: `SettingsField`, `SettingsTabs`, `NavigationBtn`, `Tooltip`, `GlobalTab`, `PVTTab`, `GFXTab`, `CalcTab`, хелперы `helpers/manualRows.ts`, `helpers/plannedCounts.ts` (контракты сохраняются), TODO(25039) заглушки сохранения/импорта.

## Tasks

### T1 Расширить общие инпуты: `ariaLabel`, `onPaste`, `disabled`/`error` для SuggestionsInput

- affected files: `inputs.types.ts`, `TextInput.tsx`, `NumberInput.tsx`, `SuggestionsInput.tsx` + их тесты
- steps:
  1. `InputProps` (`inputs.types.ts`): добавить `ariaLabel?: string` и `onPaste?: React.ClipboardEventHandler<HTMLInputElement>`.
  2. `TextInput`: пробросить `ariaLabel` и `onPaste` в `slotProps.htmlInput` (объединить с существующим `slotProps.input` для `endText`); внешний `error` должен давать error-состояние поля: `error={!!error || !!errorProp}` (сейчас рамка горит только от внутренней ошибки).
  3. `NumberInput`: аналогично объединить `ariaLabel`/`onPaste` с уже используемым `slotProps.htmlInput.inputMode`; error-состояние — по тому же правилу, что и TextInput.
  4. `SuggestionsInput`: добавить аддитивные пропсы `disabled?`, `ariaLabel?`, `error?`, `helperText?`, `onPaste?` и пробросить в `TextInput`; `disabled={disabled || pending}`; список подсказок сделать доступным: `ul role="listbox"`, `li role="option"` (+ `aria-selected`); дефолтный плейсхолдер применять только когда задан `typeFilter` (`REGIMS` → `'MM.ГГГГ'`, иначе `'ДД.ММ.ГГГГ'`), без `typeFilter` плейсхолдер не подставлять; закрытие панели по `Escape` перенести внутрь компонента (`onKeyDown` у `TextInput` → `setSuggestionsVisible(false)`), чтобы поведение не зависело от обёртки.
  5. Удаление хака ломает вид трёх потребителей (проверено grep: своего `placeholder` нет, `typeFilter` нет): `ChooseRegimsDateContent`, `ChooseMapDateContent`, `ChooseTopMapDateContent` — передать им `placeholder="ДД.ММ.ГГГГ"` явно. `ChooseRegimsWellContent` передаёт свой `placeholder`, `SelectDateContent` — `typeFilter`, их не трогать.
  6. Обновить тесты этих потребителей только если они ищут поле по плейсхолдеру: текст не меняется, меняется источник значения.
- tests: дополнить `TextInput.test.tsx`, `NumberInput.test.tsx`, `SuggestionsInput.test.tsx`: aria-label из `ariaLabel`, вызов `onPaste` с `preventDefault`, error-состояние по внешнему `error`, `disabled` у SuggestionsInput, роли `listbox`/`option`, отсутствие плейсхолдера без `typeFilter` и без `placeholder`, закрытие панели по `Escape`.
- verify: `pnpm exec vitest run src/shared/components/_ui/inputs src/features/results/ChooseRegimsDateButtonWithPopover src/features/maps && pnpm typecheck`

### T2 GtmSemiAutoContent: PlannedCountInput → NumberInput + onPaste, удалить PlannedCountInput

- affected files: `GtmSemiAutoContent.tsx`, `PlannedCountInput/` (удалить), `GTMTab.test.tsx`
- steps:
  1. В `GtmSemiAutoContent` заменить `PlannedCountInput` на `NumberInput type="integer"`: `value={Number(cell) || 0}`, `setValue: value => setPlannedValue(rowIndex, String(value))` (состояние `planned` остаётся `string[]`, хелперы `plannedCounts.ts` не менять — иначе падает typecheck), `ariaLabel={String(row[1])}`, `disabled`, `onPaste` — `e.preventDefault()` + `setPastedValues(rowIndex, parseClipboardCounts(e.clipboardData.getData('text')))`.
  2. Удалить `_ui/PlannedCountInput` (компонент и тест); перенести его сценарии (вставка диапазона, значения за пределами строк, aria-label) в `GTMTab.test.tsx` — покрытие вставки там уже частично есть.
  3. Адаптировать semi-auto секцию `GTMTab.test.tsx` под новую семантику NumberInput (см. Contract data).
- tests: `GTMTab.test.tsx` (semi-auto): рендер 10 инпутов со значением '0', ввод числа пересчитывает «Суммарно планируемых мероприятий», paste '5\n3\n7' распределяет по строкам, обрезка за последней строкой, disabled. Старые сценарии «отбрасывание не-цифр» заменяются сценарием ошибки NumberInput («Поле принимает только целые числа»).
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode && pnpm typecheck`

### T3 DictionaryInput → тонкая обёртка над SuggestionsInput

- affected files: `DictionaryInput/DictionaryInput.tsx`, `DictionaryInput.test.tsx`, `GTMTab.const.ts`
- steps:
  1. Переписать `DictionaryInput` как обёртку над `SuggestionsInput`: локально держать `suggestionsVisible`; `suggestions` = фильтр `options` по `value` с правилом D12 (0 совпадений → весь справочник) в виде `{ original, display }`; `handleSelect` → `setValue(original)` **и синхронный `setSuggestionsVisible(false)`** (иначе панель живёт до blur-таймера 150 мс и тест «закрывается после выбора» становится рэйс-зависимым); `pending={false}` (проп обязательный у `SuggestionsInput`); `error`/`errorMessage` через пропсы `error`/`helperText`; `ariaLabel`/`disabled` пробросить. Свой `<input>`, панель, кнопка «Показать варианты», `panelWidth` и локальные классы удаляются.
  2. Удалить из `GTMTab.const.ts` ставшие неиспользуемыми `GTM_MANUAL_SUGGESTIONS_TITLE`, `GTM_MANUAL_SUGGESTIONS_EMPTY` (панель SuggestionsInput не имеет заголовка и показывает «Ничего не найдено» сама).
  3. Адаптировать `DictionaryInput.test.tsx` к DOM SuggestionsInput: остаются роли `textbox`/`listbox`/`option`; удаляются тесты на кнопку «Показать варианты», заголовок панели и класс ширины `w-[305px]`; проверка error-рамки — по error-состоянию TextField, а не по классу `border-[#ff6b6b]`.
- tests: `DictionaryInput.test.tsx`: значение из пропса, фильтрация подсказок, показ всего справочника при 0 совпадений, выбор опции (mousedown), закрытие панели после выбора, закрытие по `Escape` (существующий сценарий сохраняется — его обеспечивает `SuggestionsInput` из T1), ошибка «не найдено в справочнике» и её снятие, disabled (поле и список закрыт).
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput && pnpm typecheck`

### T4 GtmManualContent: таблица → DataTables.SimpleTable, кнопки → Button, дата → TextInput

- affected files: `GtmManualContent/GtmManualContent.tsx`, `GtmManualContent.test.tsx`, `GTMTab.const.ts`, `GTMTab.test.tsx`
- steps:
  1. `GTMTab.const.ts`: `GTM_MANUAL_TABLE_COLUMNS` заменить на заголовок для SimpleTable: `HeaderElementOfDataTable[][]` c `style: { percentWidth: ... }` (4/30/30/30/6) и `sortable: true` для колонок 1–3 («Скважина», «Вид ГТМ», «Дата ГТМ»).
  2. Таблица: `DataTables.SimpleTable` (`virtualization={false}`) с `onSort` и `renderBodyCell`. `SimpleTable` принимает только `(string | number)[][]`, поэтому `data={displayedRows.map((row, index) => [index + 1, row.well, row.gtmType, row.date])}` (номер строки считается по видимому порядку), а в `renderBodyCell` строка восстанавливается по `rowIndex`: `const manualRow = displayedRows[rowIndex]` — `rowIndex` приходит как индекс в текущем массиве `data`, поэтому `visibleIds` и снапшот порядка сохраняются. Ячейки: колонка 0 — номер строки; 1–2 — `DictionaryInput`; 3 — `TextInput` (`placeholder` ДД.ММ.ГГГГ, `error` = `errors.date` — текст ошибки выводится штатным `helperText`, отдельный `<span>` убирается, `labelAdornment` = `Image type="svg" name="calendar.svg"`); 4 — `Button variant="minimal" iconName="deleteUser.svg"` c `aria-label` «Удалить строку N». Пересоздание массива `data` на каждом рендере сбрасывает внутреннее состояние `SortSwitcher` (стрелка не отражает направление) — порядок строк держит `visibleIds`, это принято.
  3. `onSort`: первым делом `if (disabled) return;` (у `SortSwitcher` нет своего disabled); далее `sortDirection: ''` (третий клик по `NEXT_SORT_TYPE`) → `setSort(null)` и `setVisibleIds(null)`, то есть возврат к исходному порядку; `ascending`/`descending` → `sortManualRows(rows, column, 'asc' | 'desc')` и снапшот `visibleIds`. Поведение «порядок сохраняется после правки» не меняется.
  4. Кнопки «Загрузить файл»/«Скачать шаблон»/«Очистить таблицу» → `Button variant="default"` с `iconName` (`loadData.svg`, `download.svg`, `del.svg`) и явным `aria-label` (иконка добавляет «button» в accessible name). Скрытый `<input type="file">` оставить по паттерну `UploadLocalFileButton` (это инфраструктура, не UI-элемент); `handleFileChange` остаётся заглушкой TODO(25039).
  5. Удалить локальные классы-константы (`UPLOAD_BUTTON_CLASS`, `CELL_CLASS`, `DATE_INPUT_CLASS`, `DATE_INPUT_ERROR_CLASS` и пр.); кнопки «Добавить строку»/«Сохранить» остаются на `Button` (уже есть).
  6. Адаптировать `GtmManualContent.test.tsx` и `GTMTab.test.tsx` (manual-секция) к новому DOM (см. Contract data). Учесть: при пустой таблице `SimpleTable` рендерит строку «Нет данных» с `<td>`, которая попадает в `getByRole('cell')` — тест «очистка таблицы» проверяет отсутствие полей и наличие заголовков, а не число ячеек.
- tests: сохранить все текущие сценарии `GtmManualContent.test.tsx`: стартовая пустая строка, добавление/удаление/очистка, ошибки справочника и даты с влиянием на canSave/hint, сортировка по дате с реверсом, третьим кликом — возврат исходного порядка, и сохранением порядка после правки, `downloadPattern('gtm', 'Шаблон ГТМ')`, disabled-режим (порядок не меняется при клике по сортировке), рендер блоков загрузки/таблицы/подсказки. Селекторы — по Contract data.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode && pnpm lint && pnpm typecheck && pnpm test`

### G: git close-out

- affected files: нет (только git)
- steps: проверить `git status --porcelain` (дерево; в plan-режиме shell был недоступен — статус неизвестен), сгруппировать изменения по задачам, коммиты conventional-стилем per-task (см. Git), push и MR — только вручную по подтверждению.
- tests: manual check
- verify: `git status --porcelain`

## Risks

- **Семантика NumberInput ≠ PlannedCountInput**: не-цифры теперь дают ошибку «Поле принимает только целые числа» вместо тихого отбрасывания; пустое поле → `0` вместо `''`. Контракт меняется осознанно (решение пользователя), тесты обновляются.
- **SortSwitcher в DataTables** — это `div role="presentation"` без disabled: в disabled-режиме кнопки сортировки не блокируются визуально. Гвард «не сортировать при disabled» делается в `onSort`; сценарий «disabled sort buttons» заменяется на «порядок не меняется».
- **Accessible name заголовков** sortable-колонок в SimpleTable включает `alt="rotate"` иконки ArrowButton → точные `getByRole('columnheader', { name })` заменяются regex-матчем.
- **Error-рамка TextInput по внешнему `error`** затрагивает всех, кто передаёт `error`: `SettingsField` (error-строки из RHF) и `StartCalcContent` (`NumberInput error={forecastPeriodError}`). Оба получат красную рамку — это улучшение, но вне скоупа ГТМ; проверить `SettingsField.test.tsx` и `StartCalcContent` при `pnpm test` (тесты проверяют текст ошибки, а не стили — ожидаемо зелёные).
- **SuggestionsInput используют шесть мест**: `features/wells/ChooseRegimsWellContent` (свой `placeholder`), `features/tableMode/SelectDateContent` (`typeFilter`), `features/results/ChooseRegimsDateContent`, `features/maps/ChooseMapDateContent`, `features/maps/ChooseTopMapDateContent` (без того и другого — им `placeholder` добавляется явно в T1). Все изменения пропсов аддитивные; дефолт по `typeFilter` сохраняется.
- **Иконка даты через `labelAdornment`** рендерится абсолютно в правом верхнем углу обёртки (на уровне лейбла), а не как trailing-иконка внутри поля — визуально отличается от текущего «▣». Если по макету иконка должна быть внутри поля, использовать механизм `endText`/`endAdornment` вместо `labelAdornment`.
- **Визуал таблицы** меняется со кастомных стилей на стандартные стили DataTables — это цель рефакторинга, но отличается от текущего отображения.
- **git-статус неизвестен** (shell недоступен в plan-режиме): tdd обязан проверить дерево перед стартом и остановиться при посторонних изменениях.
- **Гигиена планов**: в `.opencode/plans/` кроме этого плана лежат черновики `25039-gtm-manual-layout.md`, `25039-gtm-semi-auto-layout.md`, `25039-plan-tdd-tasks.md` и посторонние `foreground-only-plugin.md`, `opencode-v2-config-migration.md`. По правилу «один открытый план» их нужно удалить/архивировать вручную до старта `tdd` (плановый режим файлы не удаляет).

## Tests

TDD-порядок (единый для плана, тесты правятся до/вместе с кодом по задачам): T1 (инпуты) → T2 (semi-auto) → T3 (DictionaryInput) → T4 (manual) → G.

Фокус-команды:
- `pnpm exec vitest run src/shared/components/_ui/inputs`
- `pnpm exec vitest run src/features/results/ChooseRegimsDateButtonWithPopover src/features/maps`
- `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode`
- финал T4: `pnpm test` (полный прогон, в т.ч. `SettingsField.test.tsx`)

## Contract data

- **Поведение (сохраняется)**: старт ручного режима с одной пустой строкой; добавление/удаление/очистка строк; `validateManualRow`/`isRowComplete`/`sortManualRows` без изменений; правило D12 (0 совпадений фильтра → весь справочник); canSave-гвард и подсказка «Сохранение недоступно при наличии ошибок»; сортировка по колонкам 1–3 с реверсом и снапшотом порядка (`visibleIds`) после правки ячейки; вставка из Excel распределяет значения вниз от активной строки, лишние отбрасываются; «Суммарно планируемых мероприятий» пересчитывается; `downloadPattern('gtm', 'Шаблон ГТМ')`; в disabled-режиме всё заблокировано, панель подсказок закрыта, переключение режимов не срабатывает; заглушки TODO(25039) (`handleSave`, импорт xlsx) остаются.
- **Поведение (меняется, согласовано)**: `NumberInput` вместо `PlannedCountInput` (ошибка вместо отбрасывания не-цифр; пустое → 0); сортировка через SortSwitcher DataTables (guard disabled в `onSort`); третий клик по сортируемой колонке (`NEXT_SORT_TYPE` → `''`) сбрасывает сортировку и возвращает исходный порядок (`sort = null`, `visibleIds = null`); панель подсказок без заголовка «Возможные варианты» и без кнопки «Показать варианты» (открытие по фокусу), закрывается синхронно после выбора и по `Escape`; плейсхолдер `SuggestionsInput` берётся только из `placeholder` или `typeFilter` — трём потребителям `features/results|maps` он передаётся явно, их поведение не меняется.
- **API/типы**: `InputProps` += `ariaLabel?: string`, `onPaste?: React.ClipboardEventHandler<HTMLInputElement>`; `SuggestionsInputProps` += `disabled?`, `ariaLabel?`, `error?`, `helperText?`, `onPaste?` и внутренняя обработка `Escape` (`pending` остаётся обязательным пропом — обёртка передаёт `false`); `GTM_MANUAL_TABLE_COLUMNS` → `GTM_MANUAL_TABLE_HEADER: HeaderElementOfDataTable[][]` (`style.percentWidth`, `sortable` у колонок 1–3); константы `GTM_MANUAL_SUGGESTIONS_TITLE`/`GTM_MANUAL_SUGGESTIONS_EMPTY` удаляются.
- **UI/селекторы тестов**: инпуты — `getByRole('textbox', { name: 'Скважина, строка N' | 'Вид ГТМ, строка N' | 'Дата ГТМ, строка N' })` (через `ariaLabel`); опции — `getByRole('listbox')` + `getByRole('option')` (роли добавлены в SuggestionsInput); кнопки — `getByRole('button', { name })` с явным `aria-label` у Button с иконками; удаление строки — кнопка «Удалить строку N»; сортировка — клик по иконке ArrowButton внутри `columnheader` (regex-поиск заголовков), третий клик проверяется по возврату исходного порядка; текст ошибок справочника и даты ищется `getByText(...)` независимо от того, что теперь это `helperText` TextField; таблица — `getByRole('table')`, строки/ячейки через роли SimpleTable; при пустых данных SimpleTable добавляет строку «Нет данных» с `<td>` — не считать её строкой данных; totals — текстовые узлы «Всего строк: N», «Всего видов ГТМ: …», «Суммарно …».
- **Fixtures/MSW**: мок `useDownloadPattern` из `@/entities` (как в текущих тестах); данные строк/справочники — из `GTMTab.const` (`GTM_TABLE_ROWS`, `GTM_WELL_NAMES`, `GTM_TYPE_NAMES`), литералы не дублировать.
- **Out of scope**: API сохранения программы ГТМ и импорта xlsx (TODO 25039); `SettingsTabs`/`NavigationBtn`/локальный `Tooltip`/`PVTTab`-подвкладки; макеты Figma; новые shared-компоненты.

## Runtime

- `plan` → `openrouter/xiaomi/mimo-v2.6-pro`
- `tdd` → `openrouter/z-ai/glm-5.3`
- `build` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`
- `agent_config_check`: `fresh: true`, `missingModel: []` (инструмент доступен)
- `serverStartedAt`: 2026-10-27T07:05:18.888Z (перепроверено при ревью плана; `fresh: true`, `missingModel: []`)

## Git

- `branch`: `none` — новая ветка не нужна, работа в текущей ветке (по указанию пользователя).
- `base`: текущая ветка (имя пользователем не названо; git-команды в plan-режиме недоступны — фактическое имя фиксирует tdd при подготовке).
- `tree`: `unknown` (shell недоступен в plan-режиме; tdd проверяет `git status --porcelain` перед стартом и останавливается при посторонних изменениях).
- `sync`: `on`.
- `switch`: не требуется (новая ветка не создаётся).
- `commits`: `per-task` (T1..T4 отдельными коммитами; G — close-out). Push не входит в коммит.
- `commit/push`: вручную через `git-manager` или подтверждённый close-out.
- `merge/MR`: вручную.
- `initials`: `km`; `task number`: `25039`.
