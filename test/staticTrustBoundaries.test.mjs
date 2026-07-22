import test from 'node:test';
import assert from 'node:assert/strict';

import { copyTextToClipboard } from '../src/importExport.js';
import { read } from '../testSupport/sourceFiles.mjs';

const index = read('index.html');
const workflow = read('.github/workflows/project-verification.yml');

function contentSecurityPolicy() {
  const tag = index.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)">/i);
  assert.ok(tag, 'index.html must contain a meta-delivered Content Security Policy');
  return new Map(tag[1].split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const [directive, ...sources] = part.split(/\s+/);
    return [directive, sources];
  }));
}

test('CSP meta precedes every governed resource and the synchronous bootstrap precedes styles', () => {
  const cspIndex = index.indexOf('http-equiv="Content-Security-Policy"');
  const faviconIndex = index.indexOf('rel="icon"');
  const bootstrapIndex = index.indexOf('<script src="src/startupPreferences.js"></script>');
  const stylesheetIndex = index.indexOf('rel="stylesheet"');
  const applicationIndex = index.indexOf('<script type="module" src="src/app.js"></script>');
  assert.ok(cspIndex !== -1 && cspIndex < faviconIndex);
  assert.ok(cspIndex < bootstrapIndex);
  assert.ok(bootstrapIndex < stylesheetIndex);
  assert.ok(cspIndex < applicationIndex);
  assert.doesNotMatch(index.slice(index.indexOf('<head>'), stylesheetIndex), /<script[^>]+(?:async|defer|type="module")[^>]*src="src\/startupPreferences\.js"/);
});

test('index contains no inline executable scripts', () => {
  const scripts = [...index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)];
  assert.ok(scripts.length >= 2);
  for (const [, attributes, body] of scripts) {
    assert.match(attributes, /\bsrc="[^"]+"/);
    assert.equal(body.trim(), '');
  }
});

test('CSP blocks inline and evaluated scripts while allowing only same-origin scripts', () => {
  const policy = contentSecurityPolicy();
  assert.deepEqual(policy.get('script-src'), ["'self'"]);
  assert.deepEqual(policy.get('script-src-attr'), ["'none'"]);
  assert.equal(policy.get('script-src').includes("'unsafe-inline'"), false);
  assert.equal(policy.get('script-src').includes("'unsafe-eval'"), false);
});

test('CSP exposes only the required network, worker, image, and dynamic-style boundaries', () => {
  const policy = contentSecurityPolicy();
  assert.deepEqual(policy.get('default-src'), ["'self'"]);
  assert.deepEqual(policy.get('connect-src'), ["'self'", 'https://v2.xivapi.com']);
  assert.deepEqual(policy.get('worker-src'), ["'self'"]);
  assert.deepEqual(policy.get('img-src'), ["'self'"]);
  assert.deepEqual(policy.get('style-src'), ["'self'"]);
  assert.deepEqual(policy.get('style-src-attr'), ["'unsafe-inline'"]);
  assert.match(index, /<link rel="icon"[^>]+href="favicon\.svg">/);
  assert.doesNotMatch(index, /(?:src|href)="(?:data:|blob:)/);
});

test('CSP blocks objects, base rewriting, frames, and form submission without header-only claims', () => {
  const policy = contentSecurityPolicy();
  assert.deepEqual(policy.get('object-src'), ["'none'"]);
  assert.deepEqual(policy.get('base-uri'), ["'none'"]);
  assert.deepEqual(policy.get('frame-src'), ["'none'"]);
  assert.deepEqual(policy.get('form-action'), ["'none'"]);
  assert.equal(policy.has('frame-ancestors'), false);
  assert.equal(policy.has('report-uri'), false);
  assert.equal(policy.has('report-to'), false);
});

test('runtime resource techniques remain represented by compatible policy boundaries', () => {
  const policy = contentSecurityPolicy();
  const dom = read('src/dom.js');
  const categoryList = read('src/ui/categoryList.js');
  const colorEditor = read('src/ui/colorEditor.js');
  const formControls = read('src/ui/formControls.js');
  const importExport = read('src/importExport.js');
  const workerEvaluator = read('src/tools/regexBatchEvaluator.js');
  assert.equal(policy.get('style-src-attr').includes("'unsafe-inline'"), true);
  for (const source of [dom, categoryList, colorEditor, formControls, importExport]) {
    assert.match(source, /\.style(?:\.|\.setProperty)/);
  }
  assert.match(importExport, /URL\.createObjectURL\(blob\)/);
  assert.match(importExport, /a\.download = filename/);
  assert.match(importExport, /document\.execCommand\('copy'\)/);
  assert.equal(policy.has('navigate-to'), false, 'Blob downloads must not be blocked by an experimental navigation directive');
  assert.match(workerEvaluator, /new Worker\(new URL\('\.\/regexBatchWorker\.js', import\.meta\.url\), \{ type: 'module' \}\)/);
});

test('clipboard fallback remains functional with CSP-compatible style properties', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const calls = [];
  const original = {
    focus() { calls.push(['restore']); document.activeElement = original; }
  };
  const textarea = {
    style: {},
    setAttribute(name, value) { calls.push(['attribute', name, value]); },
    focus() { calls.push(['focus']); document.activeElement = textarea; },
    select() { calls.push(['select']); },
    remove() { calls.push(['remove']); document.activeElement = document.body; }
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { async writeText() { throw new Error('blocked'); } } }
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: original,
      createElement(tag) { calls.push(['create', tag]); return textarea; },
      body: { appendChild(node) { assert.equal(node, textarea); calls.push(['append']); } },
      contains(node) { return node === original; },
      execCommand(command) { calls.push(['exec', command]); return true; }
    }
  });
  try {
    assert.equal(await copyTextToClipboard('Phase 66'), true);
    assert.equal(textarea.value, 'Phase 66');
    assert.deepEqual(textarea.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' });
    assert.deepEqual(calls, [
      ['create', 'textarea'],
      ['attribute', 'readonly', ''],
      ['append'],
      ['focus'],
      ['select'],
      ['exec', 'copy'],
      ['remove'],
      ['restore']
    ]);
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('primary clipboard success does not inspect or move document focus', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const writes = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { async writeText(text) { writes.push(text); } } }
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    get() { throw new Error('primary clipboard success must not touch document'); }
  });
  try {
    assert.equal(await copyTextToClipboard('primary'), true);
    assert.deepEqual(writes, ['primary']);
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('clipboard fallback cleanup and focus restoration preserve copy results', async t => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { async writeText() { throw new Error('blocked'); } } }
  });

  async function runFallback({ execResult = true, execError = null, connected = true, newerFocus = false, restoreError = null } = {}) {
    const calls = [];
    const body = {};
    const newer = {};
    const original = {
      focus() {
        calls.push('restore');
        if (restoreError) throw restoreError;
        document.activeElement = original;
      }
    };
    const textarea = {
      style: {},
      setAttribute() {},
      focus() { calls.push('temporary-focus'); document.activeElement = textarea; },
      select() { calls.push('select'); },
      remove() { calls.push('remove'); document.activeElement = body; }
    };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        activeElement: original,
        body: { ...body, appendChild() { calls.push('append'); } },
        createElement() { return textarea; },
        contains(node) { return connected && node === original; },
        execCommand() {
          calls.push('exec');
          if (newerFocus) document.activeElement = newer;
          if (execError) throw execError;
          return execResult;
        }
      }
    });
    const result = await copyTextToClipboard('fallback');
    return { calls, result };
  }

  try {
    await t.test('success removes the textarea and restores the connected target', async () => {
      const { calls, result } = await runFallback();
      assert.equal(result, true);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove', 'restore']);
    });
    await t.test('reported failure removes the textarea and restores the connected target', async () => {
      const { calls, result } = await runFallback({ execResult: false });
      assert.equal(result, false);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove', 'restore']);
    });
    await t.test('exception removes the textarea and restores the connected target', async () => {
      const { calls, result } = await runFallback({ execError: new Error('copy failed') });
      assert.equal(result, false);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove', 'restore']);
    });
    await t.test('disconnected targets are not restored', async () => {
      const { calls, result } = await runFallback({ connected: false });
      assert.equal(result, true);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove']);
    });
    await t.test('newer focus state is not replaced', async () => {
      const { calls, result } = await runFallback({ newerFocus: true });
      assert.equal(result, true);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove']);
    });
    await t.test('restoration exceptions do not change a successful copy result', async () => {
      const { calls, result } = await runFallback({ restoreError: new Error('cannot focus') });
      assert.equal(result, true);
      assert.deepEqual(calls, ['append', 'temporary-focus', 'select', 'exec', 'remove', 'restore']);
    });
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('verification workflow pins reviewed official v4 releases without changing its contract', () => {
  assert.match(workflow, /uses: actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4\.3\.1/);
  assert.match(workflow, /uses: actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\.4\.0/);
  const actionUses = [...workflow.matchAll(/uses:\s+[^@\s]+@([^\s]+)/g)].map(match => match[1]);
  assert.equal(actionUses.length, 2);
  for (const sha of actionUses) assert.match(sha, /^[0-9a-f]{40}$/);
  assert.match(workflow, /^on:\n  push:\n  pull_request:/m);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /node-version: '22'/);
  assert.equal((workflow.match(/run: npm run check/g) || []).length, 1);
});
