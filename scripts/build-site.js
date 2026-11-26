'use strict';
/* Assemble the static Zany Arcade Company site for hosting. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyFile(relative) {
  const from = path.join(ROOT, relative);
  const to = path.join(DIST, relative);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDirectory(relative, filter) {
  const from = path.join(ROOT, relative);
  fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(child, filter);
    } else if (!filter || filter(child)) {
      copyFile(child);
    }
  });
}

fs.rmSync(DIST, { recursive: true, force: true });
copyFile('index.html');
copyFile('play.html');
copyFile('styles.css');
copyDirectory('src', (file) => file.endsWith('.js'));
copyDirectory('site', (file) => /\.(html|css)$/.test(file));

console.log('Built static arcade site in dist/');
