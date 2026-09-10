const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: 'gen-lang-client-0443933607', credential: applicationDefault() });
const db = getFirestore(app, 'ai-studio-77b98651-eb46-4ef0-aac8-0ad5067fb9fd');

async function run() {
  const batch = db.batch();
  
  const brands = [
    { id: 'brand_motivo', code: 'MOTIVO', name: 'Colégio Motivo' },
    { id: 'brand_salvador', code: 'SALVADOR', name: 'Colégio do Salvador' },
    { id: 'brand_upaon', code: 'UPAON', name: 'Colégio Upaon-Açu' }
  ];

  const units = [
    { id: 'unit_mot_bv', brandId: 'brand_motivo', code: 'MOT_BV', name: 'Boa Viagem' },
    { id: 'unit_mot_cf', brandId: 'brand_motivo', code: 'MOT_CF', name: 'Casa Forte' },
    { id: 'unit_mot_car', brandId: 'brand_motivo', code: 'MOT_CAR', name: 'Caruaru' },
    { id: 'unit_mot_pet', brandId: 'brand_motivo', code: 'MOT_PET', name: 'Petrolina' },
    { id: 'unit_sal_sal', brandId: 'brand_salvador', code: 'SAL_SAL', name: 'Colégio do Salvador' },
    { id: 'unit_up_up', brandId: 'brand_upaon', code: 'UP_UP', name: 'Colégio Upaon-Açu' }
  ];

  const gradeLevels = [
    { id: 'gl_i1', code: 'I1', name: 'Infantil 1', order: 1 },
    { id: 'gl_i2', code: 'I2', name: 'Infantil 2', order: 2 },
    { id: 'gl_i3', code: 'I3', name: 'Infantil 3', order: 3 },
    { id: 'gl_i4', code: 'I4', name: 'Infantil 4', order: 4 },
    { id: 'gl_i5', code: 'I5', name: 'Infantil 5', order: 5 },
    { id: 'gl_ef1', code: 'EF1', name: '1º Ano', order: 6 }
  ];

  const programs = [
    { id: 'prog_reg', code: 'REGULAR', name: 'Regular' },
    { id: 'prog_bil', code: 'BILINGUAL', name: 'Bilíngue' }
  ];

  const combinations = [
    { id: 'glp_i1_reg', gradeLevelId: 'gl_i1', programId: 'prog_reg' },
    { id: 'glp_i2_reg', gradeLevelId: 'gl_i2', programId: 'prog_reg' },
    { id: 'glp_i2_bil', gradeLevelId: 'gl_i2', programId: 'prog_bil' },
    { id: 'glp_i3_reg', gradeLevelId: 'gl_i3', programId: 'prog_reg' },
    { id: 'glp_i3_bil', gradeLevelId: 'gl_i3', programId: 'prog_bil' },
    { id: 'glp_i4_reg', gradeLevelId: 'gl_i4', programId: 'prog_reg' },
    { id: 'glp_i4_bil', gradeLevelId: 'gl_i4', programId: 'prog_bil' },
    { id: 'glp_i5_reg', gradeLevelId: 'gl_i5', programId: 'prog_reg' },
    { id: 'glp_i5_bil', gradeLevelId: 'gl_i5', programId: 'prog_bil' },
    { id: 'glp_ef1_reg', gradeLevelId: 'gl_ef1', programId: 'prog_reg' },
    { id: 'glp_ef1_bil', gradeLevelId: 'gl_ef1', programId: 'prog_bil' }
  ];

  const now = Date.now();

  brands.forEach(b => batch.set(db.collection('brands').doc(b.id), { ...b, active: true, createdAt: now, updatedAt: now }, { merge: true }));
  units.forEach(u => batch.set(db.collection('units').doc(u.id), { ...u, active: true, createdAt: now, updatedAt: now }, { merge: true }));
  gradeLevels.forEach(gl => batch.set(db.collection('gradeLevels').doc(gl.id), { ...gl, active: true }, { merge: true }));
  programs.forEach(p => batch.set(db.collection('programs').doc(p.id), { ...p, active: true, createdAt: now, updatedAt: now }, { merge: true }));
  combinations.forEach(c => batch.set(db.collection('gradeLevelPrograms').doc(c.id), { ...c, active: true }, { merge: true }));

  await batch.commit();

  const [b, u, gl, p, c] = await Promise.all([
    db.collection('brands').get(),
    db.collection('units').get(),
    db.collection('gradeLevels').get(),
    db.collection('programs').get(),
    db.collection('gradeLevelPrograms').get()
  ]);

  console.log(`Brands: ${b.size}, Units: ${u.size}, GradeLevels: ${gl.size}, Programs: ${p.size}, Combinations: ${c.size}`);
}
run().catch(console.error);
