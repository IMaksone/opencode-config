# 25039: дефолтные строки в ручном режиме ГТМ

## Goal

В ручном режиме планирования ГТМ (`GtmManualContent`) таблица по умолчанию содержит те же строки, что в автоматическом/полуавтоматическом режимах, — по одной строке на каждый вид ГТМ из `GTM_TABLE_ROWS` (10 видов: ГРП … ПЦ), где заполнен только столбец «Вид ГТМ». Колонки «Скважина» и «Дата ГТМ» остаются пустыми.

Решения пользователя:

- «Очистить таблицу» оставляет таблицу пустой (0 строк) — как сейчас; дефолт возвращается только при повторном входе в режим.
- Новая ветка не нужна — работа в текущей `km_feat/25039-model-settings`.

## Affected files

- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
- `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`

## Tasks

### T1 Предзаполненные строки с видами ГТМ в GtmManualContent

- affected files:
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.tsx`
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/_ui/GtmManualContent/GtmManualContent.test.tsx`
  - `src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab/GTMTab.test.tsx`
- steps:
  1. В `GtmManualContent.tsx` заменить константу `INITIAL_ROWS` на предзаполненные строки из справочника видов ГТМ:
     ```ts
     const INITIAL_ROWS: ManualRow[] = GTM_TYPE_NAMES.map((gtmType, id) => ({ id, well: '', gtmType, date: '' }));
     ```
     (`GTM_TYPE_NAMES` уже импортирован; ids предзаполненных строк — 0..9.)
  2. Инициализировать `rowIdCounterRef` значением `INITIAL_ROWS.length - 1` вместо `0`, чтобы первая строка от «Добавить строку» получила id 10. Без этого `createRow` вернёт id 1 — коллизия с предзаполненной строкой: `updateRow`/`handleDeleteRow` правили бы две строки сразу.
  3. Переписать тест `starts with a single empty row and the row total` → «starts with one row per gtm type with only the gtm type column filled»: `Всего строк: 10`; для каждой строки n: `gtmTypeLabel(n)` = `GTM_TYPE_NAMES[n - 1]`, `wellLabel(n)` и `dateLabel(n)` пустые; плейсхолдер даты на месте.
  4. Адаптировать тест `appends a new empty row…`: после «Добавить строку» — 11 строк, строка 11 полностью пустая (включая вид ГТМ), строки 1–10 с видами ГТМ.
  5. Адаптировать тест `removes a row by its visible number and renumbers…`: удалить строку 1 → `Всего строк: 9`, строка 1 показывает `SECOND_GTM_TYPE`; повторное удаление → 8 строк, строка 1 = `THIRD_GTM_TYPE`.
  6. Сценариям сортировки/фильтрации, которым нужна пустая таблица (предзаполненные виды ГТМ перемешивают сортировку по «Вид ГТМ» и ломают `rowsTotal(N)`), добавить в начало шаг «Очистить таблицу»: `sorts by another column descending…`, `keeps the sorted order of the remaining rows when a row is added or deleted`, well/date-фильтры с `rowsTotal(3)`. Проверку дефолта не удалять — она покрыта шагом 3.
  7. В `GTMTab.test.tsx` обновить `renders the manual mode content…`: `Всего строк: 1` → `Всего строк: 10`. В тесте `drops the filled manual row when the mode is switched away and back`: после возврата в ручной режим `Всего строк: 10`, `wellLabel(1)`/`dateLabel(1)` пустые, `gtmTypeLabel(1)` = `'ГРП'`.
- tests: поведение закрепляется в перечисленных тестах; отдельный helpers-тест не нужен — `INITIAL_ROWS` остаётся константой компонента.
- verify:
  - `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`
  - `pnpm lint`
  - `pnpm typecheck`
- commit: `feat: 25039 предзаполнить виды ГТМ в ручном режиме`

### G git close-out

- Финальный обзор диффа, план-wide проверки (`pnpm lint`, `pnpm typecheck`, `pnpm test`), `git status` — ожидается чистое дерево (T1 уже закоммичен на своей паузе).
- Закрытие: `закрыть 25039` только после явного подтверждения пользователя.

## Risks

- **Коллизия id** предзаполненных строк со строками от «Добавить строку» — закрыта шагом 2 (счётчик стартует с 9); тест шага 4 регрессионно прикрывает (правка/удаление только одной строки).
- **Фронт адаптации тестов**: около десятка кейсов в `GtmManualContent.test.tsx` неявно предполагают одну пустую строку на старте; все правятся в той же задаче, дерево остаётся зелёным.
- «Сохранить» остаётся заблокированной до заполнения всех строк — `isRowComplete` требует well + gtmType + дату; поведение не меняется.
- Порядок предзаполненных строк = порядок `GTM_TABLE_ROWS`; при изменении справочника тесты шага 3 остаются устойчивыми (значения из `GTM_TYPE_NAMES`, не литералами).

## Tests

- Порядок TDD: контракт-проверки в `GtmManualContent.test.tsx` (red) → правка `GtmManualContent.tsx` (green) → адаптация остальных тестов и `GTMTab.test.tsx`.
- Focused: `pnpm exec vitest run src/pages/ProjectPage/_ui/SettingsMode/_ui/GTMTab`
- Полный прогон: `pnpm test` (close-out).

## Contract data

- **Behavior**: при монтировании `GtmManualContent` таблица содержит 10 строк — по одной на вид ГТМ из `GTM_TYPE_NAMES`, заполнен только `gtmType`; «Очистить таблицу» → 0 строк; повторный вход в режим восстанавливает дефолт (компонент размонтируется при смене режима); «Добавить строку» добавляет пустую строку в конец.
- **API/types**: `ManualRow` (`GTMTab.types.ts`) не меняется; новые экспорты не вводятся.
- **State**: локальный стейт `rows` компонента; ids предзаполненных строк 0..9, счётчик новых строк стартует с 10.
- **UI/selectors**: `Всего строк: 10`; инпуты `Вид ГТМ, строка N` со значениями справочника.
- **Out of scope**: импорт из xlsx и API сохранения (TODO(25039) в коде), поведение «Очистить таблицу», режимы auto/semiAuto, `helpers/manualRows.ts`.

## Runtime

- `agent_config_check` (2026-10-28): **`fresh: false`** — конфиг агентов изменён после старта opencode (serverStartedAt: `2026-10-27T14:42:12.814Z`; изменены `AGENTS.md`, `.opencode/skills/{git-policy,plan,tdd}/SKILL.md`). Диспетчеризация `@tdd` BLOCKED до перезапуска сервера.
- `missingModel`: [] (все guarded-агенты на месте).
- Карта: `tdd → zai-coding-plan/glm-5.3`, `coder → zai-coding-plan/glm-5.3-flash`, `git-manager → zai-coding-plan/glm-5.3-flash`, `test-generator → openrouter/deepseek/deepseek-v4.1-flash-1017#high`, `build → zai-coding-plan/glm-5.3`.

## Git

- branch: `none` — по решению пользователя новая ветка не нужна; работа в текущей `km_feat/25039-model-settings`.
- base: не указана пользователем (новая ветка не создаётся).
- tree: clean (на момент планирования; кратковременная модификация `AGENTS.md` исчезла к повторной проверке).
- sync: on.
- switch: только через `git-manager` после явного подтверждения пользователя.
- commits: per-task — каждая задача коммитится на своей паузе после подтверждения результата пользователем; push в коммит не входит.
- commit/push: коммит T1 через `git-manager` на паузе задачи с сообщением `feat: 25039 предзаполнить виды ГТМ в ручном режиме` и файлами задачи; push — только через подтверждённый close-out (`G`).
- merge/MR: вручную.
- initials: km; task number: 25039.
