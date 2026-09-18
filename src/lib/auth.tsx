import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut as firebaseSignOut, getIdToken } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(
      async (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          await syncProfile(firebaseUser);
        } else {
          setProfile(null);
          setLoading(false);
        }
      },
      (err: any) => {
        if (err?.code === 'auth/network-request-failed' || err?.message?.includes('network-request-failed')) {
          console.warn('Firebase Auth network warning:', err.message);
        } else {
          console.warn('Firebase Auth state observer warning:', err);
        }
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const syncProfile = async (firebaseUser: User) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar perfil.');
      }

      // 1. Tenta buscar o usuário já existente
      const { doc, getDoc, setDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (!userData.active) {
          throw new Error('Seu acesso à Central de Relatórios Pedagógicos ainda não foi liberado.');
        }
        await updateDoc(userRef, { lastLoginAt: Date.now() });
        setProfile({ ...userData, lastLoginAt: Date.now() } as UserProfile);
        return;
      }

      // 2. Verifica se tem pré-autorização (accessGrants)
      const grantRef = doc(db, 'accessGrants', data.email);
      const grantSnap = await getDoc(grantRef);
      
      if (!grantSnap.exists() || !grantSnap.data()?.active) {
        throw new Error('Seu acesso à Central de Relatórios Pedagógicos ainda não foi liberado.');
      }

      const grantData = grantSnap.data();
      const newUser: UserProfile = {
        id: firebaseUser.uid,
        firebaseUid: firebaseUser.uid,
        name: grantData.name || data.email,
        email: data.email,
        role: grantData.role,
        scopes: grantData.scopes || [],
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now()
      };

      await setDoc(userRef, newUser);
      await updateDoc(grantRef, { linkedFirebaseUid: firebaseUser.uid, linkedAt: Date.now() });
      setProfile(newUser);
      
    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded')) {
        setError('Limite de cota do Firestore atingido (RESOURCE_EXHAUSTED). A cota diária gratuita do Firebase será restabelecida no próximo ciclo diário.');
      } else {
        setError(err.message);
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao validar token para bootstrap.');
      }

      const bootstrapEmail = (import.meta as any).env.VITE_BOOTSTRAP_MASTER_EMAIL?.toLowerCase().trim() || 'antoniocarloslorena@gmail.com';
      if (data.email !== bootstrapEmail) {
        throw new Error('Você não possui permissão para acessar esta área.');
      }

      const { doc, getDoc, setDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let userDoc;
      if (!userSnap.exists()) {
        userDoc = {
          id: user.uid,
          firebaseUid: user.uid,
          name: 'Master Admin',
          email: data.email,
          role: 'MASTER',
          active: true,
          scopes: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastLoginAt: Date.now()
        };
        await setDoc(userRef, userDoc);
      } else {
        await updateDoc(userRef, { role: 'MASTER', active: true, lastLoginAt: Date.now() });
        userDoc = { ...userSnap.data(), role: 'MASTER', active: true, lastLoginAt: Date.now() };
      }

      setProfile(userDoc as UserProfile);
    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded')) {
        setError('Limite de cota do Firestore atingido (RESOURCE_EXHAUSTED). A cota diária gratuita do Firebase será restabelecida no próximo ciclo diário.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      // Se sucesso, o onAuthStateChanged e syncProfile vão lidar com o estado de loading
    } catch (err: any) {
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
        console.warn('Firebase Auth network warning:', message);
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (isInIframe) {
          setError(
            'Falha de rede na autenticação (auth/network-request-failed). ' +
            'Em janelas integradas (iframe), navegadores restringem cookies de autenticação do Google. ' +
            'Abra o aplicativo em uma nova aba para entrar com sua conta.'
          );
        } else {
          setError(
            'Não foi possível conectar aos servidores de autenticação do Google (auth/network-request-failed). ' +
            'Verifique sua conexão ou se algum bloqueador de anúncios/rastreamento está ativo e tente novamente.'
          );
        }
      } else if (code === 'auth/popup-blocked') {
        console.warn('Firebase Auth popup blocked:', message);
        setError('O pop-up de login foi bloqueado pelo navegador. Permita pop-ups para este site ou abra o aplicativo em uma nova aba.');
      } else if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
        console.warn('Firebase Auth popup closed:', message);
        setError('O login foi cancelado.');
      } else {
        console.error('Firebase Auth error:', err);
        setError(message || 'Não foi possível entrar com sua conta Google. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signOut, bootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
