const fs = require('fs');
let code = fs.readFileSync('src/server-academic.ts', 'utf8');

const target = `const [brandsSnap, unitsSnap, glSnap, programsSnap, enrollmentsSnap] = await Promise.all([
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
      });`;

const replacement = `const [brandsSnap, unitsSnap, glSnap, programsSnap] = await Promise.all([
        db.collection('brands').get(),
        db.collection('units').get(),
        db.collection('gradeLevels').get(),
        db.collection('programs').get()
      ]);

      const brands = brandsSnap.docs.map(d => d.data());
      const units = unitsSnap.docs.map(d => d.data());
      const gradeLevels = glSnap.docs.map(d => d.data());
      const programs = programsSnap.docs.map(d => d.data());
      
      const enrollmentCounts: Record<string, number> = {};
      
      // Batch count queries for classes
      const countPromises = classes.map(cls => 
        db.collection('enrollments').where('active', '==', true).where('classId', '==', cls.id).count().get()
          .then(snap => {
            enrollmentCounts[cls.id] = snap.data().count;
          })
          .catch(err => {
             console.error("Count err", err);
             enrollmentCounts[cls.id] = 0;
          })
      );
      await Promise.all(countPromises);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server-academic.ts', code);
  console.log('Fixed enrollment counts in server-academic.ts');
} else {
  console.log('Target not found in server-academic.ts');
}
