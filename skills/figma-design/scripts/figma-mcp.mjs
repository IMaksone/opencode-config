#!/usr/bin/env node
/**
 * figma-mcp.mjs — helper вызова удалённого MCP-сервера Figma (скилл figma-design).
 *
 * Назначение: прямой доступ агента к инструментам Figma MCP из shell — без
 * локальных плагинов и ручных действий в Figma. Используется скиллом
 * `figma-design` для загрузки гайдов, разведки файлов и мутаций макетов.
 *
 * Использование:
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs whoami
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs schema <toolName>
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs resource <uri>
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs call <toolName> '<jsonArgs>'
 *
 * Примеры:
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs whoami
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs schema use_figma
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs resource skill://figma/figma-use/SKILL.md
 *   node .opencode/skills/figma-design/scripts/figma-mcp.mjs call get_metadata '{"fileKey":"YkW54HbLSSunXEWgTugb3f"}'
 *
 * Безопасность токена:
 *   OAuth-токен Figma читается из хранилища opencode (БД credential или
 *   mcp-auth.json) и НИКОГДА не печатается — ни в выводе, ни в ошибках.
 *   Уходит только в заголовке Authorization на https://mcp.figma.com.
 *   Не коммитить, не логировать, не передавать третьим сторонам.
 */

import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

const URL_ = 'https://mcp.figma.com/mcp';

// Токен OAuth может жить в БД сервиса opencode (новое место) или в
// mcp-auth.json (старое место). Читаем, но наружу не печатаем.
function loadToken() {
  // 1) sqlite ~/.local/share/opencode/opencode.db → credential(label='figma', active=1)
  try {
    const db = os.homedir() + '/.local/share/opencode/opencode.db';
    const row = execSync(
      `sqlite3 "${db}" "SELECT value FROM credential WHERE label='figma' AND active=1 ORDER BY time_updated DESC LIMIT 1;"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (row) {
      try {
        const parsed = JSON.parse(row);
        return parsed.access || parsed.accessToken || row;
      } catch {
        return row; // в БД может лежать и голый токен
      }
    }
  } catch {}
  // 2) фолбэк ~/.local/share/opencode/mcp-auth.json → figma.tokens.accessToken
  try {
    const cfg = JSON.parse(fs.readFileSync(os.homedir() + '/.local/share/opencode/mcp-auth.json', 'utf8'));
    return cfg.figma?.tokens?.accessToken;
  } catch {}
  return undefined;
}

const TOKEN = loadToken();
if (!TOKEN) {
  console.error(
    'Токен figma не найден.\n' +
      'Проверенные места:\n' +
      '  1. ~/.local/share/opencode/opencode.db → credential (label=figma, active=1)\n' +
      '  2. ~/.local/share/opencode/mcp-auth.json → figma.tokens.accessToken\n' +
      'Восстановление: opencode mcp logout figma, затем в TUI opencode: /mcps → figma → Sign in.'
  );
  process.exit(1);
}

const H = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
  'Authorization': 'Bearer ' + TOKEN
};

// Ответ сервера может прийти в формате SSE — вытаскиваем первый JSON из data:.
function parseSse(txt) {
  if (!txt.includes('data:')) return JSON.parse(txt);
  const line = txt
    .split('\n')
    .map((l) => l.replace(/^data:\s*/, ''))
    .filter((l) => l.trim().startsWith('{'))
    .pop();
  return JSON.parse(line);
}

async function rpc(method, params, id = 1) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
  });
  const txt = await res.text();
  if (res.status === 401) {
    throw new Error(
      'HTTP 401: токен Figma MCP недействителен или истёк (сам токен не печатается).\n' +
        'Восстановление:\n' +
        '  1. opencode mcp logout figma\n' +
        '  2. в TUI opencode: /mcps → figma → Sign in (под рабочим аккаунтом)\n' +
        '  3. повторить вызов — токен перечитывается на каждый запуск'
    );
  }
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + txt.slice(0, 400));
  return parseSse(txt);
}

// Печать результата tools/call: текстовые части как есть, прочее — кратко.
function printToolResult(res) {
  if (res.error) {
    console.error('ОШИБКА:', JSON.stringify(res.error, null, 2));
    process.exit(1);
  }
  const c = res.result;
  if (c?.isError) {
    console.error('ОШИБКА ИНСТРУМЕНТА:');
  }
  const items = (c?.content || []).map((it) =>
    it.type === 'text' ? it.text : '<' + it.type + ': ' + JSON.stringify(it).slice(0, 200) + '>'
  );
  console.log(items.join('\n'));
  if (c?.isError) process.exit(1);
}

const [, , mode, toolName, argsJson] = process.argv;

if (mode === 'whoami') {
  // Инструмент Figma MCP без аргументов: handle/email/планы аккаунта.
  const res = await rpc('tools/call', { name: 'whoami', arguments: {} }, 2);
  printToolResult(res);
} else if (mode === 'schema') {
  const list = await rpc('tools/list', {});
  const tool = (list.result?.tools || []).find((t) => t.name === toolName);
  if (!tool) {
    console.error('Инструмент не найден. Доступны:', (list.result?.tools || []).map((t) => t.name).join(', '));
    process.exit(1);
  }
  console.log('== ' + tool.name + ' ==');
  console.log('Описание:', tool.description);
  console.log('inputSchema:', JSON.stringify(tool.inputSchema, null, 2));
} else if (mode === 'resource') {
  const res = await rpc('resources/read', { uri: toolName });
  const items = (res.result?.contents || []).map((c) => c.text || JSON.stringify(c));
  console.log(items.join('\n---\n'));
} else if (mode === 'call') {
  const args = argsJson ? JSON.parse(argsJson) : {};
  const res = await rpc('tools/call', { name: toolName, arguments: args }, 2);
  printToolResult(res);
} else {
  console.error(
    'Использование: node figma-mcp.mjs <whoami|schema|resource|call> [toolName|uri] [jsonArgs]\n' +
      '  whoami                     — аккаунт Figma (email/планы)\n' +
      '  schema <tool>              — inputSchema инструмента\n' +
      '  resource <uri>             — чтение MCP-ресурса (skill://figma/...)\n' +
      "  call <tool> '<json>'       — вызов инструмента"
  );
  process.exit(1);
}
