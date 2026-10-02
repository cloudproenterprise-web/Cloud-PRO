import React, { createContext, useContext, useState } from 'react';
import { User, ResellerProfile } from '../types';
import { db } from '../services/storage';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  currentResellerProfile?: ResellerProfile;
  login: (emailOrUser: string, role?: 'admin' | 'reseller' | 'customer') => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  switchRole: (role: 'admin' | 'reseller' | 'customer') => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  saveWhiteLabel: (profileUpdates: Partial<ResellerProfile>) => void;
  toggle2FA: () => boolean;
  allUsers: User[];
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserState, setCurrentUserState] = useState<User | null>(() => {
    const savedId = localStorage.getItem('cloudpro_current_user_id');
    if (savedId) {
      return db.getUserById(savedId) || null;
    }
    return null;
  });

  // Always resolve fresh user & reseller profile from db so edits in ResellerList / WhiteLabel are reflected immediately
  const currentUser = currentUserState ? db.getUserById(currentUserState.id) || currentUserState : null;

  const currentResellerProfile =
    currentUser && currentUser.role === 'reseller'
      ? db.getResellerProfile(currentUser.id)
      : undefined;

  const ensureRoleUser = (role: 'admin' | 'reseller' | 'customer', customName?: string): User => {
    const all = db.getUsers();
    if (role === 'reseller') {
      const preferredResellerId = localStorage.getItem('cloudpro_active_reseller_id');
      const allResellers = all.filter(u => u.role === 'reseller');
      // Prefer the reseller explicitly selected or most recently created/edited in Cloud PRO
      const customResellers = allResellers.filter(
        u => u.email !== 'reseller@mitrahosting.my.id' || u.name !== 'Mitra Reseller Cloud'
      );
      const chosen =
        (preferredResellerId ? allResellers.find(u => u.id === preferredResellerId) : undefined) ||
        customResellers[customResellers.length - 1] ||
        allResellers[allResellers.length - 1];
      if (chosen) return chosen;
    }

    const existing = all.find(u => u.role === role);
    if (existing) {
      return existing;
    }

    const newUser: User = {
      id: `usr-${role}-01`,
      name:
        role === 'admin'
          ? 'Root Administrator'
          : role === 'reseller'
          ? customName || 'Mitra Reseller'
          : customName || 'Klien Hosting',
      username: customName || role,
      email:
        customName && customName.includes('@')
          ? customName
          : `${customName || role}@denbaguse.my.id`,
      role,
      status: 'active',
      creditBalance: role === 'admin' ? 50000 : role === 'reseller' ? 1500 : 250,
      companyName:
        role === 'admin'
          ? 'Cloud PRO Enterprise'
          : role === 'reseller'
          ? 'Mitra Hosting Partner'
          : 'cPanel Web Client',
      twoFactorEnabled: role === 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    db.saveUser(newUser);
    return newUser;
  };

  const login = (emailOrUser: string, role?: 'admin' | 'reseller' | 'customer') => {
    const cleanInput = emailOrUser.trim();
    const targetRole = role || 'admin';
    const all = db.getUsers();
    let target = all.find(
      u =>
        u.role === targetRole &&
        (u.email.toLowerCase() === cleanInput.toLowerCase() ||
          u.name.toLowerCase() === cleanInput.toLowerCase() ||
          (u.username ? u.username.toLowerCase() === cleanInput.toLowerCase() : false))
    );
    if (!target) {
      target = ensureRoleUser(targetRole, cleanInput);
    }
    if (target.role === 'reseller') {
      try {
        localStorage.setItem('cloudpro_active_reseller_id', target.id);
      } catch {}
    }
    setCurrentUserState(target);
    try {
      localStorage.setItem('cloudpro_current_user_id', target.id);
    } catch {}
    return true;
  };

  const logout = () => {
    try {
      localStorage.removeItem('cloudpro_current_user_id');
    } catch {}
    setCurrentUserState(null);
  };

  const switchUser = (userId: string) => {
    const target = db.getUserById(userId);
    if (target) {
      if (target.role === 'reseller') {
        try {
          localStorage.setItem('cloudpro_active_reseller_id', target.id);
        } catch {}
      }
      setCurrentUserState(target);
      try {
        localStorage.setItem('cloudpro_current_user_id', target.id);
      } catch {}
    }
  };

  const switchRole = (role: 'admin' | 'reseller' | 'customer') => {
    const target = ensureRoleUser(role);
    if (target.role === 'reseller') {
      localStorage.setItem('cloudpro_active_reseller_id', target.id);
    }
    setCurrentUserState(target);
    localStorage.setItem('cloudpro_current_user_id', target.id);
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    db.saveUser(updated);
    setCurrentUserState(updated);
  };

  const saveWhiteLabel = (profileUpdates: Partial<ResellerProfile>) => {
    if (currentUser?.role === 'reseller') {
      const existing = db.getResellerProfile(currentUser.id);
      const nextPrimary =
        profileUpdates.primaryDomain ||
        existing?.primaryDomain ||
        (profileUpdates.panelDomain || existing?.panelDomain || 'mitrahosting.my.id').replace(/^panel\./i, '');
      const nextPanel =
        profileUpdates.panelDomain ||
        existing?.panelDomain ||
        `panel.${nextPrimary.replace(/^panel\./i, '')}`;

      if (existing) {
        db.saveResellerProfile({
          ...existing,
          ...profileUpdates,
          primaryDomain: nextPrimary,
          panelDomain: nextPanel,
        });
      } else {
        db.saveResellerProfile({
          id: `prof-${currentUser.id}`,
          userId: currentUser.id,
          brandName: profileUpdates.brandName || currentUser.name || 'Mitra Cloud Hosting',
          themeColor: profileUpdates.themeColor || '#0ea5e9',
          primaryDomain: nextPrimary,
          panelDomain: nextPanel,
          supportEmail: profileUpdates.supportEmail || currentUser.email,
          allocatedDiskMb: 102400,
          allocatedBandwidthMb: 1024000,
          maxAccounts: 50,
          hideUpstreamBranding: true,
          ...profileUpdates,
        });
      }
      // Trigger state refresh
      setCurrentUserState({ ...currentUser });
    }
  };

  const toggle2FA = () => {
    if (!currentUser) return false;
    const nextVal = !currentUser.twoFactorEnabled;
    updateCurrentUser({
      twoFactorEnabled: nextVal,
      twoFactorSecret: nextVal ? 'CP-' + Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
    });
    return nextVal;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        currentResellerProfile,
        login,
        logout,
        switchUser,
        switchRole,
        updateCurrentUser,
        saveWhiteLabel,
        toggle2FA,
        allUsers: db.getUsers(),
        isImpersonating: currentUser?.role !== 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
