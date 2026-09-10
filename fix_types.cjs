const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassEvaluation.tsx', 'utf8');

code = code.replace(
  "import React, { useEffect, useState, useMemo } from 'react';",
  "import React, { useEffect, useState, useMemo, useRef } from 'react';"
);

code = code.replace(
  "const { user } = useAuth();",
  "const { user } = useAuth();\n  const [period, setPeriod] = useState('1B');"
);

fs.writeFileSync('src/pages/ClassEvaluation.tsx', code);

let serverReports = fs.readFileSync('src/server-reports.ts', 'utf8');
serverReports = serverReports.replace(
  "const uid = req.user.uid;",
  "const uid = (req as any).user.uid;"
);
fs.writeFileSync('src/server-reports.ts', serverReports);

