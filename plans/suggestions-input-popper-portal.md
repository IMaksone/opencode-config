# Plan: SuggestionsInput — выпадающий список через портал (MUI Popper)

## Goal

Выпадающий список подсказок `SuggestionsInput` обрезается ячейкой таблицы в `GtmManualContent` (вкладка ГТМ, ручной ввод): список рендерится как `absolute` внутри DOM ячейки, а ячейка находится в цепочке из четырёх clip-контейнеров:

1. `<td>` — `overflow-hidden` (`src/shared/components/_ui/VirtualTable/VirtualTable.tsx:248`);
2. wrapper `BodyCellOfDataTable` — `overflow-hidden` (`src/shared/components/table/_ui/DataTables/_ui/StyledTable.tsx:158`);
3. `VirtualList` — `overflow-y-auto overflow-x-hidden` (`src/shared/components/_ui/_coreUi/VirtualList/VirtualList.tsx:87`);
4. контейнер `SimpleTable` — `overflow-x-auto` (`.../DataTables/variants/constants.ts:2`).

`z-50` не помогает: это clipping, а не стекинг. Решение (выбрано пользователем): рендерить список через **MUI `Popper`** (`@mui/material@6.4.0` уже в зависимостях) — портал в `document.body`, позиционирование `bottom-start` относительно обёртки инпута, авто-обновление позиции при скролле/resize и flip при нехватке места снизу. Пропсы компонента не меняются; все потребители (~9 мест, включая 7 поповеров с датами и `DictionaryInput`) получают фикс без изменений их кода.

## Affected files

- `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.tsx` — рендер `Suggestions` через `Popper`.
- `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx` — новый тест портала.

Затрагиваются поведенчески (код не меняется, проверяются существующими тестами): `DictionaryInput`, `GtmManualContent`, 7 поповеров (`ChooseRegimsWellContent`, `SelectDateContent`, `ChooseTopMapDateContent`, `ChooseMapDateContent`, `ChooseRegimsDateContent`).

## Tasks

### T1 SuggestionsInput: рендер списка подсказок в портале

- affected files:
  - `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.tsx`
  - `src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx`
- steps:
  1. Добавить тест «listbox рендерится в портале `document.body`, вне контейнера компонента»: `const { container } = render(<SuggestionsInput ... suggestionsVisible />)`, `const listbox = screen.getByRole('listbox')`, `expect(container.contains(listbox)).toBe(false)`, `expect(document.body.contains(listbox)).toBe(true)` — убедиться, что он красный (сейчас список внутри `container`).
  2. В `SuggestionsInput.tsx` импортировать `Popper` из `@mui/material/Popper` и `useState` из `react`.
  3. Завести anchor: `const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);` и повесить `ref={setAnchorEl}` на существующую обёртку `<div className="relative">` (null-safe паттерн для MUI: первый рендер с `suggestionsVisible=true` получает anchor после commit).
  4. Обернуть рендер `Suggestions` в `Popper`:
     ```tsx
     {!pending && !disabled && suggestionsVisible && anchorEl && (
       <Popper
         open
         anchorEl={anchorEl}
         placement="bottom-start"
         style={{ zIndex: 1300, width: anchorEl.offsetWidth }}
       >
         <Suggestions suggestions={suggestions} handleSelect={handleSelect} value={value} />
       </Popper>
     )}
     ```
  5. В компоненте `Suggestions` убрать из класса `<ul>` `absolute z-50 w-full` — позиционирование и ширину теперь задаёт `Popper`; оставить `bg-common_white border max-h-48 overflow-auto shadow`.
  6. Прогнать фокусные тесты, lint, typecheck.
- tests: новый тест портала (шаг 1); все 18 существующих тестов `SuggestionsInput.test.tsx` остаются зелёными без правок (они ищут `listbox`/опции через `screen.*` по всему документу — портал в body их не ломает); тесты `DictionaryInput` и `GtmManualContent` (выбор опции по `mousedown` из `screen.findByRole('option')`) — без изменений.
- verify:
  - `pnpm exec vitest run src/shared/components/_ui/inputs/SuggestionsInput/SuggestionsInput.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
  - `pnpm lint`
  - `pnpm typecheck`
  - Ручная проверка (по желанию): `pnpm run-dev` → страница проекта → Настройки → ГТМ → ручной ввод: список скважин виден за пределами ячейки и таблицы.

### G: git close-out

- steps: `git status --porcelain` — убедиться, что изменения ограничены файлами T1; неожиданные пути обсудить с пользователем.
- tree: план не коммитит (branch: none).
- verify: `git status --porcelain` вывод согласован с списком файлов T1.

## Risks

- **Ширина списка фиксируется при открытии** (`anchorEl.offsetWidth`): при живом resize ячейки ширина не обновится (позицию Popper пересчитает). Приемлемо: таблица не меняет ширину во время ввода.
- **z-index 1300** (уровень MUI modal): при открытом MUI `Popover` (z1300) список рендерится в body позже → поверх; tooltip'ы (1500) остаются выше списка.
- **happy-dom**: popper.js получает нулевые `getBoundingClientRect` — на asserts по role/тексту не влияет, но проверить, что ни один существующий тест не зависит от геометрии.
- **Все ~9 потребителей меняют поведение разом**: в поповерах дат список теперь выходит за пределы `Paper` (раньше мог обрезаться его `overflow-auto`). Регрессия маловероятна, контролируется существующими тестами этих поповеров + ручная проверка.
- **Поведение закрытия не меняется**: blur → закрытие через 150 мс, выбор по `mousedown` (успевает до закрытия), Escape — синхронно.
- **Дерево git не проверено планом**: shell в plan-режиме получил permission denied; tdd-агент обязан выполнить `git status --porcelain` перед стартом и остановиться на посторонних правках.

## Tests

TDD-порядок общий для плана:

1. Red: новый тест «listbox в портале `document.body`» падает (сейчас список внутри `container`).
2. Green: реализация T1 (Popper + правка класса `ul`).
3. Регресс: существующие сьюты `SuggestionsInput`, `DictionaryInput`, `GtmManualContent` зелёные без правок тестов.

Фокусные команды — в verify задачи T1.

## Contract data

- **Behavior**: при `suggestionsVisible && !pending && !disabled && anchorEl !== null` список `role="listbox"` рендерится через MUI `Popper` в `document.body`; ширина списка = ширине обёртки инпута; позиция `bottom-start` с авто-flip; закрытие по Escape (синхронно), blur (через 150 мс) и выбору опции (`mousedown`) — без изменений; пустой список показывает «Ничего не найдено» — без изменений.
- **API/types**: пропсы `SuggestionsInputProps` и публичный API модуля (`index.ts`) не меняются; новые пропсы не добавляются.
- **Errors**: без изменений (`error`, `helperText`, `pending`, `disabled`).
- **UI/selectors**: `ul[role=listbox]`, `li[role=option]`, `aria-selected` — без изменений; список больше не имеет классов `absolute z-50 w-full`.
- **State/URL**: без изменений (локальный `suggestionsVisible` у потребителей).
- **Fixtures/MSW**: не требуются.
- **Test identifiers**: новых data-атрибутов нет.
- **Out of scope**: правка `overflow-hidden` в `VirtualTable`/`StyledTable`/`VirtualList`/`SimpleTable`; рефакторинг `DictionaryInput`; другие инпут-компоненты (`DropDown`, `MultiSelectWithSearch`); смена библиотеки позиционирования.

## Runtime

`agent_config_check` (2026-10-27): `fresh: true`, `serverStartedAt: 2026-10-27T08:55:20.621Z`, `missingModel: []`.

- `plan` → `zai-coding-plan/glm-5.3`
- `tdd` → `zai-coding-plan/glm-5.3`
- `build` → `zai-coding-plan/glm-5.3`
- `coder` → `zai-coding-plan/glm-5.3-flash` (не используется)
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high` (не используется)
- `git-manager` → `zai-coding-plan/glm-5.3-flash` (не используется: branch none)

## Git

- `branch`: `none` (по выбору пользователя — без номера задачи и ветки).
- `base`: none; правки остаются в текущей ветке (имя определить при старте tdd через `git branch --show-current`).
- `tree`: `unknown` — shell в plan-режиме получил permission denied; tdd проверяет `git status --porcelain` первым шагом.
- `sync`: `off` — нет ветки, синхронизация не применима.
- `switch`: нет.
- `commits`: нет (branch: none); коммит при желании — вручную пользователем.
- `commit/push`: только вручную.
- `merge/MR`: только вручную.
- `initials`: `km` (из `local.md`).
- `task number`: отсутствует (branch none по выбору пользователя).
