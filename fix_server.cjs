const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

// We know the middleware to verify starts at line 115.
// Let's remove from line 36 up to 114 inclusive.

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= 35 && i <= 113) {
    continue;
  }
  newLines.push(lines[i]);
}

fs.writeFileSync('server.ts', newLines.join('\n'));
