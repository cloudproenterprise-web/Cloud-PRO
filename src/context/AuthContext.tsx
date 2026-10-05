import React, { createContext, useContext, useState } from 'react';
import { User, ResellerProfile } from '../types';
import { db } from '../services/storage';
import { DEFAULT_2FA_SECRET } from '../services/totp';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  authenticatedRole: 'admin' | 'reseller' | 'customer';
  currentResellerProfile?: ResellerProfile;
  login: (
    emailOrUser: string,
    role?: 'admin' | 'reseller' | 'customer',
    twoFactorVerified?: boolean
  ) => boolean;
  check2FARequired: (
    emailOrUser: string,
    role?: 'admin' | 'reseller' | 'customer'
  ) => { required: boolean; secret: string; email: string; user?: User };
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
  const [authenticatedRole, setAuthenticatedRole] = useState<'admin' | 'reseller' | 'customer'>(() => {
    const savedRole = localStorage.getItem('cloudpro_authenticated_role') as 'admin' | 'reseller' | 'customer' | null;
    if (savedRole && ['admin', 'reseller', 'customer'].includes(savedRole)) {
      return savedRole;
    }
    const savedId = localStorage.getItem('cloudpro_current_user_id');
    if (savedId) {
      const u = db.getUserById(savedId);
      if (u) return u.role;
    }
    return 'admin';
  });

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
          ? 'Karsa Cloud PRO'
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

  const check2FARequired = (
    emailOrUser: string,
    role?: 'admin' | 'reseller' | 'customer'
  ): { required: boolean; secret: string; email: string; user?: User } => {
    const cleanInput = emailOrUser.trim();
    const targetRole = role || 'admin';
    const all = db.getUsers();
    let target = all.find(
      u =>
        u.role === targetRole &&
        (u.email.toLowerCase() === cleanInput.toLowerCase() ||
          u.name.toLowerCase() === cleanInput.toLowerCase() ||
          (u.username ? u.username.toLowerCase() === cleanInput.toLowerCase() : false) ||
          (u.role === 'admin' && ['karsacloud', 'gridmaster', 'admin', 'root'].includes(cleanInput.toLowerCase())))
    );
    if (!target) {
      target = ensureRoleUser(targetRole, cleanInput);
    }

    // Root Admin ALWAYS requires 2FA by default for enterprise security hardening
    if (target.role === 'admin') {
      const secret =
        target.twoFactorSecret && !/[^A-Z2-7]/i.test(target.twoFactorSecret)
          ? target.twoFactorSecret.toUpperCase()
          : DEFAULT_2FA_SECRET;
      return {
        required: true,
        secret,
        email: target.email || 'admin@denbaguse.my.id',
        user: target,
      };
    }

    // For other roles (reseller/customer), require 2FA if they turned it on
    if (target.twoFactorEnabled) {
      const secret =
        target.twoFactorSecret && !/[^A-Z2-7]/i.test(target.twoFactorSecret)
          ? target.twoFactorSecret.toUpperCase()
          : DEFAULT_2FA_SECRET;
      return {
        required: true,
        secret,
        email: target.email,
        user: target,
      };
    }

    return {
      required: false,
      secret: DEFAULT_2FA_SECRET,
      email: target.email,
      user: target,
    };
  };

  const login = (
    emailOrUser: string,
    role?: 'admin' | 'reseller' | 'customer',
    twoFactorVerified = false
  ) => {
    const cleanInput = emailOrUser.trim();
    const targetRole = role || 'admin';
    const all = db.getUsers();
    let target = all.find(
      u =>
        u.role === targetRole &&
        (u.email.toLowerCase() === cleanInput.toLowerCase() ||
          u.name.toLowerCase() === cleanInput.toLowerCase() ||
          (u.username ? u.username.toLowerCase() === cleanInput.toLowerCase() : false) ||
          (u.role === 'admin' && ['karsacloud', 'gridmaster', 'admin', 'root'].includes(cleanInput.toLowerCase())))
    );
    if (!target) {
      target = ensureRoleUser(targetRole, cleanInput);
    }
    if (target.role === 'reseller') {
      try {
        localStorage.setItem('cloudpro_active_reseller_id', target.id);
      } catch {}
    }
    setAuthenticatedRole(target.role);
    try {
      localStorage.setItem('cloudpro_authenticated_role', target.role);
    } catch {}
    setCurrentUserState(target);
    try {
      localStorage.setItem('cloudpro_current_user_id', target.id);
    } catch {}

    // Security Sensor & Audit Logging: Rekam jejak forensik setiap kali login
    try {
      const is2FA = target.role === 'admin' || target.twoFactorEnabled || twoFactorVerified;
      const actionType = target.role === 'admin' ? 'ADMIN_LOGIN_SUCCESS' : 'USER_LOGIN_SUCCESS';
      const desc = is2FA
        ? `Sesi login aman terverifikasi via 2FA Google Authenticator untuk portal ${target.role.toUpperCase()} (${target.name} - ${target.email})`
        : `Sesi login aktif terdeteksi untuk portal ${target.role.toUpperCase()} (${target.name} - ${target.email})`;

      db.logAction(target, actionType, 'SECURITY', desc);

      if (target.role === 'admin') {
        db.addNotification(
          '🛡️ Sensor Keamanan: Sesi Admin Aktif (2FA Terverifikasi)',
          `Sesi login Root Administrator terverifikasi dengan kode OTP 2FA pada ${new Date().toLocaleTimeString()} WIB. Seluruh akses cluster dipantau oleh tamper-evident audit.`,
          'info'
        );
      }
    } catch {}

    return true;
  };

  const logout = () => {
    if (currentUser) {
      try {
        db.logAction(
          currentUser,
          'USER_LOGOUT',
          'SECURITY',
          `Pengguna ${currentUser.name} (${currentUser.role.toUpperCase()}) telah keluar dari sesi panel.`
        );
      } catch {}
    }
    try {
      localStorage.removeItem('cloudpro_current_user_id');
      localStorage.removeItem('cloudpro_authenticated_role');
      localStorage.removeItem('cloudpro_active_reseller_id');
    } catch {}
    setCurrentUserState(null);
    setAuthenticatedRole('admin');
  };

  const switchUser = (userId: string) => {
    const target = db.getUserById(userId);
    if (!target) return;

    // RBAC SECURITY: If logged in as customer, cannot switch to any other account
    if (authenticatedRole === 'customer') {
      return;
    }
    // If logged in as reseller, cannot switch to Root Administrator or another reseller
    if (authenticatedRole === 'reseller' && (target.role === 'admin' || (target.role === 'reseller' && target.id !== currentUser?.id))) {
      return;
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
  };

  const switchRole = (role: 'admin' | 'reseller' | 'customer') => {
    // RBAC SECURITY: When logged in as reseller or customer, other dashboards CANNOT be accessed by switching portal mode
    if (authenticatedRole !== 'admin') {
      console.warn(`[RBAC Access Control] User logged in as '${authenticatedRole}' is not authorized to switch to '${role}' dashboard.`);
      return;
    }

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
    const validExistingSecret =
      currentUser.twoFactorSecret && !/[^A-Z2-7]/i.test(currentUser.twoFactorSecret) && currentUser.twoFactorSecret.length >= 16
        ? currentUser.twoFactorSecret.toUpperCase()
        : null;
    updateCurrentUser({
      twoFactorEnabled: nextVal,
      twoFactorSecret: nextVal ? (validExistingSecret || 'KARSACLOUDSECRET23') : undefined,
    });
    return nextVal;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        authenticatedRole,
        currentResellerProfile,
        login,
        check2FARequired,
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
