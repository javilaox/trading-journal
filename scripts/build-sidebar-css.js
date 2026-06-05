const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../src/dashboard.html'), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const lines = css.split('\n');

function sliceBetween(startNeedle, endNeedle) {
  const start = lines.findIndex((l) => l.includes(startNeedle));
  const end = lines.findIndex((l) => l.includes(endNeedle));
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`slice failed ${startNeedle} -> ${endNeedle} (${start},${end})`);
  }
  return lines.slice(start, end);
}

const chunks = [
  sliceBetween('.sidebar {', '.title-with-icon {'),
  sliceBetween('#user-section {', '#profile-modal {'),
  sliceBetween('.theme-toggle {', '.sidebar.collapsed .sidebar-header'),
  sliceBetween('.main-content {', '.container {'),
  sliceBetween('.switch {', '.toggle-row {')
];

const out = chunks
  .flat()
  .map((line) => line.replace(/^      /, ''))
  .join('\n')
  .trim();

fs.writeFileSync(path.join(__dirname, '../src/sidebar.css'), `${out}\n`);
console.log('sidebar.css bytes', out.length);
