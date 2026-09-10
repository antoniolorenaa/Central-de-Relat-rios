const fs = require('fs');
let code = fs.readFileSync('src/server-reports.ts', 'utf8');

const replacement = `      const finalState = await db.runTransaction(async (t) => {
        const doc = await t.get(reportRef);
        if (!doc.exists) throw new Error('Relatório não encontrado.');
        
        const reportData = doc.data()!;
        
        if (reportData.reportStatus === 'VALIDATED') {
          return reportData; // already validated
        }

        if (expectedRevision === undefined || typeof expectedRevision !== 'number') {
          throw new Error('Revisão esperada não fornecida ou inválida.');
        }

        if (reportData.revision !== expectedRevision) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
        
        if (!reportData.assessmentId) {
          throw new Error('Relatório sem avaliação vinculada.');
        }

        if (assessmentId && reportData.assessmentId !== assessmentId) {
          throw new Error('O ID de avaliação diverge do vinculado ao relatório.');
        }

        const realAssessmentId = reportData.assessmentId;
        
        const assDoc = await t.get(db.collection('assessments').doc(realAssessmentId));
        if (!assDoc.exists) {
           throw new Error('Avaliação vinculada inexistente.');
        }
        
        const assData = assDoc.data()!;

        // CONFERÊNCIA DOS VÍNCULOS
        if (
          assData.enrollmentId !== enrollmentId ||
          assData.studentId !== enrollment.studentId ||
          assData.classId !== enrollment.classId ||
          assData.schoolYear !== enrollment.schoolYear ||
          assData.period !== period
        ) {
           throw new Error('Vínculos inconsistentes entre avaliação, matrícula e relatório.');
        }

        if (assData.status !== 'COMPLETED') {
          throw new Error('INVALID_ASSESSMENT_STATUS');
        }

        // Save pending changes before validation
        if (strengths !== undefined && typeof strengths === 'string') reportData.strengths = strengths;
        if (developmentAspects !== undefined && typeof developmentAspects === 'string') reportData.developmentAspects = developmentAspects;
        if (additionalInformation !== undefined && typeof additionalInformation === 'string') reportData.additionalInformation = additionalInformation;
        if (finalText !== undefined && typeof finalText === 'string') reportData.finalText = finalText;

        if (!reportData.finalText?.trim()) {
          throw new Error('MISSING_FINAL_TEXT');
        }
        
        // Se matriz também estiver divergente na mesma base, devemos rejeitar.
        if (reportData.matrixId && reportData.matrixId !== assData.matrixId) {
          throw new Error('MATRIX_MISMATCH');
        }

        reportData.reportStatus = 'VALIDATED';
        reportData.validatedBy = uid;
        reportData.validatedAt = Date.now();
        reportData.validatedAssessmentRevision = assData.revision;
        reportData.validatedMatrixId = assData.matrixId;
        reportData.validatedMatrixVersion = assData.matrixVersion;
        reportData.revision = (reportData.revision || 0) + 1;
        reportData.updatedAt = Date.now();
        reportData.updatedBy = uid;

        t.set(reportRef, reportData);
        
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

        return reportData;
      });`;

const matchRegex = /      const finalState = await db\.runTransaction\(async \(t\) => \{[\s\S]*?        return reportData;\n      \}\);/m;

code = code.replace(matchRegex, replacement);

fs.writeFileSync('src/server-reports.ts', code);
