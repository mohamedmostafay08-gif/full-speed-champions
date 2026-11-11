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
const crypto = require('node:crypto');
const raw = read('ui/Index.html').replace('__LOGO__', logo);
const stamp = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 10);
const page = raw.replace('<!--WEB_HEAD-->', '<script>window.FS_BUILD="' + stamp + '";</script>');
const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

if (page.includes('<?')) throw new Error('Index.html must not contain "<?" (HtmlService scriptlets)');

const server = ['Config', 'Core', 'Logic', 'Sheets', 'Auth', 'Code', 'Admin'];
for (const f of server) out(`dist/apps-script/${f}.gs`, read(`src/${f}.js`));
out('dist/apps-script/Index.html', page.replace('<!--DEMO-->', ''));
out('dist/apps-script/appsscript.json', read('src/appsscript.json'));
out('dist/apps-script/.clasp.json.example', JSON.stringify({ scriptId: 'PASTE_YOUR_SCRIPT_ID', rootDir: '.' }, null, 2) + '\n');

// Same project as one file per type: Code.gs + Index.html + appsscript.json.
const single = server.map((f) => `// ════════════════════════ ${f} ════════════════════════\n\n${read(`src/${f}.js`)}`).join('\n\n');
out('dist/single-file/Code.gs', single);
out('dist/single-file/Index.html', page.replace('<!--DEMO-->', ''));
out('dist/single-file/appsscript.json', read('src/appsscript.json'));

const shared = ['Config', 'Core', 'Logic'].map((f) => read(`src/${f}.js`)).join('\n');
const demo = `<script>\n${shared}\n${read('ui/demo.js')}\n</script>`;
out('dist/preview.html', raw.replace('<!--WEB_HEAD-->', viewport).replace('<!--DEMO-->', demo));

// GitHub Pages app (docs/): same page + manifest, icons, service worker and the /exec link.
const webHead = viewport + `
<link rel="manifest" href="manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Champions">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<script src="config.js"></script>
<script>
if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('sw.js'); });
// "ثبّت التطبيق" button, shown only when the browser offers installation.
addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'btn btn-primary install-btn'; b.textContent = 'ثبّت التطبيق';
  b.onclick = function () { e.prompt(); b.remove(); };
  document.body.appendChild(b);
});
</script>
<style>.install-btn{position:fixed;z-index:35;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(96px + env(safe-area-inset-bottom,0px));padding:10px 16px;font-size:14px;box-shadow:var(--shadow)}</style>`;
const docsPage = raw.replace('<!--WEB_HEAD-->', webHead).replace('<!--DEMO-->', '');
const version = crypto.createHash('sha256').update(docsPage + read('web/config.js')).digest('hex').slice(0, 10);
out('docs/index.html', docsPage);
out('docs/config.js', read('web/config.js'));
out('docs/manifest.webmanifest', read('web/manifest.webmanifest'));
out('docs/sw.js', read('web/sw.js').replace('__VERSION__', version));
out('docs/.nojekyll', '');
for (const f of fs.readdirSync(path.join(root, 'web/icons'))) {
  fs.mkdirSync(path.join(root, 'docs/icons'), { recursive: true });
  fs.copyFileSync(path.join(root, 'web/icons', f), path.join(root, 'docs/icons', f));
}

// Admin dashboard: docs/admin/ (live, talks to /exec) and dist/admin-preview.html (demo data).
const adminRaw = read('ui/Admin.html').replace('__LOGO__', logo);
const adminHead = viewport + '\n<link rel="icon" href="../icons/icon-192.png">\n<meta name="robots" content="noindex">\n<script src="../config.js"></script>';
out('docs/admin/index.html', adminRaw.replace('<!--WEB_HEAD-->', adminHead).replace('<!--DEMO-->', ''));
out('dist/admin-preview.html', adminRaw.replace('<!--WEB_HEAD-->', viewport).replace('<!--DEMO-->', `<script>\n${shared}\n${read('ui/admin-demo.js')}\n</script>`));

const kb = (p) => (fs.statSync(path.join(root, p)).size / 1024).toFixed(0) + ' KB';
console.log('dist/apps-script/  →', server.length, 'server files + Index.html (' + kb('dist/apps-script/Index.html') + ')');
console.log('dist/preview.html  →', kb('dist/preview.html'));
console.log('docs/ (GitHub Pages) → version', version);
console.log('docs/admin + dist/admin-preview.html →', kb('dist/admin-preview.html'));
