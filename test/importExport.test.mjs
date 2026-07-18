import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_GZIP_INPUT_BYTES,
  MAX_GZIP_OUTPUT_BYTES,
  MAX_IMPORT_FILE_BYTES,
  MAX_JSON_TEXT_BYTES,
  assertJsonTextWithinLimit,
  base64ToBytes,
  bytesToBase64,
  gunzipBytes,
  gzipString,
  makeBase64Export,
  parseImportedText,
  parseJsonText,
  readImportFileText,
  utf8TextExceedsLimit
} from '../src/importExport.js';

function streamFromChunks(chunks, options = {}) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(Uint8Array.from(chunk));
      controller.close();
    },
    cancel() { options.onCancel?.(); }
  });
}

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
  assert.deepEqual(await parseImportedText('\ufeff{"Categories":[]}\u00a0'), { Categories: [] });
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


test('parseImportedText reports empty import text clearly', async () => {
  await assert.rejects(() => parseImportedText('   \n\t  '), /Import text is empty\./);
});

test('production import resource limits are explicit byte constants', () => {
  assert.equal(MAX_IMPORT_FILE_BYTES, 32 * 1024 * 1024);
  assert.equal(MAX_JSON_TEXT_BYTES, 32 * 1024 * 1024);
  assert.equal(MAX_GZIP_INPUT_BYTES, 8 * 1024 * 1024);
  assert.equal(MAX_GZIP_OUTPUT_BYTES, 32 * 1024 * 1024);
});

test('plain JSON accepts the exact byte boundary and rejects one byte over before parsing', () => {
  const text = '{"a":1}';
  let parseCalls = 0;
  assert.deepEqual(parseJsonText(text, { maxBytes: 7, jsonParser(value) { parseCalls++; return JSON.parse(value); } }), { a: 1 });
  assert.equal(parseCalls, 1);

  assert.throws(
    () => parseJsonText(`${text} `, { maxBytes: 7, jsonParser() { parseCalls++; } }),
    /JSON input exceeds the 7 bytes JSON text limit/
  );
  assert.equal(parseCalls, 1);
});

test('JSON limits count UTF-8 bytes rather than JavaScript string length', () => {
  const text = '{"name":"é😀"}';
  const bytes = new TextEncoder().encode(text).byteLength;
  assert.equal(utf8TextExceedsLimit(text, bytes), false);
  assert.equal(utf8TextExceedsLimit(text, bytes - 1), true);
  assert.deepEqual(parseJsonText(text, { maxBytes: bytes }), { name: 'é😀' });
  assert.throws(() => assertJsonTextWithinLimit(text, { maxBytes: bytes - 1 }), /JSON text limit/);
});

test('Base64 whitespace stays permitted and estimated oversized data is rejected before atob', () => {
  assert.deepEqual([...base64ToBytes(' YW\nJjZA== ', { maxBytes: 4 })], [...new TextEncoder().encode('abcd')]);
  let atobCalls = 0;
  assert.throws(
    () => base64ToBytes('AAAA \n AAAA', { maxBytes: 5, atobFn() { atobCalls++; return ''; } }),
    /Compressed gzip input exceeds the 5 bytes compressed-data limit/
  );
  assert.equal(atobCalls, 0);
});

test('Base64 decoding defensively rechecks the actual decoded byte length', () => {
  assert.throws(
    () => base64ToBytes('AA==', { maxBytes: 1, atobFn: () => String.fromCharCode(0, 1) }),
    /Decoded compressed gzip input exceeds the 1 bytes compressed-data limit/
  );
});

test('bounded decompression accepts the exact output boundary and cancels one chunk over', async () => {
  const exact = await gunzipBytes(new Uint8Array([1]), {
    maxInputBytes: 1,
    maxOutputBytes: 4,
    decompressionStreamFactory: () => streamFromChunks([[65, 66], [67, 68]])
  });
  assert.equal(exact, 'ABCD');

  let cancellations = 0;
  let releases = 0;
  const chunks = [Uint8Array.from([65, 66, 67, 68]), Uint8Array.from([69])];
  await assert.rejects(() => gunzipBytes(new Uint8Array([1]), {
    maxInputBytes: 1,
    maxOutputBytes: 4,
    decompressionStreamFactory: () => ({
      getReader() {
        return {
          async read() { return chunks.length ? { done: false, value: chunks.shift() } : { done: true }; },
          async cancel() { cancellations++; },
          releaseLock() { releases++; }
        };
      }
    })
  }), /Decompressed JSON exceeds the 4 bytes decompressed-output limit/);
  assert.equal(cancellations, 1);
  assert.equal(releases, 1);
});

test('bounded decompression decodes UTF-8 characters split across chunks', async () => {
  const expected = '{"name":"😀"}';
  const bytes = [...new TextEncoder().encode(expected)];
  const emojiStart = bytes.indexOf(0xf0);
  const decoded = await gunzipBytes(new Uint8Array([1]), {
    maxInputBytes: 1,
    maxOutputBytes: bytes.length,
    decompressionStreamFactory: () => streamFromChunks([
      bytes.slice(0, emojiStart + 2),
      bytes.slice(emojiStart + 2)
    ])
  });
  assert.equal(decoded, expected);
  assert.deepEqual(JSON.parse(decoded), { name: '😀' });
});

test('highly compressible input can pass the compressed limit and fail the output limit', async t => {
  if (!('CompressionStream' in globalThis) || !('DecompressionStream' in globalThis)) {
    t.skip('CompressionStream and DecompressionStream are unavailable in this Node version');
    return;
  }
  const text = JSON.stringify({ value: 'x'.repeat(2048) });
  const compressed = await gzipString(text);
  assert.ok(compressed.byteLength < 128);
  const encoded = bytesToBase64(compressed);
  await assert.rejects(() => parseImportedText(encoded, {
    maxGzipInputBytes: 128,
    maxGzipOutputBytes: 128,
    maxJsonBytes: 4096
  }), /Decompressed JSON exceeds the 128 bytes decompressed-output limit/);
});

test('malformed Base64, gzip, JSON, and missing decompression support remain clear', async () => {
  await assert.rejects(() => parseImportedText('not!base64'), /Invalid Base64 input/);
  await assert.rejects(() => parseImportedText(bytesToBase64(new Uint8Array([1, 2, 3]))), /Invalid gzip data/);
  await assert.rejects(() => parseImportedText('{"Categories":'), /SyntaxError|Unexpected|JSON/);

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'DecompressionStream');
  assert.equal(delete globalThis.DecompressionStream, true);
  try {
    await assert.rejects(
      () => gunzipBytes(new Uint8Array([1])),
      /This browser does not support DecompressionStream\. Try importing JSON instead\./
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'DecompressionStream', descriptor);
  }
});

test('uploaded file size is checked before file.text()', async () => {
  let textCalls = 0;
  const exact = { size: 4, async text() { textCalls++; return '{}'; } };
  assert.equal(await readImportFileText(exact, { maxBytes: 4 }), '{}');
  assert.equal(textCalls, 1);

  const oversized = { size: 5, async text() { textCalls++; return '{}'; } };
  await assert.rejects(() => readImportFileText(oversized, { maxBytes: 4 }), /Selected file exceeds the 4 bytes file size limit/);
  assert.equal(textCalls, 1);
});

test('oversized plain import and Raw JSON candidates stop before downstream side effects', async () => {
  const calls = {
    validation: 0,
    confirmation: 0,
    replacement: 0,
    compression: 0,
    clipboard: 0,
    download: 0,
    lookup: 0,
    dirtySave: 0,
    structuralRender: 0
  };
  const runCallbacks = () => {
    for (const key of Object.keys(calls)) calls[key]++;
  };

  await assert.rejects(async () => {
    await parseImportedText('{"a":1} ', { maxJsonBytes: 7 });
    runCallbacks();
  }, /Plain JSON input exceeds the 7 bytes JSON text limit/);
  assert.throws(() => {
    parseJsonText('{"a":1} ', { maxBytes: 7, label: 'Full Raw JSON input' });
    runCallbacks();
  }, /Full Raw JSON input exceeds the 7 bytes JSON text limit/);
  assert.throws(() => {
    parseJsonText('{"a":1} ', { maxBytes: 7, label: 'Selected-category Raw JSON input' });
    runCallbacks();
  }, /Selected-category Raw JSON input exceeds the 7 bytes JSON text limit/);
  assert.deepEqual(calls, {
    validation: 0,
    confirmation: 0,
    replacement: 0,
    compression: 0,
    clipboard: 0,
    download: 0,
    lookup: 0,
    dirtySave: 0,
    structuralRender: 0
  });
});
