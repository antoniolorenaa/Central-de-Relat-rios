const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const target = `
        // Write audit log
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
          action: 'REPORT_VALIDATED',
          reportId: reportData.id,
          studentId: reportData.studentId,
          classId: reportData.classId,
          uid,
          timestamp: Date.now()
        });
`;

const replacement = `
        // Write audit log
        const auditRef = db.collection('auditLogs').doc();
        t.set(auditRef, {
          action: 'REPORT_VALIDATED',
          reportId: reportData.id,
          validatedBy: uid,
          validatedAt: Date.now(),
          assessmentRevision: assData.revision,
          matrixId: assData.matrixId || '',
          matrixVersion: assData.matrixVersion || 1
        });
`;

code = code.replace(target, replacement);

fs.writeFileSync('src/server-reports.ts', code);
