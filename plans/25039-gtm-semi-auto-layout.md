# 25039 — вёрстка режима «Полуавтоматическое» вкладки «ГТМ» (`ProjectPage/SettingsMode`)

Status: ready (ревизия 26.10.2026: формат `Tasks`, свежий `Runtime`, решения по отклонениям от макета). Not executed. Hand off only to `@tdd`.

- Task: `25039`
- Branch: `none` — работа продолжается в текущей `km_feat/25039-model-settings`, новая ветка не создаётся
- Base: `none` — пользователь указал «ветку создавать не нужно, работаем в этой»; переключения и синка нет (см. «Подтверждения перед хендоффом»)
- Initials: `km`
- Макет: Figma `25:329` («Полуавтоматический»), дамп `.tmp/figma/XiCgM835YJ2jKJ6r2M1g7C-25-329.{json,md,png}`
- Предыдущий план по макету `22:100`: `.tmp/plans/25039-gtm-settings-tab.md` (реализован; новый план его дополняет, не переписывает)

## Runtime

- `agent_config_check` от 26.10.2026, `serverStartedAt` `2026-10-26T12:48:22.487Z`: `fresh=true`, `checked=[]`, `missingModel=[]`. Блокировок нет.
- Карта агентов: `build` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`, `coder` → `…deepseek-v4.1-flash-1017#low`, `git-manager` → `…deepseek-v4.1-flash-1017#low`, `plan` → `openrouter/xiaomi/mimo-v2.6-pro`, `tdd` → `openrouter/z-ai/glm-5.3`, `test-generator` → `…deepseek-v4.1-flash-1017#high`.
- Предыдущая редакция раздела ссылалась на инстанс `2026-10-26T08:15:32.744Z` (устарел); значения перезамерены, выводы не изменились.

## Goal

Довести вкладку «ГТМ» в `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab` до макета Figma `25:329` в режиме **«Полуавтоматическое»**:

- таблица из 4 колонок (`# / Вид ГТМ / Количество фактических мероприятий / Количество планируемых мероприятий`), последняя колонка — числовые инпуты (по умолчанию `0`), без синей подсветки строк;
- справа от таблицы карточка «Вставка из Excel» (пунктирная рамка) с инструкцией; вставка из буфера распределяет числа по строкам вниз от активной;
- под таблицей ряд из трёх итогов («Всего видов ГТМ», «Суммарно фактических мероприятий», «Суммарно планируемых мероприятий» — считается от инпутов) и красная кнопка «Сохранить» (заглушка: API планирования ГТМ нет);
- в этом режиме радио-ряд без иконок «i» (тултипов), инфо-блок — только описание режима (без заметки про синие строки);
- иконку инфо-блока привести к макету (белый круг с синей рамкой и синей «i»);
- текст описания «Полуавтоматическое» заменить на финальный из макета (снять provisional-TODO).

Режим «Автоматическое» остаётся как реализовано по `22:100` (тултипы, заметка, синие строки, 3 колонки), «Ручное» не трогаем — макета нет.

Почему инпут нативный, а не `NumberInput`: `NumberInput`/`TextInput` обёрнуты в ui-kit `TextField variant="filled-with-label"` с лейблом и не рассчитаны на компактную ячейку 240×29 с центрированным текстом и прямым `onPaste`. Кнопка — готовый `Button` (`variant="defaultSubmit"`), не нативный `<button>`.

## Affected files

### New

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput/PlannedCountInput.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput/PlannedCountInput.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput/index.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmSemiAutoContent/GtmSemiAutoContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmSemiAutoContent/index.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/plannedCounts.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/plannedCounts.test.ts`

### Edit

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`

### Not changed

- `SettingsMode.tsx`, `SettingsForm.tsx`, `SettingsField`, `NavigationBtn`, вкладки настроек, `ModelSettings` и API/RTK Query.
- `GTMTab.types.ts` (`GtmPlanningMode` без изменений), `GTMTab/index.ts`.
- Shared-таблица (`SimpleTable`/`StyledTable`/`VirtualTable`) — хватает существующих props: `headerData[][].style.percentWidth`, `renderBodyCell`, `virtualization`.
- Разметка режимов «Автоматическое» (3 колонки, синие строки, заметка, вертикальные итоги) и «Ручное».
- `SettingsMode.test.tsx` (проверяет ГТМ только в режиме `auto`), `SimpleTable.test.tsx`, `common.test.ts`.

## Решения по отклонениям от макета

Проверено по дампу `.tmp/figma/XiCgM835YJ2jKJ6r2M1g7C-25-329.md/.json`.

| # | Отклонение | Что делаем |
|---|---|---|
| D1 | В макете строка «таблица + карточка» шире остальных блоков: таблица 1395 + 17 + карточка 205 = **1617** при инфо-блоке 1395 (карточка «свисает» правее). | Реализуем `flex … w-full`: таблица сжимается на ~221 px (колонки — проценты 4/27/37/32, колонка 4 ≈ 376 px вместо 448, инпут фиксированные 240 px всё равно влезает). Переполнение строки за контейнер отклонено (ломает сетку таба). |
| D2 | Иконка инфо-блока: `22:100` — 30×30, stroke `#5D7EEA`, «i» 18 px `#496BD6`; `25:329` — 28×28, stroke `#3478D4`, «i» 17 px/400. | Унифицируем по актуальному `25:329` (28×28, `#3478D4`, 17 px/400) для всех режимов. Отклонение для `auto` фиксируем; попиксельная верность `22:100` — вне задачи. |
| D3 | Фон/рамка инфо-блока: `25:329` — `#F7FAFF`/`#C8DAF7`; код — `#F6F9FF`/`#CBDCF8` (совпадает с `22:100`). | Оставляем как есть. Расхождение 1–3 единицы в канале не воспроизводим. |
| D4 | Итоги в макете начинаются на 2 / 452 / 1016 px от левого края таблицы (≈0.1 % / 32.4 % / 72.8 %), а не по границам колонок. | `grid-cols-[32%_41%_27%]` — старты 0 / 32 % / 73 % повторяют макет (третий итог на ~72.8 %, а не на 68 % по границе 4-й колонки). |
| D5 | Кнопка «Сохранить» в макете 160×45 при x=552, колонка карточки 544 → смещена на 8 px, не по центру. | Правая колонка `w-[205px] shrink-0 flex justify-start pl-[8px]`. |
| D6 | `ComponentWrapper` бросает исключение при дубле `componentId` между разными компонентами. | Таблица semi-auto получает `gtm-table-semi-auto`; `gtm-table` остаётся у режимов `auto`/`manual`. |

## Tasks

### T1 Тексты и константы + helper распределения чисел

- affected files: `GTMTab/GTMTab.const.ts`, `GTMTab/helpers/plannedCounts.ts`, `GTMTab/helpers/plannedCounts.test.ts`, `GTMTab/GTMTab.test.tsx` (только константа `SEMI_AUTO_DESCRIPTION`)
- steps:
  1. `GTMTab.const.ts`: `GTM_MODE_OPTIONS.semiAuto.description` → финальный текст макета, `TODO(25039)` снять: `В полуавтоматическом режиме пользователь задает количество планируемых мероприятий по каждому виду ГТМ, на основании которого система автоматически определяет скважины и даты их проведения.` У `manual` provisional-текст и TODO остаются (макета нет).
  2. `GTM_TABLE_HEADER_SEMI_AUTO`: 4 колонки с `style: { percentWidth }` (паттерн `SpaceUsersTable`): `#` → 4, `Вид ГТМ` → 27, `Количество фактических мероприятий` → 37, `Количество планируемых мероприятий` → 32 (пропорции макета 57/372/518/448 px из 1395).
  3. `GTM_EXCEL_CARD_TITLE = 'Вставка из Excel'`.
  4. `GTM_EXCEL_CARD_TEXT = 'Выделите диапазон ячеек в Excel с числами, скопируйте (Ctrl+C) и вставьте (Ctrl+V) в столбец «Количество планируемых мероприятий». Значения будут распределены по строкам.'` (один параграф; переносы макета — артефакт ширины карточки).
  5. `helpers/plannedCounts.ts`: `parseClipboardCounts(text: string): string[]` — split `/\r?\n|\t/`, trim, оставить только `/^\d+$/`; пустые/невалидные элементы пропускаются и строку не занимают. `sumPlannedCounts(values: string[]): number` — сумма `Number(v)` (`''` → 0).
  6. `GTMTab.test.tsx`: `SEMI_AUTO_DESCRIPTION` заменить на финальный текст — иначе кейс «switches the selected radio and the info block text on mode change» станет красным после шага 1 (дерево должно остаться зелёным внутри задачи).
- tests: `helpers/plannedCounts.test.ts` — red до реализации: `parseClipboardCounts('5\n3\n7')` → `['5','3','7']`; `'1\t2\r\n3'` → `['1','2','3']`; `'a\n-1\n1.5\n\n 7 '` → `['7']`; `sumPlannedCounts(['5','3',''])` → `8`; `sumPlannedCounts([])` → `0`. Существующий `GTMTab.test.tsx` — регресс-гард, зелёный.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`, `pnpm lint`, `pnpm typecheck`

### T2 `PlannedCountInput`

- affected files: `GTMTab/_ui/PlannedCountInput/PlannedCountInput.tsx`, `…/PlannedCountInput.test.tsx`, `…/index.ts`
- steps:
  1. Нативный контролируемый `<input type="text" inputMode="numeric">` (не `NumberInput`/`TextInput`, см. Goal): `w-[240px] h-[29px] rounded-[4px] border border-[#D9DFE7] bg-white text-center text-m text-[#151515] disabled:opacity-50` (макет 240×29, рамка `#D9DFE7`, текст 16 px по центру).
  2. Props: `value: string`, `setValue(value: string)`, `onPasteValues(values: string[])`, `disabled?: boolean`, `ariaLabel?: string` → `aria-label` (доступное имя из названия вида ГТМ, используется в селекторах).
  3. Ввод: санитайзер `/^\d*$/` (пустая строка допустима).
  4. `onPaste`: `event.preventDefault()` → `parseClipboardCounts(event.clipboardData.getData('text'))` → `onPasteValues(values)`; в сам инпут ничего не попадает.
- tests: рендер значения; ввод нецифр отбрасывается (`'1a2'` → `'12'`); пустая строка допустима; `paste` → `onPasteValues` вызван с `['5','3']`, `value` не изменился; `disabled` — инпут disabled. Паста — через хелпер `pasteInto` из раздела Tests.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput`, `pnpm lint`, `pnpm typecheck`

### T3 `GtmSemiAutoContent` и свитч режимов в `GTMTab`

- affected files: `GTMTab/_ui/GtmSemiAutoContent/GtmSemiAutoContent.tsx`, `…/index.ts`, `GTMTab/GTMTab.tsx`, `GTMTab/GTMTab.test.tsx`
- steps:
  1. `GtmSemiAutoContent` владеет planned-состоянием: `useState<string[]>(() => GTM_TABLE_ROWS.map(() => '0'))`; `totalPlanned = useMemo(() => sumPlannedCounts(planned), [planned])`; `rowsWithPlanned = useMemo(() => GTM_TABLE_ROWS.map((row, i) => [...row, planned[i] ?? '0']), [planned])`. Критично: строки 4-элементные — `StyledTable` подменяет `undefined`/`IGNORED_VALUES` на `'-'` и теряет `renderBodyCell`-инпут (пустая строка `''` не игнорируется).
  2. Обёртка «таблица + карточка»: `flex items-center gap-x-[16px] w-full` (`items-center` даёт смещение карточки вниз ~81 px против 75 px в макете — принято, см. D1).
  3. Таблица: `ComponentWrapper componentId="gtm-table-semi-auto"` + `DataTables.SimpleTable` с `headerData={GTM_TABLE_HEADER_SEMI_AUTO}`, `data={rowsWithPlanned}`, `virtualization={false}`, без `getBodyCellClassName` (подсветки нет).
  4. `renderBodyCell`: `cellIndex === 3` → `<div className="flex justify-center"><PlannedCountInput … ariaLabel={String(row[1])} /></div>`, паста пишет `values` в `planned` начиная с `rowIndex`, лишние значения за последней строкой отбрасываются; иначе `<div className={cellIndex === 1 ? 'text-left' : 'text-center'}>{String(cell)}</div>`.
  5. Карточка Excel: `w-[205px] shrink-0 rounded-[5px] border border-dashed border-[#9AA8BA] p-[16px] flex flex-col gap-y-[12px]` (пунктир `strokeDashes:[5,4]` в JSON); заголовок `GTM_EXCEL_CARD_TITLE` — `font-bold text-m`; текст `GTM_EXCEL_CARD_TEXT` — `text-sm leading-[22px]`.
  6. Ряд итогов и кнопка: `flex items-center gap-x-[16px]`; слева `flex-1 grid grid-cols-[32%_41%_27%]` (D4) — три цельных текстовых узла: `` `Всего видов ГТМ: ${GTM_TOTAL_TYPES}` ``, `` `Суммарно фактических мероприятий: ${GTM_TOTAL_MEASURES}` ``, `` `Суммарно планируемых мероприятий: ${totalPlanned}` ``; справа `w-[205px] shrink-0 flex justify-start pl-[8px]` (D5) — `Button` из `@/shared/components`, `variant="defaultSubmit"`, `text="Сохранить"`, `className="!w-[160px] justify-center"`, `onClick` — заглушка с `TODO(25039)` (API сохранения программы ГТМ отсутствует), `disabled` из `SettingsFormContext`. `!` обязателен: `Button` склеивает классы через `clsx` (без `twMerge`) и `w-fit` из варианта конкурирует с `w-[160px]`.
  7. `GTMTab.tsx`: `mode === 'semiAuto' ? <GtmSemiAutoContent /> : <текущий JSX (auto/manual)>`; тултипы у радио рендерить только при `mode !== 'semiAuto'`; `GTM_TABLE_NOTE` скрывать при `mode === 'semiAuto'` (для `auto`/`manual` оставить).
  8. `GTMTab.tsx`: иконка инфо-блока вместо залитой `bg-[#CBDCF8]` → `w-[28px] h-[28px] rounded-full bg-white border border-[#3478D4] text-[#3478D4] text-[17px] leading-none font-normal` с «i» (D2).
  9. `GTMTab.test.tsx`: новые кейсы semiAuto (см. Tests), существующие кейсы `auto` — без правок.
- tests: в `GTMTab.test.tsx` после клика по радио «Полуавтоматическое»: колонка `Количество планируемых мероприятий` есть, инпутов 10 со значением `0`; тултип-триггеров 0; заметки `Синим цветом…` нет; в инфо-блоке финальный текст; у ячеек нет `GTM_HIGHLIGHT_CLASS`; ввод числа меняет итог планируемых; паста `'5\n3\n7'` в первый инпут даёт `5/3/7` в строках 1–3 и лишние значения за последней строкой отбрасываются; карточка с текстом инструкции есть; кнопка `Сохранить` есть; при `disabled: true` инпуты и кнопка disabled.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode`, `pnpm lint`, `pnpm typecheck`

### T4 Полная проверка и ручной QA

- affected files: нет
- steps:
  1. Прогнать полную матрицу проверок.
  2. Ручная проверка в `pnpm run-dev`: режим «Полуавтоматическое» — 4-колоночная таблица с инпутами `0`, карточка Excel справа с пунктирной рамкой, вставка столбца чисел из Excel распределяется вниз, итог планируемых пересчитывается, кнопка «Сохранить» слева от правого края колонки, тултипов у радио и подсветки строк нет.
  3. Сверить ширины: колонка 4 ≈ 376 px, инпут 240 px не обрезан, карточка не выходит за контейнер (D1).
- tests: existing suite / manual check
- verify: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`

### G: git close-out

- affected files: нет (git)
- steps:
  1. `git status --porcelain` — в дереве только файлы плана (7 new + 3 edit), посторонних изменений нет.
  2. Коммит по стратегии `commits` (`single`) — только через `git-manager` после явного подтверждения пользователя.
  3. Push и MR — не выполняются.
- tests: existing suite / manual check
- verify: `git status --porcelain`, `git log --oneline -1`

## Risks

- **Макеты `22:100` и `25:329` расходятся по оформлению** (тултипы «i», заметка про синие строки, подсветка, размеры иконки инфо-блока). План следует каждому своему режиму: `auto` — по `22:100`, `semiAuto` — по `25:329`; иконка инфо-блока унифицирована по `25:329` (D2). Если новый дизайн убрал тултипы/заметку во всех режимах — нужен отдельный фикс `auto` (подтвердить у продукта/дизайна).
- **Макета «Ручное» нет** — режим остаётся с текущим видом (3 колонки + заметка + тултипы). Отдельная задача по макету «Ручное» — вне плана.
- **Кнопка «Сохранить» — заглушка**: API/endpoint планирования ГТМ нет, в `ModelSettings` полей ГТМ нет; контракт сохранения — вне задачи.
- **`Button variant="defaultSubmit"`** даёт 14px/500 и `max-h-[43px]` (в макете 16px/700 и 45px) и `type="submit"`; форма (`<form>`) в `SettingsForm` отсутствует, поэтому сабмита нет — при появлении `<form>` проверить тип. Типографика намеренно не переопределяется (консистентность с приложением); ширина — через `!w-[160px]`, т.к. `Button` использует `clsx`, а не `twMerge`, и `w-fit` из варианта иначе конкурирует с `w-[160px]` (D5).
- **Сжатие таблицы** (D1): в макете строка шире инфо-блока, в реализации таблица ужимается на ~221 px. Если на QA колонка 4 окажется тесной для инпута 240 px — fallback: уменьшить `percentWidth` колонки 2 (27 → 25) и отдать 2 % колонке 4. Переполнение строки за контейнер отклонено.
- **Planned-значения и режим — локальный `useState`**: сбрасываются при размонтировании `GTMTab` (уход с таба/режима) — как и сейчас для режима; устойчивость (sessionState) — вне задачи.
- **Паста в happy-dom**: в репозитории нет ни одного теста с `paste`/`clipboardData` (grep по `src` — 0 совпадений), прецедента нет. Поэтому в тестах фиксируем рабочий приём: `new Event('paste', { bubbles: true, cancelable: true })` + `Object.defineProperty(event, 'clipboardData', …)` + `fireEvent` (см. Tests). `userEvent.paste` с системным буфером не используем.
- **Нативный `<input>` вместо ui-kit** — осознанный компромисс (см. Goal); при унификации позже можно заменить на `NumberInput`, если появится безлейбл-вариант `TextField`.
- **`percentWidth` в шапке** (паттерн `SpaceUsersTable`): фактические ширины колонок, 240 px инпута и «пунктир» карточки — сверить в ручном QA (T4).
- **Дубль `componentId`**: `ComponentWrapper` бросает `Duplicate Box codeId` при совпадении id у разных компонентов. Поэтому таблица semi-auto — `gtm-table-semi-auto` (D6); совпадения с `gtm-table` в `GTMTab` нет даже теоретически.
- **Итоги `auto` остаются вертикальным столбцом**, хотя в `22:100` горизонтальный ряд — вне задачи, не трогаем.
- **Шаблонные литералы классов в `RadioButtton`** (`text-${size}`, `w-${size}`) не попадают в Tailwind JIT — существующее ограничение, не исправляем.
- **Соседний открытый план** `.opencode/plans/25039-plan-tdd-tasks.md` правит скиллы `plan`/`tdd` (другой workstream, тот же номер задачи) — исполнение настоящего плана не конфликтует с ним по файлам.

## Tests

Общий TDD-порядок: T1 (`plannedCounts.test.ts` red) → T2 (компонентный тест `PlannedCountInput`) → T3 (интеграционные кейсы `GTMTab.test.tsx`, red на отсутствующем контенте) → T4 (полная матрица). Существующие кейсы `auto` в `GTMTab.test.tsx` — регресс-гард, должны остаться зелёными; единственная правка существующего кода тестов — константа `SEMI_AUTO_DESCRIPTION` в T1 (кейс «switches the selected radio and the info block text on mode change» проверяет финальный текст).

Хелпер пасты для тестов (кладём в `GTMTab.test.tsx` и в `PlannedCountInput.test.tsx`):

```ts
function pasteInto(input: HTMLElement, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true });

  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  fireEvent(input, event);
}
```

Фокусные прогоны по задачам:

```bash
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/PlannedCountInput
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Contract data

### Behavior

- Дефолтный режим — `auto` (не меняется). Режим — локальный `useState<GtmPlanningMode>` в `GTMTab`, в URL/API не пишется.
- `semiAuto`: таблица 4 колонки; `#` и «Количество фактических мероприятий» — read-only по центру, «Вид ГТМ» — по левому краю, «Количество планируемых мероприятий» — инпуты 240×29 по центру ячейки, стартовое значение `0` во всех строках.
- Ввод: только цифры (`/^\d*$/`); пустая строка допустима и считается 0 в итогах.
- Паста: `Ctrl+V` в любом инпуте колонки → `event.clipboardData.getData('text')` → `parseClipboardCounts` → значения записываются в строки начиная с активной (`rowIndex`) вниз; невалидные/пустые элементы строку не занимают; значения за последней строкой отбрасываются; в сам инпут ничего не вставляется (`preventDefault`).
- Итоги: `Всего видов ГТМ: 10` и `Суммарно фактических мероприятий: 341` — из констант; `Суммарно планируемых мероприятий: N` — сумма инпутов, реактивно.
- Карточка «Вставка из Excel» статична (только инструкция).
- Кнопка «Сохранить» — заглушка (`onClick` с `TODO(25039)`); при `disabled` контекста — `disabled`.
- `SettingsFormContext.disabled` (`pendingResultsInfo || !settingsEnable`): радио, инпуты и кнопка недоступны; таблица и карточка видимы.
- `auto`/`manual`: контент как сейчас (3 колонки, синие строки `count > 0`, заметка, вертикальные итоги, тултипы у радио).
- Переключение режима/таба не вызывает API-запросов и не меняет данные формы.

### API/types

- Изменений в API, `ModelSettings`, RTK Query нет; новых endpoint-ов и MSW-хендлеров нет.
- `GtmPlanningMode` без изменений; `GTM_MODE_OPTIONS.semiAuto.description` — финальный текст (provisional-TODO снят).
- Новые модульные константы: `GTM_TABLE_HEADER_SEMI_AUTO`, `GTM_EXCEL_CARD_TITLE`, `GTM_EXCEL_CARD_TEXT`.
- `helpers/plannedCounts.ts` экспортирует `parseClipboardCounts`, `sumPlannedCounts` (внутри модуля `GTMTab`, наружу не публикуются).
- `PlannedCountInput` — пропсы `value`, `setValue`, `onPasteValues`, `disabled`, `ariaLabel`.

### Errors

- Ошибок API нет (данные статические, сохранение — заглушка).
- Невалидный clipboard-ввод не роняет UI: отфильтровывается в `parseClipboardCounts`.

### UI/selectors

- Режим: `getByRole('radio', { name: 'Полуавтоматическое' })` (клик для входа).
- Колонка: `getByRole('columnheader', { name: 'Количество планируемых мероприятий' })`.
- Инпуты: `getAllByRole('textbox')` — 10 шт. в `semiAuto`; адресный — `getByRole('textbox', { name: 'ГРП' })`; проверка `toHaveValue('0')`; паста — `pasteInto(input, '5\n3\n7')`.
- Итоги — цельные текстовые узлы: `getByText('Суммарно планируемых мероприятий: 5')` (не дробить на label + число).
- Кнопка: `getByRole('button', { name: 'Сохранить' })`.
- Карточка: `getByText('Вставка из Excel')` и полный `GTM_EXCEL_CARD_TEXT`.
- `data-code-id`: `gtm-tab`, `gtm-table` (auto/manual), `gtm-table-semi-auto` (semiAuto), `tooltip-component`.
- Класс `bg-[#EAF3FF]` в `semiAuto` отсутствует (гард по `className` обёрток ячеек).

### State/URL

- `PROJECT_PAGE_SETTINGS_TAB=GTM` — без изменений.
- Режим и planned-значения — локальные `useState` в `GTMTab` / `GtmSemiAutoContent`; `sessionState` и Redux не задействуются.

### Fixtures/MSW

- MSW не нужен; фикстуры `testFixtures.ts` не требуются. Данные — константы `GTMTab.const.ts`.

### Test identifiers

- `plannedCounts.test.ts` — `gtm planned counts` (чистые функции).
- `PlannedCountInput.test.tsx` — `plannedCountInput`.
- `GTMTab.test.tsx` — `gtmTab` (существующий `describe`, новые кейсы дописываются в него).

### Out of scope

- API/endpoint сохранения программы ГТМ и режима; реальное поведение «Сохранить».
- Макет и вёрстка режима «Ручное».
- Перенос режима/planned-значений в URL или `sessionState`.
- Переделка стиля вкладок настроек, итогов `auto` под горизонтальный ряд, тултипов/заметки/иконки `auto` под `22:100` (D2), цветов инфо-блока под `25:329` (D3).
- Обновление Figma-токена/OAuth.

## Подтверждения перед хендоффом

- `base: none` — скилл `plan` допускает только `test`/`main`/`develop` из сообщения пользователя; сохраняем `none` по прямому указанию «ветку создавать не нужно», но подтверждение нужно повторить при передаче в `@tdd`.
- В `.opencode/plans/` лежат три плана (`25039-gtm-semi-auto-layout.md`, `25039-plan-tdd-tasks.md`, `opencode-v2-config-migration.md`) — правило «один открытый план» требует явно объявить открытым этот и закрыть/приостановить остальные до старта `@tdd`.

## Git

- `branch`: `none` — продолжаем в `km_feat/25039-model-settings`, переключения нет
- `base`: `none` — пользователь указал «ветку создавать не нужно, работаем в этой»; переключения и синка нет
- `tree`: `clean` (ожидается: после `T1–T3` — 7 новых и 3 изменённых файла в `src/**`)
- `sync`: `on`
- `switch`: только через `git-manager` после явного подтверждения пользователя; `plan` не выполняет git write-команды
- `commits`: `single` — один коммит по завершении `T1–T4`
- `commit/push`: только вручную через `git-manager` или подтверждённый close-out; push в рамках задачи не выполняется
- `merge/MR`: только вручную
- `initials`: `km`
- `task number`: `25039`
