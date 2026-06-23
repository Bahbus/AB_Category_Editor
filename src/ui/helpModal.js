import { openModal } from '../modals.js';

export function showHelpModal() {
  const wrap = document.createElement('div');
  wrap.className = 'help-modal';
  wrap.innerHTML = `
    <p>This editor helps you inspect and edit AetherBags category exports in your browser, then create updated text to import back into AetherBags.</p>
    <h3>Basic workflow</h3>
    <ul>
      <li><strong>Import/Paste</strong> accepts formatted JSON or the gzip+Base64 category text exported/copied from AetherBags.</li>
      <li><strong>Upload</strong> accepts a text, Base64, or JSON file containing that same AetherBags category data.</li>
      <li><strong>Export/Copy</strong> creates updated gzip+Base64 text and tries to copy it to your clipboard.</li>
      <li><strong>Download</strong> saves the updated gzip+Base64 text as a local <code>.txt</code> file.</li>
      <li>Paste or import the exported Base64 text back into AetherBags using the plugin's category import workflow.</li>
    </ul>
    <h3>Lookup tools</h3>
    <ul>
      <li><strong>Resolve IDs</strong> resolves referenced item IDs and UI category IDs to English names through XIVAPI.</li>
      <li><strong>Lookup Cache</strong> shows and clears locally cached lookup names stored in this browser.</li>
      <li><strong>Regex → Item IDs</strong> scans XIVAPI item names for a selected name pattern and can be canceled while it runs.</li>
    </ul>
    <h3>Privacy</h3>
    <ul>
      <li>The full imported config is processed locally in your browser.</li>
      <li>The app stores lookup names in <code>localStorage</code> so repeated ID lookups are faster.</li>
      <li>XIVAPI is contacted only for item/category name lookups, search queries, and item sheet scans used by Regex → Item IDs.</li>
      <li>The app does not upload the full category config to this repository.</li>
    </ul>
  `;
  openModal('About / Help', wrap);
}
