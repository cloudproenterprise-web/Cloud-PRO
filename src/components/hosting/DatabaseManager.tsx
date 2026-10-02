import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  PlusCircle,
  Trash2,
  Terminal,
  Play,
  CheckCircle2,
  ExternalLink,
  Shield,
  KeyRound,
  Table,
  Upload,
  Download,
  RefreshCw,
  Search,
  Code,
  FileText,
  Check,
  AlertCircle,
  Server,
  Zap,
  Folder,
  ChevronRight,
  ChevronDown,
  Settings,
  Layers,
  Filter,
  Eye,
  Eraser,
  Maximize2,
  Minimize2,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { DatabaseEntity, HostingAccount, DatabaseTableEntity } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface DatabaseManagerProps {
  account: HostingAccount;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ account }) => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction } = useServer();

  if (!currentUser) return null;

  // Databases strictly isolated for THIS hosting account
  const [databases, setDatabases] = useState<DatabaseEntity[]>(() => db.getDatabases(account.id));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dbSuffix, setDbSuffix] = useState('');
  const [userSuffix, setUserSuffix] = useState('');
  const [password, setPassword] = useState('cP#Pass' + Math.random().toString(36).substring(2, 6));

  // phpMyAdmin modal & state
  const [showPmaModal, setShowPmaModal] = useState(false);
  const [isPmaFullscreen, setIsPmaFullscreen] = useState(false);
  const [activePmaDb, setActivePmaDb] = useState<string>(
    databases[0]?.dbName || `${account.username}_rdm`
  );
  const [pmaTab, setPmaTab] = useState<'structure' | 'browse' | 'sql' | 'import' | 'export' | 'operations'>('structure');
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // Responsive sidebar control:
  // Desktop sidebar can be collapsed.
  // Mobile drawer is an overlay modal that never squishes the workspace!
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // New Table creation inside phpMyAdmin (cPanel standard)
  const [newTableName, setNewTableName] = useState('');
  const [newTableCols, setNewTableCols] = useState(4);

  // Active tables strictly for the active database
  const [activeTables, setActiveTables] = useState<DatabaseTableEntity[]>(() => {
    const initDb = databases[0]?.dbName || `${account.username}_rdm`;
    return db.getDatabaseTables(initDb);
  });

  // Selected table checkboxes for batch actions
  const [selectedTableNames, setSelectedTableNames] = useState<string[]>([]);
  const [tableSearchFilter, setTableSearchFilter] = useState('');

  // SQL Query Console State
  const [sqlQuery, setSqlQuery] = useState<string>(`SELECT * FROM information_schema.tables WHERE table_schema = '${activePmaDb}' LIMIT 10;`);
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  // Import SQL file state
  const [importFileName, setImportFileName] = useState('');
  const [importCustomSql, setImportCustomSql] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Operations tab state
  const [newCollation, setNewCollation] = useState('utf8mb4_unicode_ci');

  const refreshList = () => {
    const list = db.getDatabases(account.id);
    setDatabases([...list]);
  };

  const refreshTables = (dbName: string) => {
    const tbls = db.getDatabaseTables(dbName);
    setActiveTables([...tbls]);
    if (tbls.length > 0) {
      if (!tbls.some(t => t.name === selectedTable)) {
        setSelectedTable(tbls[0].name);
      }
    } else {
      setSelectedTable('');
    }
  };

  // Sync tables whenever active database changes
  useEffect(() => {
    if (activePmaDb) {
      refreshTables(activePmaDb);
      setSqlQuery(`SELECT * FROM information_schema.tables WHERE table_schema = '${activePmaDb}' LIMIT 10;`);
      setQueryResult(null);
      setSelectedTableNames([]);
    }
  }, [activePmaDb]);

  const handleCreateDatabase = () => {
    if (!dbSuffix.trim()) return;
    const cleanDb = dbSuffix.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanUser = userSuffix.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || cleanDb;

    const dbName = `${account.username}_${cleanDb}`;
    const dbUser = `${account.username}_${cleanUser}`;

    const newDb: DatabaseEntity = {
      id: `db-${Date.now()}`,
      accountId: account.id,
      dbName,
      dbUser,
      charset: 'utf8mb4_unicode_ci',
      sizeMb: 0.1, // Initial empty database size
      createdAt: new Date().toISOString(),
    };

    db.saveDatabase(newDb);
    // Explicitly initialize with 0 tables (Empty standard)
    db.clearDatabaseTables(dbName);

    db.logAction(
      currentUser,
      'DATABASE_CREATED',
      'HOSTING',
      `Membuat database MySQL baru "${dbName}" dengan user "${dbUser}" pada virtual host ${account.primaryDomain}`
    );
    showToast('success', 'Database Dibuat', `Database ${dbName} siap digunakan dalam keadaan kosong (0 tabel).`);
    setDbSuffix('');
    setUserSuffix('');
    setShowCreateModal(false);
    refreshList();
    setActivePmaDb(dbName);
    refreshTables(dbName);
  };

  const handleDeleteDatabase = (entity: DatabaseEntity) => {
    confirmAction({
      title: 'Hapus Database MySQL (DROP DATABASE)',
      message: `Yakin ingin menghapus database "${entity.dbName}"? Seluruh tabel, data record, dan user privilege akan dihapus permanen dari server.`,
      confirmText: 'Hapus Database',
      isDanger: true,
      onConfirm: () => {
        db.deleteDatabase(entity.id);
        db.logAction(
          currentUser,
          'DATABASE_DELETED',
          'HOSTING',
          `Menghapus database MySQL "${entity.dbName}" pada akun ${account.primaryDomain}`
        );
        showToast('info', 'Database Dihapus', `Database ${entity.dbName} telah dihapus permanen.`);
        refreshList();
        const remaining = db.getDatabases(account.id);
        if (remaining.length > 0) {
          setActivePmaDb(remaining[0].dbName);
          refreshTables(remaining[0].dbName);
        } else {
          setActivePmaDb('');
          setActiveTables([]);
        }
      },
    });
  };

  // Create Table inside phpMyAdmin (cPanel Standard)
  const handleCreateNewTable = () => {
    if (!newTableName.trim()) {
      showToast('error', 'Nama Tabel Kosong', 'Harap masukkan nama tabel.');
      return;
    }
    const cleanName = newTableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newTable: DatabaseTableEntity = {
      name: cleanName,
      dbName: activePmaDb,
      rows: 0,
      sizeKb: 16,
      engine: 'InnoDB',
      collation: 'utf8mb4_unicode_ci',
      columns: [
        { name: 'id', type: 'INT', length: '11', isPrimary: true, autoIncrement: true },
        { name: 'nama', type: 'VARCHAR', length: '150', nullable: false },
        { name: 'created_at', type: 'DATETIME', nullable: true },
        { name: 'status', type: 'VARCHAR', length: '50', defaultVal: 'active' },
      ],
      sampleRows: [],
    };

    db.saveDatabaseTable(activePmaDb, newTable);
    refreshTables(activePmaDb);
    setSelectedTable(cleanName);
    setNewTableName('');
    showToast('success', 'Tabel Dibuat', `Tabel "${cleanName}" dengan ${newTableCols} kolom berhasil dibuat di database ${activePmaDb}.`);
    refreshList();
  };

  // Drop Table (cPanel Standard)
  const handleDeleteTable = (tableName: string) => {
    confirmAction({
      title: 'Hapus Tabel (DROP TABLE)',
      message: `Yakin ingin menghapus tabel "${tableName}" dari database "${activePmaDb}"? Data pada tabel ini akan hilang permanen.`,
      confirmText: 'Drop Tabel',
      isDanger: true,
      onConfirm: () => {
        db.deleteDatabaseTable(activePmaDb, tableName);
        refreshTables(activePmaDb);
        showToast('info', 'Tabel Dihapus', `Tabel "${tableName}" berhasil di-drop.`);
        refreshList();
      },
    });
  };

  // Empty / Truncate Table
  const handleEmptyTable = (tableName: string) => {
    confirmAction({
      title: 'Kosongkan Tabel (TRUNCATE TABLE)',
      message: `Yakin ingin mengosongkan semua baris data pada tabel "${tableName}"? Struktur kolom tabel akan tetap dipertahankan.`,
      confirmText: 'Kosongkan (Truncate)',
      isDanger: true,
      onConfirm: () => {
        const tbl = activeTables.find(t => t.name === tableName);
        if (tbl) {
          db.saveDatabaseTable(activePmaDb, {
            ...tbl,
            rows: 0,
            sizeKb: 16,
            sampleRows: [],
          });
          refreshTables(activePmaDb);
          showToast('success', 'Tabel Dikosongkan', `Tabel "${tableName}" berhasil dikosongkan.`);
          refreshList();
        }
      },
    });
  };

  // Batch Drop selected tables
  const handleBatchDropTables = () => {
    if (selectedTableNames.length === 0) return;
    confirmAction({
      title: `Drop ${selectedTableNames.length} Tabel Terpilih`,
      message: `Yakin ingin menghapus ${selectedTableNames.length} tabel terpilih (${selectedTableNames.join(', ')}) dari database "${activePmaDb}"?`,
      confirmText: 'Hapus Semua Terpilih',
      isDanger: true,
      onConfirm: () => {
        selectedTableNames.forEach(tName => {
          db.deleteDatabaseTable(activePmaDb, tName);
        });
        setSelectedTableNames([]);
        refreshTables(activePmaDb);
        showToast('info', 'Tabel Dihapus', `${selectedTableNames.length} tabel telah di-drop.`);
        refreshList();
      },
    });
  };

  // Execute SQL in console
  const handleExecuteSql = (customQuery?: string) => {
    const start = performance.now();
    const query = (customQuery || sqlQuery).trim();
    const qUpper = query.toUpperCase();

    // Check for CREATE TABLE query
    const createMatch = query.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i);
    if (createMatch) {
      const tblName = createMatch[1];
      db.saveDatabaseTable(activePmaDb, {
        name: tblName,
        dbName: activePmaDb,
        rows: 0,
        sizeKb: 16,
        engine: 'InnoDB',
        collation: 'utf8mb4_unicode_ci',
      });
      refreshTables(activePmaDb);
      refreshList();
      setQueryResult({
        columns: ['Query OK', 'Status', 'Message'],
        rows: [['OK', 'TABLE_CREATED', `Table \`${tblName}\` created successfully.`]],
      });
    } else if (query.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i)) {
      const dropMatch = query.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i);
      if (dropMatch) {
        const tblName = dropMatch[1];
        db.deleteDatabaseTable(activePmaDb, tblName);
        refreshTables(activePmaDb);
        refreshList();
        setQueryResult({
          columns: ['Query OK', 'Status', 'Message'],
          rows: [['OK', 'TABLE_DROPPED', `Table \`${tblName}\` dropped successfully.`]],
        });
      }
    } else if (qUpper.startsWith('SHOW TABLES')) {
      const current = db.getDatabaseTables(activePmaDb);
      setQueryResult({
        columns: [`Tables_in_${activePmaDb}`],
        rows: current.length > 0 ? current.map(t => [t.name]) : [['(no tables found)']],
      });
    } else if (qUpper.startsWith('SELECT') || qUpper.startsWith('SHOW')) {
      const current = db.getDatabaseTables(activePmaDb);
      const targetTable = current.find(t => qUpper.includes(t.name.toUpperCase())) || current[0];

      if (targetTable) {
        if (targetTable.sampleRows && targetTable.sampleRows.length > 0) {
          const cols = Object.keys(targetTable.sampleRows[0]);
          const rows = targetTable.sampleRows.map(r => Object.values(r));
          setQueryResult({ columns: cols, rows });
        } else if (targetTable.name.includes('siswa')) {
          setQueryResult({
            columns: ['id', 'nisn', 'nama_lengkap', 'kelas_id', 'status', 'terakhir_login'],
            rows: [
              [1, '0081293812', 'Muhammad Zaky Pratama', 'X-IPA-1', 'AKTIF', '2026-09-28 08:30'],
              [2, '0082391294', 'Siti Nur Aisyah', 'X-IPA-1', 'AKTIF', '2026-09-28 09:15'],
              [3, '0083912381', 'Ahmad Fadillah', 'X-IPS-2', 'AKTIF', '2026-09-27 14:20'],
              [4, '0084712839', 'Fatimatuz Zahra', 'XI-IPA-2', 'AKTIF', '2026-09-28 07:50'],
              [5, '0085918231', 'Rizky Kurniawan', 'XII-IPA-1', 'AKTIF', '2026-09-28 10:12'],
            ],
          });
        } else {
          setQueryResult({
            columns: ['id', 'nama', 'status', 'created_at'],
            rows: [
              [1, `${targetTable.name}_record_01`, 'ACTIVE', '2026-09-28 10:00:00'],
              [2, `${targetTable.name}_record_02`, 'ACTIVE', '2026-09-28 11:30:00'],
              [3, `${targetTable.name}_record_03`, 'PENDING', '2026-09-28 14:15:00'],
            ],
          });
        }
      } else {
        setQueryResult({
          columns: ['id', 'name', 'status', 'created_at'],
          rows: [[1, 'default_sample', 'ACTIVE', '2026-09-28 10:00:00']],
        });
      }
    } else {
      setQueryResult({
        columns: ['Query OK', 'Rows Affected', 'Warning Count'],
        rows: [['Statement executed successfully', '1 row(s) updated', '0 warnings']],
      });
    }

    const elapsed = +(performance.now() - start).toFixed(2);
    setQueryTime(elapsed);
    showToast('success', 'Kueri SQL Selesai', `Eksekusi selesai dalam ${elapsed} ms.`);
  };

  // Export SQL dump for active database
  const handleExportSql = () => {
    const current = db.getDatabaseTables(activePmaDb);
    let dump = `-- phpMyAdmin SQL Dump
-- version 5.2.1
-- Host: localhost:3306
-- Waktu Pembuatan: ${new Date().toUTCString()}
-- Versi Server: 10.11.8-MariaDB-enterprise
-- Versi PHP: ${account.phpVersion || '8.2'}
-- Virtual Host: ${account.primaryDomain}

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: \`${activePmaDb}\`
--
CREATE DATABASE IF NOT EXISTS \`${activePmaDb}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${activePmaDb}\`;
`;

    if (current.length === 0) {
      dump += `\n-- Database \`${activePmaDb}\` saat ini kosong (0 tabel).\n`;
    } else {
      current.forEach(tbl => {
        dump += `
-- --------------------------------------------------------
--
-- Struktur dari tabel \`${tbl.name}\`
--

DROP TABLE IF EXISTS \`${tbl.name}\`;
CREATE TABLE \`${tbl.name}\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nama\` varchar(150) NOT NULL,
  \`status\` varchar(50) DEFAULT 'AKTIF',
  \`created_at\` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=${tbl.engine || 'InnoDB'} DEFAULT CHARSET=utf8mb4 COLLATE=${tbl.collation || 'utf8mb4_unicode_ci'};

--
-- Dumping data untuk tabel \`${tbl.name}\`
--

INSERT INTO \`${tbl.name}\` (\`id\`, \`nama\`, \`status\`, \`created_at\`) VALUES
(1, 'Data Contoh 1', 'AKTIF', '2026-09-28 08:00:00'),
(2, 'Data Contoh 2', 'AKTIF', '2026-09-28 09:30:00');
`;
      });
    }

    dump += `\nCOMMIT;\n`;

    const blob = new Blob([dump], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePmaDb}_dump_${Date.now()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Export Selesai', `File dump SQL untuk database ${activePmaDb} (${current.length} tabel) berhasil diunduh.`);
  };

  // Import SQL file handler
  const handleStartImport = () => {
    if (!importFileName && !importCustomSql.trim()) {
      showToast('error', 'Pilih File', 'Silakan pilih file .sql terlebih dahulu atau ketik perintah SQL.');
      return;
    }
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);

      // Parse table names from SQL content or filename
      const textToScan = importCustomSql || importFileName;
      let tablesToCreate: string[] = [];

      const matches = [...textToScan.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/gi)];
      if (matches.length > 0) {
        tablesToCreate = matches.map(m => m[1]);
      } else {
        const lower = (importFileName || 'database').toLowerCase();
        if (lower.includes('rdm')) {
          tablesToCreate = ['rdm_siswa', 'rdm_nilai', 'rdm_guru', 'rdm_kelas', 'users', 'options', 'sessions'];
        } else if (lower.includes('wordpress') || lower.includes('wp')) {
          tablesToCreate = ['wp_posts', 'wp_users', 'wp_options', 'wp_comments', 'wp_postmeta', 'wp_terms'];
        } else if (lower.includes('cbt')) {
          tablesToCreate = ['cbt_ujian', 'cbt_soal', 'cbt_peserta', 'cbt_hasil', 'cbt_jawaban'];
        } else {
          const baseName = importFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
          tablesToCreate = [`${baseName}_data`, `${baseName}_settings`, `${baseName}_logs`];
        }
      }

      // Persist newly imported tables to THIS database
      tablesToCreate.forEach(tblName => {
        db.saveDatabaseTable(activePmaDb, {
          name: tblName,
          dbName: activePmaDb,
          rows: Math.floor(Math.random() * 250) + 15,
          sizeKb: Math.floor(Math.random() * 450) + 48,
          engine: 'InnoDB',
          collation: 'utf8mb4_unicode_ci',
        });
      });

      refreshTables(activePmaDb);
      refreshList();
      showToast('success', 'Import Berhasil!', `File ${importFileName || 'SQL'} berhasil di-restore ke database ${activePmaDb} (${tablesToCreate.length} tabel dibuat).`);
      setImportFileName('');
      setImportCustomSql('');
      setPmaTab('structure');
    }, 1000);
  };

  const filteredActiveTables = useMemo(() => {
    if (!tableSearchFilter.trim()) return activeTables;
    return activeTables.filter(t => t.name.toLowerCase().includes(tableSearchFilter.toLowerCase()));
  }, [activeTables, tableSearchFilter]);

  const totalRowsCount = useMemo(() => {
    return activeTables.reduce((acc, t) => acc + (t.rows || 0), 0);
  }, [activeTables]);

  const totalSizeKb = useMemo(() => {
    return activeTables.reduce((acc, t) => acc + (t.sizeKb || 16), 0);
  }, [activeTables]);

  return (
    <div className="space-y-6">
      {/* Top Banner: MySQL Center */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 w-full max-w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-500 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              MySQL / MariaDB &amp; phpMyAdmin Database Center
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-words">
            Host: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">localhost (127.0.0.1)</span> &bull; Port: <span className="font-mono text-slate-700 dark:text-slate-300">3306</span> &bull; Engine: InnoDB / MariaDB 10.11 &bull; phpMyAdmin 5.2.1
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* phpMyAdmin Button */}
          <button
            onClick={() => {
              if (databases.length > 0) {
                setActivePmaDb(databases[0].dbName);
                refreshTables(databases[0].dbName);
              }
              setShowPmaModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:from-amber-500 hover:to-orange-500 shadow-xs cursor-pointer transition-all shrink-0"
            title="Buka phpMyAdmin Web Interface"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Masuk phpMyAdmin (SSO)</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Buat Database Baru</span>
          </button>
        </div>
      </div>

      {/* Databases Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4 w-4 text-sky-500" />
            <span>Database Virtual Host: {account.primaryDomain} ({databases.length})</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            MySQL 8.0 / MariaDB 10.11 InnoDB
          </span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
              <tr>
                <th className="px-5 py-3">Nama Database</th>
                <th className="px-5 py-3">User Privileges</th>
                <th className="px-5 py-3">Tabel Tersimpan</th>
                <th className="px-5 py-3">Ukuran Disk</th>
                <th className="px-5 py-3 text-right">Aksi &amp; phpMyAdmin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {databases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                    Belum ada database pada akun {account.primaryDomain}. Klik &quot;Buat Database Baru&quot; untuk menambahkan database MySQL.
                  </td>
                </tr>
              ) : (
                databases.map(dbItem => {
                  const itemTables = db.getDatabaseTables(dbItem.dbName);
                  return (
                    <tr key={dbItem.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-sky-500 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {dbItem.dbName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                          {dbItem.dbUser}@localhost
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-[11px] font-sans">
                        {itemTables.length === 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">0 tabel (Kosong)</span>
                        ) : (
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{itemTables.length} tabel</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {dbItem.sizeMb.toFixed(1)} MB
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActivePmaDb(dbItem.dbName);
                              refreshTables(dbItem.dbName);
                              setPmaTab('structure');
                              setShowPmaModal(true);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer shrink-0"
                            title="Buka database ini di phpMyAdmin"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>phpMyAdmin</span>
                          </button>

                          <button
                            onClick={() => handleDeleteDatabase(dbItem)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 cursor-pointer shrink-0"
                            title="Hapus Database"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive SQL Query Console */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Konsol Kueri SQL Langsung (SQL Query Terminal)
            </h4>
          </div>
          {queryTime !== null && (
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              Latency: {queryTime} ms
            </span>
          )}
        </div>

        <div className="mt-3">
          <textarea
            value={sqlQuery}
            onChange={e => setSqlQuery(e.target.value)}
            rows={3}
            placeholder={`Masukkan perintah SQL untuk database ${activePmaDb} (misal: SHOW TABLES; atau SELECT * FROM users;)`}
            className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-sky-300 dark:border-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
          />

          <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const q = 'SHOW TABLES;';
                  setSqlQuery(q);
                  handleExecuteSql(q);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-mono text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 cursor-pointer"
              >
                SHOW TABLES
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = `SELECT * FROM ${selectedTable || 'users'} LIMIT 10;`;
                  setSqlQuery(q);
                  handleExecuteSql(q);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-mono text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 cursor-pointer"
              >
                SELECT {selectedTable || 'tabel'}
              </button>
            </div>

            <button
              onClick={() => handleExecuteSql()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Jalankan Kueri</span>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {queryResult && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                <tr>
                  {queryResult.columns.map((col, idx) => (
                    <th key={idx} className="px-4 py-2 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queryResult.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2 text-slate-600 dark:text-slate-300">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Modal: phpMyAdmin 5.2.1 Web Interface Suite (Full cPanel Standards)       */}
      {/* ========================================================================= */}
      {showPmaModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xs ${
          isPmaFullscreen ? 'p-0' : 'p-0 sm:p-3 md:p-5'
        }`}>
          <div className={`w-full flex flex-col bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden transition-all duration-150 ${
            isPmaFullscreen
              ? 'h-screen w-screen rounded-none border-none'
              : 'h-full sm:h-[94vh] max-w-6xl rounded-none sm:rounded-2xl border border-slate-700'
          }`}>
            
            {/* Header: Authentic phpMyAdmin Top Navigation */}
            <div className="flex items-center justify-between bg-[#1e293b] px-3 sm:px-4 py-2.5 sm:py-3 text-white border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (pmaTab !== 'structure') {
                      setPmaTab('structure');
                    } else {
                      setShowPmaModal(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer shrink-0 transition-colors"
                  title={pmaTab !== 'structure' ? 'Kembali ke Struktur Tabel' : 'Kembali ke Database Manager'}
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-amber-400" />
                  <span>Kembali</span>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 font-black text-slate-900 text-xs shadow-xs shrink-0">
                    pma
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                        phpMyAdmin 5.2.1
                      </h3>
                      <span className="hidden sm:inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                        MariaDB 10.11 @ 127.0.0.1
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      User: <strong className="text-amber-400">{account.username}@localhost</strong> &bull; {account.primaryDomain}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Mobile Database Tree Drawer Trigger */}
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="md:hidden flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-white border border-slate-700 font-mono"
                  title="Pilih Database & Tabel"
                >
                  <Database className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="max-w-[100px] truncate">{activePmaDb}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                </button>

                {/* Desktop Database Selector */}
                <select
                  value={activePmaDb}
                  onChange={e => {
                    setActivePmaDb(e.target.value);
                    refreshTables(e.target.value);
                    setPmaTab('structure');
                  }}
                  className="hidden md:block rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-white border border-slate-700 font-mono outline-none cursor-pointer max-w-xs truncate"
                >
                  {databases.map(d => (
                    <option key={d.id} value={d.dbName}>
                      {d.dbName} ({db.getDatabaseTables(d.dbName).length} tabel)
                    </option>
                  ))}
                </select>

                {/* Fullscreen / Maximize Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPmaFullscreen(!isPmaFullscreen)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                  title={isPmaFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
                >
                  {isPmaFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>

                {/* Close Modal Button */}
                <button
                  type="button"
                  onClick={() => setShowPmaModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                  title="Tutup phpMyAdmin"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Breadcrumb Navigation Bar (Standard phpMyAdmin cPanel) */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-3 sm:px-4 py-2 text-[11px] font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Server className="h-3.5 w-3.5 text-slate-500 shrink-0 hidden sm:inline" />
                <span className="hidden sm:inline">127.0.0.1:3306</span>
                <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 hidden sm:inline" />
                <Database className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setPmaTab('structure')}
                  className="text-slate-900 dark:text-white font-bold truncate hover:underline cursor-pointer"
                >
                  {activePmaDb}
                </button>
                {selectedTable && pmaTab === 'browse' && (
                  <>
                    <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                    <Table className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-900 dark:text-white font-bold truncate">{selectedTable}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Mobile Button: Open Database Drawer */}
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="md:hidden flex items-center gap-1 rounded bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 font-semibold px-2 py-0.5 text-[11px] font-sans"
                >
                  <Folder className="h-3 w-3" />
                  <span>Daftar Database ({databases.length})</span>
                </button>

                {/* Desktop Toggle Sidebar */}
                <button
                  type="button"
                  onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                  className="hidden md:flex items-center gap-1 text-[11px] rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-slate-700 dark:text-slate-300 font-sans"
                >
                  {desktopSidebarOpen ? 'Sembunyikan Panel' : 'Lihat Panel Kiri'}
                </button>
              </div>
            </div>

            {/* Top Function Tabs Bar (Smooth touch horizontal scroll on mobile) */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 sm:px-4 py-1.5 dark:border-slate-800 dark:bg-slate-800/80 overflow-x-auto text-xs font-semibold shrink-0 whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => setPmaTab('structure')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                  pmaTab === 'structure'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Struktur Tabel ({activeTables.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPmaTab('sql')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                  pmaTab === 'sql'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>SQL Console</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPmaTab('browse');
                  if (activeTables.length > 0 && !selectedTable) {
                    setSelectedTable(activeTables[0].name);
                  }
                  handleExecuteSql(`SELECT * FROM ${selectedTable || activeTables[0]?.name || 'users'} LIMIT 10;`);
                }}
                disabled={activeTables.length === 0}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  pmaTab === 'browse'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Jelajahi (Browse)</span>
              </button>

              <button
                type="button"
                onClick={() => setPmaTab('import')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                  pmaTab === 'import'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import .SQL</span>
              </button>

              <button
                type="button"
                onClick={() => setPmaTab('export')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                  pmaTab === 'export'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export .SQL</span>
              </button>

              <button
                type="button"
                onClick={() => setPmaTab('operations')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors cursor-pointer shrink-0 ${
                  pmaTab === 'operations'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Operasi</span>
              </button>
            </div>

            {/* Workplace: Desktop 2-Column, Mobile Full-Width Responsive */}
            <div className="flex flex-1 overflow-hidden relative">
              
              {/* DESKTOP Left Sidebar: Visible only on md screens and up */}
              {desktopSidebarOpen && (
                <div className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-3 flex-col text-xs overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      Databases ({databases.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="text-sky-600 hover:text-sky-500 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      title="Buat Database Baru"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Baru</span>
                    </button>
                  </div>

                  {/* Filter input */}
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Saring tabel..."
                      value={tableSearchFilter}
                      onChange={e => setTableSearchFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>

                  {/* Databases Tree */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto font-mono text-[11px]">
                    {databases.map(d => {
                      const isCurrent = d.dbName === activePmaDb;
                      const dTables = db.getDatabaseTables(d.dbName);
                      return (
                        <div key={d.id} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePmaDb(d.dbName);
                              refreshTables(d.dbName);
                              setPmaTab('structure');
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-sky-100 text-sky-900 font-bold dark:bg-sky-950 dark:text-sky-300'
                                : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Database className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                              <span className="truncate">{d.dbName}</span>
                            </div>
                            <span className="text-[10px] font-sans font-semibold text-slate-400">
                              ({dTables.length})
                            </span>
                          </button>

                          {/* If current database is selected, show its tables list underneath */}
                          {isCurrent && (
                            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-sky-300 dark:border-sky-800 ml-2">
                              {dTables.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic py-1 font-sans">
                                  Belum ada tabel (Kosong)
                                </p>
                              ) : (
                                dTables
                                  .filter(t => !tableSearchFilter || t.name.toLowerCase().includes(tableSearchFilter.toLowerCase()))
                                  .map(t => (
                                    <button
                                      key={t.name}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTable(t.name);
                                        setPmaTab('browse');
                                        handleExecuteSql(`SELECT * FROM ${t.name} LIMIT 10;`);
                                      }}
                                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors cursor-pointer text-[10px] ${
                                        selectedTable === t.name && pmaTab === 'browse'
                                          ? 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-950 dark:text-amber-300'
                                          : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <Table className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{t.name}</span>
                                    </button>
                                  ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MOBILE Drawer: Slide-over Drawer on Mobile Screens (Never squishes workspace!) */}
              {mobileDrawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-700 flex flex-col max-h-[85vh] my-auto overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b] text-white border-b border-slate-700">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-sky-400" />
                        <h4 className="font-bold text-xs uppercase tracking-wider">
                          Pilih Database &amp; Tabel ({databases.length})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="rounded p-1.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4 overflow-y-auto space-y-3 text-xs">
                      <p className="text-[11px] text-slate-500">
                        Pilih database untuk mengelola struktur tabel atau jelajahi data:
                      </p>

                      <div className="space-y-2">
                        {databases.map(d => {
                          const isCurrent = d.dbName === activePmaDb;
                          const dTables = db.getDatabaseTables(d.dbName);
                          return (
                            <div key={d.id} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePmaDb(d.dbName);
                                  refreshTables(d.dbName);
                                  setPmaTab('structure');
                                  setMobileDrawerOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left font-mono font-bold text-xs ${
                                  isCurrent
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Database className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{d.dbName}</span>
                                </div>
                                <span className="text-[11px] font-sans opacity-80 shrink-0">
                                  {dTables.length} tabel
                                </span>
                              </button>

                              {dTables.length > 0 && (
                                <div className="p-2 bg-white dark:bg-slate-900 grid grid-cols-2 gap-1 font-mono text-[11px]">
                                  {dTables.map(t => (
                                    <button
                                      key={t.name}
                                      type="button"
                                      onClick={() => {
                                        setActivePmaDb(d.dbName);
                                        refreshTables(d.dbName);
                                        setSelectedTable(t.name);
                                        setPmaTab('browse');
                                        handleExecuteSql(`SELECT * FROM ${t.name} LIMIT 10;`);
                                        setMobileDrawerOpen(false);
                                      }}
                                      className="flex items-center gap-1.5 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-left truncate text-slate-700 dark:text-slate-300"
                                    >
                                      <Table className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{t.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileDrawerOpen(false);
                            setShowCreateModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white text-xs hover:bg-sky-500 shadow-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Buat Database MySQL Baru</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Workspace: Always 100% Full Width on Mobile */}
              <div className="flex-1 w-full min-w-0 overflow-y-auto p-3 sm:p-5 text-xs">
                
                {/* TAB 1: Struktur Tabel */}
                {pmaTab === 'structure' && (
                  <div className="space-y-5 w-full">
                    
                    {/* Database Status Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Daftar Tabel Database: <code className="text-sky-600 font-bold">{activePmaDb}</code>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Virtual Host: {account.primaryDomain} &bull; Total: <strong>{activeTables.length} tabel</strong> &bull; Ukuran: {(totalSizeKb / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => refreshTables(activePmaDb)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] hover:bg-slate-50 dark:border-slate-700 cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3 text-slate-500" />
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>

                    {/* EMPTY STATE: Standard cPanel phpMyAdmin when newly created */}
                    {activeTables.length === 0 ? (
                      <div className="space-y-5 animate-in fade-in duration-200 w-full">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-sm">
                              Tidak ada tabel ditemukan dalam database <code>{activePmaDb}</code>.
                            </p>
                            <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                              Sesuai standar hosting cPanel, database baru ini terisolasi per akun dan dalam keadaan <strong>kosong (0 tabel, 0 KB)</strong>. Anda dapat membuat tabel baru secara manual di bawah ini, atau meng-import file cadangan (.sql) dari CMS seperti WordPress, RDM, atau aplikasi web Anda.
                            </p>
                          </div>
                        </div>

                        {/* Classic cPanel phpMyAdmin "Create Table" Form */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 w-full">
                          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <PlusCircle className="h-4 w-4 text-sky-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                              Buat Tabel Baru (Create Table)
                            </h4>
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Nama Tabel:
                              </label>
                              <input
                                type="text"
                                placeholder="misal: users, tb_siswa, wp_posts"
                                value={newTableName}
                                onChange={e => setNewTableName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>

                            <div className="w-full sm:w-36">
                              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Jumlah Kolom:
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={newTableCols}
                                onChange={e => setNewTableCols(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                            </div>

                            <div className="sm:self-end">
                              <button
                                type="button"
                                onClick={handleCreateNewTable}
                                disabled={!newTableName.trim()}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2 font-bold text-xs text-white hover:bg-sky-500 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                                <span>Kirim / Buat Tabel</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quick Import Option */}
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/30 w-full">
                          <Upload className="mx-auto h-8 w-8 text-slate-400" />
                          <h5 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                            Punya file dump database (.sql atau .sql.gz)?
                          </h5>
                          <p className="mt-1 text-[11px] text-slate-500 max-w-md mx-auto">
                            Gunakan tab <strong>Import .SQL</strong> untuk memulihkan seluruh struktur tabel dan data CMS secara otomatis.
                          </p>
                          <button
                            type="button"
                            onClick={() => setPmaTab('import')}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5 text-sky-600" />
                            <span>Buka Form Import .SQL</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE TABLES LIST: Standard cPanel phpMyAdmin structure */
                      <div className="space-y-4 w-full">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 w-full">
                          <table className="w-full text-left font-mono text-xs min-w-[650px]">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider font-sans border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="px-3 py-2.5 w-8 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedTableNames.length === activeTables.length && activeTables.length > 0}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedTableNames(activeTables.map(t => t.name));
                                      } else {
                                        setSelectedTableNames([]);
                                      }
                                    }}
                                  />
                                </th>
                                <th className="px-4 py-2.5">Tabel</th>
                                <th className="px-4 py-2.5 text-center">Tindakan</th>
                                <th className="px-4 py-2.5 text-right">Baris</th>
                                <th className="px-4 py-2.5">Tipe</th>
                                <th className="px-4 py-2.5">Penyortiran (Collation)</th>
                                <th className="px-4 py-2.5 text-right">Ukuran</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {filteredActiveTables.map(t => {
                                const isChecked = selectedTableNames.includes(t.name);
                                return (
                                  <tr key={t.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedTableNames([...selectedTableNames, t.name]);
                                          } else {
                                            setSelectedTableNames(selectedTableNames.filter(n => n !== t.name));
                                          }
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-2.5 font-bold text-sky-600 dark:text-sky-400">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTable(t.name);
                                          setPmaTab('browse');
                                          handleExecuteSql(`SELECT * FROM ${t.name} LIMIT 10;`);
                                        }}
                                        className="hover:underline cursor-pointer"
                                      >
                                        {t.name}
                                      </button>
                                    </td>
                                    <td className="px-4 py-2.5 font-sans">
                                      <div className="flex items-center justify-center gap-1 text-[11px]">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedTable(t.name);
                                            setPmaTab('browse');
                                            handleExecuteSql(`SELECT * FROM ${t.name} LIMIT 10;`);
                                          }}
                                          className="rounded bg-sky-50 px-2 py-0.5 text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 font-semibold cursor-pointer"
                                          title="Jelajahi baris tabel"
                                        >
                                          Jelajahi
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEmptyTable(t.name)}
                                          className="rounded p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950 cursor-pointer"
                                          title="Kosongkan (Truncate data)"
                                        >
                                          <Eraser className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTable(t.name)}
                                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 cursor-pointer"
                                          title="Hapus Tabel (Drop)"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                                      {(t.rows || 0).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                      {t.engine || 'InnoDB'}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                                      {t.collation || 'utf8mb4_unicode_ci'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                                      {(t.sizeKb || 16)} KB
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 font-sans">
                                  Total: {activeTables.length} Tabel
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {totalRowsCount.toLocaleString()} Baris
                                </td>
                                <td>InnoDB</td>
                                <td>utf8mb4</td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {(totalSizeKb / 1024).toFixed(2)} MB
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Batch Action Toolbar */}
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Dengan yang terpilih ({selectedTableNames.length}):</span>
                            <button
                              type="button"
                              onClick={handleBatchDropTables}
                              disabled={selectedTableNames.length === 0}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300 font-semibold cursor-pointer disabled:opacity-40"
                            >
                              Hapus (Drop)
                            </button>
                          </div>

                          {/* Quick Create Table Form below list */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nama tabel baru..."
                              value={newTableName}
                              onChange={e => setNewTableName(e.target.value)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={handleCreateNewTable}
                              disabled={!newTableName.trim()}
                              className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 font-semibold text-white hover:bg-sky-500 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              <span>Tambah Tabel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: SQL Console (Full width, roomy on mobile & desktop) */}
                {pmaTab === 'sql' && (
                  <div className="space-y-4 w-full">
                    <div>
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          Jalankan Kueri SQL pada database <code>{activePmaDb}</code>:
                        </label>
                        {queryTime !== null && (
                          <span className="text-[11px] text-emerald-600 font-mono">
                            Latency: {queryTime} ms
                          </span>
                        )}
                      </div>
                      <textarea
                        value={sqlQuery}
                        onChange={e => setSqlQuery(e.target.value)}
                        rows={6}
                        placeholder={`CREATE TABLE contoh (id INT PRIMARY KEY, nama VARCHAR(100));\nSELECT * FROM ${selectedTable || 'tabel'};`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-sky-300 dark:border-slate-800 outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const q = 'SHOW TABLES;';
                            setSqlQuery(q);
                            handleExecuteSql(q);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-mono text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 cursor-pointer"
                        >
                          SHOW TABLES;
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const q = `SELECT * FROM ${selectedTable || activeTables[0]?.name || 'users'} LIMIT 10;`;
                            setSqlQuery(q);
                            handleExecuteSql(q);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-mono text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 cursor-pointer"
                        >
                          SELECT * LIMIT 10;
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExecuteSql()}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs cursor-pointer shrink-0"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Kirim Kueri (Execute)</span>
                      </button>
                    </div>

                    {/* Query Execution Result */}
                    {queryResult && (
                      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 w-full">
                        <table className="w-full text-left font-mono text-xs min-w-[500px]">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                            <tr>
                              {queryResult.columns.map((col, idx) => (
                                <th key={idx} className="px-4 py-2 font-semibold">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {queryResult.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Jelajahi (Browse) */}
                {pmaTab === 'browse' && (
                  <div className="space-y-4 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Tabel:
                        </span>
                        <select
                          value={selectedTable}
                          onChange={e => {
                            setSelectedTable(e.target.value);
                            handleExecuteSql(`SELECT * FROM ${e.target.value} LIMIT 10;`);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {activeTables.map(t => (
                            <option key={t.name} value={t.name}>
                              {t.name} ({t.rows} baris)
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExecuteSql(`SELECT * FROM ${selectedTable} LIMIT 10;`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Refresh Data</span>
                      </button>
                    </div>

                    {activeTables.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        Belum ada tabel dalam database ini untuk dijelajahi.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 w-full">
                        <table className="w-full text-left font-mono text-xs min-w-[550px]">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                            <tr>
                              {queryResult?.columns?.map((col, idx) => (
                                <th key={idx} className="px-4 py-2 font-semibold">
                                  {col}
                                </th>
                              )) || <th>Data</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {queryResult?.rows?.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            )) || (
                              <tr>
                                <td className="p-4 text-center text-slate-400">
                                  Pilih tabel untuk menampilkan baris data.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Import .SQL */}
                {pmaTab === 'import' && (
                  <div className="space-y-4 max-w-xl mx-auto py-3 w-full">
                    <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 sm:p-6 text-center dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <Upload className="mx-auto h-9 w-9 text-slate-400" />
                      <h5 className="mt-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Pilih File Backup Database (.sql atau .sql.gz)
                      </h5>
                      <p className="mt-1 text-[11px] text-slate-500">
                        File akan di-restore ke database: <strong className="font-mono text-sky-600">{activePmaDb}</strong>
                      </p>

                      <input
                        type="file"
                        id="sql-file-input"
                        accept=".sql,.gz"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setImportFileName(e.target.files[0].name);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="sql-file-input"
                        className="mt-4 inline-block rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 cursor-pointer shadow-xs"
                      >
                        Pilih File SQL dari Komputer
                      </label>

                      {importFileName && (
                        <div className="mt-3 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>File terpilih: <strong>{importFileName}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Atau Tempel Perintah SQL Dump Langsung:
                      </label>
                      <textarea
                        value={importCustomSql}
                        onChange={e => setImportCustomSql(e.target.value)}
                        rows={3}
                        placeholder="CREATE TABLE tb_demo (id INT PRIMARY KEY, judul VARCHAR(100));"
                        className="w-full rounded-lg border border-slate-200 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleStartImport}
                      disabled={(!importFileName && !importCustomSql.trim()) || isImporting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isImporting ? 'Mengimport Data...' : 'Mulai Eksekusi Import .SQL'}</span>
                    </button>
                  </div>
                )}

                {/* TAB 5: Export .SQL */}
                {pmaTab === 'export' && (
                  <div className="space-y-4 max-w-lg mx-auto py-3 w-full">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Export Database: <span className="font-mono text-amber-600">{activePmaDb}</span>
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Mengekspor seluruh struktur tabel ({activeTables.length} tabel) dan baris data dalam format standar SQL terkompresi.
                      </p>

                      <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input type="radio" name="export-method" defaultChecked className="text-amber-600" />
                          <span>Cepat (Quick) - Format SQL lengkap dengan autoincrement &amp; UTF-8</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <input type="radio" name="export-method" className="text-amber-600" />
                          <span>Kustom - Pilih tabel tertentu saja</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleExportSql}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-bold text-white hover:bg-amber-500 shadow-xs cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Unduh File Dump .SQL ({activeTables.length} Tabel)</span>
                    </button>
                  </div>
                )}

                {/* TAB 6: Operations */}
                {pmaTab === 'operations' && (
                  <div className="space-y-4 max-w-lg mx-auto py-3 w-full">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Ubah Collation Database
                      </h5>
                      <div className="flex items-center gap-2">
                        <select
                          value={newCollation}
                          onChange={e => setNewCollation(e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci (Rekomendasi Modern)</option>
                          <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                          <option value="utf8_general_ci">utf8_general_ci</option>
                          <option value="latin1_swedish_ci">latin1_swedish_ci</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            showToast('success', 'Collation Diperbarui', `Collation database ${activePmaDb} berhasil diubah ke ${newCollation}.`);
                          }}
                          className="rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-500 cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 space-y-2">
                      <h5 className="font-bold text-xs text-rose-700 dark:text-rose-400">
                        Zona Bahaya: Hapus Database Ini
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Menghapus database <code>{activePmaDb}</code> beserta seluruh tabel di dalamnya secara permanen.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentDbObj = databases.find(d => d.dbName === activePmaDb);
                          if (currentDbObj) {
                            handleDeleteDatabase(currentDbObj);
                            setShowPmaModal(false);
                          }
                        }}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-xs text-white hover:bg-rose-500 cursor-pointer"
                      >
                        Hapus Database (DROP DATABASE)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 dark:border-slate-800 dark:bg-slate-900 shrink-0 text-[11px]">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
                <span className="truncate">SSO Virtual Host: <strong>{account.primaryDomain}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setShowPmaModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
              >
                Tutup phpMyAdmin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Database Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Buat Database MySQL Baru
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Database baru akan diisolasi untuk akun <strong>{account.primaryDomain}</strong> dan dibuat dalam keadaan kosong (0 tabel).
            </p>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Database:
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
                  <span className="bg-slate-100 px-3 py-2 font-mono text-slate-500 dark:bg-slate-800">
                    {account.username}_
                  </span>
                  <input
                    type="text"
                    placeholder="nama_db (misal: rdm, cbt, atau web)"
                    value={dbSuffix}
                    onChange={e => setDbSuffix(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-slate-900 dark:bg-slate-900 dark:text-white outline-hidden"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  User Database:
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
                  <span className="bg-slate-100 px-3 py-2 font-mono text-slate-500 dark:bg-slate-800">
                    {account.username}_
                  </span>
                  <input
                    type="text"
                    placeholder="nama_user (opsional)"
                    value={userSuffix}
                    onChange={e => setUserSuffix(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-slate-900 dark:bg-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Password Database:
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword('cP#Pass' + Math.random().toString(36).substring(2, 6))}
                    className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-[11px] hover:bg-slate-50 dark:border-slate-700 cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateDatabase}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
              >
                Konfirmasi Buat DB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;
