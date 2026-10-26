# План: миграция конфига opencode V1 → V2 (`.opencode` / Cervart)

Дата: 2026-10-26. Режим: Plan (read-only). Инициалы: `km`.

**Goal.** Перевести конфигурацию opencode (`.opencode/`) из V1-формата в нативный V2 при работающем `opencode 2.1.4`: `opencode.json`, фронтматтеры агентов и команд, порт плагинов `subagent-watchdog` и `agent-config-guard` на V2 API, тексты скиллов (Приложение A) — с сохранением текущего поведения (права, модели, температура 0.1, жёсткий guard). Затронутые файлы — §2 (инвентарь) и §5 (фазы).

Ревью 26.10 (аудит): внесены правки — решения 6–7, §3.1–§3.3, §4, §6.1–§6.2, §7, §9, §10, §13, §15.

Решения пользователя, зафиксированные в плане:
1. Ветка и задача — **текущие**, новая ветка не создаётся.
2. `temperature: 0.1` переносится **через варианты моделей** (`variants` + `model#variant`).
3. Guard остаётся **жёстким**: `fresh !== true` → `BLOCKED` + «перезапусти сервер».
4. Code Mode **явно запрещён всем** агентам (`execute: deny`); точечный `execute: allow` не выдаётся никому.
5. В план добавлена адаптированная версия `25039` (Tasks-формат, tdd-цикл, прогресс-файл, задача `G`) — Приложение A.
6. Модель `plan` — **`xiaomi/mimo-v2.6-pro`** (и агент, и `/plan`), вариант `#temp-low`.
7. `build` получает `#temp-low` — правило 6 без исключений; `thinking: disabled` явно только в `temp-low`, `low`/`high` — каталожные настройки + `temperature` (ревью 26.10).

## 1. Проверенная база

- Бинарник: `opencode 2.1.4` (лог `~/.local/share/opencode/log/opencode.log`, `"cli starting" version=2.1.4`, 2026-10-26T09:34:36Z).
- V1-пакет плагинов: `@opencode-ai/plugin@1.19.3` в `.opencode/node_modules`.
- V2-пакет: `@opencode/plugin@2.1.4` (npm, версия совпадает с бинарником).
- Источники истины: `opencode.ai/v2/docs/{migrate-v1, build/plugins, build/plugins/migrate-v1, permissions, agents, config, instructions}`.
- Локальная сверка типов V2: `@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts` — `app.log` → `/log`, toast → `/tui/show-toast`, `session.list/interrupt`, события с payload `data.*` (и legacy `properties.*`).
- Не выполнено (shell запрещён в сессии): `git status`, `npx vitest`, `opencode debug config`. Соответствующие шаги помечены «при реализации».

## 2. Инвентарь

| Файл / каталог | V1-артефакты | Действие |
| --- | --- | --- |
| `.opencode/opencode.json` | `subagent_depth` в корне (V2 игнорирует + warning), плоский `mcp.figma`, `oauth.redirectUri`, скалярный `timeout`, нет `providers` | фаза 1 |
| `~/.config/opencode/opencode.jsonc` | только `$schema` | не трогаем |
| `~/.config/opencode/package.json` | `@opencode-ai/plugin: 1.18.29` | убрать (фаза 5) |
| `agents/{plan,build,tdd,coder,test-generator,git-manager}.md` | `permission` + `bash` + `task`, `temperature`, `variant` | фаза 2 |
| `commands/{plan,tdd}.md` | поля уже V2 | фаза 3 (модель + вариант) |
| `skills/**/SKILL.md` | структура V2-preferred | фаза 3: watchdog-путь (T3) + задачи T1–T5, T7 Приложения A |
| `plugins/subagent-watchdog.ts`, `plugins/agent-config-guard.ts` | V1 plugin API, `client.*`, `tool()` | **в V2 не работают** → фаза 4 |
| `watchdog/state.ts` + тесты | чистые модули | оставить как есть; новый `watchdog/events.ts` (mapEvent фан-аутится на существующие методы registry) |
| `scripts/agent-kit/agentConfig.ts` + тест | парсер V1-фронтматтера | расширить под V2 (фаза 4) |
| `AGENTS.md`, `local.md` | V2-совместимы | — |
| `tui.json` → `cli.json` | `tui.json` нет | шаг не нужен |
| `auth.json`, `mcp-auth.json`, `opencode.db` | данные инстанса | бэкап (фаза 0) |

`.opencode` — отдельный git-репозиторий (конфиг-репо: `main`, `ts-react-modules-slices`, теги `<variant>-vX.Y.Z`).

## 3. Целевое состояние

### 3.1 `.opencode/opencode.json`

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "plan",
  "instructions": ["local.md"],
  "experimental": {
    "subagent_depth": 2
  },
  "providers": {
    "openrouter": {
      "models": {
        "deepseek/deepseek-v4.1-flash-1017": {
          // low/high — пользовательские варианты поверх каталожных: перенести настройки
          // каталога (сверка ctx.model.list(), §9) и добавить temperature. DeepSeek
          // применяет temperature только с thinking off: в temp-low он выключен явно,
          // в low/high — выключить тоже, если каталог держит thinking on (решение 7).
          "variants": [
            { "id": "low",      "body": { "temperature": 0.1 } },
            { "id": "high",     "body": { "temperature": 0.1 } },
            { "id": "temp-low", "body": { "temperature": 0.1, "thinking": { "type": "disabled" } } }
          ]
        },
        "xiaomi/mimo-v2.6-pro": {
          "variants": [{ "id": "temp-low", "body": { "temperature": 0.1 } }]
        },
        "z-ai/glm-5.3": {
          "variants": [{ "id": "temp-low", "body": { "temperature": 0.1 } }]
        }
      }
    }
  },
  "mcp": {
    "servers": {
      "figma": {
        "type": "remote",
        "url": "https://mcp.figma.com/mcp",
        "oauth": {
          "redirect_uri": "http://127.0.0.1:19876/callback"
        },
        "timeout": {
          "catalog": 60000,
          "execution": 60000
        }
      }
    }
  }
}
```

Пояснения:
- `experimental.subagent_depth: 2` обязателен: дефолт V2 — 1, а `tdd` (субагент) запускает `coder`/`test-generator`.
- `low`/`high` deepseek воспроизводят каталожные варианты (+ `temperature`): объявление своих `variants` стирает каталожные — настройки каталога переносить в тела вариантов явно (§9).
- `plugins` не добавляем: `.opencode/plugins/` обнаруживается автоматически.
- `providers` (не `provider`), `variants` — массив с `id`.
- После `redirectUri → redirect_uri` возможен разовый re-login Figma (`/mcps` → сервер → sign in).

### 3.2 Агенты: фронтматтер V2

Каждый файл конвертируется **целиком**; файл с `permissions`/`system`/`disabled`/`request` читается как V2, а V1-ключи в нём игнорируются с warning.

Пример `plan.md`:

```md
---
description: Планировщик: read-only анализ задачи, план с тестами и git-разделом
mode: primary
model: openrouter/xiaomi/mimo-v2.6-pro#temp-low
steps: 60
permissions:
  - action: external_directory
    resource: "*"
    effect: ask
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".opencode/plans/*"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "cat *"
    effect: allow
  - action: shell
    resource: "grep *"
    effect: allow
  - action: shell
    resource: "head *"
    effect: allow
  - action: shell
    resource: "ls *"
    effect: allow
  - action: shell
    resource: "rg *"
    effect: allow
  - action: shell
    resource: "tail *"
    effect: allow
  - action: shell
    resource: "wc *"
    effect: allow
  - action: shell
    resource: "git status *"
    effect: allow
  - action: shell
    resource: "git diff *"
    effect: allow
  - action: shell
    resource: "git log *"
    effect: allow
  - action: shell
    resource: "git show *"
    effect: allow
  - action: shell
    resource: "git branch --show-current"
    effect: allow
  - action: shell
    resource: "node .opencode/scripts/figma-dump.js *"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: tdd
    effect: allow
  - action: subagent
    resource: build
    effect: allow
  - action: webfetch
    resource: "*"
    effect: allow
  - action: websearch
    resource: "*"
    effect: allow
---

Load `plan` with the `skill` tool and follow it.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
```

Правила конвертации (для всех шести агентов):

1. `permission.*` → `permissions[]`. В V2 **последнее совпадение побеждает** — сохранять порядок V1-мапы как есть: у большинства агентов это «широкий deny → узкие allow», у `build` наоборот (широкий `allow *` → узкие `deny`) — оба порядка корректны, менять местами нельзя.
2. `bash` → `shell`. Пары `X` и `"X *"` схлопываются в `"X *"` (паттерн с `" *"` матчит и команду без аргументов).
3. `task` → `subagent`, `resource` = ID агента; `task: deny` → одна запись `resource: "*"`.
4. `edit`: в V2 только `*` и `?`, `*` пересекает `/`, `**` спец-смысла не имеет (это просто два `*` подряд). Переписывать **осознанно, не механически**: `src/**` → `src/*` (два `*` сливаются в один), `.git/**` → `.git/*`, а `**/*.local` → `*.local` (не `*/*.local` — паттерн должен матчить файлы и в корне, как матчил V1).
5. `temperature` удалить (V2 не отправляет `request.body` в модель) — температура живёт в вариантах (§3.1).
6. `variant: low|high` → `model: provider/model#variant`; для моделей/агентов без варианта — `#temp-low` (единое правило, без исключений: `build` тоже получает `deepseek#temp-low`, решение 7).
7. `mode`, `steps`, `description` — оставить.
8. `execute: deny` — всем шести агентам, без исключений. Запись файлов не страдает: `edit`/`write` — first-class инструменты под действием `edit`.

Сводка по агентам:

| Агент | model | Ключевые правки |
| --- | --- | --- |
| plan | `openrouter/xiaomi/mimo-v2.6-pro#temp-low` | `edit`: deny `*` + allow `.opencode/plans/*`; `external_directory: ask`; `subagent`: tdd/build; `execute: deny` |
| build | `openrouter/deepseek/deepseek-v4.1-flash-1017#temp-low` | `edit` deny-list `.env*`/`*.local`/`.git/*`/`.husky/*` (порядок allow → deny сохранить); shell-allowlist; `subagent: deny` |
| tdd | `openrouter/z-ai/glm-5.3#temp-low` | `edit`: deny `*` + allow `.tmp/contracts/*`; `subagent`: test-generator/coder/git-manager |
| coder | `openrouter/deepseek/deepseek-v4.1-flash-1017#low` | `edit`: allow `src/*`, затем deny `src/*.test.ts`, `src/*.test.tsx`, `src/*.testHelpers.ts`, `src/shared/testing/*`, `src/shared/api/testing/*` (порядок критичен) |
| test-generator | `openrouter/deepseek/deepseek-v4.1-flash-1017#high` | `edit`: deny `*` + allow только тестовые пути |
| git-manager | `openrouter/deepseek/deepseek-v4.1-flash-1017#low` | длинный deny-список 1:1, схлопнув `X`/`X *`; `git worktree *` остаётся deny |

### 3.3 Команды

- Расхождение моделей `/plan` (`z-ai/glm-5.3`) и агента `plan` (`xiaomi/mimo-v2.6-pro`) устранено решением 6: **обе ссылки — `openrouter/xiaomi/mimo-v2.6-pro#temp-low`**, в `commands/plan.md` модель меняется на mimo.
- `/tdd`: `model: openrouter/z-ai/glm-5.3#temp-low` (синхронизация с агентом `tdd`, A.2).
- `subtask` → `subagent` не требуется (сейчас нет).

### 3.4 Плагины

```
.opencode/plugins/subagent-watchdog/index.ts
.opencode/plugins/agent-config-guard/index.ts
```

- `id`: `cervart.subagent-watchdog`, `cervart.agent-config-guard`.
- Настроенные локальные пути обязаны быть **каталогами** (`x.ts` пропускается с warning).
- Соседние модули (`../../watchdog/state`, `../../scripts/agent-kit/agentConfig`) остаются на месте.

## 4. Маппинг V1 → V2

| V1 | V2 |
| --- | --- |
| `permission.bash/edit/task` | `permissions[]` с `shell`/`edit`/`subagent` |
| `prompt`/`disable`/`maxSteps`/`variant` | `system`/`disabled`/`steps`/`model#variant` |
| `subagent_depth` (корень) | `experimental.subagent_depth` |
| `mcp.<name>` | `mcp.servers.<name>`, `enabled`→`disabled`, `timeout: N`→`{catalog,execution}` |
| `oauth.redirectUri` | `redirect_uri` (`client_id`, `client_secret`, `callback_port`) |
| `plugin: [pkg,[path,opts]]` | `plugins: [pkg, {package, options}]` |
| hooks-объект + `client.*` | `Plugin.define({id, setup(ctx)})`, `ctx.<domain>` |
| `chat.params` | `ctx.session.hook("context")` (наследник `chat.headers` — `"model.request"`) |
| `tool.execute.before/after` | `ctx.tool.hook("execute.before"/"execute.after")` |
| `tool` map + `tool()` | `ctx.tool.transform(editor => editor.add({...}))` (JSON Schema) |
| `client.app.log` | `ctx.app.log({ body })` |
| `client.session.abort` | `ctx.session.interrupt({ sessionID, resume: false })` |
| `client.session.list()` | `ctx.session.list({ directory, limit })` + `cursor.next` |
| `client.tui.showToast` | `ctx.tui.showToast({ body })` — форму подтвердить |
| `lsp` | принимается, не исполняется |

## 5. Фазы

### Фаза 0. Подготовка
1. Бэкап `~/.local/share/opencode/{auth.json,mcp-auth.json,opencode.db}`.
2. В `.opencode`: `git status`, зафиксировать baseline; ветку не создаём — работаем в текущей.
3. Baseline: `opencode debug config`, лог-строки `watchdog started` / `guard initialized`.

Приёмка: копии на месте, baseline снят, дерево чистое (или чужие изменения задокументированы).

### Фаза 1. `opencode.json` → V2 (низкий риск)
1. Применить §3.1.
2. `opencode debug config` → нет warning'ов о deprecated/ignored полях; видны `experimental.subagent_depth`, `mcp.servers.figma`, `providers.openrouter.models.*.variants`.
3. `/mcps` → `figma` connected (иначе re-login).

Приёмка: конфиг нормализуется без warning'ов, Figma MCP работает, модели с вариантами видны.

### Фаза 2. Агенты → V2-фронтматтер (блокирующий шаг)
1. Конвертировать `plan` и `git-manager`, затем `build`, `tdd`, `coder`, `test-generator`.
2. Проверить резолв `#low`/`#high`/`#temp-low` (`opencode debug config` / `ctx.model.list()`), иначе — правки в `variants`.
3. **Проба записи плана:** из агента `plan` записать `.opencode/plans/_probe.md`, затем удалить.
   - Данные текущей сессии: запись в `.opencode/plans/` **прошла** (этот файл создан агентом `plan`), при этом рантайм декларировал ограничение «только `~/.opencode/plan`». Значит `edit`-правило на `.opencode/plans/*` работает; встроенная политика не перекрывает наш allow. Пробу всё равно оставить как дешёвую страховку после конвертации фронтматтера.
   - Если после конвертации запись запрещена — переименовать агента в `planner`: `agents/planner.md`, `default_agent: "planner"`, `agents.plan.disabled: true`, обновить `commands/plan.md` (`agent: planner`) и тексты скиллов.
4. Smoke прав: `git-manager` не может `git push origin main`; `coder` не может править `*.test.ts`; `plan` пишет только в `.opencode/plans/`.

Приёмка: у всех агентов есть `model` с вариантом, запреты блокируют, планы пишутся, в инструментах агентов **нет** `execute`, но есть `skill`, `agent_config_check`, `figma_*`.

### Фаза 3. Команды и тексты
1. Привести модель `/plan` к `openrouter/xiaomi/mimo-v2.6-pro#temp-low` (решение 6), `/tdd` — добавить `#temp-low`.
2. `skills/tdd` (раздел «Watchdog and restart»): путь плагина → `.opencode/plugins/subagent-watchdog/index.ts`.
3. Тексты про guard **не меняются** — семантика жёсткая (§6.2).
4. Выполнить адаптированные задачи `T1–T7` из Приложения A (план `25039`) в том же заходе: Tasks-формат, паузы, прогресс-файл, `коммит`, описания.

Приёмка: `rg -n "plugins/subagent-watchdog" .opencode/skills` находит новый путь; упоминаний `.ts`-файла верхнего уровня нет; чек-лист Приложения A (§A.6) закрыт.

### Фаза 4. Плагины: порт в V2 API
1. `cd .opencode && npm i @opencode/plugin@2.1.4`, удалить `@opencode-ai/plugin`.
2. Каталоги `plugins/<id>/index.ts`, старые `.ts` удалить.
3. Перенести логику: watchdog (события/таймер/interrupt/toast), guard (модель + `agent_config_check`).
4. Адаптер событий `watchdog/events.ts` `mapEvent(event)` — `data.*` и legacy `properties.*`; выход — дискриминированный унион (`child-created`/`activity`/`deleted`/`status`/`idle`), фан-аут на существующие методы registry в плагине; `watchdog/state.ts` не меняется.
5. Guard: snapshot, привязанный к загрузке процесса (§6.2).
6. `scripts/agent-kit/agentConfig.ts`: поддержать `model: x#variant` и V1-fallback на время перехода.
7. Тесты (§7).

Приёмка: оба плагина в активном списке (самоотчёт в логе), `agent_config_check` доступен, тесты зелёные.

### Фаза 5. Приёмка и зачистка
1. Полный smoke (§10).
2. Удалить V1-зависимость в `~/.config/opencode` (или обновить до `@opencode/plugin@2.1.4`).
3. `.opencode/README.md`: пути плагинов, `experimental.subagent_depth`, варианты моделей, `planner` (если переименовали).
4. Тег `<variant>-v2.0.0` — через `git-manager` после подтверждения.

## 6. Порт плагинов

### 6.1 subagent-watchdog

```ts
import { Plugin } from '@opencode/plugin';
import process from 'node:process';
import { createRegistry, readOptions } from '../../watchdog/state';
import { mapEvent } from '../../watchdog/events';

export default Plugin.define({
  id: 'cervart.subagent-watchdog',
  async setup(ctx) {
    const options = readOptions(process.env);
    const log = (level: string, message: string, extra?: Record<string, unknown>) =>
      ctx.app.log({ body: { service: 'subagent-watchdog', level, message, extra } }).catch(() => {});
    const toast = (message: string, variant: string) =>
      ctx.tui.showToast({ body: { title: 'Subagent watchdog', message, variant } }).catch(() => {});

    if (!options.enabled) { void log('info', 'watchdog disabled by environment'); return; }

    const registry = createRegistry({ timeoutMs: options.timeoutMs });
    const controller = new AbortController();

    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        const mapped = mapEvent(event);
        if (!mapped) continue;
        switch (mapped.type) {
          case 'child-created': registry.onChildCreated(mapped.info); break;
          case 'activity': registry.onActivity(mapped.sessionID); break;
          case 'deleted': registry.onDeleted(mapped.sessionID); break;
          case 'status': registry.onStatus(mapped.sessionID, mapped.status); break;
          case 'idle': registry.onIdle(mapped.sessionID); break;
        }
      }
    })();

    await ctx.tool.hook('execute.after', (event) => {
      const sessionID = (event as { sessionID?: string }).sessionID;   // подтвердить при порте
      if (sessionID) registry.onActivity(sessionID);
    });

    const timer = setInterval(async () => {
      for (const sessionID of registry.collectAborts(Date.now())) {
        await ctx.session.interrupt({ sessionID, resume: false }).catch(() => {});
        await toast(`Субагент ${sessionID} не подавал признаков активности — сессия прервана`, 'warning');
      }
    }, 30_000);

    const page = await ctx.session.list({ directory: ctx.location.directory, limit: 50 });
    for (const session of page.data ?? []) registry.onChildCreated(session);

    return () => { controller.abort(); clearInterval(timer); };
  },
});
```

Замечания:
- `session.parentID` в V2 сохранён — фильтр «только дочерние» работает.
- Костыль «не ждать клиент в setup / setTimeout 1000» убирается: `await` клиентских вызовов в `setup` допустим.
- `mapEvent` — чистая функция, чтобы не тащить shape-зависимость в `watchdog/state.ts`; контракт выхода — дискриминированный унион (`{type: 'child-created', info}` / `{type: 'activity'|'deleted'|'idle', sessionID}` / `{type: 'status', sessionID, status}`), фан-аут на существующие методы registry (`onChildCreated`/`onActivity`/`onDeleted`/`onStatus`/`onIdle`); `state.ts` не меняется.

### 6.2 agent-config-guard (жёсткая семантика при автоперезагрузке)

V2 перечитывает конфиг на сохранение и перезагружает агентов/команды/скиллы/MCP/**плагины**. Если снимать snapshot в `setup`, то после правки агент-файла плагин перезагрузится, переснимет snapshot и `fresh` снова станет `true` — жёсткий блок не сработает никогда.

Решение — snapshot привязан к процессу, а не к загрузке плагина:

```ts
const bootId = `${process.pid}:${Math.round(performance.timeOrigin)}`;
const key = `snapshot/${bootId}`;
const stored = await ctx.storage.get(key);
const initial = (stored as ConfigSnapshot | undefined)
  ?? await snapshot(await collectConfigFiles(ctx.location.directory));
if (!stored) await ctx.storage.set(key, initial);
const serverStartedAt = new Date(performance.timeOrigin).toISOString();
```

Остальное — прежняя логика: `tool.execute.before` → свежесть + наличие модели у целевого субагента; `session.hook("context")` → то же для guarded-агентов; `ctx.tool.transform` → инструмент `agent_config_check`.

Старые ключи `snapshot/*` чистить при старте плагина (удалять все `snapshot/*`, кроме текущего `key`) — иначе `ctx.storage` растёт с каждым рестартом процесса.

Источник модели — `ctx.agent.get({ agentID })` (нативный API), файловый парсер остаётся fallback.

Подтвердить при порте: имя инструмента dispatch (`subagent` в V2 vs `task` в V1) и имя поля аргумента (`subagent_type`/`agent`) — поддержать оба.

## 7. Тесты

Изменяемые:
- `watchdog/plugin.test.ts` — под `Plugin.define` с fake ctx (`event.subscribe`, `session.interrupt`, `app.log`, `tool.hook`).
- `scripts/agent-kit/agentConfig.test.ts` — кейсы `model: x#variant`, смешанный V1/V2-фронтматтер.

Новые:
- `watchdog/events.test.ts` — `mapEvent` для `session.created/updated/deleted`, `session.status`, `session.idle`, `message.updated`, `message.part.updated`, `session.diff`, оба payload-варианта; выход — унион-события (контракт §6.1), фан-аут в плагине на методы registry.
- `plugins/agent-config-guard/*.test.ts` — блок без модели, пропуск не-guarded, JSON-контракт, «snapshot переживает перезагрузку плагина» (два `setup` с общим storage).

Команды (из `.opencode`):
```
npx vitest run --config watchdog/vitest.config.ts
npx vitest run --config scripts/agent-kit/vitest.config.ts
```
До установки `@opencode/plugin` тесты плагинов красные — ожидаемый red фазы 4.

## 8. Контракт `agent_config_check` (не меняется)

```json
{
  "fresh": true,
  "checked": ["пути изменённых файлов"],
  "serverStartedAt": "ISO-время старта процесса",
  "agents": { "tdd": { "model": "openrouter/z-ai/glm-5.3#temp-low" } },
  "missingModel": ["agent-id"]
}
```

Потребители: `skills/plan` (Runtime), `skills/tdd` (перед каждым dispatch). `fresh: false` → `BLOCKED` + «перезапусти сервер»; `missingModel` → `BLOCKED` с именем агента.

## 9. Риски

| Риск | Влияние | Мера |
| --- | --- | --- |
| Смешение V1/V2 ключей в одном файле | V1-ключи игнорируются с warning | конвертировать файл целиком, проверять лог |
| `**` в glob-ах | путь матчится не так, как в V1 | переписать на `*`, проверить пробой |
| Порядок правил прав | легко открыть лишнее | deny широкий первым, узкие allow после |
| `subagent_depth` дефолт 1 | tdd не запустит coder | `experimental.subagent_depth: 2` |
| Объявление `variants` стирает каталожные варианты | потеря настроек `low`/`high` | перенести настройки каталога в тела вариантов + `temperature`; сверить `ctx.model.list()` (§3.1) |
| DeepSeek игнорирует `temperature` при thinking | стиль не зафиксируется | `thinking: disabled` — явно в `temp-low`; для `low`/`high` — сверка каталога, при необходимости добавить (решение 7) |
| V2 плагины не работают до порта | нет watchdog/guard | не гонять tdd-прогоны в фазах 1–3 |
| `external_directory` разрешён по умолчанию | read-only агенты читают вне проекта | явный `ask` |
| OAuth Figma после rename | MCP просит авторизацию | `/mcps` → sign in |
| Имя инструмента dispatch и поля аргумента | guard не блокирует | `ctx.tool.list()`, поддержать оба |
| Code Mode запрещён всем | сценарий только через `execute` сломается | правило на конкретный инструмент, не на `execute`; фиксировать как баг конфига |
| Встроенная политика `plan` | планы в `.opencode/plans/` не пишутся | факт: запись в `.opencode/plans/` прошла, но тексты рантайма всё ещё гласят «только `~/.opencode/plan`» — проба в фазе 2; fallback — агент `planner` |
| Смена формата событий | watchdog «слепнет» | `mapEvent` с двумя payload + лог неизвестных типов |

## 10. Приёмка

1. `opencode debug config` — без warning'ов; `experimental.subagent_depth`, `mcp.servers.figma`, `providers.openrouter.models.*.variants` на месте.
2. `opencode service status` healthy; API инстанса отвечает. Имена CLI/пути (`opencode debug config`, `opencode api get /api/info`) сверить с V2 при реализации — server API заявлен как breaking change, путь `/api/info` мог смениться.
3. `rg 'watchdog started|guard initialized' ~/.local/share/opencode/log/opencode.log` — обе строки после старта.
4. `agent_config_check` → `missingModel: []`, у 6 агентов есть `model`.
5. Жёсткий guard: сохранить `agents/coder.md` при живом инстансе → `fresh: false` + путь; после `opencode service restart` → `fresh: true`.
6. Права: нет `git push origin main` у git-manager, нет правки `*.test.ts` у coder, plan пишет только в `.opencode/plans/`.
7. У каждого агента нет `execute`, но есть `skill`, `agent_config_check`; `figma_*` доступны.
8. Figma MCP connected, ресурсы читаются.
9. Watchdog абортит «залипшую» сессию; `OPENCODE_SUBAGENT_WATCHDOG=off` логирует отключение.
10. Мини-прогон `/tdd` на одной задаче: `tdd → test-generator → coder` проходит при живых guard/watchdog.
11. Vitest-конфиги зелёные.

## 11. Откат

- `.opencode`: вернуть файлы через `git` (текущая ветка, без switch) + `opencode service restart`.
- Данные инстанса: восстановить `auth.json`, `mcp-auth.json`, `opencode.db` из бэкапа фазы 0.
- Пофайловый откат независим: агенты (фаза 2) и плагины (фаза 4) откатываются отдельно.
- Не направлять V1-инстанс на файлы, переведённые в V2-форму.

## 12. За рамками

Серверный API/клиенты, `lsp`-сценарии, история сессий V1, `cli.json`/темы/кейбинды, публикация плагинов, код приложения Cervart и CI.

## 13. Git

Два репозитория, и «текущая ветка» у каждого своя:

- Корневой репозиторий проекта: по плану `25039` (ревизия 26.10) — `km_feat/25039-model-settings`; подтвердить `git branch --show-current` в фазе 0.
- Вложенный `.opencode`: отдельный клон `opencode-config`, ветка `ts-react-modules-slices` (по `25039`); `.opencode/` и `.tmp/` в gitignore корня.

Правила:
- `branch`: **текущая, не менять** в обоих репозиториях; новая не создаётся.
- `base`: текущая; `switch: off`; `sync: off` (ветки не меняются).
- `tree`: `unknown` — `git status` не выполнялся; обязательна проверка обоих репозиториев в фазе 0.
- `commit/push`: вручную или по подтверждённому close-out через `git-manager`; `merge`/MR — вручную. Для local-only правок (`25039`, решение 8) коммит — только в `.opencode`-репозитории, вручную, вне скоупа плана.
- `initials`: `km`; `task number`: `25039` (подтверждается пользователем в фазе 0).
- Отступления от формата skill `plan` (осознанные, зафиксированы ревью 26.10): собственного task number у миграции нет (используется `25039` встроенной адаптации); `base: текущая` вне allowed values (`test`/`main`/`develop`); Runtime получена без `agent_config_check` (инструмент недоступен — §14) — по букве skill это `BLOCKED`, для config-миграции допустимо: dispatch из этого плана не выполняется.

## 14. Runtime

- `agent_config_check` **недоступен** в этой сессии: его нет в каталоге инструментов Code Mode (доступны только 8 инструментов `opencode`). Карта `agent → model`, `fresh`, `serverStartedAt` не получены; dispatch не выполнялся.
- Следствие: **V1-плагины в V2 не загружаются** — `subagent-watchdog` и `agent-config-guard` сейчас неактивны, защиты (жёсткий guard, аборт зависших субагентов) нет. Это усиливает приоритет фазы 4.
- Версия инстанса: `opencode 2.1.4`, `cli starting` 2026-10-26T09:34:36Z.
- Ограничения сессии: `shell` запрещён (`permission.rejected`). Запись в `.opencode/plans/` работает (этот файл создан агентом `plan`), хотя рантайм декларирует ограничение `~/.opencode/plan`; каталога `~/.opencode/plan` нет, поэтому запись туда отклоняется.

## 15. Открытые вопросы

1. ~~`plan` (встроенный ID) или `planner` (свой ID)~~ — **закрыт 26.10**: агент `plan` записал этот файл в `.opencode/plans/`, значит `edit`-allow работает и встроенная политика наш allow не перекрывает. Переименование в `planner` не требуется; проба записи остаётся дешёвой страховкой после конвертации фронтматтера.
2. Нужен ли кому-то из скиллов code-mode-only инструмент — по умолчанию нет; при обнаружении лечится правилом на инструмент, а не включением `execute`.
3. Гигиена планов: в `.opencode/plans/` три открытых плана под номером `25039` (`25039-plan-tdd-tasks.md`, `25039-gtm-semi-auto-layout.md`, этот). Файлы не пересекаются, но порядок исполнения и закрытие лишних — за пользователем.
4. `build` → `#temp-low` принято по умолчанию (вопрос ревью оставлен без ответа). Альтернатива: `build` → каталожный `#low` с исключением в правиле 6 — тогда убрать `temp-low` из deepseek-вариантов и поправить сводную таблицу §3.2.

## 16. Приложение A: адаптированный план `25039` (Tasks-формат и tdd-цикл) под V2

Источник: `.opencode/plans/25039-plan-tdd-tasks.md`, status `ready`, ревизия 26.10, **не исполнен**. Исходный файл не переписывается; здесь — адаптация под V2 и встраивание в фазы миграции.

### A.1 Что переносится без изменений

- Декомпозиция: `plan` выдаёт **Tasks** (`id` `T1…Tn`, goal, affected files, steps, tests, verify) с гранулярностью по объёму и сложности; механика в 1–2 файлах объединяется, рискованное дробится мельче, тривиальная работа = одна задача.
- TDD-цикл `tdd` **по одной задаче**: `agent_config_check` → тесты → red (skeleton) → green → отметка прогресса → **пауза с отчётом** «сделано / осталось / следующая»; продолжение только по явному «продолжи».
- One contract per plan; per-task tests; green = `pnpm typecheck`, финальная проверка = `pnpm build`/`pnpm test`.
- Прогресс-файл `.tmp/contracts/<slug>.progress.md` (чекбоксы `T*`, `G`, строка `Last:`); рассинхрон с планом → `BLOCKED`.
- Команда `коммит <task-number>` (коммит без push, Conventional Commits, хуки обязательны); `закрыть <task-number>` не меняется; push/merge — только в close-out/MR вручную.
- Обязательная финальная задача `G: git close-out`; для local-only (`branch: none`, файлы в gitignore) `G` = только `git status`.
- Legacy: план без секции Tasks = одна задача.
- Ссылок на `.tmp/plans/` не остаётся; каталог планов — `.opencode/plans/<slug>.md`.

### A.2 Что адаптируется под V2

| `25039` (писано под V1-инстанс) | Адаптация V2 |
| --- | --- |
| `permission` + `resource: ".opencode/plans/**"` | `permissions[]` + ресурс `.opencode/plans/*` (в V2 `*` пересекает `/`) |
| «guard снапшотит конфиг на старте» | snapshot привязан к процессу (`process.pid` + `performance.timeOrigin`, хранение в `ctx.storage`), иначе автоперезагрузка конфига обнуляет жёсткий блок |
| «guard блокирует dispatch после первой правки `.opencode/**`» | **сейчас не блокирует**: V1-плагины в V2 не запускаются, `agent_config_check` в текущей сессии недоступен. После фазы 4 ограничение возвращается в жёстком виде |
| «один ручной сеанс `@build`, пока guard не заблокировал» | сохранено, причина меняется: после фазы 4 любая правка `.opencode/**` требует `opencode service restart` перед следующим dispatch |
| `variant: low/high`, `temperature: 0.1` | `model: provider/model#variant` + `providers.openrouter.models.*.variants` (§3.1) |
| «permissions не меняем» | состав правил не меняем; меняем форму (`permissions`, `shell`, `subagent`) и добавляем `execute: deny` |
| `agents/plan.md` — точечная правка `permission.edit` | полная конвертация фронтматтера (фаза 2) + `edit`-allow на `.opencode/plans/*` |
| `commands/tdd.md`: `description` + `agent` + `model: openrouter/z-ai/glm-5.3` (варианта нет) — уточнено по ревью 26.10 | добавить `#temp-low` (синхронизация с агентом `tdd`, §3.3) |
| прогресс-файл в `.tmp/contracts/` «чтобы не менять permissions» | остаётся: `tdd` получает `edit`-allow `.tmp/contracts/*` в новой форме |
| legacy-план = одна задача | без изменений |

### A.3 Задачи (адаптированные) и место в фазах

- **T1. `skills/plan/SKILL.md` — формат Tasks.** Заменить буллет `Steps` на `Tasks` (поля, гранулярность, каждая задача оставляет дерево зелёным, `tests: existing suite / manual check` для config/docs), переформулировать `Tests` как общий TDD-порядок, добавить число задач в Output. Фаза 3.
- **T2. `skills/plan/SKILL.md` — Git-блок.** Добавить `commits` (per-task / single / группы) и обязательную задачу `G: git close-out` с local-вариантом. Фаза 3.
- **T3. `skills/tdd/SKILL.md` — цикл по задачам.** Шаг 2 «Contract» один раз; шаг 3 «Task loop» (dispatch guard → тесты → red → green → прогресс → пауза); шаг 4 «Final review and close-out» (задача `G`); правило local-only; legacy-fallback; watchdog-правила без изменений, но путь плагина → `.opencode/plugins/subagent-watchdog/index.ts`. Тексты про `fresh`/BLOCKED **не меняются** (жёсткая семантика). Фаза 3.
- **T4. `skills/tdd/SKILL.md` — прогресс-файл.** Формат `.tmp/contracts/<slug>.progress.md`: чтение при старте, продолжение с первой незакрытой, `BLOCKED` при рассинхроне. Фаза 3.
- **T5. `skills/git-policy/SKILL.md` — команда `коммит <task-number>`.** Коммит без push, stage явных путей или `git add -u`, Conventional Commits `<type>: <task-number> <summary>`, хуки обязательны; список tdd-команд: `branch.create`, `branch.switch`, `коммит`, `закрыть`. Фаза 3.
- **T6. Описания.** `agents/tdd.md` `description` («…red/green по задачам плана, паузы с отчётом…»), синхронно `commands/tdd.md`. Выполнять вместе с конвертацией фронтматтера. Фаза 2/3.
- **T7. `skills/build/SKILL.md`.** Путь `.opencode/plans/` уже применён 26.10 — проверить, что в V2-тексте нет ссылок на `.tmp/plans/`; права `build` не меняются. Фаза 3.
- **G. Git close-out.** Local-only: только `git status` в обоих репозиториях, без коммитов; коммит `.opencode`-репозитория — вручную, вне скоупа.

Каждая задача verification: `rg` по устаревшим путям/полям + ревью текста; для T1–T7 автотестов нет (markdown/config), `test-generator` не диспатчить.

### A.4 Порядок и пересечения

1. T1–T7 идут **в фазе 3**, до порта плагинов (фаза 4): пока guard не загружен, правки `.opencode/**` не блокируются, и весь набор текстов делается одним заходом.
2. Пересечение с фазой 2: `agents/plan.md`, `agents/tdd.md` конвертируются один раз — фронтматтер и `description` вместе, без повторных проходов.
3. Пересечение с фазой 4: путь watchdog-плагина упоминается только в T3, чтобы не править `skills/tdd` дважды.
4. Конфликт с исходным `25039`: он не знает про `execute: deny`, автоперезагрузку конфига и boot-snapshot. Формулировки «guard снапшотит на старте» в T3 переписать под §6.2, иначе после миграции текст будет противоречить поведению.
5. После фазы 4 любая правка `.opencode/**` → `opencode service restart` до следующего dispatch (жёсткий guard, решение 3).

### A.5 Риски адаптации

| Риск | Мера |
| --- | --- |
| Правки скиллов и порт плагинов в одном заходе — guard не работает, защиты нет | сначала smoke-тесты плагинов, затем рестарт; в окне между правками tdd-прогоны не запускать |
| T1/T3 меняют контракт планов, а старые планы (`25039` и др.) написаны в прежнем формате | legacy-fallback «план без Tasks = одна задача» обязателен |
| `skills/tdd` правится в T3 и T4 | объединить в один проход по файлу |
| Прогресс-файл в `.tmp/contracts/` семантически чужой каталог | зафиксировано осознанно ради прав `tdd`; менять не в этой задаче |
| `коммит` без push легко спутать с close-out | явно в `git-policy`: push только в `закрыть`, MR/merge вручную |

### A.6 Верификация Приложения A

1. `rg -n "tmp/plans" .opencode/skills .opencode/agents` — пусто.
2. `rg -n "Steps|Tasks|commits|git close-out|progress" .opencode/skills/plan/SKILL.md .opencode/skills/tdd/SKILL.md` — новые секции на месте, старого `Steps` нет.
3. Чек-лист `25039` (роль автотестов): Tasks-формат и гранулярность; общий Git-блок + `G`; `commits`; per-task цикл с паузами; прогресс-файл читается/пишется/возобновляет; local-only; legacy = одна задача; green = `pnpm typecheck`; `коммит` без push; `закрыть` не изменился.
4. `pnpm lint && pnpm typecheck && pnpm test` — репозиторий не задет (правки вне `src/`).
5. Smoke после `opencode service restart`: `agent_config_check` (`fresh: true`, `missingModel: []`), mini-план из 2–3 задач в `.opencode/plans/`, dry-run `tdd` (первая задача + пауза с отчётом).

### A.7 Contract data (дельта к §8)

- **План:** секция `Tasks` (`id`, goal, files, steps, tests, verify); Git `commits` + обязательная `G: git close-out`; путь `.opencode/plans/<slug>.md`.
- **Прогресс:** `.tmp/contracts/<slug>.progress.md` — чекбоксы `T1…Tn`, `G`, строка `Last:`.
- **Git-команды для `tdd`:** `branch.create`, `branch.switch`, `коммит <task-number>` (без push), `закрыть <task-number>`.
- **Ошибки:** рассинхрон прогресс-файла с планом → `BLOCKED` и вопрос пользователю; пауза с незакрытыми задачами — норма; задача без goal/steps/tests/verify — план не выдаётся.
- **Out of scope:** `src/**`, `docs/`, `opencode.jsonc`, остальные permissions, plan-мод как внешний слой, MR/merge, коммит `.opencode`-репозитория, чекбоксы прогресса внутри плана.
