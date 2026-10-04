-- =======================================================
-- SKEMA SUPABASE UNTUK SIAKAD MADRASAH
-- =======================================================
-- Jalankan SQL ini di SQL Editor dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Buat Tabel Utama site_settings (Penyimpanan Key-Value JSON)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. Hapus Policy Lama Jika Ada untuk Menghindari Duplikasi
DROP POLICY IF EXISTS "Allow public read access" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public insert/update access" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public all access" ON public.site_settings;

-- 4. Buat Kebijakan Akses Publik (Membaca dan Menyimpan Data)
CREATE POLICY "Allow public all access" ON public.site_settings
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Aktifkan Fitur Realtime untuk Sinkronisasi Otomatis Semua Perangkat
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

-- =======================================================
-- SELESAI: Sekarang semua perubahan data akan otomatis 
-- tersimpan di Supabase dan tersinkronisasi di semua perangkat!
-- =======================================================
