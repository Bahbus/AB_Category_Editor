export const EXPORT_FILENAME = 'aetherbags_categories.txt';
export const MAX_IMPORT_FILE_BYTES = 32 * 1024 * 1024;
export const MAX_JSON_TEXT_BYTES = 32 * 1024 * 1024;
export const MAX_GZIP_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_GZIP_OUTPUT_BYTES = 32 * 1024 * 1024;

const MIB = 1024 * 1024;

function formatLimit(bytes) {
  return bytes % MIB === 0 ? `${bytes / MIB} MiB` : `${bytes} bytes`;
}

function isWhitespace(character) {
  return /\s/.test(character);
}

export function utf8TextExceedsLimit(text, maxBytes) {
  let bytes = 0;
  for (let index = 0; index < text.length; index++) {
    const codeUnit = text.charCodeAt(index);
    if (codeUnit <= 0x7f) bytes += 1;
    else if (codeUnit <= 0x7ff) bytes += 2;
    else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index++;
      } else bytes += 3;
    } else bytes += 3;
    if (bytes > maxBytes) return true;
  }
  return false;
}

export function assertJsonTextWithinLimit(text, options = {}) {
  const { maxBytes = MAX_JSON_TEXT_BYTES, label = 'JSON input' } = options;
  if (utf8TextExceedsLimit(text, maxBytes)) {
    throw new Error(`${label} exceeds the ${formatLimit(maxBytes)} JSON text limit.`);
  }
}

export function parseJsonText(text, options = {}) {
  const { maxBytes = MAX_JSON_TEXT_BYTES, label = 'JSON input', jsonParser = JSON.parse } = options;
  assertJsonTextWithinLimit(text, { maxBytes, label });
  return jsonParser(text);
}

export async function readImportFileText(file, options = {}) {
  const { maxBytes = MAX_IMPORT_FILE_BYTES } = options;
  if (file.size > maxBytes) {
    throw new Error(`Selected file exceeds the ${formatLimit(maxBytes)} file size limit.`);
  }
  return file.text();
}

export function downloadText(filename, text, type='application/json', options = {}) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (typeof options.onDownloaded === 'function') options.onDownloaded(filename);
}

export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    let ta = null;
    try {
      ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      ta?.remove();
    }
  }
}

export async function makeBase64Export(data) {
  const json = JSON.stringify(data);
  const gz = await gzipString(json);
  return bytesToBase64(gz);
}

export async function gzipString(str) {
  if (!('CompressionStream' in globalThis)) {
    throw new Error('This browser does not support CompressionStream, which is needed for gzip+Base64 export. Use a newer Firefox/Chromium.');
  }
  const stream = new Blob([str], {type: 'application/json'}).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(compressed);
}

export async function gunzipBytes(bytes, options = {}) {
  const {
    maxInputBytes = MAX_GZIP_INPUT_BYTES,
    maxOutputBytes = MAX_GZIP_OUTPUT_BYTES,
    decompressionStreamFactory
  } = options;
  if (bytes.byteLength > maxInputBytes) {
    throw new Error(`Compressed gzip input exceeds the ${formatLimit(maxInputBytes)} compressed-data limit.`);
  }
  if (!decompressionStreamFactory && !('DecompressionStream' in globalThis)) {
    throw new Error('This browser does not support DecompressionStream. Try importing JSON instead.');
  }
  let reader;
  try {
    const stream = decompressionStreamFactory
      ? decompressionStreamFactory(bytes)
      : new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    reader = stream.getReader();
    const decoder = new TextDecoder();
    let decoded = '';
    let outputBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      outputBytes += value.byteLength;
      if (outputBytes > maxOutputBytes) {
        try { reader.cancel().catch(() => {}); } catch {}
        throw new Error(`Decompressed JSON exceeds the ${formatLimit(maxOutputBytes)} decompressed-output limit.`);
      }
      decoded += decoder.decode(value, { stream: true });
    }
    return decoded + decoder.decode();
  } catch (err) {
    if (err?.message?.includes('decompressed-output limit')) throw err;
    throw new Error(`Invalid gzip data: ${err?.message || String(err)}`);
  } finally {
    reader?.releaseLock();
  }
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64, options = {}) {
  const { maxBytes = MAX_GZIP_INPUT_BYTES, atobFn = atob } = options;
  let characterCount = 0;
  let last = '';
  let secondLast = '';
  for (const character of b64) {
    if (isWhitespace(character)) continue;
    characterCount++;
    secondLast = last;
    last = character;
  }
  const padding = last === '=' ? (secondLast === '=' ? 2 : 1) : 0;
  const estimatedBytes = Math.max(0, Math.floor(characterCount * 3 / 4) - padding);
  if (estimatedBytes > maxBytes) {
    throw new Error(`Compressed gzip input exceeds the ${formatLimit(maxBytes)} compressed-data limit.`);
  }
  const clean = b64.replace(/\s+/g, '');
  let binary;
  try {
    binary = atobFn(clean);
  } catch (err) {
    throw new Error(`Invalid Base64 input: ${err?.message || String(err)}`);
  }
  if (binary.length > maxBytes) {
    throw new Error(`Decoded compressed gzip input exceeds the ${formatLimit(maxBytes)} compressed-data limit.`);
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function parseImportedText(text, options = {}) {
  const {
    maxJsonBytes = MAX_JSON_TEXT_BYTES,
    maxGzipInputBytes = MAX_GZIP_INPUT_BYTES,
    maxGzipOutputBytes = MAX_GZIP_OUTPUT_BYTES,
    jsonParser = JSON.parse,
    atobFn,
    decompressionStreamFactory
  } = options;
  let firstCharacter = '';
  for (const character of text) {
    if (!isWhitespace(character)) { firstCharacter = character; break; }
  }
  if (!firstCharacter) throw new Error('Import text is empty.');
  if (firstCharacter === '{' || firstCharacter === '[') {
    assertJsonTextWithinLimit(text, { maxBytes: maxJsonBytes, label: 'Plain JSON input' });
    return jsonParser(text.trim());
  }
  const bytes = base64ToBytes(text, { maxBytes: maxGzipInputBytes, ...(atobFn ? { atobFn } : {}) });
  const decoded = await gunzipBytes(bytes, {
    maxInputBytes: maxGzipInputBytes,
    maxOutputBytes: maxGzipOutputBytes,
    ...(decompressionStreamFactory ? { decompressionStreamFactory } : {})
  });
  return parseJsonText(decoded, { maxBytes: maxJsonBytes, label: 'Decompressed JSON', jsonParser });
}
