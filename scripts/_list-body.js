const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const ids = [...body.matchAll(/^\s{2}<div id="([^"]+)"/gm)].map((m) => m[1]);
console.log(ids.join('\n'));
