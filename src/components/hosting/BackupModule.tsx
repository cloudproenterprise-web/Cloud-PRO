import React from 'react';
import { BackupManager } from './BackupManager';
import { HostingAccount } from '../../types';

export interface BackupModuleProps {
  account: HostingAccount;
  preselectedDomain?: string;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

export const BackupModule: React.FC<BackupModuleProps> = (props) => {
  return (
    <BackupManager
      {...props}
      mode="backup"
      initialTab="backup_domain"
    />
  );
};
