import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';

export function registerAcademicRoutes(app: express.Express, db: FirebaseFirestore.Firestore, authenticate: any) {
  
  // Gets all classes (filtered by user scope)
  app.get('/api/academic/classes', authenticate, async (req, res) => {
    try {
      const uid = (req as any).user.uid;
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) return res.status(403).json({ error: 'Usuário não encontrado.' });
      
      const userData = userSnap.data()!;
      let classesRef: FirebaseFirestore.Query = db.collection('classes').where('active', '==', true);
      
      const { schoolYear, brandId, unitId, gradeLevelId, programId, shift, search } = req.query;

      if (schoolYear) classesRef = classesRef.where('schoolYear', '==', schoolYear);
      if (brandId) classesRef = classesRef.where('brandId', '==', brandId);
      if (unitId) classesRef = classesRef.where('unitId', '==', unitId);
      if (gradeLevelId) classesRef = classesRef.where('gradeLevelId', '==', gradeLevelId);
      if (programId) classesRef = classesRef.where('programId', '==', programId);
      if (shift) classesRef = classesRef.where('shift', '==', shift);

      const classesSnap = await classesRef.get();
      let classes = classesSnap.docs.map(d => d.data());

      // Client-side text search (since Firestore doesn't support native partial text search easily)
      if (search) {
        const queryStr = (search as string).toLowerCase();
        classes = classes.filter(c => c.displayName?.toLowerCase().includes(queryStr));
      }

      // If COORDINATION, apply scope filtering
      if (userData.role === 'COORDINATION') {
        const userScopes = userData.scopes || [];
        if (userScopes.length === 0) {
          return res.json({ success: true, classes: [] });
        }
        classes = classes.filter((cls: any) => {
          return userScopes.some((scope: any) => {
            const brandMatch = scope.brandId === cls.brandId;
            const unitMatch = !scope.unitId || scope.unitId === cls.unitId;
            const glMatch = !scope.gradeLevelIds || scope.gradeLevelIds.length === 0 || scope.gradeLevelIds.includes(cls.gradeLevelId);
            return brandMatch && unitMatch && glMatch;
          });
        });
      }

      // Get enrollment counts
      const classIds = classes.map(c => c.id);
      
      // Fetch metadata to enrich response
      const [brandsSnap, unitsSnap, glSnap, programsSnap, enrollmentsSnap] = await Promise.all([
        db.collection('brands').get(),
        db.collection('units').get(),
        db.collection('gradeLevels').get(),
        db.collection('programs').get(),
        db.collection('enrollments').where('active', '==', true).select('classId').get()
      ]);

      const brands = brandsSnap.docs.map(d => d.data());
      const units = unitsSnap.docs.map(d => d.data());
      const gradeLevels = glSnap.docs.map(d => d.data());
      const programs = programsSnap.docs.map(d => d.data());
      
      const enrollmentCounts: Record<string, number> = {};
      enrollmentsSnap.docs.forEach(doc => {
        const cid = doc.data().classId;
        if (!enrollmentCounts[cid]) enrollmentCounts[cid] = 0;
        enrollmentCounts[cid]++;
      });

      // Enrich classes with counts and names
      classes = classes.map(cls => ({
        ...cls,
        studentCount: enrollmentCounts[cls.id] || 0,
        brandName: brands.find(b => b.id === cls.brandId)?.name || 'Desconhecido',
        unitName: units.find(u => u.id === cls.unitId)?.name || 'Desconhecida',
        gradeLevelName: gradeLevels.find(gl => gl.id === cls.gradeLevelId)?.name || 'Desconhecida',
        programName: programs.find(p => p.id === cls.programId)?.name || 'Desconhecido'
      }));

      // Scoped metadata for frontend filters (if COORDINATION, only return what they can see)
      let availableBrands = brands;
      let availableUnits = units;
      let availableGradeLevels = gradeLevels;

      if (userData.role === 'COORDINATION') {
        const userScopes = userData.scopes || [];
        const scopeBrandIds = new Set(userScopes.map((s: any) => s.brandId));
        const scopeUnitIds = new Set(userScopes.map((s: any) => s.unitId).filter(Boolean));
        
        availableBrands = brands.filter(b => scopeBrandIds.has(b.id));
        availableUnits = units.filter(u => scopeUnitIds.size === 0 || scopeUnitIds.has(u.id) || userScopes.some((s:any) => s.brandId === u.brandId && !s.unitId));
      }

      res.json({ 
        success: true, 
        classes,
        meta: {
          brands: availableBrands,
          units: availableUnits,
          gradeLevels: availableGradeLevels,
          programs
        }
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Gets students for a specific class
  app.get('/api/academic/classes/:classId/students', authenticate, async (req, res) => {
    try {
      const { classId } = req.params;
      const uid = (req as any).user.uid;
      
      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.data()!;

      // Verify scope access to this class if COORDINATION
      if (userData.role === 'COORDINATION') {
        const clsSnap = await db.collection('classes').doc(classId).get();
        if (!clsSnap.exists) return res.status(404).json({ error: 'Turma não encontrada' });
        const cls = clsSnap.data()!;

        const userScopes = userData.scopes || [];

        const hasAccess = userScopes.some((scope: any) => {
          const brandMatch = scope.brandId === cls.brandId;
          const unitMatch = !scope.unitId || scope.unitId === cls.unitId;
          const glMatch = !scope.gradeLevelIds || scope.gradeLevelIds.length === 0 || scope.gradeLevelIds.includes(cls.gradeLevelId);
          return brandMatch && unitMatch && glMatch;
        });

        if (!hasAccess) return res.status(403).json({ error: 'Acesso negado a esta turma' });
      }

      const enrollmentsSnap = await db.collection('enrollments').where('classId', '==', classId).where('active', '==', true).get();
      const enrollments = enrollmentsSnap.docs.map(d => d.data());

      if (enrollments.length === 0) {
        return res.json({ success: true, students: [] });
      }

      // Fetch students using IN chunks (max 30 per chunk in Firestore)
      const studentIds = Array.from(new Set(enrollments.map(e => e.studentId)));
      const students: any[] = [];
      
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const sSnap = await db.collection('students').where('id', 'in', chunk).get();
        sSnap.forEach(s => students.push(s.data()));
      }

      const result = enrollments.map(enr => {
        const stu = students.find(s => s.id === enr.studentId);
        return {
          ...stu,
          enrollment: enr
        };
      });

      res.json({ success: true, students: result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
