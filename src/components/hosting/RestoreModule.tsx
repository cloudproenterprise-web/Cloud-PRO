import React from 'react';
import { BackupManager } from './BackupManager';
import { HostingAccount } from '../../types';

export interface RestoreModuleProps {
  account: HostingAccount;
  preselectedDomain?: string;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

export const RestoreModule: React.FC<RestoreModuleProps> = (props) => {
  return (
    <BackupManager
      {...props}
      mode="restore"
      initialTab="restore_domain"
    />
  );
};
