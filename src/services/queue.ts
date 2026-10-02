import { AsyncJob } from '../types';
import { db } from './storage';

type JobListener = (jobs: AsyncJob[]) => void;

class JobQueueService {
  private jobs: AsyncJob[] = [];
  private listeners: Set<JobListener> = new Set();
  private isProcessing = false;

  constructor() {
    // Add sample recent jobs for immediate visibility
    this.jobs = [
      {
        id: 'job-init-01',
        title: 'AutoSSL Certificate Renewal: *.tokoberkah.com',
        jobType: 'ISSUE_SSL',
        targetId: 'acc-toko-01',
        targetName: 'tokoberkah.com',
        status: 'completed',
        progress: 100,
        logs: [
          '[09:59:45] Initiating ACME HTTP-01 challenge for tokoberkah.com',
          '[09:59:48] Challenge verified by Let\'s Encrypt Authority X3',
          '[09:59:52] Certificate /etc/letsencrypt/live/tokoberkah.com/fullchain.pem generated',
          '[09:59:54] Reloading Nginx vhost configuration on SG-Equinix-Node01',
          '[10:00:00] SSL successfully renewed. Expiration: Dec 15, 2026',
        ],
        startedAt: '2026-09-28T09:59:45Z',
        completedAt: '2026-09-28T10:00:00Z',
      },
    ];
  }

  public subscribe(listener: JobListener): () => void {
    this.listeners.add(listener);
    listener([...this.jobs]);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const copy = [...this.jobs];
    this.listeners.forEach(fn => fn(copy));
  }

  public getJobs(): AsyncJob[] {
    return [...this.jobs];
  }

  public getActiveJobsCount(): number {
    return this.jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  }

  public enqueueJob(
    title: string,
    jobType: AsyncJob['jobType'],
    targetId?: string,
    targetName?: string,
    customSteps?: { stepName: string; durationMs: number }[]
  ): string {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newJob: AsyncJob = {
      id: jobId,
      title,
      jobType,
      targetId,
      targetName,
      status: 'pending',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString()}] Job enqueued into worker queue`],
      startedAt: new Date().toISOString(),
    };

    this.jobs.unshift(newJob);
    this.notify();

    // Start processing asynchronously
    setTimeout(() => {
      this.processJob(jobId, customSteps);
    }, 200);

    return jobId;
  }

  private async processJob(
    jobId: string,
    customSteps?: { stepName: string; durationMs: number }[]
  ): Promise<void> {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 10;
    job.logs.push(`[${new Date().toLocaleTimeString()}] Worker node claimed task: ${job.title}`);
    this.notify();

    // Default step definitions based on job type
    const steps = customSteps || this.getDefaultSteps(job);
    const stepIncrement = Math.floor(80 / steps.length);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await new Promise(resolve => setTimeout(resolve, step.durationMs));

      job.progress = Math.min(95, 15 + (i + 1) * stepIncrement);
      job.logs.push(`[${new Date().toLocaleTimeString()}] ${step.stepName}`);
      this.notify();
    }

    // Complete job
    await new Promise(resolve => setTimeout(resolve, 400));
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toLocaleTimeString()}] Execution finished successfully with exit code 0`);
    this.notify();

    // Post-completion triggers
    db.addNotification(
      `Job Selesai: ${job.title}`,
      `Operasi ${job.targetName || ''} telah sukses dieksekusi oleh sistem background worker.`,
      'success'
    );
  }

  private getDefaultSteps(job: AsyncJob): { stepName: string; durationMs: number }[] {
    switch (job.jobType) {
      case 'PROVISION_ACCOUNT':
        return [
          { stepName: 'Memeriksa ketersediaan kuota reseller & validasi format domain', durationMs: 400 },
          { stepName: 'Mengalokasikan IP & VHost di target node cluster', durationMs: 600 },
          { stepName: 'Membuat user Linux /home/' + (job.targetName || 'user') + ' & direktori public_html', durationMs: 500 },
          { stepName: 'Menyetel permission 0755 & membuat starter template PHP', durationMs: 400 },
          { stepName: 'Mengkonfigurasi BIND9 DNS Zone records (A, CNAME, MX, TXT)', durationMs: 500 },
          { stepName: 'Menghubungkan PHP-FPM pool & pool socket listener', durationMs: 400 },
          { stepName: 'Menerbitkan sertifikat SSL otomatis Let\'s Encrypt AutoSSL', durationMs: 700 },
        ];
      case 'ISSUE_SSL':
        return [
          { stepName: 'Memulai validasi ACME HTTP-01 challenge untuk domain', durationMs: 400 },
          { stepName: 'DNS authorization & SSL challenge verification lolos', durationMs: 600 },
          { stepName: 'Menyimpan fullchain.pem dan privkey.pem ke folder SSL vhost', durationMs: 500 },
          { stepName: 'Reload daemon Nginx web server tanpa downtime', durationMs: 400 },
        ];
      case 'GENERATE_BACKUP':
        return [
          { stepName: 'Mengunci file virtual & freeze database sementara', durationMs: 300 },
          { stepName: 'Membuat snapshot mysqldump database MySQL/MariaDB', durationMs: 600 },
          { stepName: 'Mengompres direktori public_html ke format tar.gz', durationMs: 800 },
          { stepName: 'Memverifikasi checksum sha256 arsip backup', durationMs: 400 },
        ];
      case 'RESTORE_BACKUP':
        return [
          { stepName: 'Menghentikan proses FastCGI untuk akun target', durationMs: 400 },
          { stepName: 'Mengekstrak file snapshot ke /home/public_html', durationMs: 700 },
          { stepName: 'Mengimpor skema database SQL ke MariaDB server', durationMs: 600 },
          { stepName: 'Memperbaiki hak akses chown & chmod akun', durationMs: 300 },
          { stepName: 'Menghidupkan kembali service vhost akun', durationMs: 400 },
        ];
      case 'RESTART_SERVICE':
        return [
          { stepName: 'Mengirim sinyal graceful shutdown SIGHUP ke daemon', durationMs: 400 },
          { stepName: 'Memeriksa integritas file konfigurasi vhost/daemon', durationMs: 500 },
          { stepName: 'Memulai ulang service process daemon & binding port', durationMs: 600 },
          { stepName: 'Health check OK: daemon berstatus ACTIVE (RUNNING)', durationMs: 400 },
        ];
      case 'PROVISION_VPS':
        return [
          { stepName: 'Memvalidasi spesifikasi hardware (vCPU, RAM, NVMe) & alokasi node KVM', durationMs: 400 },
          { stepName: 'Mengalokasikan dedicated IPv4 & IPv6 dari IP pool cluster', durationMs: 500 },
          { stepName: 'Membuat volume NVMe storage sparse image & partitioning', durationMs: 700 },
          { stepName: 'Menginjeksi Cloud-Init image & konfigurasi SSH Key / password root', durationMs: 600 },
          { stepName: 'Menjalankan VM hypervisor instance (KVM/QEMU) & booting kernel', durationMs: 600 },
          { stepName: 'Instance online, status ACTIVE: SSH port 22 responsif', durationMs: 400 },
        ];
      case 'REBUILD_VPS':
        return [
          { stepName: 'Menghentikan proses instance KVM secara graceful', durationMs: 400 },
          { stepName: 'Memformat ulang partisi root disk NVMe', durationMs: 600 },
          { stepName: 'Mengunduh & menulis image distro OS baru ke block storage', durationMs: 800 },
          { stepName: 'Mengaplikasikan Cloud-Init password root & re-injeksi SSH keys', durationMs: 500 },
          { stepName: 'Menghidupkan kembali VPS dengan image sistem operasi baru', durationMs: 500 },
        ];
      case 'SNAPSHOT_VPS':
        return [
          { stepName: 'Membuat live snapshot qemu-img freeze filesystem', durationMs: 500 },
          { stepName: 'Streaming delta block storage ke cluster backup S3 storage', durationMs: 800 },
          { stepName: 'Memverifikasi integritas checksum qcow2 snapshot', durationMs: 400 },
          { stepName: 'Thaw filesystem & snapshot point-in-time selesai', durationMs: 300 },
        ];
      default:
        return [
          { stepName: 'Memulai eksekusi task background', durationMs: 500 },
          { stepName: 'Menjalankan skrip sistem', durationMs: 700 },
          { stepName: 'Memverifikasi status akhir', durationMs: 400 },
        ];
    }
  }
}

export const queue = new JobQueueService();
