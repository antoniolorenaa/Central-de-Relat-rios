const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const regex = /\/\/ Save pending changes before validation[\s\S]*?if \(!reportData\.finalText\?\.trim\(\)\) \{/m;

const replacement = `// Save pending changes before validation
        if (strengths !== undefined) {
          if (typeof strengths !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.strengths = strengths;
        }
        if (developmentAspects !== undefined) {
          if (typeof developmentAspects !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.developmentAspects = developmentAspects;
        }
        if (additionalInformation !== undefined) {
          if (typeof additionalInformation !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.additionalInformation = additionalInformation;
        }
        if (finalText !== undefined) {
          if (typeof finalText !== 'string') throw new Error('INVALID_TEXT_FIELD');
          reportData.finalText = finalText;
        }

        if (!reportData.finalText?.trim()) {`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/server-reports.ts', code);
console.log("Patched validate texts");
