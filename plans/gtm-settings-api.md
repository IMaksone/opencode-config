# План 25039 — Эндпоинты настроек ГТМ (`settings/gtms`, `settings/upload`)

Status: closed (30.10.2026)

## Goal

Добавить в `settingsEndpoints` (`src/shared/api/queries/settings.ts`) три эндпоинта для настроек геолого-технических мероприятий (ГТМ):

1. `getGtmSettings` — `GET /api/v1/spaces/{spaceUuid}/fields/{fieldCode}/dev-objects/{devObjectCode}/settings/gtms` с опциональным query-параметром `mode` (`AUTO | SEMI_AUTO | MANUAL`); ответ — таблица настроек ГТМ с мета-информацией (режим, период прогнозирования).
2. `postGtmSettings` — `PUT .../settings/gtms?mode=SEMI_AUTO|MANUAL`, тело — массив элементов ГТМ; ответ — обновлённая таблица. Режим `AUTO` бэкендом не поддерживается (400) — исключается типом.
3. `uploadGtmSettings` — `POST .../settings/upload`, тело `{ filePath }`; ответ 204 `void`, фактическая обработка асинхронная (SSE `GTM_SETTINGS` — вне скоупа).

Только API-слой: типы, тег кэша, эндпоинты, фикстуры, тесты. UI и SSE — вне скоупа.

## Affected files

- `src/shared/api/queries/settings.ts` — payload-интерфейсы, сегменты пути, 3 эндпоинта.
- `src/shared/api/types/settings.ts` — типы ответа и тела.
- `src/shared/api/const.ts` — тег `API_CACHE_TAGS.GTM_SETTINGS`.
- `src/shared/testing/testFixtures.ts` — фабрика `createModelGtmSettings`.
- `src/shared/api/queries/settings.test.ts` — тесты новых эндпоинтов.

## Tasks

### T1 Типы, тег кэша и три эндпоинта настроек ГТМ с тестами

- affected files: `src/shared/api/types/settings.ts`, `src/shared/api/const.ts`, `src/shared/api/queries/settings.ts`, `src/shared/testing/testFixtures.ts`, `src/shared/api/queries/settings.test.ts`
- steps:
  1. В `src/shared/api/types/settings.ts` добавить типы (экспорт через существующий `export * from './settings'` в `types/index.ts`):
     ```ts
     export type GtmSettingsMode = 'AUTO' | 'SEMI_AUTO' | 'MANUAL';

     export interface ModelGtmSettingsHeader {
       name: string;
     }

     export interface ModelGtmSettingsRow {
       isFact: boolean;
       isPredict: boolean;
       dateTime: string; // ISO 8601
       values: unknown[]; // ячейки строки; уточнение типов — при построении UI
     }

     export interface ModelGtmSettingsMeta {
       mode: GtmSettingsMode;
       fromPeriodInclude: string; // YYYY-MM-DD
       toPeriodInclude: string;   // YYYY-MM-DD
     }

     export interface ModelGtmSettings {
       headers: ModelGtmSettingsHeader[];
       data: ModelGtmSettingsRow[];
       meta: ModelGtmSettingsMeta;
     }

     export interface GtmSettingsItem {
       gtmType: number;      // 400..491
       count?: number;       // SEMI_AUTO
       wellCode?: number;    // MANUAL
       date?: string;        // YYYY-MM-DD, MANUAL
     }
     ```
  2. В `src/shared/api/const.ts` добавить в `API_CACHE_TAGS` строку `GTM_SETTINGS: 'gtm_settings'` (например, после `SETTINGS`).
  3. В `src/shared/api/queries/settings.ts`:
     - импортировать типы `GtmSettingsItem`, `GtmSettingsMode`, `ModelGtmSettings` из `'../types'`;
     - добавить локальные константы сегментов: `const GTMS = 'gtms';` и `const UPLOAD = 'upload';`;
     - добавить payload-интерфейсы (по образцу существующих `GetSettingsPayload`/`PostSettingsPayload`):
       ```ts
       interface GetGtmSettingsPayload {
         spaceUuid: string;
         fieldCode: string;
         devObjectCode: string;
         mode?: GtmSettingsMode;
       }

       interface PostGtmSettingsPayload {
         spaceUuid: string;
         fieldCode: string;
         devObjectCode: string;
         mode: Exclude<GtmSettingsMode, 'AUTO'>;
         body: GtmSettingsItem[];
       }

       interface UploadGtmSettingsPayload {
         spaceUuid: string;
         fieldCode: string;
         devObjectCode: string;
         filePath: string;
       }
       ```
     - добавить в возвращаемый объект `settingsEndpoints` три эндпоинта:
       ```ts
       getGtmSettings: builder.query<ModelGtmSettings, GetGtmSettingsPayload>({
         query: payload => ({
           method: HTTP_METHODS.GET,
           url: path(SPACES, payload.spaceUuid, FIELDS, payload.fieldCode,
             DEV_OBJECTS, payload.devObjectCode, SETTINGS, GTMS),
           params: { mode: payload.mode }, // undefined => RTK Query опускает параметр
         }),
         providesTags: [API_CACHE_TAGS.GTM_SETTINGS],
       }),

       postGtmSettings: builder.mutation<ModelGtmSettings, PostGtmSettingsPayload>({
         query: payload => ({
           method: HTTP_METHODS.PUT,
           url: path(SPACES, payload.spaceUuid, FIELDS, payload.fieldCode,
             DEV_OBJECTS, payload.devObjectCode, SETTINGS, GTMS),
           params: { mode: payload.mode },
           body: payload.body,
         }),
         invalidatesTags: [API_CACHE_TAGS.GTM_SETTINGS],
       }),

       uploadGtmSettings: builder.mutation<void, UploadGtmSettingsPayload>({
         query: payload => ({
           method: HTTP_METHODS.POST,
           url: path(SPACES, payload.spaceUuid, FIELDS, payload.fieldCode,
             DEV_OBJECTS, payload.devObjectCode, SETTINGS, UPLOAD),
           body: { filePath: payload.filePath },
         }),
         invalidatesTags: [API_CACHE_TAGS.GTM_SETTINGS],
       }),
       ```
  4. В `src/shared/testing/testFixtures.ts` добавить фабрику по образцу `createModelSettings` (импорт типа `ModelGtmSettings` из `'@/shared/api/types'`):
     ```ts
     export function createModelGtmSettings(
       overrides: Partial<ModelGtmSettings> = {},
     ): ModelGtmSettings {
       return {
         headers: [{ name: 'Вид ГТМ' }, { name: 'Количество фактических мероприятий' }],
         data: [{
           isFact: true,
           isPredict: false,
           dateTime: '2026-10-28T00:00:00.000Z',
           values: ['433', 5],
         }],
         meta: {
           mode: 'SEMI_AUTO',
           fromPeriodInclude: '2026-01-01',
           toPeriodInclude: '2026-12-31',
         },
         ...overrides,
       };
     }
     ```
  5. В `src/shared/api/queries/settings.test.ts` добавить тесты (по существующим паттернам файла):
     - расширить `it.each` (или добавить отдельный `describe`/кейсы) на `getGtmSettings` / `postGtmSettings` / `uploadGtmSettings` через `captureJsonRequests` + `createApiTestHarness`: ожидаемые `method`/`pathname`:
       - GET → `'/api/v1/spaces/space-1/fields/field-1/dev-objects/object-1/settings/gtms'`;
       - PUT → тот же pathname с `searchParams.get('mode') === 'MANUAL'` и телом `[{ gtmType: 433, count: 5, wellCode: 10001, date: '2000-12-01' }]`;
       - POST upload → `'/api/v1/.../object-1/settings/upload'` с телом `{ filePath: 'uploads/gtm_settings.xlsx' }` (handler отдаёт 204: `new HttpResponse(null, { status: 204 })`);
       - для GET дополнительно проверить `requests[0].searchParams.get('mode')` при переданном `mode: 'SEMI_AUTO'` и `null` — без `mode` (query-параметр опущен).
     - тест инвалидации тега: по образцу существующего «refetches settings query after posting new settings» — MSW-хендлеры `http.get(`${API_BASE_URL}/*/settings/gtms`, ...)` и `http.put(...)`; после `postGtmSettings.initiate(...)` количество GET-запросов становится 2 (`vi.waitFor`).
     - тест ошибки `postGtmSettings`: `http.put(..., 400)` → `rejects.toMatchObject({ status: 400 })`.
- tests: behavior-тесты через MSW-харнесс рядом с исходником (см. шаг 5); TDD: сначала тесты (red), затем реализация (green), тесты не править после red.
- verify:
  - `pnpm exec vitest run src/shared/api/queries/settings.test.ts`
  - `pnpm lint`
  - `pnpm typecheck`
- commit: `feat: 25039 gtm settings api endpoints`

### G git close-out

- affected files: все файлы T1
- steps: финальный ревью результата T1; план-широкие проверки; чистое дерево; после явного подтверждения пользователя — `закрыть 25039`.
- tests: existing suite
- verify: `pnpm test`, `pnpm lint`, `pnpm typecheck`; `git status --porcelain` — пусто
- commit: без нового коммита (все задачи уже закоммичены на своих паузах); push только после подтверждённого close-out

## Risks

- **`values` непрозрачен**: в спеке это массив пустых объектов (`[{}]`) — типизирован как `unknown[]`; уточнение типов при построении UI таблицы.
- **PUT с `AUTO` → HTTP 400**: исключено на уровне типа (`Exclude<GtmSettingsMode, 'AUTO'>`); тест на 400 фиксирует поведение.
- **Upload асинхронный**: 204 приходит до завершения обработки — инвалидация тега `GTM_SETTINGS` сработает «рано»; актуальная таблица приедет после SSE-события `GTM_SETTINGS` (подписка — вне скоупа).
- **Типы path-параметров**: `fieldCode`/`devObjectCode` в спеке `int32`, но в проекте конвенционно `string` (значение попадает в URL) — сохранён existing-стиль, как у `GetSettingsPayload`.
- **Git-состояние не проверено планом**: `shell` для git отклонён по правам на этапе планирования; `@tdd` обязан снять `git status --porcelain` до начала и остановиться при посторонних изменениях.
- **Конфликт имён**: `getGtmSettings` не пересекается с `getGTMSList`/`getGTMSTables` из `results.ts` (старые ручки `/gtms` без префикса `settings`).

## Tests

TDD-порядок (общий для плана): контракт в `.tmp/contracts/**` → тесты в `src/shared/api/queries/settings.test.ts` (red) → реализация T1 (green) → verify.

Focused-команда: `pnpm exec vitest run src/shared/api/queries/settings.test.ts`

## Contract data

- **Behavior**:
  - `getGtmSettings` — GET `.../settings/gtms`; query `mode` опционален (`AUTO | SEMI_AUTO | MANUAL`), без него режим определяет бэкенд; `providesTags: [GTM_SETTINGS]`.
  - `postGtmSettings` — PUT `.../settings/gtms`; query `mode` обязателен (`SEMI_AUTO | MANUAL`); тело — массив `GtmSettingsItem`; ответ — обновлённая таблица `ModelGtmSettings`; `invalidatesTags: [GTM_SETTINGS]`.
  - `uploadGtmSettings` — POST `.../settings/upload`; тело `{ filePath: string }`; ответ 204 → `void`; `invalidatesTags: [GTM_SETTINGS]`.
- **API/types**: `GtmSettingsMode`, `ModelGtmSettingsHeader`, `ModelGtmSettingsRow`, `ModelGtmSettingsMeta`, `ModelGtmSettings`, `GtmSettingsItem` (в `types/settings.ts`); payload-интерфейсы — локально в `queries/settings.ts`; тег `API_CACHE_TAGS.GTM_SETTINGS = 'gtm_settings'`.
- **Errors**: PUT с `mode=AUTO` → 400 от бэкенда (исключено типом); ошибки мутаций проксируются RTK Query — `unwrap()` реджектится с `status`.
- **UI/selectors**: нет — UI вне скоупа.
- **state/URL**: нет — только RTK Query кэш.
- **fixtures/MSW**: `createModelGtmSettings` в `testFixtures.ts`; MSW-хендлеры на `${API_BASE_URL}/*/settings/gtms` и `${API_BASE_URL}/*/settings/upload`; `commonPayload` = `{ spaceUuid: 'space-1', fieldCode: 'field-1', devObjectCode: 'object-1' }`; базовый URL харнесса `http://localhost/api/v1/`.
- **test identifiers**: не требуются (API-слой).
- **Out of scope**: SSE-подписка `GTM_SETTINGS` (ключ в `SUBSCRIBE_KEYS`, прогресс 0/25/80/100/Failed) и UI прогресса; UI-интеграция эндпоинтов; выбор Excel-файла/fileManager; старые ручки `/gtms` в `results.ts`; уточнение типов `values`.

## Runtime

`agent_config_check` (2026-10-28): `fresh: true`, `serverStartedAt: 2026-10-28T10:54:10.520Z`, `missingModel: []`.

- `plan` → `zai-coding-plan/glm-5.3`
- `tdd` → `zai-coding-plan/glm-5.3`
- `build` → `zai-coding-plan/glm-5.3`
- `coder` → `zai-coding-plan/glm-5.3-flash`
- `git-manager` → `zai-coding-plan/glm-5.3-flash`
- `test-generator` → `openrouter/deepseek/deepseek-v4.1-flash-1017#high`

## Git

- branch: `none` — по решению пользователя работаем в текущей ветке, новую не создаём.
- base: не задан (branch: none).
- tree: `unknown` — git-команды недоступны плану (права shell отклонены); `@tdd` проверяет `git status --porcelain` до старта и останавливается при посторонних изменениях.
- sync: `off` — работа в текущей ветке без синхронизации (решение пользователя).
- switch: нет — ветки не меняем.
- commits: `per-task` — каждый коммит сразу после подтверждения результата задачи («продолжи» на паузе); отложенных коммитов нет; коммит без push.
- commit/push: коммит задачи через `git-manager` на паузе задачи (сообщение и пути — из `commit:` задачи); push только через подтверждённый close-out (`G`).
- merge/MR: только вручную.
- initials: `km`
- task number: `25039`
