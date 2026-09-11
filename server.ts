import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import { registerImportRoutes } from './src/server-import';
import { registerAcademicRoutes } from './src/server-academic';
import { registerMatricesRoutes } from './src/server-matrices';
import { registerAssessmentRoutes } from './src/server-assessments';
import { registerReportsRoutes } from './src/server-reports';

// Initialize Firebase Admin
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let projectId = 'gen-lang-client-0443933607'; // Fallback
let firestoreDatabaseId = '(default)';
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  projectId = config.projectId;
  if (config.firestoreDatabaseId) {
    firestoreDatabaseId = config.firestoreDatabaseId;
  }
}

const adminApp = getApps().length === 0 ? initializeApp({ projectId }) : getApps()[0];
const db = getFirestore(adminApp, firestoreDatabaseId);
const adminAuth = getAuth(adminApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Firebase Auth token
  const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não foi possível confirmar sua sessão. Entre novamente.' });
      return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Não foi possível confirmar sua sessão. Entre novamente.' });
    }
  };

  // Cache for users to prevent hammering Firestore and burning daily read quotas
  const userCache = new Map<string, { data: any; timestamp: number }>();
  const USER_CACHE_TTL = 60 * 1000; // 60 seconds

  // Middleware to enforce MASTER role
  const requireMaster = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const uid = (req as any).user.uid;
    try {
      const now = Date.now();
      const cached = userCache.get(uid);
      let userData: any;
      if (cached && now - cached.timestamp < USER_CACHE_TTL) {
        userData = cached.data;
      } else {
        const userSnap = await db.collection('users').doc(uid).get();
        if (!userSnap.exists) {
          res.status(403).json({ error: 'Você não possui permissão para acessar esta área.' });
          return;
        }
        userData = userSnap.data();
        userCache.set(uid, { data: userData, timestamp: now });
      }

      if (userData?.role !== 'MASTER' || !userData?.active) {
        res.status(403).json({ error: 'Você não possui permissão para acessar esta área.' });
        return;
      }
      next();
    } catch (error: any) {
      console.error("DEBUG ERROR:", error);
      if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
        res.status(429).json({
          error: 'Limite de cota do Firestore atingido (RESOURCE_EXHAUSTED). A cota diária gratuita do Firebase será restabelecida no próximo ciclo diário.',
          code: 'RESOURCE_EXHAUSTED'
        });
        return;
      }
      res.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' });
    }
  };

  app.get('/api/auth/me', authenticate, async (req, res) => {
    const uid = (req as any).user.uid;
    const email = (req as any).user.email?.toLowerCase().trim();
    const emailVerified = (req as any).user.email_verified;

    if (!emailVerified) {
      res.status(403).json({ error: 'E-mail não verificado.' });
      return;
    }

    res.json({ success: true, uid, email, emailVerified });
  });

  let statsCache: { stats: any; timestamp: number } | null = null;
  const STATS_CACHE_TTL = 30 * 1000; // 30s

  app.get('/api/admin/stats', authenticate, requireMaster, async (req, res) => {
    try {
      const now = Date.now();
      if (statsCache && (now - statsCache.timestamp < STATS_CACHE_TTL)) {
        return res.json({ success: true, stats: statsCache.stats });
      }

      const [brandsSnap, unitsSnap, glSnap, progSnap, usersSnap, grantsSnap, classesSnap, studentsSnap] = await Promise.all([
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
      };

      statsCache = { stats, timestamp: now };
      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      console.error("Stats Error:", error);
      if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('Quota exceeded')) {
        if (statsCache) {
          return res.json({ success: true, stats: statsCache.stats, stale: true });
        }
        return res.status(429).json({
          error: 'Limite de cota do Firestore atingido (RESOURCE_EXHAUSTED). A cota diária gratuita do Firebase será restabelecida no próximo ciclo diário.',
          code: 'RESOURCE_EXHAUSTED'
        });
      }
      res.status(500).json({ error: 'Erro ao carregar estatísticas: ' + error.message });
    }
  });

  app.post('/api/admin/seed', authenticate, requireMaster, async (req, res) => {
    try {
      const batch = db.batch();

      // 1. Brands
      const brands = [
        { id: 'brand_motivo', code: 'MOTIVO', name: 'Colégio Motivo' },
        { id: 'brand_salvador', code: 'SALVADOR', name: 'Colégio do Salvador' },
        { id: 'brand_upaon', code: 'UPAON', name: 'Colégio Upaon-Açu' }
      ];

      // 2. Units
      const units = [
        { id: 'unit_mot_bv', brandId: 'brand_motivo', code: 'MOT_BV', name: 'Boa Viagem' },
        { id: 'unit_mot_cf', brandId: 'brand_motivo', code: 'MOT_CF', name: 'Casa Forte' },
        { id: 'unit_mot_car', brandId: 'brand_motivo', code: 'MOT_CAR', name: 'Caruaru' },
        { id: 'unit_mot_pet', brandId: 'brand_motivo', code: 'MOT_PET', name: 'Petrolina' },
        { id: 'unit_sal_sal', brandId: 'brand_salvador', code: 'SAL_SAL', name: 'Colégio do Salvador' },
        { id: 'unit_up_up', brandId: 'brand_upaon', code: 'UP_UP', name: 'Colégio Upaon-Açu' }
      ];

      // 3. Grade Levels
      const gradeLevels = [
        { id: 'gl_i1', code: 'I1', name: 'Infantil 1', order: 1 },
        { id: 'gl_i2', code: 'I2', name: 'Infantil 2', order: 2 },
        { id: 'gl_i3', code: 'I3', name: 'Infantil 3', order: 3 },
        { id: 'gl_i4', code: 'I4', name: 'Infantil 4', order: 4 },
        { id: 'gl_i5', code: 'I5', name: 'Infantil 5', order: 5 },
        { id: 'gl_ef1', code: 'EF1', name: '1º Ano', order: 6 }
      ];

      // 4. Programs
      const programs = [
        { id: 'prog_reg', code: 'REGULAR', name: 'Regular' },
        { id: 'prog_bil', code: 'BILINGUAL', name: 'Bilíngue' }
      ];

      // 5. GradeLevel Programs
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
      res.json({ success: true });
    } catch (error: any) {
      console.error("Seed Error:", error);
      res.status(500).json({ error: 'Erro de permissão IAM no Sandbox: ' + error.message });
    }
  });

  registerImportRoutes(app, db, authenticate, requireMaster);
  registerAcademicRoutes(app, db, authenticate);
  registerMatricesRoutes(app, db, authenticate, requireMaster);
  registerAssessmentRoutes(app, db, authenticate);
  registerReportsRoutes(app, db, authenticate);

  // Global error handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error("Global API Error Handler caught:", err);
      if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded')) {
        return res.status(429).json({
          error: "Limite de cota do Firestore atingido (RESOURCE_EXHAUSTED). A cota diária gratuita do Firebase será restabelecida no próximo ciclo diário.",
          code: "RESOURCE_EXHAUSTED"
        });
      }
      return res.status(500).json({ error: err.message || "Erro interno do servidor." });
    }
    next(err);
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
  
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
