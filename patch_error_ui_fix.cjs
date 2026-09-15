const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

// I might have replaced too much or too little in the error block
// Let's restore the code right at the end of the savingState === "saved"
// and insert the error block properly.

// First let's check what I broke.
