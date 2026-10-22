#!/usr/bin/env node
/**
 * Read-only Figma export for agents.
 *
 * Requires a Figma personal access token with the `file_content:read` scope
 * (Figma -> Settings -> Security -> Personal access tokens). The token is
 * passed through the FIGMA_API_KEY environment variable and is never written
 * to disk by this script.
 *
 * Usage:
 *   FIGMA_API_KEY=... node .opencode/scripts/figma-dump.js <figma-url|fileKey> [nodeIds...]
 *   FIGMA_API_KEY=... node .opencode/scripts/figma-dump.js https://www.figma.com/design/<key>/Name?node-id=22-100
 *
 * Node ids accept both `22-100` and `22:100` forms.
 *
 * Output (gitignored):
 *   .tmp/figma/<fileKey>-<nodeId>.json  raw API response for the node subtree
 *   .tmp/figma/<fileKey>-<nodeId>.md    compact readable tree for LLM context
 *   .tmp/figma/<fileKey>-<nodeId>.png   2x render of the node
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const API = 'https://api.figma.com/v1';
const OUT_DIR = '.tmp/figma';
const SCALE = 2;

const args = process.argv.slice(2);
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const positional = args.filter(arg => !arg.startsWith('--'));

if (flags.has('--help') || positional.length === 0) {
  console.log(
    'Usage: FIGMA_API_KEY=... node .opencode/scripts/figma-dump.js <figma-url|fileKey> [nodeIds...]',
  );
  process.exit(0);
}

const token = process.env.FIGMA_API_KEY;
if (!token) {
  console.error('FIGMA_API_KEY is not set (scope: file_content:read).');
  process.exit(1);
}

const [target, ...explicitNodeIds] = positional;
const { fileKey, nodeIds } = parseTarget(target, explicitNodeIds);
const wantImages = !flags.has('--no-images');

const response = await request(
  `${API}/files/${fileKey}/nodes?ids=${nodeIds.map(encodeURIComponent).join(',')}`,
);
const nodes = response.nodes ?? {};

mkdirSync(OUT_DIR, { recursive: true });

const written = [];
for (const nodeId of nodeIds) {
  const entry = nodes[nodeId];
  if (!entry?.document) {
    console.warn(`node ${nodeId}: not found in the API response`);
    continue;
  }

  const slug = slugify(nodeId);
  const base = join(OUT_DIR, `${fileKey}-${slug}`);

  writeFileSync(`${base}.json`, `${JSON.stringify(entry, null, 2)}\n`);
  writeFileSync(`${base}.md`, renderMarkdown(fileKey, nodeId, entry.document));
  written.push(`${base}.json`, `${base}.md`);

  if (wantImages) {
    const imagePath = await downloadImage(fileKey, nodeId, `${base}.png`);
    if (imagePath)
      written.push(imagePath);
  }

  const document = entry.document;
  console.log(
    `${nodeId}: ${document.name} (${document.type}) -> ${OUT_DIR}/${fileKey}-${slug}.*`,
  );
}

if (written.length === 0) {
  console.error('nothing was written: check file key, node ids and token scope');
  process.exit(1);
}

function parseTarget(target, explicit) {
  if (/^[A-Z0-9]{10,}$/i.test(target) && !target.includes('/')) {
    return { fileKey: target, nodeIds: explicit.map(normalizeNodeId) };
  }

  let url;
  try {
    url = new URL(target);
  }
  catch {
    console.error(`cannot parse "${target}": expected a Figma URL or a file key`);
    process.exit(1);
  }

  const fileKey = url.pathname.split('/').filter(Boolean)[1];
  const nodeId = url.searchParams.get('node-id');
  const collected = [...explicit, ...(nodeId ? [nodeId] : [])].map(normalizeNodeId);

  if (!fileKey || collected.length === 0) {
    console.error('the URL must contain a file key and a node-id query parameter');
    process.exit(1);
  }

  return { fileKey, nodeIds: collected };
}

function normalizeNodeId(nodeId) {
  return nodeId.replace(/-/g, ':');
}

function slugify(nodeId) {
  return nodeId.replace(/:/g, '-');
}

async function request(url) {
  // Figma personal access tokens (`figd_...`) must go into X-Figma-Token,
  // OAuth access tokens into Authorization: Bearer.
  const auth = token.startsWith('figd_')
    ? { 'X-Figma-Token': token }
    : { Authorization: `Bearer ${token}` };

  const response = await fetch(url, {
    headers: {
      ...auth,
      'User-Agent': 'Mozilla/5.0 (compatible; cervart-figma-dump)',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Figma API ${response.status}: ${body.slice(0, 500)}`);
    if (response.status === 403 && body.includes('file_content:read')) {
      console.error('the token is missing the file_content:read scope');
    }
    process.exit(1);
  }

  return response.json();
}

async function downloadImage(fileKey, nodeId, path) {
  const meta = await request(
    `${API}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${SCALE}`,
  );
  const url = meta.images?.[nodeId];
  if (!url) {
    console.warn(`node ${nodeId}: no image render returned (node may be empty)`);
    return null;
  }

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`node ${nodeId}: image download failed with ${response.status}`);
    return null;
  }

  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

function renderMarkdown(fileKey, nodeId, root) {
  const lines = [
    `# Figma node ${nodeId}`,
    '',
    `- file: ${fileKey}`,
    `- url: https://www.figma.com/design/${fileKey}/?node-id=${slugify(nodeId)}`,
    '',
    '```text',
  ];

  walk(root, 0, lines);

  lines.push('```', '');
  return lines.join('\n');
}

function walk(node, depth, lines) {
  if (node.visible === false)
    return;

  const indent = '  '.repeat(depth);
  const parts = [`${indent}${node.type} "${node.name}"`];

  const size = sizeOf(node);
  if (size)
    parts.push(`size=${size}`);
  if (node.characters)
    parts.push(`text=${truncate(node.characters, 120)}`);
  if (node.componentId)
    parts.push(`componentId=${node.componentId}`);
  if (node.cornerRadius)
    parts.push(`radius=${node.cornerRadius}`);
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    parts.push(`layout=${node.layoutMode.toLowerCase()}`);
  }

  const fill = firstSolidFill(node.fills);
  if (fill)
    parts.push(`fill=${fill}`);
  const stroke = firstSolidFill(node.strokes);
  if (stroke)
    parts.push(`stroke=${stroke}`);

  const style = node.style;
  if (style) {
    if (style.fontSize)
      parts.push(`fontSize=${style.fontSize}`);
    if (style.fontWeight)
      parts.push(`fontWeight=${style.fontWeight}`);
    if (style.fontFamily)
      parts.push(`font=${style.fontFamily}`);
  }

  lines.push(parts.join(' '));

  for (const child of node.children ?? []) {
    walk(child, depth + 1, lines);
  }
}

function sizeOf(node) {
  const box = node.absoluteBoundingBox;
  if (!box)
    return null;
  return `${round(box.width)}x${round(box.height)} @ ${round(box.x)},${round(box.y)}`;
}

function firstSolidFill(fills) {
  if (!Array.isArray(fills))
    return null;
  for (const paint of fills) {
    if (paint.visible === false)
      continue;
    if (paint.type !== 'SOLID' || !paint.color)
      continue;
    const { r, g, b } = paint.color;
    const toHex = value =>
      Math.round(value * 255)
        .toString(16)
        .padStart(2, '0');
    const alpha = paint.opacity ?? paint.color.a ?? 1;
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alpha < 1 ? `@${round(alpha)}` : ''}`;
  }
  return null;
}

function truncate(value, max) {
  const single = value.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max)}...` : single;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
