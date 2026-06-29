export const EXPORT_FILENAME = 'aetherbags_categories.txt';

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

export async function gunzipBytes(bytes) {
  if (!('DecompressionStream' in globalThis)) {
    throw new Error('This browser does not support DecompressionStream. Try importing JSON instead.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function parseImportedText(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Import text is empty.');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  const bytes = base64ToBytes(trimmed);
  const decoded = await gunzipBytes(bytes);
  return JSON.parse(decoded);
}
