# figma-use — чит-лист обязательных правил

> **Фолбэк.** Живая загрузка гайдов обязательна перед мутациями:
> `resource skill://figma/figma-use/SKILL.md` и
> `resource skill://figma/figma-generate-design/SKILL.md`.
> Этот чит-лист — только аварийная выжимка, снятая **2026-11-11**; гайды могли
> измениться. Противоречие между чит-листом и живым гайдом решается в пользу
> гайда.

## Каркас скрипта

- Обычный JS с top-level `await` и `return`. Код сам обёрнут в async-контекст:
  **не** оборачивать в `(async () => … })()`, **не** вызывать `figma.closePlugin()`.
- Агент видит **только** `return`-значение; `console.log()` невидим; ошибки
  пробрасываются сами (можно `throw` явно).
- Каждый мутирующий скрипт обязан `return`-ить структуру с ID:
  `return { createdNodeIds: [...], mutatedNodeIds: [...], count: 5, errors: [] }`.
- ID из прошлых вызовов передаются **строчными литералами**, не переменными:
  состояния между вызовами нет.
- Каждый Promise — с `await` (незаавайченный `loadFontAsync` молча теряется).
- Код ≤ **50 000 символов** на вызов `use_figma` — дробить по экранам/секциям.

## Текст и шрифты

- Канонический рецепт: **load font → `await` → mutate → return affected IDs**.
  Мутация с незагруженным шрифтом бросает `Cannot write to node with unloaded font`.
- Имя стиля **не угадывать**: `await figma.listAvailableFontsAsync()` и искать
  точное написание. Inter Semi Bold — именно `'Semi Bold'` (с пробелом), не
  `'SemiBold'`.
- Существующий текст: грузить его текущие шрифты через
  `node.getStyledTextSegments(['fontName'])`, не хардкод.
- `lineHeight`/`letterSpacing` — `{ unit: 'PIXELS'|'PERCENT', value }`, не числа.

## Цвета и заливки

- Цвета в диапазоне **0–1**: `{ r: 1, g: 0, b: 0 }` = красный. `Property value
  out of range` → поделили на 255 неправильно.
- В paint `color` только `{r,g,b}` — **без `a`**; прозрачность живёт в самом paint:
  `{ type: 'SOLID', color: {...}, opacity: 0.5 }`.
- `fills`/`strokes` — read-only массивы: клонировать, менять, переприсваивать.

## Страницы

- Только `await figma.setCurrentPageAsync(page)`; синхронный
  `figma.currentPage = …` бросает `Setting figma.currentPage is not supported`.
- Контекст страницы **сбрасывается на первую** в начале каждого вызова —
  переключаться заново в каждом скрипте, **максимум один раз на вызов**.
- Многостраничная работа — N параллельных вызовов `use_figma` (по одному на
  страницу, в одном сообщении), не цикл переключений внутри одного скрипта.

## Лэйаут

- Связанные дети (stack/side-by-side/gap/hug) — в
  `figma.createAutoLayout('VERTICAL'|'HORIZONTAL', { name, itemSpacing })`,
  не в абсолютные координаты. Абсолютный `x/y` — только для позиционирования
  контейнера на канвасе.
- `HUG`/`FILL` валидны только у ребёнка auto-layout родителя: **сначала
  `appendChild`, потом** `layoutSizing*`.
- `resize()` сбрасывает sizing в `FIXED` — вызывать **до** `layoutSizing*`.
- Оборачивающий TEXT: `textAutoResize = 'HEIGHT'` + явная FIXED ширина, проверить
  `node.width > 0`.
- Два разных enum'а: у ребёнка `layoutSizingHorizontal/Vertical` =
  `'FIXED'|'HUG'|'FILL'`; у фрейма `primary/counterAxisSizingMode` =
  `'FIXED'|'AUTO'`. Не смешивать (`'AUTO'` у layoutSizing — невалидно).

## Позиционирование

- Новые топ-левел узлы **не в (0,0)**: просканировать `figma.currentPage.children`
  и встать правее самого правого (или в свободном месте).

## Запрещённые API (среда MCP)

- `figma.notify()` — бросает `not implemented`.
- `figma.loadAllPagesAsync()`, `setPluginData()`, `createImageAsync()` — в среде
  MCP недоступны/запрещены (проверено 2026-11-11): чистку и метки делать по
  возвращённым ID и именам узлов, внешние картинки — только через хэши узлов
  уже в файле (или `generate_figma_design` для растеризации).

## Типобезопасность

- Сужать тип перед доступом к специфичным полям: `node.type === 'TEXT'`,
  `"characters" in node`, `findAllWithCriteria({ types: […] })`.
- `componentPropertyDefinitions` — только у `COMPONENT_SET` / `COMPONENT` вне
  сета; `description` — только на `COMPONENT`/`COMPONENT_SET`.
- Широкие запросы возвращают только `{id, name, type}` и счётчики; детали —
  отдельными вызовами по конкретным ID.

## Удобные API (предпочитать многословным)

- `node.query('FRAME[name^=Card] TEXT')` — CSS-подобный поиск по поддереву;
  `figma.currentPage.query('…')` — по странице.
- `node.set({ opacity: 0.5, cornerRadius: 8, name: 'Card' })` — батч-сеттер,
  `width/height` идут через `resize()`; `layoutMode` применяется первым.
- `node.placeholder = true/false` — шиммер «в работе»; **снимать** на финале.
- `await node.screenshot({ scale: 2 })` — инлайн-скриншот узла в ответе.

## Валидация и ошибки

- На ошибку `use_figma` смотреть `safeToRetryWithoutCanvasRead`: `true` —
  исправить и ретрай; `false` — прочитать канвас, понять что изменилось.
- Структурная валидация — ID/счётчики/имена из `return` + `get_metadata`;
  визуальная — `get_screenshot` **один раз после композиции** и один после
  визуального фикса. Последний прошедший скриншот финален.
- «Результат looks wrong» → `get_metadata` (структура) vs `get_screenshot`
  (обрезки/наложения) → точечный фикс только сломанного, не пересоздание всего.
- Типовые сообщения: `Property value out of range` → цвет 0–255 вместо 0–1;
  `Cannot read properties of null` → неверный ID/страница; зависание → цикл или
  потерянный `await`.

## Из figma-generate-design (обязательный компаньон перед мутациями)

- Скриншот/растровый рендер целого UI — **только визуальный референс**: никогда
  не импортировать его в deliverable как слой/заливку.
- Дизайн-система: `get_libraries` → `search_design_system` (один интент на
  запрос, без синонимов в одной строке) → импорт по ключу
  (`importComponentByKeyAsync`/`importVariableByKeyAsync`).
- «Локальных переменных нет» (`getLocalVariableCollectionsAsync` пуст) — не
  вывод без `search_design_system` с `entity: "variable"`.
- Контентные картинки (фото/аватары/логотипы): `use_figma` не качает внешние
  URL — хэши берутся из узлов файла или через `generate_figma_design`.

## SSE (специфика helper'а)

Ответы `mcp.figma.com` приходят как SSE: helper `figma-mcp.mjs` сам достаёт
JSON из `data:`-строк — при ручных экспериментах повторить тот же парсинг.
