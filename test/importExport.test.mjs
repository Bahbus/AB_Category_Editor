import test from 'node:test';
import assert from 'node:assert/strict';

import {
  base64ToBytes,
  bytesToBase64,
  makeBase64Export,
  parseImportedText
} from '../src/importExport.js';

test('bytesToBase64 and base64ToBytes round-trip bytes', () => {
  const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
  const encoded = bytesToBase64(bytes);

  assert.equal(encoded, 'AAECf4D/');
  assert.deepEqual([...base64ToBytes(encoded)], [...bytes]);
  assert.deepEqual([...base64ToBytes(' AAEC\nf4D/ ')], [...bytes]);
});

test('parseImportedText parses plain JSON input', async () => {
  const parsed = await parseImportedText(' { "Categories": [ { "Name": "A" } ] } ');

  assert.deepEqual(parsed, { Categories: [{ Name: 'A' }] });
});

test('makeBase64Export round-trips through parseImportedText when compression streams exist', async t => {
  if (!('CompressionStream' in globalThis) || !('DecompressionStream' in globalThis)) {
    t.skip('CompressionStream and DecompressionStream are unavailable in this Node version');
    return;
  }

  globalThis.window = globalThis;
  const data = { Categories: [{ Id: 'abc', Name: 'Round trip' }] };
  const encoded = await makeBase64Export(data);
  const parsed = await parseImportedText(encoded);

  assert.deepEqual(parsed, data);
});
