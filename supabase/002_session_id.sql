-- Menambah session_id: foto Adriel dan Maria dari satu sesi capture yang sama
-- dikelompokkan sebagai SATU memory, bukan dua.
--
-- PENTING: file inilah yang harus dijalankan untuk database yang tabelnya
-- sudah ada. Menjalankan ulang schema.sql TIDAK menambah kolom ini, karena
-- di sana kolomnya ada di dalam `create table if not exists` — dan blok itu
-- dilewati begitu tabelnya sudah ada.
--
-- Jalankan di Supabase Dashboard → SQL Editor. Aman dijalankan berulang.

alter table public.memories
  add column if not exists session_id uuid;

create index if not exists memories_session_idx
  on public.memories (session_id, created_at);

-- Paksa PostgREST membaca ulang skema, supaya kolom barunya langsung terlihat
-- oleh aplikasi tanpa menunggu.
notify pgrst, 'reload schema';
