const fs = require('fs');
const path = require('path');

const statsHtml = fs.readFileSync(path.join(__dirname, '../src/stats.html'), 'utf8');
const dashPath = path.join(__dirname, '../src/dashboard.html');
let dash = fs.readFileSync(dashPath, 'utf8');

const innerMatch = statsHtml.match(
  /<div class="stats-page">([\s\S]*?)<\/div>\s*<\/main>/
);
if (!innerMatch) {
  console.error('Could not extract stats-page inner HTML');
  process.exit(1);
}
const inner = innerMatch[1].trim();

const statsViewBlock = `        <div id="statsView" class="stats-view-root" style="display:none;">
          <div class="stats-page">
${inner}
          </div>
        </div>

`;

const marker = '        <section id="backtestingView" style="display:none;">';
if (!dash.includes(marker)) {
  console.error('dashboard marker not found');
  process.exit(1);
}
dash = dash.replace(marker, statsViewBlock + marker);
fs.writeFileSync(dashPath, dash);

const styleMatch = statsHtml.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.error('no style in stats.html');
  process.exit(1);
}
let css = styleMatch[1];
css = css.replace(/\/\* Sidebar:[\s\S]*?\*\//, '');
css = css.replace(/\/\* Crítico:[\s\S]*?overflow-x: hidden;\s*}/, '');
css = css.replace(/\.app-shell[\s\S]*?\/\* Sidebar:/, '/* Sidebar:');
css = css
  .split('\n')
  .map((line) => line.replace(/^      /, ''))
  .join('\n');

fs.writeFileSync(path.join(__dirname, '../src/stats-page.css'), css);
require('./scope-stats-page-css.js');
console.log('embedded statsView in dashboard.html and wrote scoped stats-page.css');
