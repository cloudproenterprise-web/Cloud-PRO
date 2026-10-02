import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  ServerNode,
  HostingAccount,
  HostingPlan,
  Invoice,
  AccountBackup,
  AuditLog,
  AsyncJob,
  AppNotification,
  FirewallRule,
  ApiKeyItem,
  VpsInstance,
} from '../types';
import { db } from '../services/storage';
import { queue } from '../services/queue';
import { ConfirmDialogOptions } from '../components/common/ConfirmationModal';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ServerContextType {
  users: User[];
  stateVersion: number;
  servers: ServerNode[];
  accounts: HostingAccount[];
  plans: HostingPlan[];
  invoices: Invoice[];
  backups: AccountBackup[];
  auditLogs: AuditLog[];
  firewallRules: FirewallRule[];
  apiKeys: ApiKeyItem[];
  notifications: AppNotification[];
  jobs: AsyncJob[];
  vpsInstances: VpsInstance[];
  activeAccount: HostingAccount | null;
  setActiveAccount: (account: HostingAccount | null) => void;
  toasts: ToastMessage[];
  showToast: (optionsOrType: 'success' | 'error' | 'info' | 'warning' | { title: string; message?: string; type?: ToastMessage['type'] } | string, titleOrType?: string, message?: string) => void;
  removeToast: (id: string) => void;
  confirmModal: ConfirmDialogOptions | null;
  confirmAction: (options: ConfirmDialogOptions) => void;
  closeConfirm: () => void;
  refreshAll: () => void;
  resetDatabase: () => void;
  activeJobsCount: number;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [backups, setBackups] = useState<AccountBackup[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [jobs, setJobs] = useState<AsyncJob[]>([]);
  const [vpsInstances, setVpsInstances] = useState<VpsInstance[]>([]);
  const [activeAccount, setActiveAccount] = useState<HostingAccount | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogOptions | null>(null);

  const confirmAction = useCallback((options: ConfirmDialogOptions) => {
    setConfirmModal(options);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(null);
  }, []);

  const refreshAll = useCallback(() => {
    setUsers([...db.getUsers()]);
    setServers([...db.getServerNodes()]);
    setAccounts([...db.getHostingAccounts()]);
    setPlans([...db.getHostingPlans()]);
    setInvoices([...db.getInvoices()]);
    setBackups([...db.getBackups()]);
    setAuditLogs([...db.getAuditLogs()]);
    setFirewallRules([...db.getFirewallRules()]);
    setApiKeys([...db.getApiKeys()]);
    setNotifications([...db.getNotifications()]);
    setVpsInstances([...db.getVpsInstances()]);
    setStateVersion(v => v + 1);
  }, []);

  useEffect(() => {
    refreshAll();

    // Subscribe to storage updates (including cross-device Server Vault hydration)
    const unsubscribeDb = db.subscribe(() => {
      refreshAll();
    });

    // Subscribe to async worker jobs
    const unsubscribe = queue.subscribe(newJobs => {
      setJobs(newJobs);
      // Whenever a job completes, refresh the local state so new accounts/files show up immediately
      refreshAll();
    });

    // Subtle 15-second simulation tick to generate realistic telemetry jitter (CPU/RAM fluctuation)
    const interval = setInterval(() => {
      setServers(prev =>
        prev.map(srv => {
          const jitter = (Math.random() - 0.5) * 2;
          const currentCpu = srv.cpuUsagePct ?? 20;
          const newCpu = Math.max(8, Math.min(85, +(currentCpu + jitter).toFixed(1)));
          return {
            ...srv,
            cpuUsagePct: newCpu,
          };
        })
      );
    }, 15000);

    return () => {
      unsubscribeDb();
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshAll]);

  const showToast = (
    optionsOrType: 'success' | 'error' | 'info' | 'warning' | { title: string; message?: string; type?: ToastMessage['type'] } | string,
    titleOrType?: string,
    message?: string
  ) => {
    let type: ToastMessage['type'] = 'info';
    let title = '';
    let msg = message;

    if (typeof optionsOrType === 'object' && optionsOrType !== null) {
      type = optionsOrType.type || 'info';
      title = optionsOrType.title;
      msg = optionsOrType.message;
    } else if (typeof optionsOrType === 'string' && ['success', 'error', 'info', 'warning'].includes(optionsOrType)) {
      type = optionsOrType as ToastMessage['type'];
      title = titleOrType || '';
    } else if (typeof optionsOrType === 'string' && titleOrType && ['success', 'error', 'info', 'warning'].includes(titleOrType)) {
      type = titleOrType as ToastMessage['type'];
      title = optionsOrType;
    } else {
      title = String(optionsOrType || '');
      msg = titleOrType;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message: msg }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const resetDatabase = () => {
    db.resetToDefault();
    refreshAll();
    showToast('info', 'Database Direset', 'Seluruh data cluster telah dipulihkan ke konfigurasi bawaan server.');
  };

  const activeJobsCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;

  return (
    <ServerContext.Provider
      value={{
        users,
        stateVersion,
        servers,
        accounts,
        plans,
        invoices,
        backups,
        auditLogs,
        firewallRules,
        apiKeys,
        notifications,
        jobs,
        vpsInstances,
        activeAccount,
        setActiveAccount,
        toasts,
        showToast,
        removeToast,
        confirmModal,
        confirmAction,
        closeConfirm,
        refreshAll,
        resetDatabase,
        activeJobsCount,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
