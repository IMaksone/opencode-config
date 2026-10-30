# Plan: DropDown — выпадающее меню через портал (MUI Popper)

Status: closed (30.10.2026)

## Goal

Контент выпадающего меню `DropDown` рендерится как `absolute left-0 top-[65px] z-drop-down` внутри DOM-обёртки и обрезается overflow-контейнерами (ячейки/таблицы — та же проблема, что была у `SuggestionsInput`, см. план `suggestions-input-popper-portal.md`). Решение — паттерн `SuggestionsInput.tsx`: MUI `Popper` (`@mui/material@6.4.0` уже в зависимостях) — портал в `document.body`, авто-позиционирование с flip.

Позиционные оверрайды потребителей (`!left/!top/absolute`) при переходе на Popper дают двойное смещение поверх `transform`, поэтому заменяются аддитивными пропсами:

- `placement?: PopperPlacementType` (default `'bottom-start'`) — для обоих Headers: `bottom-end` (правое выравнивание меню, эквивалент сегодняшнего `!left-[-267px]` при ширине меню 307px и триггере ~40px);
- `matchAnchorWidth?: boolean` (default `false`) — поппер получает инлайн `style.width = anchorEl.offsetWidth` (паттерн `SuggestionsInput`) для `DropdownWells` и `DropdownWithCheckbox`, которым нужна ширина якоря.

Ширина меню по умолчанию — по контенту (как сегодня), НЕ `width: anchorEl.offsetWidth` всегда: иначе у Headers поппер шириной ~40px с контентом 307px вылезет вправо за экран.

z-index — `1300` (как в `SuggestionsInput`; уровень MUI modal, безопасно в портале у `document.body`).

## Affected files

- `src/shared/components/_ui/DropDown/DropDown.tsx` — рендер контента через `Popper`, новые пропсы.
- `src/shared/components/_ui/DropDown/DropDown.test.tsx` — тесты портала/placement/matchAnchorWidth.
- `src/widgets/common/Header/Header.tsx` — `placement="bottom-end"`, убрать `!left-[-267px] !top-[50px]`.
- `src/widgets/tables/ThisSpaceUsersTable/Header/Header.tsx` — то же.
- `src/widgets/wells/DropdownWells/DropdownWells.tsx` — `matchAnchorWidth`, убрать `absolute z-[2000] !top-[39px] w-[100%]` (остальные классы сохранить).
- `src/pages/ResultsPage/_ui/DropdownWithCheckbox/DropdownWithCheckbox.tsx` — `matchAnchorWidth`, убрать `!top-[35px] !w-full` (`!max-w-full` сохранить).
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.tsx` — убрать `!top-[18px]`.
- `src/shared/components/table/_ui/DataTables/_ui/StyledTable.tsx` (`FilterButton`) — убрать `!top-[18px]`.

Поведенчески затрагивается без правок кода: `src/pages/ProjectPage/_ui/TableMode/TableMode.tsx` (DropDown без оверрайдов — не меняется).

## Tasks

### T1 DropDown: рендер меню через MUI Popper + чистка позиционных оверрайдов потребителей

- affected files: все 8 из списка выше.
- steps:
  1. Red-тест в `DropDown.test.tsx`: «контент рендерится в портале вне контейнера компонента» — зеркало `SuggestionsInput.test.tsx:329`: `const { container } = render(<DropDown label="Menu" renderContent={() => <div>Panel</div>} />)`, открыть кликом по `Menu`, `expect(container.contains(screen.getByText('Panel'))).toBe(false)`, `expect(document.body.contains(screen.getByText('Panel'))).toBe(true)`. Убедиться, что красный (сейчас контент внутри `container`).
  2. Red-тесты: с `placement="bottom-end"` у корня поппера появляется атрибут `data-popper-placement="bottom-end"`; с `matchAnchorWidth` контейнер поппера получает инлайн-ширину (мок `vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(320)`, Assert `style.width === '320px'`). Если `data-popper-placement` в happy-dom не выставляется — заменить ассерт на проверку структуры/стилей по факту, решение фиксирует tdd-агент.
  3. В `DropDown.tsx`: импортировать `Popper` из `@mui/material/Popper` и тип `PopperPlacementType`; добавить пропсы `placement = 'bottom-start'`, `matchAnchorWidth = false`; anchor — `const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null)` + callback-ref на существующую обёртку триггера `<div>` (совмещён с `triggerRef`: `ref={(node) => { triggerRef.current = node; setAnchorEl(node); }}`).
  4. Контент рендерить как:
     ```tsx
     {opened && canOpen && anchorEl && (
       <Popper
         open
         anchorEl={anchorEl}
         placement={placement}
         style={{ zIndex: 1300, ...(matchAnchorWidth ? { width: anchorEl.offsetWidth } : {}) }}
       >
         <div ref={contentRef} className={contentClassNameInside}>
           {renderContent?.(opened, handleTrigger)}
         </div>
       </Popper>
     )}
     ```
  5. `contentClassNameInside`: убрать `absolute z-drop-down left-[0px] top-[65px]`; визуальные классы сохранить: `rounded-[5px] text-s border-default shadow-customDark p-2 max-h-[200px] max-w-[300px] overflow-auto bg-common_white flex flex-col` + `contentClassName`.
  6. Потребители (шаги 6а–6е) — обязательно в той же задаче, иначе промежуточное состояние ломает позиционирование:
     - оба Headers: добавить `placement="bottom-end"`, из `contentClassName` убрать `!left-[-267px] !top-[50px]` (остальное, включая `!w-[307px] max-w-[307px]`, сохранить);
     - `DropdownWells`: добавить `matchAnchorWidth`, из `contentClassName` убрать `absolute z-[2000] !top-[39px] w-[100%]` (`max-w-[871px] p-[10px] !bg-table_header_bg` сохранить);
     - `DropdownWithCheckbox`: добавить `matchAnchorWidth`, убрать `!top-[35px] !w-full` (`!max-w-full` и остальные классы сохранить);
     - `ColumnFilter` и `StyledTable/FilterButton`: убрать `!top-[18px]`.
  7. Прогнать фокусные тесты, lint, typecheck.
- tests: 2–3 новых теста (портал; placement; matchAnchorWidth); 12 существующих тестов `DropDown.test.tsx` — зелёные без правок (запросы через `screen.*` по всему документу, портал их не ломает; capture-слушатель внешнего клика на `document` работает и с порталом — `contentRef.current.contains` остаётся валидным); сьюты потребителей — зелёные без правок.
- verify:
  - `pnpm exec vitest run src/shared/components/_ui/DropDown/DropDown.test.tsx src/widgets/common/Header/Header.test.tsx src/widgets/tables/ThisSpaceUsersTable/Header/Header.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/_ui/ColumnFilter/ColumnFilter.test.tsx src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx src/shared/components/table/_ui/DataTables/_ui/StyledTable.test.tsx`
  - `pnpm lint`
  - `pnpm typecheck`
  - Ручная проверка (по желанию): `pnpm run-dev` → `http://localhost:3000` — меню хдера открывается вправо-выровненным (bottom-end); фильтры столбцов GTM/настроек видны за пределами ячейки; поиск скважин — шириной с панель; меню «Построить график» — по контенту.

### G: git close-out

- steps: `git status --porcelain` — изменения ограничены 8 файлами T1; ` M AGENTS.md` — посторонняя правка пользователя, в коммит задачи НЕ включать. Один коммит (single), вид `refactor: ...` по commitlint; без push.
- verify: `git status --porcelain` согласован со списком файлов T1; коммит не содержит `AGENTS.md`.

## Risks

- **Визуальные сдвиги позиционирования**: `bottom-start` ставит меню у нижней грани триггера (сегодня — `top-65px` от обёртки, потребители тюнили `!top`); возможны сдвиги на несколько px — ручная проверка. Flip при нехватке места снизу — новое поведение (меню переворачивается вверх).
- **Остаточные позиционные классы** (`!top/!left/absolute z-*`) у потребителей дают двойное смещение поверх transform поппера — поэтому правки потребителей входят в T1, а не отдельной задачей.
- **`w-[100%]`/`!w-full` в портале перестают означать ширину якоря** — заменены на `matchAnchorWidth`; пропуск замены даст меню шириной по контенту.
- **happy-dom**: popper.js получает нулевые `getBoundingClientRect` — на role/текст-ассерты не влияет (опыт `SuggestionsInput`); ассертов по геометрии не добавлять (кроме мока `offsetWidth`).
- **z-index 1300**: поверх контента и sticky-заголовков, под тултипами (~1500); внутри открытых MUI-диалогов корректно (портал добавляется позже в body).
- **`z-drop-down` (21) в `src/theme/layout.ts`** становится неиспользуемым классом — не трогаем (out of scope).
- **Скролл/resize**: поппер обновляет позицию по умолчанию — меню следует за триггером при скролле VirtualList (улучшение, не регрессия).
- **Поведение закрытия не меняется**: внешний клик (capture), `handleTrigger`, `canOpen`, `closeOnClickOutside`, `onChangeOpened` — как было.

## Tests

TDD-порядок общий для плана:

1. Red: портал-тест падает (контент сейчас внутри `container`).
2. Green: реализация T1 (Popper + пропсы + правки потребителей).
3. Новые тесты placement и matchAnchorWidth.
4. Регресс: `DropDown`, `Header` ×2, `ColumnFilter`, `GtmManualContent`, `StyledTable` — зелёные без правок тестов.

Фокусные команды — в verify задачи T1.

## Contract data

- **Behavior**: при `opened && canOpen && anchorEl !== null` контент рендерится через MUI `Popper` в `document.body`; позиция из `placement` (default `bottom-start`) с авто-flip; `matchAnchorWidth=true` → инлайн `width = anchorEl.offsetWidth`; открытие/закрытие (триггер, внешний клик, `canOpen`, `closeOnClickOutside`, `onChangeOpened`) — без изменений.
- **API/types**: `DropDownProps` + опциональные `placement?: PopperPlacementType` (default `'bottom-start'`) и `matchAnchorWidth?: boolean` (default `false`); обратная совместимость полная; публичный API модуля (`index.ts` → `export * from './DropDown'`) не меняется.
- **Errors**: нет изменений.
- **UI/selectors**: контент-див сохраняет визуальные классы (`rounded-[5px]`, `border-default`, `shadow-customDark`, `p-2`, `max-h-[200px]`, `max-w-[300px]`, `overflow-auto`, `bg-common_white`, `flex flex-col`); убраны только позиционные (`absolute z-drop-down left-[0px] top-[65px]`); у корня поппера появляется `data-popper-placement`.
- **State/URL**: без изменений (локальный `opened`).
- **Fixtures/MSW**: не требуются.
- **Test identifiers**: новых data-атрибутов нет.
- **Out of scope**: закрытие по Escape; `focused-background`/подложка; `Popover.tsx`; `MultiSelectWithSearch`; чистка zIndex-шкалы (`z-drop-down`) в теме; правка `TableMode`; смена библиотеки позиционирования.

## Runtime

`agent_config_check` (2026-10-28): **`fresh: false`** — изменён `AGENTS.md` после старта сервера (`serverStartedAt: 2026-10-27T14:42:12.814Z`); `missingModel: []`.

- `plan` → `zai-coding-plan/glm-5.3`
- `tdd` → `zai-coding-plan/glm-5.3`
- `build` → `zai-coding-plan/glm-5.3`
- `coder` → `zai-coding-plan/glm-5.3-flash` (не используется)
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high` (не используется)
- `git-manager` → `zai-coding-plan/glm-5.3-flash`

⚠️ Диспетчеризация `@tdd`/`@build` **BLOCKED** до перезапуска opencode-сервера (`fresh !== true`). После перезапуска повторить `agent_config_check` и убедиться, что `fresh: true`.

## Git

- `branch`: текущая `km_feat/25039-model-settings` — совпадает с задачей 25039, новая не нужна (по словам пользователя); переключения нет.
- `base`: не применим (ветка задачи уже существует и текущая).
- `tree`: ` M AGENTS.md` — посторонняя правка пользователя (не относится к задаче, остаётся в дереве).
- `sync`: `on`.
- `switch`: нет.
- `commits`: `single` — один коммит `refactor: ...` по всем файлам T1; коммит не включает `AGENTS.md` и не включает push.
- `commit/push`: вручную через `git-manager` или по подтверждённому close-out.
- `merge/MR`: только вручную.
- `initials`: `km` (из `local.md`).
- `task number`: `25039`.
