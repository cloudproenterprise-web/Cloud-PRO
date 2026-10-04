-- ========================================================================
-- SKEMA DATABASE MYSQL / MARIADB SIAKAD MADRASAH
-- ========================================================================
-- Petunjuk Import:
-- 1. Buka phpMyAdmin di Plesk / cPanel / DirectAdmin hosting Anda.
-- 2. Pilih nama database yang telah Anda buat di menu Database hosting.
-- 3. Klik tab "Import" di bagian atas phpMyAdmin.
-- 4. Pilih file `database-mysql.sql` ini dan klik tombol "Go" / "Kirim".
-- ========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Tabel Utama `site_settings`
-- Menyimpan seluruh konfigurasi, siswa, guru, artikel, & data siakad (Format JSON)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` VARCHAR(191) NOT NULL,
  `value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Tabel Relasional Opsional `teachers` / `guru` (Data Pendidik & Tenaga Kependidikan)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `nama` VARCHAR(191) NOT NULL,
  `gelar` VARCHAR(100) DEFAULT NULL,
  `nik` VARCHAR(30) DEFAULT NULL,
  `nip` VARCHAR(50) DEFAULT NULL,
  `nuptk` VARCHAR(50) DEFAULT NULL,
  `npk` VARCHAR(50) DEFAULT NULL,
  `peg_id` VARCHAR(50) DEFAULT NULL,
  `nrg` VARCHAR(50) DEFAULT NULL COMMENT 'Nomor Registrasi Guru (NRG)',
  `jabatan` VARCHAR(150) DEFAULT NULL,
  `status_kepegawaian` VARCHAR(100) DEFAULT 'GTY / Guru Tetap Yayasan',
  `gender` ENUM('Laki-laki', 'Perempuan') DEFAULT 'Laki-laki',
  `telepon` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `pendidikan` VARCHAR(150) DEFAULT NULL,
  `sertifikasi` VARCHAR(100) DEFAULT 'Belum Sertifikasi',
  `no_sertifikat_pendidik` VARCHAR(100) DEFAULT NULL,
  `mapel_diampu` VARCHAR(255) DEFAULT NULL,
  `mengajar_kelas` VARCHAR(255) DEFAULT NULL,
  `tempat_lahir` VARCHAR(150) DEFAULT NULL,
  `tanggal_lahir` DATE DEFAULT NULL,
  `tmt_pendidik` DATE DEFAULT NULL,
  `status_keaktifan` VARCHAR(50) DEFAULT 'Aktif',
  `foto_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Tabel `users` (Opsional / Data Pengguna Administrator)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'admin',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Konfigurasi Default Si@Kad
INSERT IGNORE INTO `site_settings` (`id`, `value`) VALUES 
('general', '{"school_name":"Si@Kad","tagline":"Sistem Informasi Akademik Modern","address":"","phone":"","email":"","operational_hours":"Senin - Sabtu: 07:00 - 14:00 WIB","headmaster_name":"","headmaster_title":"Kepala Madrasah","maps_latitude":"-7.517606","maps_longitude":"109.132984","maps_zoom":"16"}'),
('hero', '{"badge_text":"Eksklusif & Modern","heading_line1":"Si@Kad","heading_line2":"Madrasah","description":"Selamat datang di institusi pendidikan yang memadukan kemuliaan akhlakul karimah dengan keunggulan akademik berbasis digital.","cta_primary":"Daftar Sekarang","cta_secondary":"Lihat Profil","stats_students":"150+","stats_achievements":"25+","stats_teachers":"15+","stats_years":"10+","background_image":"/og-cover.jpg","right_image":"/og-cover.jpg","images":[{"url":"/og-cover.jpg","title":"Pembiasaan","subtitle":"Terakreditasi & Berprestasi"}],"right_image_title":"Pembiasaan","right_image_subtitle":"Terakreditasi & Berprestasi"}'),
('running_text', '{"enabled":true,"text":"Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.","direction":"right_to_left","speed":"normal","badge":"INFORMASI MADRASAH","bg_color":"emerald","link_url":"/spmb","link_label":"Lihat SPMB","show_close_button":true,"archive":[{"id":"1","text":"Selamat Datang di Si@Kad Madrasah! Penerimaan Peserta Didik Baru (SPMB) Telah Dibuka. Silakan mendaftar secara online melalui menu SPMB.","badge":"INFORMASI MADRASAH","direction":"right_to_left","speed":"normal","bg_color":"emerald","link_url":"/spmb","link_label":"Lihat SPMB","created_at":"2026-01-01 00:00:00","is_active":true}]}'),
('seo', '{"title":"Si@Kad - Sistem Informasi Akademik Modern","description":"Aplikasi Sistem Informasi Akademik Madrasah Modern untuk kelola data siswa, guru, jadwal KBM, nilai, dan SPMB secara digital.","image_url":"/og-cover.jpg","og_image_url":"/og-cover.jpg"}'),
('tahun_pelajaran', '{"active_year":"2026/2027","available_years":["2026/2027","2025/2026","2024/2025","2023/2024"],"spmb_year":"2026/2027","semester":"Ganjil"}'),
('sticky_footer', '{"items":[{"icon_name":"Home","label":"Beranda","path":"/"},{"icon_name":"Brain","label":"Modul Ajar KBC","path":"/ai-teaching"},{"icon_name":"Link","label":"Tautan","path":"/links"},{"icon_name":"Users","label":"SPMB","path":"/spmb"},{"icon_name":"UserCircle","label":"Admin","path":"/login"}]}'),
('teachers', '[{"id":"g-1","nama":"Ahmad Syafii","gelar":"S.Pd.I, M.Pd","nik":"3302151501850001","nip":"198501152010011001","nuptk":"1234567890123456","npk":"987654321012","peg_id":"20198501150001","nrg":"120984756","jabatan":"Kepala Madrasah & Guru PAI","status_kepegawaian":"PNS","gender":"Laki-laki","telepon":"081234567890","email":"ahmad.syafii@mimaarif.sch.id","pendidikan":"S2 Pendidikan Agama Islam","sertifikasi":"Sudah Sertifikasi","no_sertifikat_pendidik":"123456789012","mapel_diampu":"Akidah Akhlak","mengajar_kelas":"Kelas 4, 5, 6","tempat_lahir":"Banyumas","tanggal_lahir":"1985-01-15","foto_url":"","status_keaktifan":"Aktif","tmt_pendidik":"2010-01-01","created_at":"2026-01-01T00:00:00.000Z"},{"id":"g-2","nama":"Siti Nurjanah","gelar":"S.Pd","nik":"3302156003900002","nip":"199003202015022002","nuptk":"8765432109876543","npk":"876543210987","peg_id":"20199003200002","nrg":"120984757","jabatan":"Guru Kelas I","status_kepegawaian":"PPPK","gender":"Perempuan","telepon":"082198765432","email":"siti.nurjanah@mimaarif.sch.id","pendidikan":"S1 PGMI / PGSD","sertifikasi":"Sudah Sertifikasi","no_sertifikat_pendidik":"987654321098","mapel_diampu":"Guru Kelas / Tematik","mengajar_kelas":"Kelas 1","tempat_lahir":"Banyumas","tanggal_lahir":"1990-03-20","foto_url":"","status_keaktifan":"Aktif","tmt_pendidik":"2015-02-01","created_at":"2026-01-01T00:00:00.000Z"},{"id":"g-3","nama":"M. Ridwan Kurniawan","gelar":"S.Pd","nik":"3302151207930003","nip":"199307122019031003","nuptk":"5678901234567890","npk":"765432109876","peg_id":"20199307120003","nrg":"","jabatan":"Guru Mapel Bahasa Arab","status_kepegawaian":"GTY / Guru Tetap Yayasan","gender":"Laki-laki","telepon":"085712345678","email":"ridwan.kurniawan@mimaarif.sch.id","pendidikan":"S1 Pendidikan Bahasa Arab","sertifikasi":"Dalam Proses","no_sertifikat_pendidik":"","mapel_diampu":"Bahasa Arab & Al-Qur\'an Hadis","mengajar_kelas":"Kelas 1, 2, 3, 4, 5, 6","tempat_lahir":"Purwokerto","tanggal_lahir":"1993-07-12","foto_url":"","status_keaktifan":"Aktif","tmt_pendidik":"2019-03-01","created_at":"2026-01-01T00:00:00.000Z"},{"id":"g-4","nama":"Dewi Rahmawati","gelar":"S.Kom","nik":"3302154508950004","nip":"-","nuptk":"3456789012345678","npk":"654321098765","peg_id":"20199508050004","nrg":"","jabatan":"Guru TIK & Operator EMIS","status_kepegawaian":"GTT / Honorer","gender":"Perempuan","telepon":"088812349999","email":"dewi.rahmawati@mimaarif.sch.id","pendidikan":"S1 Teknik Informatika","sertifikasi":"Belum Sertifikasi","no_sertifikat_pendidik":"","mapel_diampu":"Informatika / TIK","mengajar_kelas":"Kelas 4, 5, 6","tempat_lahir":"Cilacap","tanggal_lahir":"1995-08-05","foto_url":"","status_keaktifan":"Aktif","tmt_pendidik":"2021-07-15","created_at":"2026-01-01T00:00:00.000Z"},{"id":"g-5","nama":"Bambang Subagyo","gelar":"S.Pd","nik":"3302150211880005","nip":"198811022014011005","nuptk":"7654321098765432","npk":"543210987654","peg_id":"20198811020005","nrg":"120984758","jabatan":"Guru PJOK & Pembina Pramuka","status_kepegawaian":"PNS","gender":"Laki-laki","telepon":"081398761234","email":"bambang.subagyo@mimaarif.sch.id","pendidikan":"S1 Pendidikan Jasmani (PJOK)","sertifikasi":"Sudah Sertifikasi","no_sertifikat_pendidik":"543210987654","mapel_diampu":"Pendidikan Jasmani & Olahraga","mengajar_kelas":"Kelas 1, 2, 3, 4, 5, 6","tempat_lahir":"Banyumas","tanggal_lahir":"1988-11-02","foto_url":"","status_keaktifan":"Aktif","tmt_pendidik":"2014-01-01","created_at":"2026-01-01T00:00:00.000Z"}]');

-- Insert Admin Default
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role`) 
VALUES (1, 'admin', 'admin@madrasah.sch.id', '$2y$10$4qK1nZ94f1O1wUfB1y5lce0Yl9e4k1w8m9Z1x2y3z4a5b6c7d8e9f', 'admin');

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
