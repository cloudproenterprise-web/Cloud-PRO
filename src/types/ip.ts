export interface IpAddressRecord {
  id: string;
  ip: string;
  subnetMask?: string;
  subnet?: string;
  gateway: string;
  type: 'dedicated' | 'shared';
  status: 'assigned' | 'available' | 'reserved';
  serverId: string;
  serverName: string;
  assignedToType?: 'account' | 'vps' | 'nameserver' | 'ssl' | 'server';
  assignedToId?: string;
  assignedToName?: string;
  assignedDomain?: string;
  ptrRecord?: string; // Reverse DNS (rDNS)
  isPrimaryServerIp?: boolean;
  notes?: string;
  createdAt: string;
}
