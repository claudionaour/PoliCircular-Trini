import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  isFirebaseConfigured,
  testFirestoreConnection,
} from '../services/firebase';
import {
  ensureBootstrapProfile,
  fetchUserProfile,
  fetchUserRoles,
  signOutUser,
} from '../services/authService';
import { ensureInitialTerritorialSeed } from '../services/seedService';
import type { Profile, UserRole } from '../types/domain';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
  isEmailVerified: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshProfile: () => Promise<void>;
  reloadAuthUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>(['user']);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [verifiedState, setVerifiedState] = useState<boolean>(false);

  const loadUserData = useCallback(async (firebaseUser: User) => {
    try {
      await ensureBootstrapProfile(firebaseUser).catch(() => {});
      const [prof, userRoles] = await Promise.all([
        fetchUserProfile(firebaseUser.uid),
        fetchUserRoles(firebaseUser.uid, firebaseUser.email),
      ]);
      setProfile(prof);
      setRoles(userRoles);

      const isAdminUser =
        userRoles.includes('admin') || userRoles.includes('super_admin');
      if (isAdminUser && firebaseUser.emailVerified) {
        ensureInitialTerritorialSeed().catch((err) => {
          console.warn('Semilla territorial inicial pendiente:', err);
        });
      }
    } catch {
      setProfile(null);
      setRoles(['user']);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    testFirestoreConnection();
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      setUser(firebaseUser);
      setVerifiedState(Boolean(firebaseUser?.emailVerified));
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setProfile(null);
        setRoles(['user']);
      }
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadUserData]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserData(user);
    }
  }, [user, loadUserData]);

  const reloadAuthUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const refreshed = auth.currentUser;
      setUser(refreshed);
      setVerifiedState(Boolean(refreshed?.emailVerified));
      if (refreshed) {
        await loadUserData(refreshed);
      }
    }
  }, [loadUserData]);

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await signOutUser();
    setUser(null);
    setVerifiedState(false);
    setProfile(null);
    setRoles(['user']);
  }, []);

  const isEmailVerified = verifiedState || Boolean(user?.emailVerified);
  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = isSuperAdmin || roles.includes('admin');
  const isModerator = isAdmin || roles.includes('moderator');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        loading,
        isEmailVerified,
        isModerator,
        isAdmin,
        isSuperAdmin,
        refreshProfile,
        reloadAuthUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }
  return ctx;
}
