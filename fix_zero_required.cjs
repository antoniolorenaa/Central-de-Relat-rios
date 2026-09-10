const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

// In /validate
const replaceValidate = `
        let assDoc = await t.get(db.collection('assessments').doc(assessmentId));
        let assStatus = 'NOT_STARTED';
        let assRevision = 1;
        let assMatrixId = '';
        let assMatrixVersion = 1;
        
        if (!assDoc.exists) {
           // Maybe requiredCount is 0, so no one clicked answers yet. 
           // We need to fetch the matrix to check.
           const matrixSnap = await t.get(db.collection('matrices').where('status', '==', 'PUBLISHED').where('gradeLevelId', '==', cls.gradeLevelId).limit(1));
           // Let's just say we need to reject unless we know for sure. 
           // But wait, we have assessmentId parameter which contains matrixId.
           const parts = assessmentId.split('_');
           const matId = parts[2];
           if (matId) {
             const mx = await t.get(db.collection('matrices').doc(matId));
             if (mx.exists) {
               const reqCount = mx.data().criteria.filter(c => c.required).length;
               if (reqCount === 0) {
                 assStatus = 'COMPLETED';
                 assMatrixId = matId;
                 assMatrixVersion = mx.data().version || 1;
                 
                 // Create it!
                 t.set(db.collection('assessments').doc(assessmentId), {
                    id: assessmentId,
                    studentId: enrollment.studentId,
                    enrollmentId,
                    classId: cls.id,
                    matrixId: matId,
                    matrixVersion: assMatrixVersion,
                    schoolYear: cls.schoolYear,
                    period,
                    answers: {},
                    answeredCount: 0,
                    requiredCount: 0,
                    developedCount: 0,
                    inDevelopmentCount: 0,
                    completionPercentage: 0,
                    status: 'COMPLETED',
                    revision: 1,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    updatedBy: uid
                 });
               }
             }
           }
           
           if (assStatus !== 'COMPLETED') {
             throw new Error('INVALID_ASSESSMENT_STATUS');
           }
        } else {
          const assData = assDoc.data();
          assStatus = assData.status;
          assRevision = assData.revision;
          assMatrixId = assData.matrixId;
          assMatrixVersion = assData.matrixVersion;
        }
        
        if (assStatus !== 'COMPLETED') {
          throw new Error('INVALID_ASSESSMENT_STATUS');
        }
`;

code = code.replace(
/        \/\/ Re-check assessment status[\s\S]*?throw new Error\('INVALID_ASSESSMENT_STATUS'\);\s*\}/,
  replaceValidate
);

// We need to adjust validated properties
code = code.replace(
  "reportData.validatedAssessmentRevision = assData.revision;",
  "reportData.validatedAssessmentRevision = assRevision;"
);
code = code.replace(
  "reportData.validatedMatrixId = assData.matrixId;",
  "reportData.validatedMatrixId = assMatrixId;"
);
code = code.replace(
  "reportData.validatedMatrixVersion = assData.matrixVersion;",
  "reportData.validatedMatrixVersion = assMatrixVersion;"
);
code = code.replace(
  "assessmentRevision: assData.revision,",
  "assessmentRevision: assRevision,"
);
code = code.replace(
  "matrixId: assData.matrixId || '',",
  "matrixId: assMatrixId || '',"
);
code = code.replace(
  "matrixVersion: assData.matrixVersion || 1",
  "matrixVersion: assMatrixVersion || 1"
);


fs.writeFileSync('src/server-reports.ts', code);
