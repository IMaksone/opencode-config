# Блоки Cervart — заготовки кода для `use_figma`

Адаптация демо «Дашборд скважин» (сессия 2026-11-11) под правила figma-use:
шрифты грузим до мутаций, цвета 0–1, авто-лейаут для связанных детей, без
`setPluginData`/`figma.notify`, `return` с ID. Скаффолд (раздел 1) обязателен в
каждом скрипте; блоки 3–7 собираются в один вызов на канвас.

Конвенции: экран 1440×900, тёмная тема, Inter; канвас = релиз
(`v1.2.1 | release 3 | 2026.3.1`); фрейм = «route — Название».

## 1. Скаффолд (в каждом скрипте)

```js
// --- страница (один переключение на вызов; контекст сбрасывается на первую) ---
const page = figma.root.children.find((p) => p.id === 'PAGE_ID'); // ID из разведки
await figma.setCurrentPageAsync(page);

// --- шрифты: грузим ДО мутаций, стиль не угадываем ---
async function resolveFont(family, candidates) {
  const available = await figma.listAvailableFontsAsync();
  const styles = available.filter((f) => f.fontName.family === family).map((f) => f.fontName.style);
  const list = styles.length ? styles : ['Regular'];
  for (const c of candidates) {
    if (list.includes(c)) return { family, style: c };
  }
  return { family, style: list[0] };
}
const F_REG  = await resolveFont('Inter', ['Regular']);
const F_MED  = await resolveFont('Inter', ['Medium', 'Regular']);
const F_SEMI = await resolveFont('Inter', ['Semi Bold', 'Medium', 'Bold']); // «Semi Bold» с пробелом!
await Promise.all([F_REG, F_MED, F_SEMI].map((f) => figma.loadFontAsync(f)));

// --- палитра демо «Дашборд скважин» (hex → 0–1) ---
const hex = (h) => {
  const v = h.replace('#', '');
  return { r: parseInt(v.slice(0, 2), 16) / 255, g: parseInt(v.slice(2, 4), 16) / 255, b: parseInt(v.slice(4, 6), 16) / 255 };
};
const C = {
  bg: hex('#141517'), panel: hex('#191B1D'), card: hex('#1F2124'), field: hex('#232629'),
  line: hex('#2E3134'), text: hex('#EDEFF2'), muted: hex('#8B929A'), accent: hex('#5B8DEF'),
  ok: hex('#43B97E'), warn: hex('#E3A43C'), err: hex('#E06060')
};
const paint = (color, opacity) => {
  const p = { type: 'SOLID', color };
  if (opacity !== undefined) p.opacity = opacity; // альфа — только здесь, не в color
  return [p];
};

// --- хелперы узлов (каждый push-ит ID) ---
const ids = [];
function mkFrame(parent, name, x, y, w, h, fills) {
  const f = figma.createFrame();
  parent.appendChild(f);
  f.name = name; f.resize(w, h); f.x = x; f.y = y;
  f.fills = fills === undefined ? [] : fills;
  ids.push(f.id);
  return f;
}
function mkRect(parent, name, x, y, w, h, fills, radius) {
  const r = figma.createRectangle();
  parent.appendChild(r);
  r.name = name; r.resize(w, h); r.x = x; r.y = y;
  r.fills = fills === undefined ? [] : fills;
  if (radius) r.cornerRadius = radius;
  ids.push(r.id);
  return r;
}
function mkEllipse(parent, name, x, y, d, fills, strokes) {
  const e = figma.createEllipse();
  parent.appendChild(e);
  e.name = name; e.resize(d, d); e.x = x; e.y = y;
  e.fills = fills === undefined ? [] : fills;
  if (strokes) { e.strokes = paint(strokes); e.strokeWeight = 1.5; }
  ids.push(e.id);
  return e;
}
function mkText(parent, name, str, x, y, size, color, font, opts) {
  const t = figma.createText();
  parent.appendChild(t);
  t.name = name; t.fontName = font; t.characters = str; t.fontSize = size;
  t.fills = paint(color);
  t.lineHeight = { unit: 'PIXELS', value: Math.round(size * 1.35) };
  if (opts && opts.tracking) t.letterSpacing = { unit: 'PERCENT', value: opts.tracking };
  t.x = x; t.y = y;
  ids.push(t.id);
  return t;
}
```

## 2. Экранный фрейм (не в 0,0!)

```js
// Топ-левел узлы не в (0,0): встаём правее самого правого на канвасе.
function freeX(page) {
  return page.children.reduce((m, n) => Math.max(m, n.x + n.width), 0) + 120;
}
const G = { W: 1440, H: 900, SIDEBAR: 240, HEADER: 72, PAD: 32, GAP: 16 };
const root = mkFrame(page, '/wells — Скважины', freeX(page), 0, G.W, G.H, paint(C.bg));
root.cornerRadius = 12;
root.clipsContent = true;
root.effects = [{
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.35 },
  offset: { x: 0, y: 12 }, radius: 32, visible: true, blendMode: 'NORMAL', showShadow: true
}];
```

## 3. Сайдбар с навигацией

```js
function drawSidebar(root) {
  const side = mkFrame(root, 'Сайдбар', 0, 0, G.SIDEBAR, G.H, paint(C.panel));
  mkRect(side, 'Граница', G.SIDEBAR - 1, 0, 1, G.H, paint(C.line));

  const logo = mkFrame(side, 'Логотип', 16, 20, 208, 32, []);
  const mark = mkFrame(logo, 'Знак', 0, 2, 28, 28, paint(C.accent));
  mark.cornerRadius = 8;
  mkText(mark, 'C', 'C', 10, 5, 14, C.text, F_SEMI);
  mkText(logo, 'CERVART', 'CERVART', 40, 8, 13, C.text, F_SEMI, { tracking: 12 });

  // Навигация — связанные дети => авто-лейаут
  const nav = figma.createAutoLayout('VERTICAL', { name: 'Навигация', itemSpacing: 4 });
  side.appendChild(nav);
  nav.x = 16; nav.y = 84;
  ids.push(nav.id);
  const items = ['Дашборд', 'Скважины', 'Месторождения', 'Отчёты', 'Алерты', 'Настройки'];
  items.forEach((item, i) => {
    const active = i === 0;
    const row = figma.createFrame();
    nav.appendChild(row);            // сначала appendChild…
    row.name = (active ? '● ' : '') + item;
    row.resize(208, 40);             // …потом resize (сброс sizing)…
    if (active) {
      row.fills = paint(C.field);
      row.cornerRadius = 8;
      mkRect(row, 'Индикатор', 0, 10, 3, 20, paint(C.accent), 2);
    }
    const icon = mkFrame(row, 'Иконка', 14, 12, 16, 16,
      [{ type: 'SOLID', color: active ? C.accent : C.muted, opacity: active ? 0.9 : 0.35 }]);
    icon.cornerRadius = 4;
    mkText(row, item, item, 40, 13, 13, active ? C.text : C.muted, active ? F_MED : F_REG);
  });

  mkText(side, 'Версия', 'v0.1.0 · demo', 16, G.H - 28, 11, C.muted, F_REG);
  return side;
}
```

## 4. Шапка с поиском

```js
function drawHeader(root, title, crumbs) {
  const head = mkFrame(root, 'Шапка', G.SIDEBAR, 0, G.W - G.SIDEBAR, G.HEADER, paint(C.panel));
  mkRect(head, 'Граница', 0, G.HEADER - 1, G.W - G.SIDEBAR, 1, paint(C.line));
  mkText(head, 'Заголовок', title, G.PAD, 14, 16, C.text, F_SEMI);
  mkText(head, 'Хлебные крошки', crumbs, G.PAD, 38, 11, C.muted, F_REG);

  const search = mkFrame(head, 'Поиск', 796, 18, 280, 36, paint(C.field));
  search.cornerRadius = 18;
  search.strokes = paint(C.line);
  search.strokeWeight = 1;
  mkEllipse(search, 'Лупа', 14, 12, 12, [], C.muted);
  mkText(search, 'Подсказка', 'Поиск по скважинам…', 34, 11, 13, C.muted, F_REG);

  const bell = mkFrame(head, 'Уведомления', 1088, 18, 36, 36, []);
  bell.cornerRadius = 18;
  bell.strokes = paint(C.line);
  bell.strokeWeight = 1;
  mkEllipse(bell, 'Колокол', 11, 12, 14, [], C.muted);
  mkEllipse(bell, 'Точка', 23, 10, 7, paint(C.err));

  const avatar = mkFrame(head, 'Аватар', 1136, 20, 32, 32, paint(C.accent));
  avatar.cornerRadius = 16;
  mkText(avatar, 'Инициалы', 'ИМ', 9, 8, 11, C.text, F_MED);
  return head;
}
```

## 5. KPI-карточки (ряд — авто-лейаут)

```js
// stats: [{ label, value, delta, tone: 'ok' | 'muted' }]
function drawKpi(content, stats) {
  const row = figma.createAutoLayout('HORIZONTAL', { name: 'Показатели', itemSpacing: G.GAP });
  content.appendChild(row);
  row.x = G.PAD; row.y = G.PAD;
  row.resize(1136, 96); // фиксируем габариты ряда (resize сбрасывает sizing в FIXED)
  ids.push(row.id);
  stats.forEach((s) => {
    const card = figma.createFrame();
    row.appendChild(card);                    // appendChild до layoutSizing
    card.name = 'Карточка / ' + s.label;
    card.resize(272, 96);
    card.layoutSizingHorizontal = 'FILL';     // после append — можно FILL
    card.layoutSizingVertical = 'FIXED';
    card.fills = paint(C.card);
    card.cornerRadius = 12;
    card.strokes = paint(C.line);
    card.strokeWeight = 1;
    mkText(card, 'Метка', s.label, 20, 16, 12, C.muted, F_REG);
    mkText(card, 'Значение', s.value, 20, 38, 24, C.text, F_SEMI);
    mkText(card, 'Динамика', s.delta, 20, 68, 11, s.tone === 'ok' ? C.ok : C.muted, F_REG);
  });
  return row;
}
```

## 6. Таблица со статус-чипами

```js
// wells: [{ id, field, status, tone: 'ok'|'warn'|'err', rate, updated }]
function drawChip(parent, str, tone, x, y) {
  const c = C[tone];
  // Чип — связанные дети (точка + текст) => HUG-лейаут, ширина сама
  const box = figma.createAutoLayout('HORIZONTAL', {
    name: 'Статус / ' + str, itemSpacing: 6,
    paddingLeft: 10, paddingRight: 12, paddingTop: 5, paddingBottom: 5
  });
  parent.appendChild(box);
  box.x = x; box.y = y;
  box.counterAxisAlignItems = 'CENTER';
  box.fills = [{ type: 'SOLID', color: c, opacity: 0.16 }];
  box.cornerRadius = 12;
  ids.push(box.id);
  const dot = figma.createEllipse();
  box.appendChild(dot);
  dot.name = 'Точка'; dot.resize(6, 6); dot.fills = paint(c);
  const label = figma.createText();
  box.appendChild(label);
  label.name = str; label.fontName = F_MED; label.characters = str;
  label.fontSize = 11; label.fills = paint(c);
  return box;
}

function drawTable(content, wells) {
  const table = mkFrame(content, 'Таблица скважин', G.PAD, 136, 720, 384, paint(C.card));
  table.cornerRadius = 12;
  table.strokes = paint(C.line);
  table.strokeWeight = 1;

  mkText(table, 'Заголовок', 'Скважины', 24, 20, 16, C.text, F_SEMI);
  mkText(table, 'Ссылка', 'Все скважины →', 600, 24, 12, C.accent, F_MED);
  mkRect(table, 'Разделитель', 24, 56, 672, 1, paint(C.line));

  const colX = { id: 24, field: 150, status: 372, rate: 520, updated: 600 };
  [['СКВАЖИНА', 'id'], ['МЕСТОРОЖДЕНИЕ', 'field'], ['СТАТУС', 'status'], ['ДЕБИТ', 'rate'], ['ОБНОВЛЕНО', 'updated']]
    .forEach(([label, key]) => mkText(table, 'Колонка / ' + label, label, colX[key], 68, 10, C.muted, F_MED, { tracking: 8 }));

  wells.forEach((w, i) => {
    const y = 92 + i * 52;
    if (i > 0) mkRect(table, 'Линия строки', 24, y - 1, 672, 1, paint(C.line));
    mkText(table, w.id, w.id, colX.id, y + 14, 13, C.text, F_MED);
    mkText(table, w.field, w.field, colX.field, y + 14, 13, C.muted, F_REG);
    drawChip(table, w.status, w.tone, colX.status, y + 11);
    mkText(table, 'Дебит / ' + w.id, w.rate, colX.rate, y + 14, 13, C.text, F_REG);
    mkText(table, 'Обновлено / ' + w.id, w.updated, colX.updated, y + 15, 12, C.muted, F_REG);
  });
  return table;
}
```

## 7. Столбчатый график

```js
function drawChart(content, chart) {
  // chart: { title, sub, months: [...], values: [...] }
  const g = mkFrame(content, 'Дебит по месяцам', G.PAD + 720 + G.GAP, 136, 400, 320, paint(C.card));
  g.cornerRadius = 12;
  g.strokes = paint(C.line);
  g.strokeWeight = 1;

  mkText(g, 'Заголовок', chart.title, 24, 20, 16, C.text, F_SEMI);
  mkText(g, 'Подзаголовок', chart.sub, 24, 44, 11, C.muted, F_REG);
  [136, 184, 232].forEach((gy) => mkRect(g, 'Линия сетки', 24, gy, 352, 1,
    [{ type: 'SOLID', color: C.line, opacity: 0.5 }]));

  const max = Math.max(...chart.values);
  chart.values.forEach((v, i) => {
    const h = Math.round((v / max) * 140);
    mkRect(g, 'Столбец / ' + chart.months[i], 24 + i * 30, 264 - h, 22, h,
      [{ type: 'SOLID', color: C.accent, opacity: 0.35 + (0.6 * i) / 11 }], 4);
    mkText(g, 'Месяц / ' + chart.months[i], chart.months[i], 24 + i * 30 + 8, 272, 10, C.muted, F_REG);
  });
  return g;
}
```

## 8. Сборка экрана и возврат

```js
const content = mkFrame(root, 'Контент', G.SIDEBAR, G.HEADER, G.W - G.SIDEBAR, G.H - G.HEADER, []);
drawSidebar(root);
drawHeader(root, 'Дашборд · Скважины', 'Cervart  /  Эксплуатация  /  Скважины');
drawKpi(content, [
  { label: 'Всего скважин', value: '128', delta: '+4 за месяц', tone: 'ok' },
  { label: 'Активные', value: '96', delta: '75% парка', tone: 'muted' },
  { label: 'В обслуживании', value: '12', delta: '−2 к прошлой неделе', tone: 'ok' },
  { label: 'Средний дебит, т/сут', value: '28,4', delta: '+1,8 к октябрю', tone: 'ok' }
]);
drawTable(content, [
  { id: 'СК-117', field: 'Западно-Камышная', status: 'Активна', tone: 'ok', rate: '34,2', updated: '12 мин назад' },
  { id: 'СК-204', field: 'Приразломная', status: 'Обслуживание', tone: 'warn', rate: '—', updated: '1 ч назад' },
  { id: 'СК-098', field: 'Южно-Мыльджинская', status: 'Алерт', tone: 'err', rate: '22,1', updated: '3 ч назад' }
]);
drawChart(content, {
  title: 'Дебит, т/сут', sub: 'последние 12 месяцев',
  months: ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'],
  values: [22, 25, 24, 27, 26, 29, 31, 30, 28, 32, 34, 33]
});

// Обязательный возврат: все затронутые ID
return { createdNodeIds: ids, rootId: root.id, canvas: page.name };
```

## 9. Правки по ID и чистка (отдельные вызовы)

```js
// Правка: ID из прошлого возврата — строчным литералом; шрифт грузим до записи
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
const sec = await figma.getNodeByIdAsync('12:345'); // ID из return прошлого вызова
if (sec && sec.type === 'FRAME') {
  sec.name = 'Новое имя секции';
  const chip = sec.findOne((n) => n.name === 'Статус / Алерт');
  if (chip && chip.type === 'FRAME') chip.fills = [{ type: 'SOLID', color: { r: 0.227, g: 0.361, b: 0.937 } }];
}
return { mutatedNodeIds: ['12:345'] };

// Чистка тест-узлов песочницы — по ID из возвратов
for (const id of ['1:23', '4:56']) {
  const n = await figma.getNodeByIdAsync(id);
  if (n) n.remove();
}
return { removedNodeIds: ['1:23', '4:56'] };
```
