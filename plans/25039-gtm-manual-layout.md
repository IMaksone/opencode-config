# 25039 — вёрстка режима «Ручное» вкладки «ГТМ» (`ProjectPage/SettingsMode`)

Status: closed (30.10.2026). Было: ready (ревизия 26.10.2026 после аудита). Не исполнен. **Хендофф в `@tdd` заблокирован** до снятия блокеров из раздела Runtime и «Подтверждения перед хендоффом». Hand off only to `@tdd`.

Аудит 26.10.2026: сверка с кодом и дампом `31:1036` дала 1 процессный блокер (`fresh=false`) и правки D5, D9–D15 (доступные имена кнопок, моки `@/entities/files`, обновление строк по `id`, снимок сортировки, `table-fixed`/`max-w`, фильтр панели, px/rem).

- Task: `25039`
- Branch: `none` — работа продолжается в текущей `km_feat/25039-model-settings`, новая ветка не создаётся
- Base: `none` — пользователь указал «текущая ветка»; скилл `plan` допускает только `test`/`main`/`develop` — фиксируем отклонение (см. «Подтверждения перед хендоффом»)
- Initials: `km`
- Макет: Figma `31:1036` («Ручной»), дамп `.tmp/figma/XiCgM835YJ2jKJ6r2M1g7C-31-1036.{json,md,png}`
- Предыдущие планы серии: `.tmp/plans/25039-gtm-settings-tab.md` (макет `22:100`, реализован), `.opencode/plans/25039-gtm-semi-auto-layout.md` (макет `25:329`, реализован). Новый план дополняет их: закрывает режим «Ручное», оставленный прошлыми планами нетронутым.

## Runtime

- `agent_config_check` от 26.10.2026 (аудит), `serverStartedAt` `2026-10-26T13:36:28.138Z`: **`fresh=false`**, `checked=[".opencode/agents/plan.md", ".opencode/skills/plan/SKILL.md", ".opencode/skills/figma/SKILL.md"]`, `missingModel=[]`.
- **BLOCKED**: конфиг агентов изменён после старта opencode. Перед хендоффом перезапустить сервер, повторить `agent_config_check` и обновить этот раздел до `fresh=true`, `missingModel=[]`. Карта агентов ниже совпадает с фактической, поэтому после рестарта правок не требует.
- Предыдущая редакция раздела содержала `fresh=true` для того же `serverStartedAt` — значение устарело, не использовать.
- Карта агентов: `build` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`, `coder` → `…deepseek-v4.1-flash-1017#low`, `git-manager` → `…deepseek-v4.1-flash-1017#low`, `plan` → `openrouter/xiaomi/mimo-v2.6-pro`, `tdd` → `openrouter/z-ai/glm-5.3`, `test-generator` → `…deepseek-v4.1-flash-1017#high`.
- Состояние дерева на момент аудита не перепроверялось (в plan-режиме shell недоступен): перед хендоффом выполнить `git status --porcelain` (ожидается пусто, либо только файлы настоящего плана) и `git branch --show-current` (ожидается `km_feat/25039-model-settings`).

## Goal

Довести вкладку «ГТМ» в `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab` до макета Figma `31:1036` в режиме **«Ручное»**:

- текст описания «Ручное» — финальный из макета (снять `TODO(25039)`); в этом режиме инфо-блок — только описание (без заметки «Синим цветом…»), у радио нет иконок «i» (тултипы остаются только в `auto`);
- блок «Загрузка данных»: кнопки «Загрузить файл», «Скачать шаблон», «Очистить таблицу» (белые, рамка `#d7dde6`, текст `#355a9e`, глифы ⇧/⇩/▣) и хинт «Допустимые форматы: .xlsx, .xls»;
- таблица «Данные ГТМ»: 5 колонок (`# / Скважина / Вид ГТМ / Дата ГТМ / Действия`), редактируемые строки — комбобоксы по справочникам с панелью «Возможные варианты», дата-инпут `ДД.ММ.ГГГГ`, удаление строки «×»; три текста ошибок валидации с красной подсветкой (`Скважина не найдена в справочнике`, `Вид ГТМ не найден в справочнике`, `Некорректная дата`); в шапке иконки ▽ (декоративная) и ⇅ (сортировка) у колонок Скважина/Вид ГТМ/Дата ГТМ;
- футер: «Всего строк: N» слева, «＋ Добавить строку» и красная «Сохранить» справа, под «Сохранить» хинт «Сохранение недоступно при наличии ошибок» (D3/D6);
- словари скважин и видов ГТМ — статические константы (как данные semi-auto); подключение API-справочников — вне задачи (D8).

Режимы «Автоматическое» и «Полуавтоматическое» остаются как реализовано (`22:100` / `25:329`), меняются только условия показа тултипов/заметки (`auto` only) и текст описания `manual`.

Кнопка «Сохранить» — заглушка (`TODO(25039)`, API сохранения программы ГТМ отсутствует — как в semi-auto). «Скачать шаблон» — рабочий, через существующий `useDownloadPattern().downloadPattern('gtm', 'Шаблон ГТМ')`. «Загрузить файл» — скрытый `<input type="file" accept=".xlsx,.xls">`, выбор файла — заглушка (парсинга `.xlsx` в зависимостях нет, контракт импорта не определён).

Почему таблица кастомная, а не `DataTables`: `StyledTable` рендерит шапку в две строки (заголовок, ниже иконки) с фоном/скруглениями ячеек — макет требует заголовок и ▽ ⇅ в одну строку, разделители `#e5e9ef`, строки переменной высоты (текст ошибки под инпутом) и оверлеи-дропдауны в ячейках. Прецедент обхода ui-kit в этой вкладке — нативный `PlannedCountInput`. Комбобокс — локальный `DictionaryInput`, а не shared `SuggestionsInput` (тому нужен error-стейт и панель «Возможные варианты», он заточен под даты со `Spinner`).

## Affected files

### New

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/manualRows.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers/manualRows.test.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/DictionaryInput.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput/index.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/index.ts`

### Edit

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.const.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.types.ts`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`

### Not changed

- `SettingsMode.tsx`, `SettingsMode.test.tsx` (проверяет ГТМ в режиме `auto` — остаётся зелёным), `SettingsForm.tsx`, `SettingsField`, `NavigationBtn`, остальные вкладки настроек, `SettingsMode.context.ts`, `SettingsMode.types.ts`.
- `GtmSemiAutoContent`, `PlannedCountInput`, `helpers/plannedCounts.*` — без правок.
- Shared: `DataTables`/`StyledTable`/`VirtualTable`, `Button`, `Tooltip`, `RadioButtton`, `ComponentWrapper`, `Image`.
- `ModelSettings`, RTK Query, API-типы, MSW-хендлеры, `testFixtures.ts`.

## Решения по отклонениям от макета

Проверено по дампу `.tmp/figma/XiCgM835YJ2jKJ6r2M1g7C-31-1036.md/.json/.png`.

| # | Отклонение | Что делаем |
|---|---|---|
| D1 | Радио-лейблы в `31:1036` — «Автоматический / Полуавтоматический / Ручной» (15px), в `22:100`/`25:329` и в коде — «Автоматическое / Полуавтоматическое / Ручное» (16px). | Оставляем существующие лейблы (консистентность с `auto`/`semiAuto` и тестами; в прошлых макетах — они). Правим только текст описания `manual`. Смена лейблов во всех режимах — отдельное решение (см. Out of scope). |
| D2 | Инфо-блок `31:1036`: bg `#fbfcff`, рамка `#adc4ef`, иконка 26px `#355a9e`, текст 15px синий `#355a9e`; в `22:100`/`25:329` текст тёмный (`#171717`/`#151515`), оформление унифицировано прошлым планом (bg `#F6F9FF`, рамка `#CBDCF8`, иконка 28px `#3478D4`). | Оставляем текущее оформление инфо-блока и тёмный текст для всех режимов (решения D2/D3 прошлого плана). Синий текст `31:1036` — вопрос к дизайну, не блокирует вёрстку. |
| D3 | Текст итога в макете — обрезанный текстовый узел «Всего стро» (дизайн-опечатка/обрезка). | Реализуем `Всего строк: ${rows.length}` одним текстовым узлом (шаблон итогов semi-auto). **Подтвердить у продукта.** |
| D4 | Кнопки макета: «Добавить строку» 200×44 (текст 15px `#171717`), «Сохранить» 198×44 (текст 16px, bg `#ef1111`); `Button variant="defaultSubmit"` даёт 14px/500 и `max-h-[43px]` (как принято в semi-auto). | Типографику `Button` не переопределяем (консистентность с приложением), ширина — через `!w-[198px]` / `!w-[200px]` (`Button` склеивает классы через `clsx` без `twMerge`, `w-fit` конкурирует). |
| D5 | Иконки ⇧/⇩/▣/＋ и ▽/⇅/⌄/× в макете — TEXT-глифы шрифта Inter, не векторы. | Рендерим глифами (span, 15–20px) как в макете; декоративные глифы — `aria-hidden`, чтобы не попадали в доступное имя кнопок; для «Добавить строку» — `Button` c `iconName="plus.svg"` (готовая svg в `public/assets/svg`) и `aria-label` (иначе `alt="button"` из `Button` ломает accname). Inter в приложении **не подключён**: `src/index.css:6` — `system-ui, Avenir, Helvetica, Arial, sans-serif`, поэтому глифы рендерит системный шрифт ОС (SF Pro / Segoe UI). Замена глифов на svg-сток (`calendar.svg`, `filter.svg`, `arrowSort.svg`, `del.svg`) — отдельная задача; поводом считать расхождение на Windows при QA (T5). |
| D6 | Хинт под «Сохранить» в макете виден при наличии ошибок; поведение при «неполных, но без ошибок» строках не определено. | Правило: хинт виден, когда «Сохранить» заблокирована (есть ошибки, неполные строки или строк нет); скрыт, когда все строки полны и валидны. **Подтвердить у продукта.** |
| D7 | Значок ▽ (фильтр) в шапке: поведение макетом не определено (только иконка). | ▽ — декоративная иконка (`aria-hidden`), без обработчика; ⇅ — рабочая сортировка (asc ↔ desc). Поведение фильтра — вне задачи. |
| D8 | Справочники скважин и видов ГТМ: в приложении есть API (`getWells`, `getGTMSList`). | Берём статические константы (как данные semi-auto) — верстка без привязки к бэкенду; словари из макета: скважины `1001–1005`, `1023–1027`; виды ГТМ — 10 видов из `GTM_TABLE_ROWS`. Подключение API — вне задачи. |
| D9 | В макете таблица заполнена 10 строками; поведение при пустой программе не показано. | Старт — одна пустая строка; «Очистить таблицу» → 0 строк. Альтернатива (10 предзаполненных строк) — правка инициализации `rows`. **Подтвердить у продукта.** |
| D10 | Хинт «Сохранение недоступно при наличии ошибок» в макете выровнен по левому краю кнопки «Сохранить»: обе строки начинаются на одном x, блок 183×32 при кнопке 198 px. | Реализуем `w-[183px] text-left mr-[15px]` внутри `items-end`: правая граница блока на 15 px левее правого края кнопки, строки выровнены по левому краю — как в макете. `text-right` из первой редакции отклонён (вторая строка уезжала вправо). |
| D11 | Ширина панели «Возможные варианты»: 285 px у скважин и 305 px у видов ГТМ. | Проп `panelWidth?: number` у `DictionaryInput` (default 285): 285 для скважин, 305 для видов ГТМ (305 вмещает «Интенсификация притока»). |
| D12 | Рядом с невалидными значениями (`0001`, `ГРПП`) макет показывает **полный** справочник, а не отфильтрованный список. | Фильтруем по подстроке (case-insensitive) при вводе; если совпадений 0 — показываем весь справочник (поведение макета). `GTM_MANUAL_SUGGESTIONS_EMPTY` остаётся только для пустого `options` (со статическими данными недостижим) как страховка. **Подтвердить у продукта.** |
| D13 | Панель в макете начинается ниже текста ошибки (инпут 30 px + 5 px + текст 13 px). | Панель — `top-full mt-[3px]` под инпутом: при наличии ошибки она перекрывает её текст. Осознанно (панель открывается по фокусу, ошибка уже прочитана); сдвиг на высоту ошибки — при замечании дизайна. |
| D14 | Типографика макета задана в px при frame 1600×960. | В приложении root font-size адаптивный (`src/app/App.css`: 16 px → 14 px при ≤1687 → 12 px при ≤1406), т.е. на 1600 px root = 14 px и `text-sm-700` = 12.25 px, а не 14 px. Заголовки берём токенами (`text-xl-700`, `text-sm-700`), тексты ячеек/кнопок/хинтов — фиксированными px (`text-[15px]`, `text-[13px]`), т.к. токена 15 px нет (sm = 14, m = 16). Компромисс осознанный: токены масштабируются, px-тексты — нет. |
| D15 | Макет рассчитан на контент 1544 px. | Фактическая ширина контента вкладки при 1600 px viewport ≈ 1488 px (viewport − 70 px `SettingsForm` `pl-[20px] pr-[50px]` − 42 px `GTMTab` `p-[20px]` + рамка); левого меню в режиме настроек нет. Поэтому: `<table className="table-fixed">`, инпуты `w-full max-w-[405px]` / `w-full max-w-[344px]`. Иначе на ≤1450 px 405 px > 30 % колонки, а `ProjectPage` обрезает переполнение (`overflow-x-hidden`, `ProjectPage.tsx:37`). |

Метрики макета (контент 1544px, фрейм 1600×960; в приложении фактическая ширина контента ≈1488px при 1600px viewport — D15; шрифт макета Inter, в приложении системный — D5; root 14px на 1600px — D14): шапка таблицы 40px, строки ≥46px (с ошибкой растягиваются на высоту текста 13px; высоту задаём на `<td>`, `min-height` на `<tr>` не действует); колонки `#` 60 / Скважина 470 / Вид ГТМ 470 / Дата ГТМ 461 / Действия 83 px → проценты `4/30/30/30/6`; инпуты 405×30 (Скважина, Вид ГТМ) и 344×30 (Дата) → в реализации `w-full max-w-[405px]` / `w-full max-w-[344px]` (D15); разделители колонок/строк `#e5e9ef`, рамка таблицы `#dfe4ea`; панель «Возможные варианты» 285–305px (D11), рамка `#d8dee8`; кнопки «Загрузить файл» 180×40, «Скачать шаблон» 185×40, «Очистить таблицу» 203×40 (gap 14px); футер: итог 15px, кнопки 200×44 и 198×44 (gap 18px), хинт 13px `#75829a` шириной ~183px в 2 строки (D10). Типографика макета: 24/700 заголовок (`text-xl-700`), 14/700 заголовки секций и колонок (`text-sm-700`, на root 14px = 12.25px — D14), 15/400 тексты ячеек/кнопок (`text-[15px]` — в теме шага 15px нет: sm=14, m=16), 13/400 хинты и ошибки (`text-[13px]`), 16/400 «Сохранить» (текст `Button` не переопределяем, D4). Цвета: акцент `#355a9e`, вторичный текст `#75829a`, рамки `#d7dde6`/`#dfe4ea`/`#e5e9ef`, ошибка `#ff2a2a`/`#ff6b6b`/`#fff8f8`, удаление/«Сохранить» `#ef1111`.

## Tasks

### T1 Константы ручного режима и helpers валидации

- affected files: `GTMTab/GTMTab.const.ts`, `GTMTab/GTMTab.types.ts`, `GTMTab/helpers/manualRows.ts`, `GTMTab/helpers/manualRows.test.ts`, `GTMTab/GTMTab.test.tsx` (только константа `MANUAL_DESCRIPTION`)
- steps:
  1. `GTMTab.const.ts`: `GTM_MODE_OPTIONS.manual.description` → финальный текст `31:1036`, `TODO(25039)` снять: `В ручном режиме пользователь формирует план ГТМ по каждой скважине, самостоятельно указывая вид ГТМ и дату проведения каждого мероприятия.`
  2. `GTMTab.types.ts`: `interface ManualRow { id: number; well: string; gtmType: string; date: string }`; `interface ManualRowErrors { well?: string; gtmType?: string; date?: string }` (тексты ошибок — строки из констант).
  3. `GTMTab.const.ts` (константы ручного режима): `GTM_MANUAL_TABLE_COLUMNS: { title: string; widthPercent: number }[]` — 5 колонок (`# / Скважина / Вид ГТМ / Дата ГТМ / Действия`) с `widthPercent` 4/30/30/30/6; своя форма, а не `HeaderElementOfDataTable` из `DataTables`, потому что таблица кастомная и ширины идут и в `<colgroup>`, и в заголовки (T3.6); `GTM_MANUAL_UPLOAD_BUTTON = 'Загрузить файл'`, `GTM_MANUAL_TEMPLATE_BUTTON = 'Скачать шаблон'`, `GTM_MANUAL_CLEAR_BUTTON = 'Очистить таблицу'`, `GTM_MANUAL_ADD_ROW_BUTTON = 'Добавить строку'`, `GTM_MANUAL_SAVE_BUTTON = 'Сохранить'`, `GTM_MANUAL_FORMATS_HINT = 'Допустимые форматы: .xlsx, .xls'`, `GTM_MANUAL_SAVE_HINT = 'Сохранение недоступно при наличии ошибок'`, `GTM_MANUAL_SUGGESTIONS_TITLE = 'Возможные варианты'`, `GTM_MANUAL_SUGGESTIONS_EMPTY = 'Ничего не найдено'`, `GTM_MANUAL_ERROR_WELL = 'Скважина не найдена в справочнике'`, `GTM_MANUAL_ERROR_GTM_TYPE = 'Вид ГТМ не найден в справочнике'`, `GTM_MANUAL_ERROR_DATE = 'Некорректная дата'`, `GTM_MANUAL_DATE_PLACEHOLDER = 'ДД.ММ.ГГГГ'`, `GTM_MANUAL_UPLOAD_TITLE = 'Загрузка данных'`, `GTM_MANUAL_DATA_TITLE = 'Данные ГТМ'`.
  4. Справочники (D8): `GTM_WELL_NAMES: string[] = ['1001', '1002', '1003', '1004', '1005', '1023', '1024', '1025', '1026', '1027']` (варианты + значения строк макета), `GTM_TYPE_NAMES: string[] = GTM_TABLE_ROWS.map(row => String(row[1]))` (10 видов). Функция итога — в рендере шаблоном `` `Всего строк: ${rows.length}` `` (один текстовый узел, D3).
  5. `helpers/manualRows.ts` (чистые функции, паттерн `plannedCounts.ts`):
     - `isValidGtmDate(value: string): boolean` — строгий формат `^\d{2}\.\d{2}\.\d{4}$` + существование календарной даты (месяц 01–12, день по длине месяца, високосные годы); `''` → `false`.
     - `validateManualRow(row: ManualRow, wells: string[], gtmTypes: string[]): ManualRowErrors` — непустое значение вне справочника → ошибка с текстом константы; пустое поле → ошибки нет (D6: пустое ≠ ошибка подсветки); пустая дата → `date` без ошибки, `isValidGtmDate('') === false` используется только для полноты.
     - `isRowComplete(row: ManualRow): boolean` — все три поля непусты и дата `isValidGtmDate`.
     - `sortManualRows(rows: ManualRow[], columnIndex: 1 | 2 | 3, direction: 'asc' | 'desc'): ManualRow[]` — по строке `localeCompare` для 1/2, по разобранной календарной дате для 3 (не лексикографически!), пустые значения — в конец при любом направлении; исходный массив не мутирует.
  6. `GTMTab.test.tsx`: `MANUAL_DESCRIPTION` → финальный текст (иначе кейс «switches the selected radio and the info block text on mode change» станет красным после шага 1).
- tests: `helpers/manualRows.test.ts` — red до реализации: `isValidGtmDate`: `12.01.2024`→true, `32.06.2024`→false, `29.02.2024`→true, `29.02.2023`→false, `31.04.2024`→false, `1.1.2024`→false, `''`→false, `abc`→false; `validateManualRow`: валидная строка → `{}`; `{well:'0001'}` → `{well: GTM_MANUAL_ERROR_WELL}`; `{gtmType:'ГРПП'}` → `{gtmType: …}`; `{date:'32.06.2024'}` → `{date: GTM_MANUAL_ERROR_DATE}`; пустая строка → `{}`, `isRowComplete` → false; `sortManualRows`: строки asc/desc, даты `12.01.2024 < 25.02.2024` календарно (и `01.02.2024` < `12.01.2025` — не лексикографически), пустые в конце.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers`, `pnpm lint`, `pnpm typecheck`

### T2 `DictionaryInput` — инпут со справочником и панелью «Возможные варианты»

- affected files: `GTMTab/_ui/DictionaryInput/DictionaryInput.tsx`, `…/DictionaryInput.test.tsx`, `…/DictionaryInput/index.ts`
- steps:
  1. Props: `value: string`, `setValue(value: string)`, `options: string[]`, `ariaLabel: string`, `error?: boolean`, `errorMessage?: string`, `disabled?: boolean`, `placeholder?: string`, `panelWidth?: number` (default 285, D11).
  2. Нативный контролируемый `<input type="text">` (прецедент `PlannedCountInput`) в обёртке `relative`: классы по макету `h-[30px] w-full rounded-[4px] border border-[#dfe4ea] bg-white px-[16px] text-[15px] text-[#171717] disabled:opacity-50`; `error` → `border-[#ff6b6b] bg-[#fff8f8]`; `aria-label={ariaLabel}`. **Роль инпута не переопределяем** (`role` остаётся `textbox` — на него опираются селекторы Contract; `combobox` сломал бы `getByRole('textbox')`). Справа глиф ⌄ в `<span aria-hidden="true">` внутри `<button type="button" aria-label="Показать варианты">`: глиф не попадает в accname (D5), кнопка — нет (`type="button"`, чтобы не сабмитить форму).
  3. Панель «Возможные варианты»: `absolute left-0 top-full z-50 mt-[3px] rounded-[5px] border border-[#d8dee8] bg-white` + ширина по `panelWidth` — **статическими** классами по значению (`panelWidth === 305 ? 'w-[305px]' : 'w-[285px]'`) или inline `style={{ width: panelWidth }}`: динамическая интерполяция `w-[${panelWidth}px]` Tailwind JIT не соберёт (D11; позиция под инпутом перекрывает текст ошибки — D13); заголовок `GTM_MANUAL_SUGGESTIONS_TITLE` (`text-[13px] text-[#75829a]`) — **вне** `role="listbox"` (по ARIA в listbox допустимы только `option`); список — `<ul role="listbox" className="max-h-[146px] overflow-y-auto">` (высота макета: заголовок + 5 пунктов; 10 скважин скроллятся), пункты `<li role="option" aria-selected={false}>` (`text-[15px]`, шаг 20px, hover `bg-gray-100`).
  4. Фильтрация (D12): по `value` — substring, case-insensitive (пустое значение → все `options`); **при 0 совпадений показываем весь справочник** (поведение макета: панель рядом с `0001`/`ГРПП` непустая); `GTM_MANUAL_SUGGESTIONS_EMPTY` (`text-[13px] text-[#75829a]`) — только при пустом `options` (страховка).
  5. Поведение: открытие — фокус инпута или клик по ⌄; выбор — `onMouseDown` (с `preventDefault`, чтобы blur не закрыл панель раньше) → `setValue(option)` + закрыть; закрытие — `onBlur` c `setTimeout(…, 150)` (паттерн `SuggestionsInput`) или `Escape`; при переходе в `disabled` панель закрывается и не открывается.
  6. Текст ошибки под инпутом: `errorMessage` при `error`, `text-[13px] text-[#ff2a2a]`.
- tests: рендер `value`; инпут остаётся `getByRole('textbox', { name })` (не `combobox`); ввод `ГРП` фильтрует список (есть `ГРП`, нет `ОПЗ`); ввод `0001` не даёт совпадений → показывается весь справочник (D12); клик по `role="option"` → `setValue('1001')`, панель закрыта; `panelWidth={305}` → класс `w-[305px]`; `error` + `errorMessage` → класс `border-[#ff6b6b]` и текст ошибки; пустой инпут показывает все `options`; `Escape` закрывает панель; `disabled` → input disabled, панель не открывается; открытие по клику на «Показать варианты»; заголовок «Возможные варианты» не входит в `getByRole('listbox')`.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput`, `pnpm lint`, `pnpm typecheck`

### T3 `GtmManualContent` — «Загрузка данных», таблица «Данные ГТМ», футер

- affected files: `GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`, `…/GtmManualContent.test.tsx`, `…/index.ts`
- steps:
  1. Состояние: `rows: ManualRow[]` (старт — одна пустая строка, `id` — счётчик `useRef(0)`), `sort: { column: 1 | 2 | 3; direction: 'asc' | 'desc' } | null`, `visibleIds: number[] | null` (снимок порядка отображения; `null` — исходный порядок `rows`). Порядок строк — **снимок**, а не пересчёт `sortManualRows(rows, …)` в рендере: иначе ввод символа переставлял бы строку (вместе с открытой панелью) на каждое нажатие. Снимок пересчитывается только в `handleSort` (клик ⇅); при добавлении строки её `id` дописывается в конец снимка, при удалении — убирается, при очистке — `visibleIds = null` (выбранная сортировка сохраняется, порядок на каждый ввод не пересчитывается). Строки сопоставляются **по `id`**. `rowIndex` в рендере — по отображаемому порядку (нумерация `#` = `index + 1`); любая правка и удаление — по `id`, не по индексу отображения.
  2. Блок «Загрузка данных»: контейнер `flex flex-col gap-y-[8px]` (макет: заголовок → 12px → кнопки → 8px → хинт; без своей группировки родительский `gap-y-[20px]` из `GTMTab` растянул бы блок); заголовок `GTM_MANUAL_UPLOAD_TITLE` (`text-sm-700`); ряд кнопок `flex gap-x-[14px]` — три нативных `<button type="button">` (контроль глифов/цвета, D5): `h-[40px] rounded-[5px] border border-[#d7dde6] bg-white text-[15px] text-[#355a9e]`, ширины 180/185/203px, глиф ⇧/⇩/▣ в `<span aria-hidden="true">` + текст; accname кнопок — ровно `Загрузить файл` / `Скачать шаблон` / `Очистить таблицу` (Contract → UI/selectors); под ними хинт `GTM_MANUAL_FORMATS_HINT` (`text-[13px] text-[#75829a]`).
  3. «Загрузить файл» → `inputRef.current?.click()`; скрытый `<input type="file" accept=".xlsx,.xls" class="hidden" />`; `onChange` — заглушка `// TODO(25039): импорт строк из xlsx — контракт не определён` (сбросить `event.target.value`, чтобы повторный выбор того же файла срабатывал).
  4. «Скачать шаблон» → `const { downloadPattern } = entities.useDownloadPattern()` (namespace-импорт `@/entities` — конвенция страниц, ср. `SettingsMode.tsx:7`; прямой подпуть `@/entities/files` слоями тоже допустим, но тогда зафиксировать отклонение) → `downloadPattern('gtm', 'Шаблон ГТМ')` (endpoint `downloadPatternMutation` поддерживает `gtm` — `helper/downloadPattern.ts:46`). В тестах — только фабричный мок `@/entities`/`@/entities/files` (см. Fixtures/MSW): автомок возвращает `undefined` и рендер падает на деструктуризации.
  5. «Очистить таблицу» → `setRows([])`, `visibleIds = null`, `sort = null` (0 строк, только шапка).
  6. Раздел «Данные ГТМ»: заголовок `GTM_MANUAL_DATA_TITLE` (`text-sm-700`) над таблицей; таблица — семантический `<table className="w-full table-fixed border-collapse border border-[#dfe4ea]">` внутри `ComponentWrapper componentId="gtm-table-manual" className="w-full"` (`table-fixed` обязателен: в авто-layout фиксированные ширины инпутов разъезжаются с процентами колонок, D15):
     - `<colgroup>`: `4% / 30% / 30% / 30% / 6%` (D-метрики выше);
     - `<thead><tr className="h-[40px]">`, `<th>` `text-sm-700 text-center`, у Скважина/Вид ГТМ/Дата ГТМ — заголовок и иконки в одну строку (`inline-flex items-center gap-x-[8px]`): ▽ (span, `aria-hidden`) и ⇅ (кнопка `type="button"`, `aria-label={`Сортировать по столбцу «${title}»`}`, клик — переключение `sort` asc↔desc по своей колонке и пересчёт `visibleIds`); у колонок с сортировкой `<th>` получает `aria-label={title}` — иначе `aria-label` кнопки сортировки входит в accname ячейки и точный селектор `columnheader` перестаёт её находить; разделители колонок `border-l border-[#e5e9ef]`, низ шапки `border-b border-[#e5e9ef]`;
     - `<tbody>`: `<tr key={row.id}>` (без `min-h` — на `<tr>` не действует), низ строки `border-b border-[#e5e9ef]`, ячейки `<td className="h-[46px] align-middle text-center">`: текст ошибки под инпутом увеличивает высоту строки автоматически, порядок строк — по `visibleIds` (T3.1);
     - ячейка `#` — `index + 1` (`text-[15px]`); Скважина/Вид ГТМ — `<DictionaryInput>` в обёртке `mx-auto w-full max-w-[405px]`, `options={GTM_WELL_NAMES | GTM_TYPE_NAMES}`, `panelWidth={285 | 305}` (D11), `error`/`errorMessage` из `validateManualRow` (well/gtmType), `ariaLabel={`Скважина, строка ${n}`}`, `setValue` обновляет строку **по `id`** (не по индексу отображения); Дата — обёртка `relative mx-auto w-full max-w-[344px]` с нативным инпутом (`h-[30px] w-full rounded-[4px] border border-[#dfe4ea] px-[16px] text-[15px]`, `onChange` — тоже по `id`, `placeholder={GTM_MANUAL_DATE_PLACEHOLDER}`, `aria-label={`Дата ГТМ, строка ${n}`}`, ошибка → `border-[#ff6b6b] bg-[#fff8f8]`) и глифом ▣ справа (`aria-hidden`, D5) + текст ошибки `GTM_MANUAL_ERROR_DATE` под инпутом (`text-[13px] text-[#ff2a2a]`); Действия — нативная кнопка × (`text-[20px] text-[#ef1111]`, `aria-label={`Удалить строку ${n}`}`) → удаляет строку и её `id` из `visibleIds`.
  7. Футер `flex items-start justify-between mt-[16px]`: слева `` `Всего строк: ${rows.length}` `` (`text-[15px]`, один текстовый узел, D3); справа `flex flex-col items-end gap-y-[8px]`: ряд `flex items-center gap-x-[18px]` — `Button variant="default"` `iconName="plus.svg"` `text="Добавить строку"` **`aria-label="Добавить строку"`** (иначе accname = «button Добавить строку» из `alt="button"`, `Button.tsx:175`) `className="!w-[200px] justify-center"` (→ пустая строка в конец `rows` + её `id` в конец `visibleIds`) и `Button variant="defaultSubmit"` `text="Сохранить"` `className="!w-[198px] justify-center"` (`onClick` — заглушка `// TODO(25039): API сохранения программы ГТМ отсутствует`); под рядом хинт `GTM_MANUAL_SAVE_HINT` (`text-[13px] text-[#75829a] w-[183px] text-left mr-[15px]`, D10).
  8. Логика блокировки: `canSave = rows.length > 0 && rows.every(row => isRowComplete(row) && Object.keys(validateManualRow(row, …)).length === 0)`; «Сохранить» `disabled = disabled || !canSave`; хинт `GTM_MANUAL_SAVE_HINT` — `{!canSave && <span…>}` (D6). Все контролы (инпуты, ⌄, ×, сортировка, три кнопки, «Добавить строку») получают `disabled` из `SettingsFormContext` (`use(SettingsFormContext)`).
  9. `DictionaryInput` при `disabled` — disabled; панель не открывается.
- tests: старт — одна пустая строка, «Всего строк: 1»; «Добавить строку» → 2 строки, «Всего строк: 2»; «Очистить таблицу» → строк нет, шапка есть, «Всего строк: 0», «Сохранить» disabled, хинт виден; «Удалить строку 1» → строк нет; ввод `0001` в «Скважина, строка 1» → `Скважина не найдена в справочнике`, «Сохранить» disabled, хинт виден; `user.clear` инпута → панель показывает весь справочник (D12) → клик `1001` → ошибка исчезла; ввод `32.06.2024` → `Некорректная дата`; корректно заполненная строка (скважина из справочника, вид из справочника, `12.01.2024`) → «Сохранить» enabled, хинт скрыт; неполная строка → «Сохранить» disabled; клик «Сортировать по столбцу «Дата ГТМ»» с `01.02.2024`/`12.01.2024` → порядок календарный, повторный клик — обратный; ввод в отсортированной таблице не меняет порядок строк (снимок `visibleIds`); «Скачать шаблон» → `downloadPattern('gtm', 'Шаблон ГТМ')` из фабричного мока; при `disabled: true` из контекста — инпуты/кнопки/сортировка/⌄ disabled, панель не открывается; «Добавить строку» находится по точному имени (aria-label, без префикса «button»). Мок `@/entities/files` — только фабричный с `mockReturnValue` (код в Fixtures/MSW): голый `vi.mock` роняет рендер на деструктуризации.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent`, `pnpm lint`, `pnpm typecheck`

### T4 Свитч `manual` в `GTMTab` и интеграционные кейсы

- affected files: `GTMTab/GTMTab.tsx`, `GTMTab/GTMTab.test.tsx`
- steps:
  1. `GTMTab.tsx`: контент по режиму — `mode === 'semiAuto' ? <GtmSemiAutoContent /> : mode === 'manual' ? <GtmManualContent /> : <текущий JSX auto>`; тултипы у радио — только `mode === 'auto'` (условие `mode !== 'semiAuto'` → `mode === 'auto'`; в `31:1036` иконок «i» нет); `GTM_TABLE_NOTE` — только `mode === 'auto'`.
  2. `GTMTab.test.tsx`: добавить **фабричный** мок `@/entities/files` (голый `vi.mock` возвращает `undefined` → падение на `const { downloadPattern } = useDownloadPattern()`; нужен `mockReturnValue({ downloadPattern: vi.fn(), pending: false, firstLoading: false, error: undefined })` — код в Fixtures/MSW): иначе рендер `GtmManualContent` при клике по «Ручное» требует Redux Provider — RTK-хук `useDownloadPattern`; уточнить кейс «switches the selected radio and the info block text on mode change» (в `manual` заметки `Синим цветом…` нет); новые кейсы: после клика «Ручное» — columnheaders `#`, `Скважина`, `Вид ГТМ`, `Дата ГТМ`, `Действия`, кнопки `Загрузить файл`/`Скачать шаблон`/`Очистить таблицу`/`Добавить строку`/`Сохранить` (имена точные: глифы `aria-hidden`, у «Добавить строку» — `aria-label`), хинт `Допустимые форматы: .xlsx, .xls`, тултип-триггеров 0, заметки нет; при `disabled: true` клик «Ручное» не переключает режим (гард прежний).
  3. Существующие кейсы `auto`/`semiAuto` — без правок, регресс-гард.
- tests: см. steps; красные до реализации свитча, зелёные после.
- verify: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`, `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode`, `pnpm lint`, `pnpm typecheck`

### T5 Полная проверка и ручной QA

- affected files: нет
- steps:
  1. Полная матрица проверок.
  2. Ручная проверка в `pnpm run-dev`: режим «Ручное» — блок «Загрузка данных» с тремя кнопками и хинтом; таблица с инпутами (`max-w-[405px]`/`max-w-[344px]` не обрезаны, `table-fixed` держит проценты колонок), панель «Возможные варианты» открывается под инпутом и не обрезается контейнерами (`ProjectPage` имеет `overflow-x-hidden` — проверить и по вертикали); ошибки трёх типов с красной подсветкой и текстом под полем (строка растёт, не ломая разделители); «Скачать шаблон» скачивает xlsx; сортировка ⇅ (порядок не «прыгает» при вводе); «Добавить строку»/«×»/«Очистить таблицу»; «Сохранить» блокируется с хинтом при ошибках/неполноте.
  3. Ширины: 1920 / 1600 / 1440 px — таблица не выходит за контейнер, инпуты сжимаются, а не клипаются; на 1440 проверить, что 405 px не ломает 30 %-колонку (иначе — уменьшать `max-w`).
  4. Глифы ⇧/⇩/▣/▽/⇅/⌄/× — проверить на macOS и Windows (шрифт системный, D5); расхождение → замена на svg отдельной задачей.
  5. Сверить метрики с макетом (D-таблица): проценты колонок, высоты строк ≥46px, футер и хинт (D10), ширины панели 285/305 (D11), панель перекрывает текст ошибки (D13 — ожидаемо).
- tests: existing suite / manual check
- verify: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`

### G: git close-out

- affected files: нет (git)
- steps:
  1. `git status --porcelain` — в дереве только файлы плана (8 new + 4 edit), посторонних изменений нет (на момент аудита не перепроверялось: shell в plan-режиме недоступен — проверить перед коммитом, вместе с `git branch --show-current`).
  2. Коммит по стратегии `commits` (`single`) — только через `git-manager` после явного подтверждения пользователя.
  3. Push и MR — не выполняются.
- tests: existing suite / manual check
- verify: `git status --porcelain`, `git log --oneline -1`

## Risks

- **Кастомная таблица вместо `DataTables`** (D-обоснование): единый стиль со `StyledTable` не достигнут; при желании унифицировать позже — переделка. Принято осознанно ради макета (шапка в одну строку, переменная высота строк, оверлеи).
- **Оверлеи панели «Возможные варианты»** внутри таблицы могут обрезаться `overflow` контейнеров (`SettingsMode`, `ComponentWrapper`, скролл страницы). Если в QA панель обрезается — рендерить через портал (`TooltipPortal`-паттерн) или `fixed` по координатам инпута.
- **RTK-хук в `GtmManualContent`** (`useDownloadPattern`) ломает существующие рендер-тесты `GTMTab` без Redux Provider — в `GTMTab.test.tsx` и `GtmManualContent.test.tsx` нужен **фабричный** мок с `mockReturnValue({ downloadPattern, pending: false, firstLoading: false, error: undefined })` (T4/T3, код — Fixtures/MSW). Голый `vi.mock` возвращает `undefined` и роняет рендер на деструктуризации. Fallback, если мокать нежелательно: обернуть `renderGtmTab` в `Provider store={createApiTestHarness(...)}`.
- **Blur/таймеры панели**: паттерн `onBlur → setTimeout(150)` из `SuggestionsInput`; в `happy-dom` клик по `role="option"` должен срабатывать на `mousedown` до blur. Тесты — через `userEvent` с реальными таймерами (setup сбрасывает fake timers), закрытие по blur проверять через `waitFor`.
- **Хинт «Сохранение недоступно…» и правило полноты** (D6) и **текст «Всего строк: N»** (D3) — продуктовые подтверждения; правка копирайта/условий не ломает структуру.
- **Пустые строки и «Очистить таблицу» → 0 строк**: в макете пустое состояние не показано; правило «0 строк + рабочая «Добавить строку»» принято по аналогии с semi-auto. Альтернатива (оставлять одну пустую строку) — тривиальная правка `handleClear`.
- **Глифы ⇧/⇩/▣/＋/▽/⇅/⌄/× вместо svg** (D5): Inter в приложении не подключён (`src/index.css:6` — `system-ui, Avenir, …`), глифы рендерит системный шрифт ОС и метрики различаются между macOS/Windows. При расхождении — замена на svg (`calendar.svg`, `filter.svg`, `arrowSort.svg`, `plus.svg`, `del.svg` уже в `public/assets/svg`).
- **Доступные имена (accname)**: `Button` с `iconName` добавляет `alt="button"` (`Button.tsx:175`), а глифы внутри `<button>` входят в accname. Отсюда обязательные `aria-hidden` на декоративных глифах и `aria-label="Добавить строку"` на кнопке — иначе точные селекторы Contract не находят кнопки (прецедент regex-селекторов: `PlastsCatalogButtonWithPopover.test.tsx:38`). Тот же эффект у `<th>` с кнопкой сортировки: её `aria-label` входит в accname заголовка, поэтому таким колонкам нужен `aria-label={title}` на `<th>`.
- **`min-h` на `<tr>` не работает** (CSS игнорирует `min-height` для `display: table-row`) — высота строки 46px задаётся на `<td>`, иначе строки сжимаются до контента.
- **Ширины**: макет 1544 px, фактический контент вкладки ≈1488 px при 1600 px viewport (`SettingsForm` + `GTMTab` padding) и ~1328 px при 1440 px; корень `ProjectPage` — `overflow-x-hidden` (`ProjectPage.tsx:37`), переполнение обрежется без скролла. Поэтому `table-fixed` + `w-full max-w-[405px]`/`max-w-[344px]` обязательны в шагах T3, а не только как «минимум»; Responsive ниже 1280 — вне задачи.
- **Сортировка и ввод**: порядок отображается снимком `visibleIds` (T3.1); пересчёт `sortManualRows` в рендере переставлял бы строку на каждый символ. Нумерация `#` — по отображению; если продукт ждёт стабильную — нумеровать по `id` (тривиальная правка).
- **Фильтр панели (D12)**: при 0 совпадений панель показывает весь справочник — это поведение макета, но продуктовое подтверждение открыто; альтернатива (пустой список + `GTM_MANUAL_SUGGESTIONS_EMPTY`) — правка одной функции.
- **Типографика (D14)**: смешение rem-токенов и px (`text-[15px]`/`text-[13px]`) означает, что при root 14 px (любой viewport ≤1687) заголовки уменьшаются, а тексты ячеек — нет. Если это заметно на QA — перевести px в rem-эквиваленты.
- **`Button` без `twMerge`** (`clsx`): ширины `!w-[198px]`/`!w-[200px]` с обязательным `!` (принято в semi-auto, D4).
- **Дубль `componentId`**: `ComponentWrapper` бросает исключение при совпадении id — таблица manual получает `gtm-table-manual`; `gtm-table` остаётся за `auto` (в `manual` не рендерится — конфликта нет).
- **Соседние планы** в `.opencode/plans/`: `25039-gtm-semi-auto-layout.md` (реализован), `25039-plan-tdd-tasks.md` (правки скиллов plan/tdd — вероятная причина `fresh=false`), `opencode-v2-config-migration.md` (конфиг opencode). По файлам не конфликтуют, но правило «один открытый план» требует закрыть реализованный и приостановить остальные до старта `@tdd` (см. «Подтверждения перед хендоффом»).

## Tests

Общий TDD-порядок: T1 (`manualRows.test.ts` red → helpers green) → T2 (компонентный тест `DictionaryInput`) → T3 (`GtmManualContent.test.tsx` red на отсутствующем контенте) → T4 (интеграционные кейсы `GTMTab.test.tsx`, red до свитча) → T5 (полная матрица + QA). Существующие кейсы `auto`/`semiAuto` в `GTMTab.test.tsx` — регресс-гард; правки существующего кода тестов — `MANUAL_DESCRIPTION` (T1) и фабричный мок `@/entities/files` + уточнение кейса mode-change (T4). Селекторы опираются на точные accname: декоративные глифы — `aria-hidden`, у `Button` с `iconName` — `aria-label` (см. Risks → accname).

Ключевые селекторы — см. Contract data → UI/selectors.

Фокусные прогоны по задачам:

```bash
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/helpers
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/DictionaryInput
pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent
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
- `manual`: блок «Загрузка данных» (3 кнопки + хинт форматов), таблица «Данные ГТМ» (5 колонок), футер (итог + 2 кнопки + хинт).
- Строки: старт — одна пустая (D9); «Добавить строку» — +1 пустая в конец `rows` (её `id` дописывается в конец `visibleIds`); «Очистить таблицу» — `rows = []`, `visibleIds = null`, `sort = null`; «×» (`aria-label="Удалить строку N"`) — удаляет по `id` из `rows` и `visibleIds`. Правки ячеек — тоже по `id`, не по индексу отображения.
- Ячейки: Скважина/Вид ГТМ — `DictionaryInput` (фильтр substring/case-insensitive; при 0 совпадений показывается весь справочник — D12; панель «Возможные варианты» шириной 285/305 — D11, под инпутом — D13; выбор — `mousedown`, закрытие — blur 150ms/Esc); Дата — текстовый инпут `ДД.ММ.ГГГГ` (placeholder), глиф ▣ декоративный (`aria-hidden`).
- Валидация: ошибка только при непустом невалидном значении (`GTM_MANUAL_ERROR_WELL`/`GTM_MANUAL_ERROR_GTM_TYPE`/`GTM_MANUAL_ERROR_DATE`); пустое поле не подсвечивается, но строка неполная; «Некорректная дата» — строгий `ДД.ММ.ГГГГ` + календарная дата (`32.06.2024` → ошибка).
- «Сохранить»: `disabled` при `disabled` контекста, `rows.length === 0`, неполных строках или ошибках; хинт `GTM_MANUAL_SAVE_HINT` виден, когда `!canSave` (D6); `onClick` — заглушка `TODO(25039)`.
- Сортировка ⇅ (Скважина/Вид ГТМ/Дата ГТМ): клик asc ↔ desc; переставляется снимок `visibleIds` (ввод в строку порядок не меняет), `#` — по порядку отображения; даты — по календарю. ▽ — декоративная иконка (D7).
- «Загрузить файл»: скрытый `<input type="file" accept=".xlsx,.xls">`, `onChange` — заглушка `TODO(25039)` (сброс value). «Скачать шаблон»: `downloadPattern('gtm', 'Шаблон ГТМ')` (реальный endpoint `downloadPatternMutation`).
- Словари — статические константы `GTM_WELL_NAMES` / `GTM_TYPE_NAMES` (D8).
- Тултипы «i» у радио — только `auto`; заметка `GTM_TABLE_NOTE` — только `auto`; описание `manual` — финальный текст макета.
- `SettingsFormContext.disabled` (`pendingResultsInfo || !settingsEnable`): все контролы disabled, разметка видима.
- Переключение режимов/табов не вызывает API-запросов.

### API/types

- Новых endpoint/MSW-хендлеров нет; используется существующий `useDownloadPattern` — через `entities.useDownloadPattern()` из `@/entities` (подпуть `@/entities/files` допустим слоями, но тогда мок должен целиться в него). `ModelSettings` и RTK Query без изменений.
- `GTMTab.types.ts`: `ManualRow`, `ManualRowErrors`; `GtmPlanningMode` без изменений.
- `helpers/manualRows.ts` экспортирует `isValidGtmDate`, `validateManualRow`, `isRowComplete`, `sortManualRows` (внутри модуля `GTMTab`, наружу не публикуются).
- `DictionaryInput` — пропсы `value`, `setValue`, `options`, `ariaLabel`, `error`, `errorMessage`, `disabled`, `placeholder`, `panelWidth` (D11). Колонки таблицы — `GTM_MANUAL_TABLE_COLUMNS: { title, widthPercent }[]` (своя форма, не `HeaderElementOfDataTable` из `DataTables`).

### Errors

- Ошибок API в контенте нет (скачивание шаблона — существующий хук с `showToast.error('Ошибка при скачивании файла')`).
- Тексты ошибок полей — из констант (3 текста макета); невалидный файл при «Загрузить файл» не обрабатывается (заглушка).

### UI/selectors

- Режим: `getByRole('radio', { name: 'Ручное' })` (клик для входа).
- Кнопки: `getByRole('button', { name: 'Загрузить файл' | 'Скачать шаблон' | 'Очистить таблицу' | 'Добавить строку' | 'Сохранить' | 'Удалить строку 1' | 'Показать варианты' | 'Сортировать по столбцу «Скважина»' })`. Точные имена обеспечиваются реализацией: декоративные глифы — `aria-hidden`, у `Button` с `iconName` — `aria-label`; иначе accname станет «button Добавить строку» (`alt="button"` из `Button`, `Button.tsx:175`).
- Таблица: `getByRole('table')`; `getByRole('columnheader', { name: '#' | 'Скважина' | 'Вид ГТМ' | 'Дата ГТМ' | 'Действия' })` — точные имена только при `aria-label={title}` на `<th>` (иначе в accname попадает `aria-label` кнопки сортировки; тогда — regex `/Скважина/`).
- Инпуты строк: `getByRole('textbox', { name: 'Скважина, строка 1' })`, `getByRole('textbox', { name: 'Вид ГТМ, строка 1' })`, `getByRole('textbox', { name: 'Дата ГТМ, строка 1' })`.
- Панель: `getByText('Возможные варианты')` (заголовок вне `role="listbox"`), `getByRole('option', { name: '1001' })`; `getByText('Ничего не найдено')` — только при пустом справочнике (D12).
- Ошибки: `getByText('Скважина не найдена в справочнике')`, `getByText('Вид ГТМ не найден в справочнике')`, `getByText('Некорректная дата')`.
- Хинты: `getByText('Допустимые форматы: .xlsx, .xls')`, `getByText('Сохранение недоступно при наличии ошибок')`.
- Итог: `getByText('Всего строк: 1')` — цельный текстовый узел (не дробить).
- `data-code-id`: `gtm-tab`, `gtm-table` (auto), `gtm-table-semi-auto`, `gtm-table-manual`, `tooltip-component`.

### State/URL

- `PROJECT_PAGE_SETTINGS_TAB=GTM` — без изменений. Режим — `useState` в `GTMTab`; `rows`/`sort`/`visibleIds` — `useState` в `GtmManualContent`; `sessionState`/Redux/URL не задействуются (устойчивость — вне задачи).

### Fixtures/MSW

- MSW не нужен; `testFixtures.ts` не требуются. Данные — константы `GTMTab.const.ts`.
- `useDownloadPattern` — **фабричный** мок (голый `vi.mock` даёт `undefined` и роняет рендер на деструктуризации). Общий код для `GTMTab.test.tsx` и `GtmManualContent.test.tsx`:

```ts
const { downloadPatternMock } = vi.hoisted(() => ({ downloadPatternMock: vi.fn() }));

vi.mock('@/entities/files', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/files')>();

  return {
    ...actual,
    useDownloadPattern: () => ({
      downloadPattern: downloadPatternMock,
      pending: false,
      firstLoading: false,
      error: undefined,
    }),
  };
});
```

- Если компонент импортирует хук из барреля (`entities.useDownloadPattern`), мокать `@/entities` через `importOriginal` (прецедент `SettingsMode.test.tsx:16-27`) с тем же `mockReturnValue`.

### Test identifiers

- `manualRows.test.ts` — `gtm manual rows helpers` (чистые функции).
- `DictionaryInput.test.tsx` — `dictionaryInput`.
- `GtmManualContent.test.tsx` — `gtmManualContent`.
- `GTMTab.test.tsx` — существующий describe `gtmTab`, новые кейсы дописываются в него.

### Out of scope

- API сохранения программы ГТМ и режима («Сохранить» — заглушка).
- Реальный импорт строк из `.xlsx` («Загрузить файл»): нет библиотеки парсинга и контракта.
- API-справочники скважин/видов ГТМ (`getWells`, `getGTMSList`) — используются константы.
- Поведение фильтра ▽ (макетом не определено).
- Смена радио-лейблов на «Автоматический/…» во всех режимах (D1).
- Перекраска инфо-блока/его текста под `31:1036` (D2).
- Responsive ниже 1280 px и мобильные; замена глифов на svg (D5); типографика `Button` под макет (D4); перевод px-метрик в rem (D14). Обязательный минимум из D15 (`table-fixed`, `max-w` инпутов) входит в задачу, а не в out of scope.
- Перенос режима/строк в URL или `sessionState`; правки `auto`/`semiAuto` контента.

## Подтверждения перед хендоффом

- **BLOCKED: `Runtime`** — `agent_config_check` даёт `fresh=false` (конфиг агентов изменён после старта opencode). Перезапустить сервер, повторить проверку, обновить Runtime до `fresh=true`; до этого `@tdd` не запускать.
- **Правило «один открытый план»** — в `.opencode/plans/` четыре файла. Открытым считается настоящий; `25039-gtm-semi-auto-layout.md` закрыть (реализован), `25039-plan-tdd-tasks.md` и `opencode-v2-config-migration.md` приостановить до старта `@tdd`.
- `base: none` — скилл `plan` допускает только `test`/`main`/`develop`; сохраняем `none` по указанию пользователя «текущая ветка» (работаем в `km_feat/25039-model-settings`), подтверждение повторить при передаче в `@tdd`.
- **Продуктовые подтверждения** (не блокируют вёрстку, но фиксируем): «Всего строк: N» (D3), правило показа хинта (D6), старт с одной пустой строки (D9), поведение фильтра панели при 0 совпадений (D12).

## Git

- `branch`: `none` — продолжаем в `km_feat/25039-model-settings`, переключения нет
- `base`: `none` — пользователь указал «текущая ветка»; переключения и синка нет (см. «Подтверждения перед хендоффом»)
- `tree`: `clean` по состоянию перед записью плана; на момент аудита не перепроверялось (shell в plan-режиме недоступен) — перепроверить `git status --porcelain` перед хендоффом. Ожидается после T1–T4: 8 новых и 4 изменённых файла в `src/**`
- `sync`: `off` — причина: `base: none`, синхронизировать не с чем; переключение ветки не выполняется. Если пользователь назовёт базовую ветку — вернуть `on`
- `switch`: только через `git-manager` после явного подтверждения пользователя; `plan` не выполняет git write-команды
- `commits`: `single` — один коммит по завершении `T1–T5`
- `commit/push`: только вручную через `git-manager` или подтверждённый close-out; push в рамках задачи не выполняется
- `merge/MR`: только вручную
- `initials`: `km`
- `task number`: `25039`
