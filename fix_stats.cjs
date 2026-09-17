const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `const [brandsSnap, unitsSnap, glSnap, progSnap, usersSnap, grantsSnap, classesSnap, studentsSnap] = await Promise.all([
        db.collection('brands').get(),
        db.collection('units').get(),
        db.collection('gradeLevels').get(),
        db.collection('programs').get(),
        db.collection('users').where('active', '==', true).get(),
        db.collection('accessGrants').where('active', '==', true).get(),
        db.collection('classes').where('active', '==', true).get(),
        db.collection('students').where('active', '==', true).get()
      ]);

      const users = usersSnap.docs.map(d => d.data());
      const pendingGrants = grantsSnap.docs.map(d => d.data()).filter(g => !g.linkedFirebaseUid);
      
      const totalUsers = users.length + pendingGrants.length;
      const coordinations = users.filter(u => u.role === 'COORDINATION').length + 
                           pendingGrants.filter(g => g.role === 'COORDINATION').length;

      const stats = {
        brands: brandsSnap.size,
        units: unitsSnap.size,
        gradeLevels: glSnap.size,
        programs: progSnap.size,
        classes: classesSnap.size,
        students: studentsSnap.size,
        users: totalUsers,
        coordinations
      };`;

const replacement = `const [brandsSnap, unitsSnap, glSnap, progSnap, usersSnap, grantsSnap, classesSnap, studentsSnap] = await Promise.all([
        db.collection('brands').count().get(),
        db.collection('units').count().get(),
        db.collection('gradeLevels').count().get(),
        db.collection('programs').count().get(),
        db.collection('users').where('active', '==', true).get(),
        db.collection('accessGrants').where('active', '==', true).get(),
        db.collection('classes').where('active', '==', true).count().get(),
        db.collection('students').where('active', '==', true).count().get()
      ]);

      const users = usersSnap.docs.map(d => d.data());
      const pendingGrants = grantsSnap.docs.map(d => d.data()).filter(g => !g.linkedFirebaseUid);
      
      const totalUsers = users.length + pendingGrants.length;
      const coordinations = users.filter(u => u.role === 'COORDINATION').length + 
                           pendingGrants.filter(g => g.role === 'COORDINATION').length;

      const stats = {
        brands: brandsSnap.data().count,
        units: unitsSnap.data().count,
        gradeLevels: glSnap.data().count,
        programs: progSnap.data().count,
        classes: classesSnap.data().count,
        students: studentsSnap.data().count,
        users: totalUsers,
        coordinations
      };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('Fixed stats query in server.ts');
} else {
  console.log('Target not found');
}
