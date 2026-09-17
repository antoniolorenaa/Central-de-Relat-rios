const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update Global Handler
code = code.replace(
  'console.error("Global API Error Handler caught:", err);',
  `if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded')) {
        console.warn("Global API Quota Warning:", err.message);
      } else {
        console.error("Global API Error Handler caught:", err);
      }`
);

// Update Stats Handler
code = code.replace(
  'console.error("Stats Error:", error);',
  `if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
        console.warn("Stats Quota Warning:", error.message);
      } else {
        console.error("Stats Error:", error);
      }`
);

// Update DEBUG
code = code.replace(
  'console.error("DEBUG ERROR:", error);',
  `if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
        console.warn("DEBUG Quota Warning:", error.message);
      } else {
        console.error("DEBUG ERROR:", error);
      }`
);

fs.writeFileSync('server.ts', code);
