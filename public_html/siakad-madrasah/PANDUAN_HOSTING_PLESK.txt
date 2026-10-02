================================================================================
PANDUAN DEPLOYMENT HOSTING PLESK & MYSQL
Website Personal Ust. Jaenal Maskun, S.Pd.I.
================================================================================

Detail Database MySQL Plesk Anda:
- Database Name : jaenal_masterwebsite
- Database User : jaenal_masterwebsite
- Database Pass : masbagus15
- Database Host : localhost (Port 3306)

--------------------------------------------------------------------------------
LANGKAH 1: UNGGAH BERKAS WEB KE PLESK / CPANEL
--------------------------------------------------------------------------------
1. Masuk ke Control Panel Plesk / cPanel hosting Anda.
2. Buka menu "Files" (Pengelola Berkas) -> buka folder domain Anda -> masuk ke folder "httpdocs" (atau public_html).
3. Klik tombol "Upload" dan pilih berkas ZIP ini.
4. Klik kanan berkas ZIP -> pilih "Extract Files" ke folder tersebut.
5. Pastikan index.html, index.php, .htaccess, serta folder assets/ dan api/ berada di folder utama.

--------------------------------------------------------------------------------
LANGKAH 2: IMPOR DATABASE MYSQL KE PHPMYADMIN
--------------------------------------------------------------------------------
1. Di Control Panel Plesk, buka menu "Databases" -> klik "phpMyAdmin" pada database "jaenal_masterwebsite".
2. Klik tab "Import" di bagian atas phpMyAdmin.
3. Klik "Choose File", pilih berkas "database.sql" dari paket ini.
4. Klik tombol "Go" / "Kirim" di bagian bawah.
5. Selesai! Seluruh data dan tabel telah tersimpan aman.

--------------------------------------------------------------------------------
LANGKAH 3: PENGUJIAN & PERSISTENSI DATA
--------------------------------------------------------------------------------
1. Buka domain website Anda di browser.
2. Seluruh perubahan yang Anda lakukan di Admin Portal akan otomatis tersimpan ganda (ke MySQL Database dan server file backup data/persisted_site_data.json) sehingga data dijamin TIDAK AKAN HILANG saat di-refresh!
3. Login Admin: Email jaenalmaskun@gmail.com | Password: masbagus
================================================================================