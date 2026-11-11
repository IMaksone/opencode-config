---
name: figma-design
description: Use when creating or editing Cervart page mockups in Figma via the Figma MCP: drawing screens, fixing existing frames by node ID, screenshot validation and reporting. The helper CLI wraps the remote MCP; no local plugins or manual Figma actions.
---

# figma-design — макеты Cervart в Figma

Создание и редактирование макетов экранов проекта в файлах Figma через удалённый
MCP-сервер `https://mcp.figma.com/mcp`. Все вызовы идут через helper CLI — токен
OAuth читается из хранилища opencode и никогда не печатается.

## Inputs

- Целевой файл: по умолчанию «Mantic» `YkW54HbLSSunXEWgTugb3f`; переопределяется URL
  `figma.com/design/<fileKey>/...` в запросе пользователя.
- Список экранов для макета — **только вручную из запроса пользователя**
  (инвентаризация экранов из кодовой базы не выполняется).
- Требуемые правки существующих макетов — по node ID или по имени канваса/фрейма из запроса.

## Helper CLI

```bash
node .opencode/skills/figma-design/scripts/figma-mcp.mjs whoami
node .opencode/skills/figma-design/scripts/figma-mcp.mjs schema <toolName>
node .opencode/skills/figma-design/scripts/figma-mcp.mjs resource <uri>
node .opencode/skills/figma-design/scripts/figma-mcp.mjs call <toolName> '<jsonArgs>'
```

- `whoami` — аккаунт Figma (email/планы); вызывайте при подозрении на проблемы
  доступа или rate-limit.
- Токен: sqlite `~/.local/share/opencode/opencode.db` (`credential`,
  `label='figma' AND active=1`) → фолбэк `~/.local/share/opencode/mcp-auth.json`
  (`figma.tokens.accessToken`). Перечитывается на каждый вызов, наружу не печатается.
- HTTP 401 → `opencode mcp logout figma`, затем в TUI opencode `/mcps` → figma →
  Sign in под рабочим аккаунтом; повторить вызов.
- «could not access the requested file» → сверьте аккаунт `whoami` с владельцем файла.
- Ответы приходят в SSE — helper сам достаёт JSON из `data:`.

## Process

1. **Гайды — обязательно перед мутациями.** Живой загрузкой через helper:

   ```bash
   node .opencode/skills/figma-design/scripts/figma-mcp.mjs resource skill://figma/figma-use/SKILL.md
   node .opencode/skills/figma-design/scripts/figma-mcp.mjs resource skill://figma/figma-generate-design/SKILL.md
   ```

   Гайды могли измениться — локальный чит-лист `references/figma-use-cheatsheet.md`
   только фолбэк (дата снятия выжимки указана в нём).

2. **Сессия.** `call create_session '{"fileKey":"<fileKey>","description":"…"}'` →
   `sessionId`; один sessionId переиспользуется во всей задаче и передаётся во все
   вызовы, которые его принимают. Для песочницы сначала `create_new_file`.
3. **Разведка.** Структурная: канвасы/фреймы через `get_metadata` (или read-only
   `use_figma` c `return figma.root.children.map(...)`) — имена канвасов, топ-левел
   фреймы, свободные координаты. Смотрите, что уже есть, и повторяйте его конвенции.
4. **Рисование/правки.** Один канвас — один вызов `use_figma`
   (`await figma.setCurrentPageAsync` максимум раз на вызов). Правки существующих
   узлов — по node ID **строчными литералами** из предыдущих возвратов. Каждый
   скрипт `return`-ит `{ createdNodeIds, mutatedNodeIds, … }`. Правила кода — в
   чит-листе; готовые блоки Cervart — в `references/screen-snippets.md`.
5. **Скриншоты.** `get_screenshot` после композиции экрана и после визуального
   фикса — не чаще. Последний прошедший скриншот финален, без повторов «на всякий
   случай».
6. **Отчёт.** Созданные/изменённые node ID, имена канвасов, ссылки на файл
   (`figma.com/design/<fileKey>/<slug>?node-id=<id>`), что удалено из тестового.
   Тест-узлы песочницы удаляются (`node.remove()` по возвращённым ID).

## Макетные конвенции Cervart

- **Канвас** именуется версией релиза: `v1.2.1 | release 3 | 2026.3.1`
  (семвер | номер релиза | дата).
- **Топ-левел фрейм = экран**: 1440×900, имя «route — Название»
  (например, `/wells — Скважины`). Тёмная тема, шрифт Inter, именованные слои.
- Палитра — из демо «Дашборд скважин» (см. `references/screen-snippets.md`):
  bg `#141517`, panel `#191B1D`, card `#1F2124`, field `#232629`, line `#2E3134`,
  text `#EDEFF2`, muted `#8B929A`, accent `#5B8DEF`, ok `#43B97E`,
  warn `#E3A43C`, err `#E06060`.
- **Песочница**: любые эксперименты — только в отдельном файле через
  `create_new_file`, не в «Mantic». «Mantic» — только по явному запросу
  пользователя.

## Limits

- Код `use_figma` ≤ 50 000 символов на вызов — дробите по экранам/секциям.
- Rate-limits Figma MCP: при 429/лимитах — `whoami` (там инструкция), пауза,
  батчинг «один канвас — один вызов».

## Rules

- Токен не печатается, не коммитится, не логируется — ни в одном режиме helper'а.
- Список экранов — только из запроса пользователя; не додумывать экраны самому.
- Не трогать чужие канвасы/фреймы вне задачи; правки — только по ID из разведки.
- `src/` не меняется: это скилл макетов, не имплементации.

## Output

Отчёт: созданные/изменённые node ID по экранам, имена канвасов, ссылки,
скриншот-подтверждения (по одному на композицию/фикс), чистка тест-узлов.

## BLOCKED

- 401 после перелогина, отсутствие токена, недоступность `mcp.figma.com`.
- Нет edit-доступа к целевому файлу (`could not access the requested file`).
- В запросе нет списка экранов и его не у кого уточнить.

## Out of scope

Чтение дампов Figma для имплементации (скилл `figma`), изменения `src/`,
OAuth-настройка на чужих машинах, refresh-токен флоу, генерация дизайн-системы
и библиотек компонентов.
