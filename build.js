#!/usr/bin/env node
/**
 * Builds two things from src/ and ui/:
 *
 *   dist/apps-script/   the files to put in the Apps Script project
 *                       (paste them, or `clasp push` from that folder)
 *   dist/preview.html   a standalone demo of the app with fake data
 */
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const out = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };

const logo = fs.readFileSync(path.join(root, 'assets/logo-mark.webp')).toString('base64');
const page = read('ui/Index.html').replace('__LOGO__', logo);
if (page.includes('<?')) throw new Error('Index.html must not contain "<?" (HtmlService scriptlets)');

const server = ['Config', 'Core', 'Logic', 'Sheets', 'Auth', 'Code'];
for (const f of server) out(`dist/apps-script/${f}.gs`, read(`src/${f}.js`));
out('dist/apps-script/Index.html', page.replace('<!--DEMO-->', ''));
out('dist/apps-script/appsscript.json', read('src/appsscript.json'));
out('dist/apps-script/.clasp.json.example', JSON.stringify({ scriptId: 'PASTE_YOUR_SCRIPT_ID', rootDir: '.' }, null, 2) + '\n');

const shared = ['Config', 'Core', 'Logic'].map((f) => read(`src/${f}.js`)).join('\n');
const demo = `<script>\n${shared}\n${read('ui/demo.js')}\n</script>`;
out('dist/preview.html', page.replace('<!--DEMO-->', demo));

const kb = (p) => (fs.statSync(path.join(root, p)).size / 1024).toFixed(0) + ' KB';
console.log('dist/apps-script/  →', server.length, 'server files + Index.html (' + kb('dist/apps-script/Index.html') + ')');
console.log('dist/preview.html  →', kb('dist/preview.html'));
