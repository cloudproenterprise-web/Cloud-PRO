import {
  HostingAccount,
  HostingPlan,
  ServerNode,
  User,
  ResellerProfile,
  DnsRecord,
  DatabaseEntity,
  EmailMailbox,
  CronJobItem,
  AccountBackup,
  Invoice,
  VirtualFile,
  FirewallRule,
  ApiKeyItem,
  VpsInstance,
  VpsSnapshot,
  VpsFirewallRule,
  PhpVersion,
  DomainEntity,
} from '../types';
import { db } from './storage';
import { queue } from './queue';

export class CloudProApi {
  // --- Server Nodes ---
  public static async getServerNodes(): Promise<ServerNode[]> {
    return db.getServerNodes();
  }

  public static async restartService(serverId: string, serviceName: string, currentUser: User): Promise<void> {
    const server = db.getServerNode(serverId);
    if (!server) throw new Error('Server node tidak ditemukan');

    const service = server.services.find(s => s.name === serviceName);
    const serviceTitle = service ? service.displayName : serviceName;

    // Temporarily flag service as degraded
    if (service) {
      service.status = 'degraded';
      db.saveServerNode(server);
    }

    queue.enqueueJob(
      `Restart Daemon: ${serviceTitle} (${server.name})`,
      'RESTART_SERVICE',
      serverId,
      server.name
    );

    db.logAction(
      currentUser,
      'SERVER_SERVICE_RESTART',
      'SERVER',
      `Memulai ulang daemon ${serviceTitle} pada node ${server.name} (${server.ipAddress})`
    );

    // After 2.5s set service back to running
    setTimeout(() => {
      const refreshedServer = db.getServerNode(serverId);
      if (refreshedServer) {
        const refreshedService = refreshedServer.services.find(s => s.name === serviceName);
        if (refreshedService) {
          refreshedService.status = 'running';
          db.saveServerNode(refreshedServer);
        }
      }
    }, 2500);
  }

  public static async createServerNode(node: Omit<ServerNode, 'id' | 'assignedAccountsCount'>, currentUser: User): Promise<ServerNode> {
    const id = `srv-${node.location.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substr(2, 4)}`;
    const fullNode: ServerNode = {
      ...node,
      id,
      assignedAccountsCount: 0,
      uptimeDays: 0,
    };
    db.saveServerNode(fullNode);
    db.logAction(
      currentUser,
      'SERVER_NODE_PROVISIONED',
      'SERVER',
      `Menambahkan node server cluster baru: ${fullNode.name} (${fullNode.ipAddress}) di ${fullNode.location}`
    );
    return fullNode;
  }

  // --- Hosting Provisioning ---
  public static async provisionHostingAccount(params: {
    customerId: string;
    customerName: string;
    customerEmail: string;
    resellerId?: string;
    serverId: string;
    planId: string;
    username: string;
    primaryDomain: string;
    phpVersion?: PhpVersion;
    documentRoot?: string;
  }, currentUser: User): Promise<HostingAccount> {
    // 1. Quota Check for Reseller
    if (params.resellerId) {
      const resellerProfile = db.getResellerProfile(params.resellerId);
      if (resellerProfile) {
        const existingAccounts = db.getHostingAccounts().filter(a => a.resellerId === params.resellerId);
        if (existingAccounts.length >= resellerProfile.maxAccounts) {
          throw new Error(`Batas kuota reseller tercapai: Maksimal ${resellerProfile.maxAccounts} akun.`);
        }
      }
    }

    const server = db.getServerNode(params.serverId);
    if (!server) throw new Error('Server node yang dipilih tidak valid.');

    const plan = db.getHostingPlans().find(p => p.id === params.planId);
    if (!plan) throw new Error('Paket hosting tidak ditemukan.');

    // 2. Validate uniqueness of username and domain
    const existing = db.getHostingAccounts().find(
      a => a.username.toLowerCase() === params.username.toLowerCase() ||
           a.primaryDomain.toLowerCase() === params.primaryDomain.toLowerCase()
    );
    if (existing) {
      throw new Error(`Username "${params.username}" atau domain "${params.primaryDomain}" sudah terdaftar di sistem.`);
    }

    const cleanUsername = params.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDomain = params.primaryDomain.toLowerCase().trim();
    const docRoot = params.documentRoot || `/home/${cleanUsername}/public_html`;

    const accountId = `acc-${cleanUsername}-${Math.random().toString(36).substr(2, 4)}`;
    const newAccount: HostingAccount = {
      id: accountId,
      customerId: params.customerId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      resellerId: params.resellerId,
      serverId: server.id,
      serverName: server.name,
      planId: plan.id,
      planName: plan.name,
      username: cleanUsername,
      primaryDomain: cleanDomain,
      documentRoot: docRoot,
      ipAddress: server.ipAddress,
      status: 'active',
      diskUsedMb: 120, // Initial boilerplate files size
      diskLimitMb: (plan.diskMb ?? plan.diskLimitMb) || 5120,
      bandwidthUsedMb: 0,
      bandwidthLimitMb: (plan.bandwidthMb ?? plan.bandwidthLimitMb) || 102400,
      phpVersion: params.phpVersion || '8.2',
      phpExtensions: ['mysqli', 'pdo', 'curl', 'opcache', 'gd', 'mbstring', 'zip'],
      sslStatus: 'active',
      sslProvider: "Let's Encrypt Authority X3",
      sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      forceHttps: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Save hosting account
    db.saveHostingAccount(newAccount);

    // Save Primary Domain Entity
    const primaryDomainEntity: DomainEntity = {
      id: `dom-${Date.now()}-primary`,
      accountId,
      domain: newAccount.primaryDomain,
      type: 'primary',
      documentRoot: docRoot,
      phpVersion: newAccount.phpVersion,
      sslStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    db.saveDomain(primaryDomainEntity);

    // 3. Inject Boilerplate Virtual Files
    const initialFiles: VirtualFile[] = [
      {
        id: `vf-${Date.now()}-1`,
        accountId,
        path: '/public_html/index.php',
        name: 'index.php',
        type: 'file',
        sizeBytes: 1540,
        permissions: '0644',
        updatedAt: new Date().toISOString(),
        content: `<?php
/**
 * Website: ${newAccount.primaryDomain}
 * Account: ${newAccount.username}
 * Server: ${server.name} (${server.ipAddress})
 * Powered by Cloud PRO High-Performance Nginx & PHP 8.2-FPM
 */
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${newAccount.primaryDomain} - Berhasil Dikonfigurasi!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; }
    .card { max-width: 680px; margin: 40px auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; }
    h1 { color: #38bdf8; margin-top: 0; font-size: 24px; }
    .badge { background: #0284c7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Akun Hosting Siap Digunakan!</h1>
    <p>Domain <strong>${newAccount.primaryDomain}</strong> berhasil diprovisi secara otomatis di cluster server kami.</p>
    <p>Silakan gunakan File Manager atau FTP untuk mengunggah file website Anda ke dalam folder <code>/public_html/</code>.</p>
    <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
    <p style="font-size: 13px; color: #94a3b8;">PHP: <?php echo phpversion(); ?> &bull; Web Server: Nginx 1.26 &bull; Status SSL: Aktif</p>
  </div>
</body>
</html>`,
      },
      {
        id: `vf-${Date.now()}-2`,
        accountId,
        path: '/public_html/style.css',
        name: 'style.css',
        type: 'file',
        sizeBytes: 420,
        permissions: '0644',
        updatedAt: new Date().toISOString(),
        content: `/* Custom Stylesheet for ${newAccount.primaryDomain} */\nbody {\n  margin: 0;\n  padding: 0;\n}`,
      },
      {
        id: `vf-${Date.now()}-3`,
        accountId,
        path: '/public_html/.htaccess',
        name: '.htaccess',
        type: 'file',
        sizeBytes: 310,
        permissions: '0644',
        updatedAt: new Date().toISOString(),
        content: `RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
      },
      {
        id: `vf-${Date.now()}-4`,
        accountId,
        path: '/public_html/assets',
        name: 'assets',
        type: 'directory',
        sizeBytes: 4096,
        permissions: '0755',
        updatedAt: new Date().toISOString(),
      },
    ];
    initialFiles.forEach(f => db.saveVirtualFile(f));

    // 4. Inject DNS Zone Records with Private Nameservers
    const activeNs = db.getDefaultNameserverConfig();
    const ns1Host = activeNs ? activeNs.ns1Host : 'ns1.denbaguse.my.id';
    const ns2Host = activeNs ? activeNs.ns2Host : 'ns2.denbaguse.my.id';
    const nsTtl = activeNs ? activeNs.defaultTtl : 86400;

    const initialDns: DnsRecord[] = [
      { id: `dns-${Date.now()}-1`, accountId, domain: newAccount.primaryDomain, type: 'A', name: '@', content: server.ipAddress, ttl: 3600 },
      { id: `dns-${Date.now()}-2`, accountId, domain: newAccount.primaryDomain, type: 'CNAME', name: 'www', content: newAccount.primaryDomain, ttl: 3600 },
      { id: `dns-${Date.now()}-3`, accountId, domain: newAccount.primaryDomain, type: 'MX', name: '@', content: `mail.${newAccount.primaryDomain}`, priority: 10, ttl: 3600 },
      { id: `dns-${Date.now()}-4`, accountId, domain: newAccount.primaryDomain, type: 'A', name: 'mail', content: server.ipAddress, ttl: 3600 },
      { id: `dns-${Date.now()}-5`, accountId, domain: newAccount.primaryDomain, type: 'TXT', name: '@', content: `v=spf1 a mx ip4:${server.ipAddress} ~all`, ttl: 3600 },
      { id: `dns-${Date.now()}-6`, accountId, domain: newAccount.primaryDomain, type: 'NS', name: '@', content: ns1Host, ttl: nsTtl },
      { id: `dns-${Date.now()}-7`, accountId, domain: newAccount.primaryDomain, type: 'NS', name: '@', content: ns2Host, ttl: nsTtl },
    ];
    initialDns.forEach(d => db.saveDnsRecord(d));

    // 5. Inject Default Database
    const initialDb: DatabaseEntity = {
      id: `db-${Date.now()}`,
      accountId,
      dbName: `${newAccount.username}_db`,
      dbUser: `${newAccount.username}_usr`,
      charset: 'utf8mb4_unicode_ci',
      sizeMb: 5.4,
      createdAt: new Date().toISOString(),
    };
    db.saveDatabase(initialDb);

    // 6. Inject Default Email Mailbox
    const initialMail: EmailMailbox = {
      id: `mail-${Date.now()}`,
      accountId,
      emailAddress: `info@${newAccount.primaryDomain}`,
      quotaMb: 1024,
      usedMb: 12,
      createdAt: new Date().toISOString(),
    };
    db.saveEmail(initialMail);

    // 6.5. Auto-Generate Initial UNPAID Invoice for the new hosting account
    const priceIdr =
      plan.priceMonthlyIdr && plan.priceMonthlyIdr > 0
        ? Math.round(plan.priceMonthlyIdr)
        : Math.round((plan.priceMonthly || 9.99) * 16000);
    const initialInvoice: Invoice = {
      id: `inv-prov-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: newAccount.customerId,
      userName: newAccount.customerName || newAccount.username,
      userEmail: newAccount.customerEmail || `admin@${newAccount.primaryDomain}`,
      resellerId: newAccount.resellerId,
      items: [
        {
          description: `Aktivasi Hosting ${newAccount.primaryDomain} (${plan.name})`,
          qty: 1,
          unitPrice: priceIdr,
          amount: priceIdr,
        },
      ],
      amount: priceIdr,
      currency: 'IDR',
      status: 'unpaid',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.saveInvoice(initialInvoice);

    // 7. Enqueue Async Provisioning Job in Background Worker Queue
    queue.enqueueJob(
      `Provisioning Hosting: ${newAccount.primaryDomain}`,
      'PROVISION_ACCOUNT',
      newAccount.id,
      newAccount.primaryDomain
    );

    // 8. Log Audit
    db.logAction(
      currentUser,
      'HOSTING_ACCOUNT_PROVISIONED',
      'HOSTING',
      `Membuat akun hosting baru "${newAccount.username}" (${newAccount.primaryDomain}) pada server ${server.name} dengan paket ${plan.name}`
    );

    // 9. Immediately flush full state to Server Persistent Vault so all devices (PC & Android) see the new customer/account right away
    await db.syncToServerVault(true).catch(() => {});

    return newAccount;
  }

  // --- Account Lifecycle: Suspend, Unsuspend, Terminate ---
  public static async suspendAccount(accountId: string, reason: string, currentUser: User): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    acc.status = 'suspended';
    acc.suspendReason = reason || 'Ditangguhkan oleh administrator';
    db.saveHostingAccount(acc);

    db.logAction(
      currentUser,
      'HOSTING_ACCOUNT_SUSPENDED',
      'HOSTING',
      `Akun ${acc.username} (${acc.primaryDomain}) ditangguhkan. Alasan: ${acc.suspendReason}`
    );
    db.addNotification(
      'Akun Ditangguhkan',
      `Akun ${acc.primaryDomain} telah di-suspend (${acc.suspendReason}).`,
      'warning'
    );
  }

  public static async unsuspendAccount(accountId: string, currentUser: User): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    acc.status = 'active';
    acc.suspendReason = undefined;
    db.saveHostingAccount(acc);

    db.logAction(
      currentUser,
      'HOSTING_ACCOUNT_UNSUSPENDED',
      'HOSTING',
      `Akun ${acc.username} (${acc.primaryDomain}) telah diaktifkan kembali`
    );
    db.addNotification(
      'Akun Diaktifkan Kembali',
      `Akun ${acc.primaryDomain} kini telah berstatus aktif nominal.`,
      'success'
    );
  }

  public static async terminateAccount(accountId: string, currentUser: User): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    const domain = acc.primaryDomain;
    const user = acc.username;
    const ownerCustomerId = acc.customerId;

    db.deleteHostingAccount(accountId);

    // If the owner is a customer and has no remaining hosting accounts, remove their orphan customer profile as well
    if (ownerCustomerId && ownerCustomerId !== 'usr-admin-01') {
      const ownerUser = db.getUserById(ownerCustomerId);
      const remainingAccounts = db.getHostingAccounts().filter(a => a.customerId === ownerCustomerId);
      if (ownerUser && ownerUser.role === 'customer' && remainingAccounts.length === 0) {
        db.deleteUser(ownerCustomerId, false);
      }
    }

    db.logAction(
      currentUser,
      'HOSTING_ACCOUNT_TERMINATED',
      'HOSTING',
      `Akun hosting ${user} (${domain}) beserta seluruh data virtual files, databases, DNS, dan email telah dihapus permanen`
    );
    db.addNotification(
      'Akun Dihapus',
      `Akun hosting ${domain} telah diterminasi dari cluster.`,
      'info'
    );
    await db.syncToServerVault(true).catch(() => {});
  }

  public static async deleteReseller(resellerId: string, currentUser: User): Promise<void> {
    const reseller = db.getUserById(resellerId);
    if (!reseller || reseller.role !== 'reseller') {
      throw new Error('Mitra Reseller tidak ditemukan.');
    }
    if (reseller.id === currentUser.id) {
      throw new Error('Anda tidak dapat menghapus akun Reseller yang sedang Anda gunakan.');
    }

    const prof = db.getResellerProfile(resellerId);
    const brandTitle = prof?.brandName || reseller.name;
    const subAccounts = db.getHostingAccounts().filter(a => a.resellerId === resellerId && a.id !== 'acc-rdm-01');

    queue.enqueueJob(
      `Terminate Reseller & ${subAccounts.length} Client vHosts: ${brandTitle}`,
      'TERMINATE_ACCOUNT',
      resellerId,
      prof?.primaryDomain || reseller.email
    );

    db.deleteUser(resellerId, true);

    db.logAction(
      currentUser,
      'RESELLER_TERMINATED',
      'AUTH',
      `Menghapus permanen Mitra Reseller "${brandTitle}" (${reseller.email}) beserta ${subAccounts.length} akun hosting klien di bawahnya`
    );
    db.addNotification(
      'Reseller Dihapus Permanen',
      `Mitra Reseller ${brandTitle} (${reseller.email}) dan ${subAccounts.length} akun kliennya telah dihapus.`,
      'warning'
    );
    await db.syncToServerVault(true).catch(() => {});
  }

  public static async deleteCustomer(customerId: string, currentUser: User): Promise<void> {
    const customer = db.getUserById(customerId);
    if (!customer || customer.role !== 'customer') {
      throw new Error('Data pelanggan/klien tidak ditemukan.');
    }
    if (customer.id === currentUser.id) {
      throw new Error('Anda tidak dapat menghapus akun yang sedang aktif login.');
    }
    if (currentUser.role === 'reseller' && customer.resellerId !== currentUser.id) {
      throw new Error('Akses ditolak: Pelanggan ini bukan di bawah manajemen Reseller Anda.');
    }

    const customerAccounts = db.getHostingAccounts().filter(
      a =>
        a.id !== 'acc-rdm-01' &&
        (a.customerId === customerId ||
          (customer.email && a.customerEmail?.toLowerCase() === customer.email.toLowerCase()))
    );

    queue.enqueueJob(
      `Terminate Client & ${customerAccounts.length} vHosts: ${customer.name}`,
      'TERMINATE_ACCOUNT',
      customerId,
      customer.email
    );

    db.deleteUser(customerId, true);

    db.logAction(
      currentUser,
      'CUSTOMER_TERMINATED',
      'AUTH',
      `Menghapus permanen Klien "${customer.name}" (${customer.email}) beserta ${customerAccounts.length} akun hosting terkait`
    );
    db.addNotification(
      'Klien & Hosting Dihapus',
      `Klien ${customer.name} (${customer.email}) telah dihapus permanen dari sistem.`,
      'info'
    );
    await db.syncToServerVault(true).catch(() => {});
  }

  public static async toggleCustomerStatus(customerId: string, currentUser: User): Promise<User> {
    const customer = db.getUserById(customerId);
    if (!customer || customer.role !== 'customer') {
      throw new Error('Data pelanggan tidak ditemukan.');
    }
    const nextStatus = customer.status === 'active' ? 'suspended' : 'active';
    const updated: User = { ...customer, status: nextStatus };
    db.saveUser(updated);

    // Sync status to all hosting accounts owned by this customer
    const customerAccounts = db.getHostingAccounts().filter(
      a =>
        a.id !== 'acc-rdm-01' &&
        (a.customerId === customerId ||
          (customer.email && a.customerEmail?.toLowerCase() === customer.email.toLowerCase()))
    );
    customerAccounts.forEach(acc => {
      db.saveHostingAccount({
        ...acc,
        status: nextStatus,
        suspendReason: nextStatus === 'suspended' ? 'Akun pelanggan ditangguhkan oleh administrator/reseller' : undefined,
      });
    });

    db.logAction(
      currentUser,
      nextStatus === 'suspended' ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_UNSUSPENDED',
      'AUTH',
      `Mengubah status klien ${customer.name} (${customer.email}) menjadi ${nextStatus.toUpperCase()}`
    );
    return updated;
  }

  // --- SSL Management ---
  public static async issueSsl(accountId: string, currentUser: User): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    queue.enqueueJob(
      `Issue Let's Encrypt SSL: ${acc.primaryDomain}`,
      'ISSUE_SSL',
      acc.id,
      acc.primaryDomain
    );

    acc.sslStatus = 'active';
    acc.sslProvider = "Let's Encrypt Authority X3";
    acc.sslExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    db.saveHostingAccount(acc);

    db.logAction(
      currentUser,
      'SSL_CERTIFICATE_ISSUED',
      'SECURITY',
      `Penerbitan sertifikat SSL Let's Encrypt untuk domain ${acc.primaryDomain}`
    );
  }

  public static async toggleForceHttps(accountId: string, force: boolean, currentUser: User): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    acc.forceHttps = force;
    db.saveHostingAccount(acc);

    db.logAction(
      currentUser,
      'HTTPS_FORCE_TOGGLED',
      'SECURITY',
      `${force ? 'Mengaktifkan' : 'Menonaktifkan'} paksa HTTPS redirect untuk domain ${acc.primaryDomain}`
    );
  }

  // --- PHP Versions & Extensions (Per-Domain & Subdomain Support) ---
  public static async updatePhpConfig(
    accountId: string,
    phpVersion: PhpVersion,
    phpExtensions: string[],
    currentUser: User,
    options?: {
      targetDomain?: string;
      documentRoot?: string;
      phpDirectives?: {
        maxInputVars: number;
        maxExecutionTime: number;
        memoryLimit: string;
        uploadMaxFilesize: string;
        postMaxSize: string;
      };
    }
  ): Promise<void> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    const targetDom = (options?.targetDomain || acc.primaryDomain).toLowerCase().trim();
    const isPrimary = targetDom === acc.primaryDomain.toLowerCase().trim();

    if (isPrimary) {
      acc.phpVersion = phpVersion;
      acc.phpExtensions = phpExtensions;
      if (options?.phpDirectives) {
        acc.phpDirectives = options.phpDirectives;
      }
      db.saveHostingAccount(acc);
    }

    // Update or create matching DomainEntity in db
    const accountDomains = db.getDomains(accountId);
    const existingDom = accountDomains.find(d => d.domain.toLowerCase() === targetDom);
    if (existingDom) {
      db.saveDomain({
        ...existingDom,
        phpVersion,
        phpExtensions,
        phpDirectives: options?.phpDirectives || existingDom.phpDirectives,
      });
    } else {
      const pDom = acc.primaryDomain.toLowerCase();
      const isSub = targetDom.endsWith(`.${pDom}`);
      const prefix = isSub ? targetDom.slice(0, -(pDom.length + 1)) : undefined;
      const defaultDocRoot = isPrimary
        ? acc.documentRoot || `/home/${acc.username}/public_html`
        : isSub
        ? `/home/${acc.username}/public_html/${prefix}`
        : `/home/${acc.username}/${targetDom}`;
      db.saveDomain({
        id: `dom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        accountId: acc.id,
        domain: targetDom,
        type: isPrimary ? 'primary' : isSub ? 'subdomain' : 'addon',
        parentDomain: isSub ? acc.primaryDomain : undefined,
        subdomainPrefix: prefix,
        documentRoot: options?.documentRoot || defaultDocRoot,
        phpVersion,
        phpExtensions,
        phpDirectives: options?.phpDirectives,
        sslStatus: 'active',
        createdAt: new Date().toISOString(),
      });
    }

    // Sync to server vhostStore
    try {
      await fetch('/api/vhost/php-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: acc.id,
          domain: targetDom,
          isPrimary,
          documentRoot: options?.documentRoot,
          phpVersion,
          phpExtensions,
          phpDirectives: options?.phpDirectives,
        }),
      });
    } catch {
      // Ignore network error in offline mode
    }

    db.logAction(
      currentUser,
      'PHP_CONFIG_UPDATED',
      'HOSTING',
      `Memperbarui runtime PHP menjadi PHP ${phpVersion} (${phpExtensions.length} ekstensi aktif) pada ${isPrimary ? 'domain utama' : 'subdomain/domain'} ${targetDom}`
    );
  }

  // --- Domains & Subdomains ---
  public static async createSubdomain(params: {
    accountId: string;
    subdomainPrefix: string;
    parentDomain: string;
    documentRoot?: string;
    phpVersion?: PhpVersion;
  }, currentUser: User): Promise<DomainEntity> {
    const acc = db.getHostingAccount(params.accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    const prefix = params.subdomainPrefix.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!prefix) throw new Error('Prefix subdomain tidak valid');

    const fullDomain = `${prefix}.${params.parentDomain.toLowerCase().trim()}`;

    // Default document root automatically: /home/<user>/public_html/<prefix>
    const autoDocRoot = `/home/${acc.username}/public_html/${prefix}`;
    const docRoot = params.documentRoot?.trim() || autoDocRoot;

    // Check if there is an existing record with the same fullDomain
    const existing = db.getDomains().find(d => d.domain.toLowerCase() === fullDomain.toLowerCase());

    // If a legacy primary domain record had fullDomain (e.g., rdm.denbaguse.my.id), fix its domain to parentDomain first
    if (existing && existing.type === 'primary') {
      db.saveDomain({
        ...existing,
        domain: acc.primaryDomain,
      });
    }

    const reusableSub = existing && existing.type !== 'primary' ? existing : null;

    const domainEntity: DomainEntity = {
      id: reusableSub ? reusableSub.id : `dom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      accountId: acc.id,
      domain: fullDomain,
      type: 'subdomain',
      parentDomain: params.parentDomain,
      subdomainPrefix: prefix,
      documentRoot: docRoot,
      phpVersion: params.phpVersion || acc.phpVersion || '7.4',
      sslStatus: 'active',
      createdAt: reusableSub?.createdAt || new Date().toISOString(),
    };

    db.saveDomain(domainEntity);

    // Otomatis buat folder virtual & index starter untuk subdomain
    const virtualDirPath = `/public_html/${prefix}`;
    db.saveVirtualFile({
      id: `vf-${Date.now()}-dir`,
      accountId: acc.id,
      path: virtualDirPath,
      name: prefix,
      type: 'directory',
      sizeBytes: 4096,
      permissions: '0755',
      updatedAt: new Date().toISOString(),
    });

    db.saveVirtualFile({
      id: `vf-${Date.now()}-index`,
      accountId: acc.id,
      path: `${virtualDirPath}/index.php`,
      name: 'index.php',
      type: 'file',
      sizeBytes: 850,
      permissions: '0644',
      updatedAt: new Date().toISOString(),
      content: `<?php\n// Subdomain: ${fullDomain}\n// Document Root: ${docRoot}\necho "<h1>Subdomain ${fullDomain} Aktif!</h1><p>Document Root: <code>${docRoot}</code></p>";`,
    });

    // Otomatis inject DNS A record
    db.saveDnsRecord({
      id: `dns-${Date.now()}-sub`,
      accountId: acc.id,
      domain: params.parentDomain,
      type: 'A',
      name: prefix,
      content: acc.ipAddress,
      ttl: 3600,
    });

    db.logAction(
      currentUser,
      'SUBDOMAIN_CREATED',
      'HOSTING',
      `Membuat subdomain ${fullDomain} dengan document root ${docRoot} pada akun ${acc.primaryDomain}`
    );

    return domainEntity;
  }

  public static async createAddonDomain(params: {
    accountId: string;
    domain: string;
    documentRoot?: string;
    phpVersion?: PhpVersion;
  }, currentUser: User): Promise<DomainEntity> {
    const acc = db.getHostingAccount(params.accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    const cleanDomain = params.domain.toLowerCase().trim().replace(/[^a-z0-9.-]/g, '');
    if (!cleanDomain || !cleanDomain.includes('.')) {
      throw new Error('Format nama domain tidak valid');
    }

    const existing = db.getDomains().find(d => d.domain.toLowerCase() === cleanDomain);
    if (existing) {
      throw new Error(`Domain "${cleanDomain}" sudah terdaftar.`);
    }

    // Default document root automatically: /home/<user>/<cleanDomain>
    const autoDocRoot = `/home/${acc.username}/${cleanDomain}`;
    const docRoot = params.documentRoot?.trim() || autoDocRoot;

    const domainEntity: DomainEntity = {
      id: `dom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      accountId: acc.id,
      domain: cleanDomain,
      type: 'addon',
      documentRoot: docRoot,
      phpVersion: params.phpVersion || acc.phpVersion || '8.2',
      sslStatus: 'active',
      createdAt: new Date().toISOString(),
    };

    db.saveDomain(domainEntity);

    // Otomatis buat folder virtual & index starter
    const virtualDirPath = `/${cleanDomain}`;
    db.saveVirtualFile({
      id: `vf-${Date.now()}-addon-dir`,
      accountId: acc.id,
      path: virtualDirPath,
      name: cleanDomain,
      type: 'directory',
      sizeBytes: 4096,
      permissions: '0755',
      updatedAt: new Date().toISOString(),
    });

    db.saveVirtualFile({
      id: `vf-${Date.now()}-addon-index`,
      accountId: acc.id,
      path: `${virtualDirPath}/index.php`,
      name: 'index.php',
      type: 'file',
      sizeBytes: 850,
      permissions: '0644',
      updatedAt: new Date().toISOString(),
      content: `<?php\n// Addon Domain: ${cleanDomain}\n// Document Root: ${docRoot}\necho "<h1>Domain ${cleanDomain} Aktif!</h1><p>Document Root: <code>${docRoot}</code></p>";`,
    });

    db.logAction(
      currentUser,
      'ADDON_DOMAIN_CREATED',
      'HOSTING',
      `Membuat addon domain ${cleanDomain} dengan document root ${docRoot} pada akun ${acc.primaryDomain}`
    );

    return domainEntity;
  }

  public static async deleteDomain(domainId: string, currentUser: User): Promise<void> {
    const domain = db.getDomains().find(d => d.id === domainId);
    if (!domain) throw new Error('Domain tidak ditemukan');
    if (domain.type === 'primary') {
      throw new Error('Domain utama (Primary Domain) tidak dapat dihapus.');
    }

    db.deleteDomain(domainId);
    db.logAction(
      currentUser,
      'DOMAIN_DELETED',
      'HOSTING',
      `Menghapus domain/subdomain ${domain.domain} (${domain.type})`
    );
  }

  // --- Backups & Restore ---
  public static async createBackup(accountId: string, type: 'full' | 'database' | 'files', currentUser: User): Promise<AccountBackup> {
    const acc = db.getHostingAccount(accountId);
    if (!acc) throw new Error('Akun hosting tidak ditemukan');

    const backupId = `bk-${Date.now()}`;
    const ext = type === 'database' ? 'sql.gz' : 'tar.gz';
    const fileName = `backup-${acc.username}-${type}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.${ext}`;
    const sizeMb = type === 'full' ? 245.5 : type === 'database' ? 38.2 : 180.0;

    const newBackup: AccountBackup = {
      id: backupId,
      accountId: acc.id,
      accountDomain: acc.primaryDomain,
      type,
      sizeMb,
      fileName,
      status: 'ready',
      createdAt: new Date().toISOString(),
    };

    queue.enqueueJob(
      `Membuat Backup ${type.toUpperCase()}: ${acc.primaryDomain}`,
      'GENERATE_BACKUP',
      acc.id,
      acc.primaryDomain
    );

    db.saveBackup(newBackup);

    db.logAction(
      currentUser,
      'BACKUP_CREATED',
      'HOSTING',
      `Membuat snapshot backup ${type} arsip ${fileName} untuk akun ${acc.primaryDomain}`
    );

    return newBackup;
  }

  public static async restoreBackup(backupId: string, currentUser: User): Promise<void> {
    const backup = db.getBackups().find(b => b.id === backupId);
    if (!backup) throw new Error('File backup tidak ditemukan');

    queue.enqueueJob(
      `Restore 1-Klik Backup: ${backup.fileName}`,
      'RESTORE_BACKUP',
      backup.accountId,
      backup.accountDomain
    );

    db.logAction(
      currentUser,
      'BACKUP_RESTORED',
      'HOSTING',
      `Merestore snapshot arsip backup ${backup.fileName} pada akun ${backup.accountDomain}`
    );
  }

  // --- Billing: Invoices & Payment ---
  public static formatBillingWhatsAppMessage(inv: Invoice, type: 'unpaid' | 'receipt'): string {
    const kop = db.getLetterheadConfig();
    const formatAmt = (amt: number, cur = 'IDR') =>
      cur === 'IDR' ? `Rp ${Math.round(amt).toLocaleString('id-ID')}` : `$${Number(amt).toFixed(2)}`;
    const totalStr = formatAmt(inv.amount, inv.currency);
    const itemDesc = inv.items
      .map(i => `• ${i.description} (${formatAmt(i.amount, inv.currency)})`)
      .join('\n');

    if (type === 'unpaid') {
      return (
        `*${kop.headerTitle}*\n` +
        `${kop.headerSubtitle}\n` +
        `Domain Server: ${kop.serverDomain}\n` +
        `========================================\n` +
        `*BUKTI TAGIHAN LAYANAN (UNPAID INVOICE)*\n` +
        `Yth. *${inv.userName}*,\n\n` +
        `Berikut informasi tagihan layanan hosting/domain Anda:\n` +
        `• *No. Tagihan:* ${inv.invoiceNumber}\n` +
        `• *Kategori:* ${inv.billingSource === 'automated' ? 'Tagihan Otomatis (Auto-Billing)' : 'Tagihan Manual'}\n` +
        `• *Status:* UNPAID (BELUM DIBAYAR)\n` +
        `• *Jatuh Tempo:* ${new Date(inv.dueDate).toLocaleDateString('id-ID')}\n\n` +
        `*Rincian Layanan:*\n${itemDesc}\n\n` +
        `*Total Tagihan:* *${totalStr}*\n\n` +
        `*Rekening Pembayaran Resmi Karsa Cloud PRO:*\n` +
        `1. *${kop.bank1Name}:* ${kop.bank1Number} a.n *${kop.bank1Holder}*\n` +
        (kop.bank2Number ? `2. *${kop.bank2Name}:* ${kop.bank2Number} a.n *${kop.bank2Holder}*\n` : '') +
        (kop.qrisInfo ? `3. *QRIS:* ${kop.qrisInfo}\n` : '') +
        `\n_Diterbitkan resmi oleh: ${kop.ownerName} (${kop.ownerTitle})_`
      );
    }

    const sigCode = inv.signatureHash || `SIG-CPRO-${(inv.receiptNumber || inv.invoiceNumber).replace(/[^A-Z0-9]/gi, '')}`;
    return (
      `*${kop.headerTitle}*\n` +
      `${kop.headerSubtitle}\n` +
      `Domain Server: ${kop.serverDomain}\n` +
      `========================================\n` +
      `*BUKTI PEMBAYARAN RESMI (KWITANSI LUNAS / PAID)*\n` +
      `Yth. *${inv.userName}*,\n\n` +
      `Terima kasih! Pembayaran Anda telah diterima dan diverifikasi *LUNAS (PAID)*:\n` +
      `• *No. Kwitansi:* ${inv.receiptNumber || `KW-${inv.invoiceNumber}`}\n` +
      `• *No. Invoice:* ${inv.invoiceNumber}\n` +
      `• *Status:* PAID / LUNAS SAH\n` +
      `• *Tanggal Lunas:* ${inv.paidAt ? new Date(inv.paidAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}\n` +
      `• *Metode Bayar:* ${inv.paymentMethod || 'Transfer Bank Terverifikasi'}\n` +
      `• *No. Referensi:* ${inv.paymentReference || '-'}\n` +
      `• *Penyetor:* ${inv.payerName || inv.userName}\n\n` +
      `*Rincian Layanan:*\n${itemDesc}\n\n` +
      `*Total Dibayar:* *${totalStr} (LUNAS)*\n\n` +
      `*Pengesahan Tanda Tangan Barcode:*\n` +
      `• *Penerima / Pemilik Server:* ${inv.verifiedBy || kop.ownerName}\n` +
      `• *Jabatan:* ${kop.ownerTitle}\n` +
      `• *Kode Barcode Tanda Tangan:* \`${sigCode}\` (VERIFIED)`
    );
  }

  public static async dispatchBillingNotification(
    inv: Invoice,
    type: 'unpaid' | 'receipt'
  ): Promise<{ whatsappDirectUrl: string; normalizedPhone: string }> {
    const kop = db.getLetterheadConfig();
    const customer = db.getUsers().find(u => u.id === inv.userId || u.email === inv.userEmail);
    const rawPhone = inv.userPhone || customer?.phone || kop.officialWhatsApp || '+62 812-2673-8883';
    const digits = String(rawPhone).replace(/[^0-9]/g, '');
    const normalizedPhone = digits.startsWith('0')
      ? `62${digits.slice(1)}`
      : digits.startsWith('62')
      ? digits
      : `62${digits}`;

    const message = CloudProApi.formatBillingWhatsAppMessage(inv, type);
    const whatsappDirectUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    const nowIso = new Date().toISOString();
    inv.userPhone = rawPhone;
    inv.whatsappSentAt = nowIso;
    inv.emailSentAt = nowIso;
    db.saveInvoice(inv);

    try {
      await fetch('/api/billing/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: inv.invoiceNumber,
          receiptNumber: inv.receiptNumber,
          documentType: type,
          userName: inv.userName,
          userEmail: inv.userEmail,
          userPhone: rawPhone,
          message,
          waGatewayUrl: kop.waGatewayUrl,
          waGatewayToken: kop.waGatewayToken,
        }),
      });
    } catch {
      // Fallback handled locally
    }

    return { whatsappDirectUrl, normalizedPhone };
  }

  public static async payInvoice(
    invoiceId: string,
    paymentMethod: string,
    currentUser: User,
    receiptDetails?: {
      receiptNumber?: string;
      paymentReference?: string;
      paymentNotes?: string;
      paidAt?: string;
      payerName?: string;
      verifiedBy?: string;
      userPhone?: string;
      proofImageUrl?: string;
      autoNotify?: boolean;
    }
  ): Promise<Invoice> {
    const inv = db.getInvoices().find(i => i.id === invoiceId);
    if (!inv) throw new Error('Invoice tidak ditemukan');
    const kop = db.getLetterheadConfig();

    inv.status = 'paid';
    inv.paidAt = receiptDetails?.paidAt || new Date().toISOString();
    inv.paymentMethod = paymentMethod;
    inv.receiptNumber =
      receiptDetails?.receiptNumber?.trim() ||
      inv.receiptNumber ||
      `KW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    inv.paymentReference =
      receiptDetails?.paymentReference?.trim() ||
      inv.paymentReference ||
      `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    inv.paymentNotes =
      receiptDetails?.paymentNotes?.trim() ||
      inv.paymentNotes ||
      'Pembayaran telah diverifikasi lunas dan layanan aktif.';
    inv.payerName = receiptDetails?.payerName?.trim() || inv.payerName || inv.userName;
    inv.verifiedBy = receiptDetails?.verifiedBy?.trim() || kop.ownerName || inv.verifiedBy || currentUser.name;
    if (receiptDetails?.userPhone?.trim()) {
      inv.userPhone = receiptDetails.userPhone.trim();
    }
    inv.signatureHash = `SIG-CPRO-${inv.receiptNumber.replace(/[^A-Z0-9]/gi, '')}-${Math.abs(
      inv.invoiceNumber.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)
    )
      .toString(16)
      .toUpperCase()
      .slice(0, 6)}`;
    if (receiptDetails?.proofImageUrl) {
      inv.proofImageUrl = receiptDetails.proofImageUrl;
    }
    db.saveInvoice(inv);

    if (receiptDetails?.autoNotify !== false && (kop.autoSendWhatsApp || kop.autoSendEmail)) {
      await CloudProApi.dispatchBillingNotification(inv, 'receipt');
    }

    // If customer has any suspended account due to billing, auto-unsuspend
    const accounts = db.getHostingAccounts().filter(a => a.customerId === inv.userId);
    accounts.forEach(a => {
      if (a.status === 'suspended' && a.suspendReason?.toLowerCase().includes('tagihan')) {
        a.status = 'active';
        a.suspendReason = undefined;
        db.saveHostingAccount(a);
      }
    });

    db.logAction(
      currentUser,
      'INVOICE_PAID',
      'BILLING',
      `Menerbitkan bukti pembayaran ${inv.receiptNumber} untuk invoice ${inv.invoiceNumber} via ${paymentMethod} (Terkirim ke WA ${inv.userPhone || 'terdaftar'} & Email ${inv.userEmail || '-'})`
    );

    db.addNotification(
      'Bukti Pembayaran Diterbitkan & Dikirim',
      `Kwitansi ${inv.receiptNumber} (${inv.invoiceNumber}) telah diterbitkan lunas dan dikirim ke WhatsApp & Email terdaftar.`,
      'success'
    );

    return inv;
  }

  public static async markInvoiceUnpaid(
    invoiceId: string,
    currentUser: User,
    unpaidReason?: string
  ): Promise<Invoice> {
    const inv = db.getInvoices().find(i => i.id === invoiceId);
    if (!inv) throw new Error('Invoice tidak ditemukan');

    inv.status = 'unpaid';
    inv.paidAt = undefined;
    inv.paymentNotes =
      unpaidReason?.trim() ||
      'Status dikembalikan ke UNPAID (Belum Dibayar). Silakan selesaikan pembayaran sebelum jatuh tempo.';
    db.saveInvoice(inv);

    db.logAction(
      currentUser,
      'INVOICE_MARKED_UNPAID',
      'BILLING',
      `Mengubah status invoice ${inv.invoiceNumber} milik ${inv.userName} menjadi UNPAID (Belum Dibayar)`
    );

    db.addNotification(
      'Bukti Tagihan Unpaid Diterbitkan',
      `Invoice ${inv.invoiceNumber} (${inv.userName}) kini berstatus UNPAID.`,
      'warning'
    );

    return inv;
  }

  public static async topupCredit(userId: string, amount: number, currentUser: User): Promise<void> {
    const user = db.getUserById(userId);
    if (!user) throw new Error('User tidak ditemukan');

    user.creditBalance = (user.creditBalance || 0) + amount;
    db.saveUser(user);

    db.logAction(
      currentUser,
      'CREDIT_TOPPED_UP',
      'BILLING',
      `Top-up saldo kredit sebesar $${amount.toFixed(2)} untuk akun ${user.name} (${user.email}). Saldo saat ini: $${user.creditBalance.toFixed(2)}`
    );
  }

  public static async createManualInvoice(
    payload: {
      invoiceNumber?: string;
      receiptNumber?: string;
      userId: string;
      userName: string;
      userEmail: string;
      userPhone?: string;
      resellerId?: string;
      items: Array<{ description: string; qty: number; unitPrice: number; amount: number }>;
      currency: string;
      status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
      dueDate: string;
      paymentMethod?: string;
      paymentReference?: string;
      paymentNotes?: string;
      payerName?: string;
      verifiedBy?: string;
      proofImageUrl?: string;
      autoNotify?: boolean;
    },
    currentUser: User
  ): Promise<Invoice> {
    const kop = db.getLetterheadConfig();
    const totalAmount = payload.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const invNum =
      payload.invoiceNumber?.trim() ||
      `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isPaid = payload.status === 'paid';
    const customerUser = db.getUsers().find(u => u.id === payload.userId || u.email === payload.userEmail);
    const resolvedPhone = payload.userPhone?.trim() || customerUser?.phone || '+62 812-2673-8883';
    const receiptNum = isPaid
      ? payload.receiptNumber?.trim() ||
        `KW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
      : undefined;

    const newInvoice: Invoice = {
      id: `inv-man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceNumber: invNum,
      receiptNumber: receiptNum,
      userId: payload.userId || currentUser.id,
      userName: payload.userName,
      userEmail: payload.userEmail,
      userPhone: resolvedPhone,
      resellerId: payload.resellerId,
      billingSource: 'manual',
      items: payload.items,
      amount: totalAmount,
      currency: payload.currency || 'IDR',
      status: payload.status,
      dueDate: payload.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      paidAt: isPaid ? new Date().toISOString() : undefined,
      paymentMethod: isPaid ? payload.paymentMethod || 'Transfer Bank / Tunai Manual' : payload.paymentMethod,
      paymentReference: isPaid ? payload.paymentReference || `REF-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      payerName: payload.payerName || (isPaid ? payload.userName : undefined),
      verifiedBy: payload.verifiedBy || kop.ownerName || currentUser.name,
      proofImageUrl: payload.proofImageUrl,
      signatureHash: isPaid
        ? `SIG-CPRO-${(receiptNum || invNum).replace(/[^A-Z0-9]/gi, '')}-VERIFIED`
        : undefined,
      paymentNotes:
        payload.paymentNotes ||
        (isPaid
          ? 'Pembayaran manual diterima lunas dan diverifikasi oleh Pemilik Karsa Cloud PRO.'
          : 'Bukti Tagihan Unpaid Manual — Menunggu pembayaran sebelum tanggal jatuh tempo.'),
    };

    db.saveInvoice(newInvoice);

    if (payload.autoNotify !== false && (kop.autoSendWhatsApp || kop.autoSendEmail)) {
      await CloudProApi.dispatchBillingNotification(newInvoice, isPaid ? 'receipt' : 'unpaid');
    }

    db.logAction(
      currentUser,
      'INVOICE_CREATED_MANUAL',
      'BILLING',
      `Membuat invoice manual ${newInvoice.invoiceNumber} (${newInvoice.status.toUpperCase()}) untuk ${newInvoice.userName} & kirim ke WA ${newInvoice.userPhone}`
    );

    db.addNotification(
      isPaid ? 'Bukti Pembayaran Manual Diterbitkan' : 'Tagihan Unpaid Baru Diterbitkan',
      `Invoice ${newInvoice.invoiceNumber} (${newInvoice.status.toUpperCase()}) untuk ${newInvoice.userName} berhasil diterbitkan & dikirim ke WA/Email terdaftar.`,
      isPaid ? 'success' : 'info'
    );

    return newInvoice;
  }

  public static async deleteInvoice(invoiceId: string, currentUser: User): Promise<void> {
    const inv = db.getInvoices().find(i => i.id === invoiceId);
    if (!inv) throw new Error('Invoice tidak ditemukan');
    db.deleteInvoice(invoiceId);
    db.logAction(
      currentUser,
      'INVOICE_DELETED',
      'BILLING',
      `Menghapus invoice ${inv.invoiceNumber} milik ${inv.userName}`
    );
  }

  public static async runAutomatedBillingCycle(
    options: {
      billingPeriodLabel: string;
      dueDays: number;
      currency: 'USD' | 'IDR';
      autoDeductWallet: boolean;
      autoSuspendOverdue: boolean;
      idrRate?: number;
      forceUnpaid?: boolean;
    },
    currentUser: User
  ): Promise<{ generatedCount: number; autoPaidCount: number; suspendedCount: number; generatedInvoices: Invoice[] }> {
    const kop = db.getLetterheadConfig();
    const allAccounts = db.getHostingAccounts();
    // Filter accounts by role so Reseller only bills their own Reseller accounts
    const accounts = allAccounts.filter(acc => {
      if (currentUser.role === 'reseller') {
        return acc.resellerId === currentUser.id && acc.id !== 'acc-rdm-01';
      }
      return true;
    });
    const plans = db.getHostingPlans();
    const users = db.getUsers();
    const existingInvoices = db.getInvoices();
    const idrMultiplier = options.currency === 'IDR' ? (options.idrRate || 16000) : 1;

    let generatedCount = 0;
    let autoPaidCount = 0;
    let suspendedCount = 0;
    const generatedInvoices: Invoice[] = [];

    for (const acc of accounts) {
      const plan = plans.find(p => p.id === acc.planId);
      const customer = users.find(u => u.id === acc.customerId);
      const basePriceUsd = plan?.priceMonthly || 9.99;
      const finalAmount =
        options.currency === 'IDR'
          ? plan?.priceMonthlyIdr && plan.priceMonthlyIdr > 0
            ? Math.round(plan.priceMonthlyIdr)
            : Math.round(basePriceUsd * idrMultiplier)
          : Number(basePriceUsd.toFixed(2));

      const desc = `Tagihan Otomatis Hosting ${acc.primaryDomain} (${plan?.name || acc.planName || 'Cloud Hosting'}) — Periode ${options.billingPeriodLabel}`;

      const alreadyBilledUnpaid = existingInvoices.some(
        inv =>
          inv.userId === acc.customerId &&
          inv.items.some(it => it.description === desc) &&
          inv.status === 'unpaid'
      );

      if (!alreadyBilledUnpaid || options.forceUnpaid) {
        let status: Invoice['status'] = 'unpaid';
        let paidAt: string | undefined;
        let paymentMethod: string | undefined;
        let receiptNumber: string | undefined;

        if (!options.forceUnpaid && options.autoDeductWallet && customer && customer.creditBalance >= basePriceUsd) {
          customer.creditBalance = Number((customer.creditBalance - basePriceUsd).toFixed(2));
          db.saveUser(customer);
          status = 'paid';
          paidAt = new Date().toISOString();
          paymentMethod = 'Auto-Debit Saldo Deposit Wallet';
          receiptNumber = `KW-AUTO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
          autoPaidCount++;
        }

        const inv: Invoice = {
          id: `inv-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          invoiceNumber: `INV-AUTO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
          receiptNumber,
          userId: acc.customerId,
          userName: acc.customerName || customer?.name || acc.username,
          userEmail: acc.customerEmail || customer?.email || `admin@${acc.primaryDomain}`,
          userPhone: customer?.phone || kop.officialWhatsApp || '+62 812-2673-8883',
          resellerId: acc.resellerId,
          billingSource: 'automated',
          items: [
            {
              description: desc,
              qty: 1,
              unitPrice: finalAmount,
              amount: finalAmount,
            },
          ],
          amount: finalAmount,
          currency: options.currency,
          status,
          dueDate: new Date(Date.now() + options.dueDays * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          paidAt,
          paymentMethod,
          verifiedBy: status === 'paid' ? kop.ownerName : undefined,
          signatureHash: status === 'paid' && receiptNumber ? `SIG-CPRO-${receiptNumber.replace(/[^A-Z0-9]/gi, '')}-AUTO` : undefined,
          paymentNotes:
            status === 'unpaid'
              ? `Bukti Tagihan Unpaid Otomatis (Cron H-${options.dueDays}) untuk domain ${acc.primaryDomain}. Silakan lakukan pembayaran ke rekening resmi Karsa Cloud PRO.`
              : `Lunas otomatis melalui pemotongan Saldo Deposit Wallet.`,
        };

        db.saveInvoice(inv);
        if (kop.autoSendWhatsApp || kop.autoSendEmail) {
          await CloudProApi.dispatchBillingNotification(inv, status === 'paid' ? 'receipt' : 'unpaid');
        }
        generatedInvoices.push(inv);
        generatedCount++;
      }
    }

    if (options.autoSuspendOverdue) {
      const now = Date.now();
      const allInvs = db.getInvoices();
      for (const inv of allInvs) {
        if (inv.status === 'unpaid' && new Date(inv.dueDate).getTime() < now) {
          inv.status = 'overdue';
          db.saveInvoice(inv);
        }
        if (inv.status === 'overdue') {
          const userAccounts = accounts.filter(a => a.customerId === inv.userId && a.status === 'active');
          for (const ua of userAccounts) {
            ua.status = 'suspended';
            ua.suspendReason = `Auto-Suspend: Tagihan jatuh tempo (${inv.invoiceNumber})`;
            db.saveHostingAccount(ua);
            suspendedCount++;
          }
        }
      }
    }

    db.logAction(
      currentUser,
      'AUTOMATED_BILLING_RUN',
      'BILLING',
      `Cron Billing Otomatis dijalankan (${options.billingPeriodLabel}): ${generatedCount} invoice diterbitkan, ${autoPaidCount} lunas via Auto-Debit, ${suspendedCount} akun di-suspend.`
    );

    return { generatedCount, autoPaidCount, suspendedCount, generatedInvoices };
  }

  // --- Reseller Management ---
  public static async createReseller(
    userData: { name: string; email: string; companyName: string; phone: string; initialBalance: number },
    profileData: {
      brandName: string;
      themeColor: string;
      panelDomain: string;
      supportEmail: string;
      maxAccounts: number;
      allocatedDiskGb: number;
      allocatedBandwidthTb: number;
    },
    currentUser: User
  ): Promise<{ user: User; profile: ResellerProfile }> {
    const userId = `usr-reseller-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: 'reseller',
      status: 'active',
      creditBalance: userData.initialBalance || 0,
      companyName: userData.companyName,
      phone: userData.phone,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    };

    const newProfile: ResellerProfile = {
      id: `prof-${userId}`,
      userId,
      brandName: profileData.brandName,
      themeColor: profileData.themeColor || '#0ea5e9',
      panelDomain: profileData.panelDomain,
      supportEmail: profileData.supportEmail,
      hideUpstreamBranding: true,
      maxAccounts: profileData.maxAccounts || 50,
      allocatedDiskMb: (profileData.allocatedDiskGb || 100) * 1024,
      allocatedBandwidthMb: (profileData.allocatedBandwidthTb || 1) * 1024 * 1024,
      allocatedDatabases: (profileData.maxAccounts || 50) * 2,
      allocatedEmails: (profileData.maxAccounts || 50) * 5,
      allocatedDomains: (profileData.maxAccounts || 50) * 2,
    };

    db.saveUser(newUser);
    db.saveResellerProfile(newProfile);

    db.logAction(
      currentUser,
      'RESELLER_PROVISIONED',
      'AUTH',
      `Menambahkan mitra Reseller baru: ${newUser.name} (${newProfile.brandName}) dengan kuota ${newProfile.maxAccounts} akun & ${profileData.allocatedDiskGb} GB Disk`
    );

    return { user: newUser, profile: newProfile };
  }

  public static async suspendReseller(userId: string, currentUser: User): Promise<void> {
    const user = db.getUserById(userId);
    if (!user) throw new Error('Reseller tidak ditemukan');

    user.status = user.status === 'active' ? 'suspended' : 'active';
    db.saveUser(user);

    // If reseller suspended, also cascade suspend their hosted accounts
    if (user.status === 'suspended') {
      const accounts = db.getHostingAccounts().filter(a => a.resellerId === userId);
      accounts.forEach(a => {
        a.status = 'suspended';
        a.suspendReason = 'Ditangguhkan karena akun reseller induk nonaktif';
        db.saveHostingAccount(a);
      });
    }

    db.logAction(
      currentUser,
      user.status === 'suspended' ? 'RESELLER_SUSPENDED' : 'RESELLER_UNSUSPENDED',
      'AUTH',
      `Status reseller ${user.name} diubah menjadi ${user.status}`
    );
  }

  // --- VPS Cloud Instance Operations ---
  public static async provisionVps(
    payload: {
      name: string;
      hostname: string;
      region: string;
      regionName: string;
      countryCode: string;
      osDistro: string;
      osIcon: string;
      vCpu: number;
      ramMb: number;
      diskGb: number;
      bandwidthLimitGb: number;
      monthlyPrice: number;
      rootPassword?: string;
      sshKeyName?: string;
      autoBackupEnabled?: boolean;
      customerId?: string;
      customerName?: string;
    },
    currentUser: User
  ): Promise<VpsInstance> {
    const id = `vps-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const randomIp = `103.147.${Math.floor(Math.random() * 50 + 150)}.${Math.floor(Math.random() * 200 + 10)}`;
    const randomIpV6 = `2001:df0:340:${Math.floor(Math.random() * 9 + 1)}::${Math.floor(Math.random() * 99 + 10)}`;
    const gateway = randomIp.substring(0, randomIp.lastIndexOf('.')) + '.1';

    const newVps: VpsInstance = {
      id,
      name: payload.name.trim(),
      hostname: payload.hostname.trim(),
      customerId: payload.customerId || currentUser.id,
      customerName: payload.customerName || currentUser.name,
      resellerId: currentUser.role === 'reseller' ? currentUser.id : undefined,
      region: payload.region,
      regionName: payload.regionName,
      countryCode: payload.countryCode,
      osDistro: payload.osDistro,
      osIcon: payload.osIcon,
      status: 'provisioning',
      vCpu: payload.vCpu,
      ramMb: payload.ramMb,
      diskGb: payload.diskGb,
      bandwidthLimitGb: payload.bandwidthLimitGb,
      bandwidthUsedGb: 0,
      ipV4: randomIp,
      ipV6: randomIpV6,
      gateway,
      reverseDns: payload.hostname.trim(),
      liveCpuPct: 0,
      liveRamMb: 0,
      uptime: '0 mins (provisioning)',
      monthlyPrice: payload.monthlyPrice,
      currency: 'USD',
      autoBackupEnabled: !!payload.autoBackupEnabled,
      createdAt: new Date().toISOString(),
      rootPassword: payload.rootPassword || 'cP#Root' + Math.random().toString(36).substring(2, 8),
      sshKeyName: payload.sshKeyName,
    };

    db.saveVpsInstance(newVps);

    // Initial default firewall rules (SSH, HTTP, HTTPS)
    db.saveVpsFirewallRule({
      id: `vfw-${Date.now()}-1`,
      vpsId: id,
      protocol: 'TCP',
      portRange: '22',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'OpenSSH Management',
    });
    db.saveVpsFirewallRule({
      id: `vfw-${Date.now()}-2`,
      vpsId: id,
      protocol: 'TCP',
      portRange: '80',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'HTTP Web Port',
    });
    db.saveVpsFirewallRule({
      id: `vfw-${Date.now()}-3`,
      vpsId: id,
      protocol: 'TCP',
      portRange: '443',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'HTTPS SSL Port',
    });

    // Enqueue realistic background worker job
    queue.enqueueJob(
      `Provisi Cloud VPS: ${newVps.name} (${newVps.hostname})`,
      'PROVISION_VPS',
      newVps.id,
      newVps.name
    );

    // After 3.5s background step completes, set status to running
    setTimeout(() => {
      const v = db.getVpsById(id);
      if (v) {
        v.status = 'running';
        v.liveCpuPct = 12.4;
        v.liveRamMb = Math.round(v.ramMb * 0.25);
        v.uptime = 'Baru saja aktif';
        db.saveVpsInstance(v);
        db.addNotification(
          'VPS Siap Digunakan',
          `Instance Cloud VPS ${v.name} (${v.ipV4}) telah berhasil aktif dan siap diakses melalui SSH.`,
          'success'
        );
      }
    }, 3800);

    db.logAction(
      currentUser,
      'VPS_PROVISIONED',
      'VPS',
      `Memprovisi VPS baru ${newVps.name} (${newVps.ipV4}) spesifikasi ${newVps.vCpu} vCPU, ${newVps.ramMb} MB RAM, ${newVps.diskGb} GB NVMe di Region ${newVps.regionName}`
    );

    return newVps;
  }

  public static async powerActionVps(
    vpsId: string,
    action: 'start' | 'stop' | 'restart',
    currentUser: User
  ): Promise<void> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    if (action === 'start') {
      vps.status = 'running';
      vps.uptime = 'Baru saja dijalankan';
      vps.liveCpuPct = +(Math.random() * 20 + 8).toFixed(1);
      vps.liveRamMb = Math.round(vps.ramMb * 0.3);
      db.saveVpsInstance(vps);
      db.logAction(currentUser, 'VPS_STARTED', 'VPS', `Menyalakan VPS ${vps.name} (${vps.ipV4})`);
    } else if (action === 'stop') {
      vps.status = 'stopped';
      vps.uptime = 'Offline';
      vps.liveCpuPct = 0;
      vps.liveRamMb = 0;
      db.saveVpsInstance(vps);
      db.logAction(currentUser, 'VPS_STOPPED', 'VPS', `Mematikan VPS ${vps.name} (${vps.ipV4})`);
    } else if (action === 'restart') {
      vps.status = 'restarting';
      db.saveVpsInstance(vps);
      db.logAction(currentUser, 'VPS_REBOOTED', 'VPS', `Memulai ulang (reboot) VPS ${vps.name} (${vps.ipV4})`);
      setTimeout(() => {
        const v = db.getVpsById(vpsId);
        if (v) {
          v.status = 'running';
          v.uptime = 'Baru saja di-reboot';
          v.liveCpuPct = +(Math.random() * 18 + 12).toFixed(1);
          v.liveRamMb = Math.round(v.ramMb * 0.35);
          db.saveVpsInstance(v);
        }
      }, 2500);
    }
  }

  public static async rebuildVps(
    vpsId: string,
    osDistro: string,
    osIcon: string,
    rootPassword: string,
    currentUser: User
  ): Promise<void> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    vps.status = 'provisioning';
    vps.osDistro = osDistro;
    vps.osIcon = osIcon;
    vps.rootPassword = rootPassword;
    db.saveVpsInstance(vps);

    queue.enqueueJob(
      `Rebuild OS Distro: ${vps.name} -> ${osDistro}`,
      'REBUILD_VPS',
      vps.id,
      vps.name
    );

    setTimeout(() => {
      const v = db.getVpsById(vpsId);
      if (v) {
        v.status = 'running';
        v.uptime = 'Baru saja di-rebuild';
        v.liveCpuPct = 10.5;
        v.liveRamMb = Math.round(v.ramMb * 0.22);
        db.saveVpsInstance(v);
        db.addNotification(
          'Rebuild VPS Selesai',
          `OS pada instance ${v.name} telah diganti ke ${osDistro}.`,
          'success'
        );
      }
    }, 3200);

    db.logAction(
      currentUser,
      'VPS_REBUILT',
      'VPS',
      `Melakukan instalasi ulang OS ${osDistro} pada VPS ${vps.name} (${vps.ipV4})`
    );
  }

  public static async resizeVps(
    vpsId: string,
    vCpu: number,
    ramMb: number,
    diskGb: number,
    monthlyPrice: number,
    currentUser: User
  ): Promise<void> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    vps.vCpu = vCpu;
    vps.ramMb = ramMb;
    vps.diskGb = diskGb;
    vps.monthlyPrice = monthlyPrice;
    db.saveVpsInstance(vps);

    db.logAction(
      currentUser,
      'VPS_RESIZED',
      'VPS',
      `Upgrade spesifikasi VPS ${vps.name} ke ${vCpu} vCPU, ${ramMb} MB RAM, ${diskGb} GB NVMe`
    );
  }

  public static async createVpsSnapshot(
    vpsId: string,
    name: string,
    currentUser: User
  ): Promise<VpsSnapshot> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    const snap: VpsSnapshot = {
      id: `snap-${Date.now()}`,
      vpsId,
      name: name.trim() || `snapshot-${new Date().toISOString().substring(0, 10)}`,
      sizeGb: +(Math.random() * 10 + 5).toFixed(1),
      createdAt: new Date().toISOString(),
    };

    queue.enqueueJob(
      `Snapshot VPS: ${vps.name} (${snap.name})`,
      'SNAPSHOT_VPS',
      vps.id,
      snap.name
    );

    db.saveVpsSnapshot(snap);
    db.logAction(currentUser, 'VPS_SNAPSHOT_CREATED', 'VPS', `Membuat snapshot ${snap.name} untuk VPS ${vps.name}`);
    return snap;
  }

  public static async restoreVpsSnapshot(
    vpsId: string,
    snapshotId: string,
    currentUser: User
  ): Promise<void> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    vps.status = 'restarting';
    db.saveVpsInstance(vps);

    queue.enqueueJob(
      `Restore Snapshot: ${vps.name}`,
      'REBUILD_VPS',
      vps.id,
      vps.name
    );

    setTimeout(() => {
      const v = db.getVpsById(vpsId);
      if (v) {
        v.status = 'running';
        v.uptime = 'Baru saja di-restore';
        db.saveVpsInstance(v);
        db.addNotification('Restore Snapshot Sukses', `Snapshot telah berhasil dipulihkan pada ${v.name}.`, 'info');
      }
    }, 2800);

    db.logAction(currentUser, 'VPS_SNAPSHOT_RESTORED', 'VPS', `Restore snapshot pada VPS ${vps.name}`);
  }

  public static async terminateVps(vpsId: string, currentUser: User): Promise<void> {
    const vps = db.getVpsById(vpsId);
    if (!vps) throw new Error('VPS instance tidak ditemukan');

    db.deleteVpsInstance(vpsId);
    db.logAction(
      currentUser,
      'VPS_TERMINATED',
      'VPS',
      `Menghapus permanen VPS ${vps.name} (${vps.ipV4}) beserta snapshot dan firewall`
    );
  }

  public static async runSystemJob(type: string, description: string, targetName?: string): Promise<string> {
    return queue.enqueueJob(description, type as any, undefined, targetName);
  }
}
