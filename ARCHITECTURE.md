# Cloud PRO - Reseller Hosting Management System
## System Architecture, Database Schema, and Engineering Specification

---

### 1. System Architecture
Cloud PRO utilizes a modular multi-tenant architecture with strict tenancy isolation across three hierarchy levels:
```
           +---------------------------------------------------+
           |            Cloud PRO Root Administrator           |
           |   (Full Cluster, Server Nodes, Global Billing)    |
           +-------------------------+-------------------------+
                                     |
                                     v
           +---------------------------------------------------+
           |                  Reseller Tenant                  |
           | (Resource Allocation, White-label, Sub-customers) |
           +-------------------------+-------------------------+
                                     |
                                     v
           +---------------------------------------------------+
           |                  End Customer                     |
           |   (Hosting Account, Domains, DB, Email, Files)    |
           +---------------------------------------------------+
```

#### Core Components:
1. **Core Application & State Orchestrator**: Handles RBAC, multi-tenancy, audit logging, session persistence, and role switching.
2. **Server Node & Infrastructure Agent**: Manages multi-server clusters, IP pools, live metrics (CPU, RAM, Disk, IOPS), and service daemons (Nginx, PHP-FPM, MariaDB, BIND9 DNS, Postfix, Dovecot, Pure-FTPd).
3. **Provisioning Engine & Async Job Queue**: Executes background operations (account provisioning, SSL Let's Encrypt certificates, automated backups, migrations, auto-suspension) with real-time progress tracking and error rollback.
4. **Reseller White-label Engine**: Allows resellers to customize brand name, logo, domain, color themes, custom invoices, and hide the upstream provider identity.
5. **Customer cPanel-grade Hosting Suite**: File Manager with text editor, MySQL Database Manager, DNS Zone Editor (A/AAAA/CNAME/MX/TXT/NS), Email accounts, SSL toggles, Cron jobs, PHP versions (7.4-8.3) & extension toggles.
6. **Billing & Automated Lifecycle**: Automated invoices, renewal cycles, overdue suspension, payment gateways (Midtrans, Xendit, Stripe, Manual Bank), discount vouchers, and reseller credit balances.
7. **Security & Firewall**: Role-Based Access Control (RBAC), 2FA, API token scopes, IP Whitelist/Blacklist, rate limiting, and tamper-evident audit logs.

---

### 2. Database Schema (Relational Entities & Keys)

1. **`users`**:
   - `id` (UUID PK)
   - `name`, `email`, `password_hash`
   - `role` ('admin' | 'reseller' | 'customer')
   - `reseller_id` (UUID FK -> users.id, nullable for admin/root)
   - `status` ('active' | 'suspended' | 'pending')
   - `two_factor_enabled` (boolean), `two_factor_secret`
   - `credit_balance` (number, USD/IDR)
   - `company_name`, `phone`, `created_at`, `updated_at`

2. **`reseller_profiles`**:
   - `id` (UUID PK)
   - `user_id` (UUID FK -> users.id UNIQUE)
   - `brand_name`, `logo_url`, `theme_color`, `panel_domain`
   - `support_email`, `hide_upstream_branding` (boolean)
   - `max_accounts`, `allocated_disk_mb`, `allocated_bandwidth_mb`
   - `allocated_domains`, `allocated_databases`, `allocated_emails`

3. **`server_nodes`**:
   - `id` (UUID PK)
   - `name`, `hostname`, `ip_address`, `location`, `country_code`
   - `os_type`, `status` ('online' | 'degraded' | 'offline' | 'maintenance')
   - `total_cpu_cores`, `cpu_usage_pct`
   - `total_ram_mb`, `ram_usage_mb`
   - `total_disk_gb`, `disk_usage_gb`
   - `services_status` (JSON: nginx, mysql, php_fpm, named, postfix, ftp)
   - `is_primary` (boolean), `created_at`

4. **`hosting_plans`**:
   - `id` (UUID PK)
   - `reseller_id` (UUID FK -> users.id, nullable for global root plans)
   - `name`, `slug`, `description`
   - `disk_mb`, `bandwidth_mb`, `cpu_limit_pct`, `ram_limit_mb`
   - `max_domains`, `max_subdomains`, `max_databases`, `max_emails`, `max_ftp`
   - `has_ssl`, `has_backup`, `has_cron`
   - `price_monthly`, `price_yearly`, `is_active`

5. **`hosting_accounts`**:
   - `id` (UUID PK)
   - `customer_id` (UUID FK -> users.id)
   - `reseller_id` (UUID FK -> users.id)
   - `server_id` (UUID FK -> server_nodes.id)
   - `plan_id` (UUID FK -> hosting_plans.id)
   - `username`, `primary_domain`, `ip_address`
   - `status` ('active' | 'suspended' | 'terminated')
   - `suspend_reason` (string, nullable)
   - `disk_used_mb`, `bandwidth_used_mb`
   - `php_version` ('7.4' | '8.0' | '8.1' | '8.2' | '8.3')
   - `php_extensions` (JSON array)
   - `ssl_status` ('active' | 'expired' | 'pending' | 'none')
   - `ssl_provider` ('Let\'s Encrypt' | 'ZeroSSL' | 'Custom')
   - `created_at`, `expires_at`

6. **`dns_zones` & `dns_records`**:
   - `id` (UUID PK), `account_id` (UUID FK), `domain_name`
   - Records: `id`, `zone_id`, `type` ('A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'), `name`, `content`, `priority`, `ttl`

7. **`databases` & `db_users`**:
   - `id` (UUID PK), `account_id` (UUID FK), `db_name`, `db_user`, `charset`, `size_mb`

8. **`email_accounts`**:
   - `id` (UUID PK), `account_id` (UUID FK), `email_address`, `quota_mb`, `used_mb`, `forward_to`

9. **`invoices` & `transactions`**:
   - `id` (UUID PK), `invoice_number`, `user_id` (UUID FK), `amount`, `status` ('paid' | 'unpaid' | 'overdue' | 'cancelled')
   - `due_date`, `paid_at`, `payment_method`, `items` (JSON)

10. **`backups`**:
    - `id` (UUID PK), `account_id` (UUID FK), `type` ('full' | 'db' | 'files'), `size_mb`, `filename`, `status` ('ready' | 'creating' | 'restoring')

11. **`async_jobs` (Queue)**:
    - `id` (UUID PK), `job_type`, `target_id`, `status` ('pending' | 'processing' | 'completed' | 'failed')
    - `progress`, `logs` (array), `created_at`, `completed_at`

12. **`audit_logs` & `firewall_rules`**:
    - Audit: `id`, `user_id`, `action`, `ip_address`, `details`, `timestamp`
    - Firewall: `id`, `ip_or_subnet`, `type` ('whitelist' | 'blacklist'), `reason`, `active`

---

### 3. Role & Permission Matrix (RBAC)

| Capability / Resource | Administrator (Root) | Reseller (Tenant) | End Customer |
| :--- | :---: | :---: | :---: |
| Server Node CRUD & Daemon Control | Full (Create, Reboot, Services) | View Assigned Node Stats | No Access |
| Reseller CRUD & Quota Allocations | Full | Read Own Profile & Balances | No Access |
| Customer Management | Full (Global) | Manage Own Customers | Read/Edit Own Profile |
| Hosting Account Provisioning | Full (Any Node) | Within Reseller Quota Limit | Self-service Subdomains/Files |
| Hosting Plan Packages | Global & Custom Plans | Custom Sub-Plans | View Plan Details |
| File Manager / MySQL / Email / DNS | Super-Admin Access | Impersonation Access | Full Access to Own Account |
| White-Label Branding | System Defaults Setup | Full Brand Customization | Sees Reseller Brand |
| Billing & Invoicing | Global Ledger & Gateway | Reseller Balance & Invoices | Pay Invoices, View Receipts |
| Server Backups & 1-Click Restore | Cluster Backups | Customer Backups | Account Snapshots & Restore |
| Audit Logs & Security Firewall | Full Audit & Global IP Rules | Tenant Audit Logs | Account Login History & 2FA |

---

### 4. API Specification
- `GET /api/v1/health` -> System health & node statuses
- `POST /api/v1/auth/login` -> Session token, role, user payload
- `GET /api/v1/servers` -> Multi-node metrics & services
- `POST /api/v1/servers/:id/restart-service` -> Restart daemon (Nginx, MariaDB, PHP, etc.)
- `GET /api/v1/resellers` -> Reseller quota, balance, sub-tenants
- `POST /api/v1/resellers` -> Provision new reseller
- `GET /api/v1/customers` -> Customer directory
- `POST /api/v1/accounts` -> Provision hosting account (triggers queue)
- `PUT /api/v1/accounts/:id/suspend` -> Suspend hosting account
- `GET /api/v1/accounts/:id/files` -> File manager directory listing
- `POST /api/v1/accounts/:id/files/save` -> Save file content
- `GET /api/v1/accounts/:id/dns` -> DNS zone records
- `POST /api/v1/accounts/:id/dns` -> Add/update DNS record
- `POST /api/v1/accounts/:id/ssl/issue` -> Auto-issue SSL certificate
- `GET /api/v1/billing/invoices` -> Invoices list
- `POST /api/v1/billing/pay` -> Pay invoice with balance or gateway
- `GET /api/v1/queue/jobs` -> Realtime async jobs status
- `POST /api/v1/white-label` -> Save reseller brand configuration

---

### 5. Provisioning & Lifecycle Flow
1. **Order Placed**: Customer or Reseller submits domain, plan, username.
2. **Quota Check**: System validates reseller has sufficient disk, bandwidth, and account allowance.
3. **Queue Enqueue**: Asynchronous job `PROVISION_HOSTING` is pushed to queue.
4. **Server Execution**:
   - Allocates IP address and virtual host on target Server Node.
   - Creates system user, home directory `/home/<user>/public_html`, and sets permissions `0755`.
   - Injects default `index.html` starter page.
   - Provisions DNS zone with standard A, CNAME, MX, and NS records.
   - Generates Let's Encrypt SSL certificate & configures HTTPS redirection.
   - Provisions database & email mailbox.
5. **Completion Notification**: Audit log emitted, real-time notification sent to customer & reseller.
