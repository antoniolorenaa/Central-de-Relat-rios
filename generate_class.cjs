// Just mock it and we will rebuild the functionality from the backup file
const fs = require('fs');
let original = fs.readFileSync('broken_class.txt', 'utf8').split('\n').map(l => l.replace(/^\s*\d+\t/, '').replace(/\r$/, ''));
// Okay this is too hard to parse via regex since we did it so many times and it keeps breaking. 
// What if we just revert to git... wait there's no git.

// Let's just create the component manually from scratch using what we know it does.
