// Final desperate fix script
const fs = require('fs');

let content = fs.readFileSync('broken_class.txt', 'utf8');
content = content.replace(/^[ \t]*\d+\t/gm, ''); // remove line numbers
// I will just use the AST parser (Babel) if it's installed. Wait, there's no Babel CLI here.
