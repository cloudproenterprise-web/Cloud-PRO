// ========================================================================
// KONFIGURASI UTAMA SIAKAD MADRASAH BERBASIS DIGITAL (HOSTING PLESK / CPANEL)
// ========================================================================

// 1. OPSI DATABASE MYSQL (Rekomendasi untuk Hosting Plesk/cPanel)
// Set true untuk memakai Database MySQL / MariaDB lokal di hosting via api.php
window.__ENV_USE_MYSQL__ = true;
window.__ENV_MYSQL_API_URL__ = "/api.php";

// 2. OPSI DATABASE SUPABASE CLOUD (Jika ingin menggunakan Supabase Cloud)
// Set window.__ENV_USE_MYSQL__ = false jika ingin beralih ke Supabase
window.__ENV_SUPABASE_URL__ = "https://zyytldzzqahayjxyegdm.supabase.co";
window.__ENV_SUPABASE_ANON_KEY__ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5eXRsZHp6cWFoYXlqeHllZ2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzA1MzAsImV4cCI6MjA4OTUwNjUzMH0.xNhRWM9qCOcIfu89jbM-atzp3pj86h2lUVmibn18UEI";
