-- Long Distance Photobooth — skema awal
-- Jalankan sekali di Supabase Dashboard → SQL Editor → New query → Run.
-- Aman dijalankan ulang (idempotent).

-- ── Tabel memories ───────────────────────────────────────────────────
create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users (id) on delete cascade,
  caption     text not null default '',
  mood        text not null default 'Happy',
  template    text not null default 'polaroid',
  -- path di Storage bucket "memories", bukan base64
  image_path  text not null,
  photo_paths text[] not null default '{}',
  -- foto kedua orang dari satu sesi capture berbagi session_id yang sama
  session_id  uuid
);

create index if not exists memories_session_idx
  on public.memories (session_id, created_at);

create index if not exists memories_created_at_idx
  on public.memories (created_at desc);

-- ── Tabel reactions (chat di halaman Memory Detail) ──────────────────
create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  memory_id  uuid not null references public.memories (id) on delete cascade,
  author     uuid not null references auth.users (id) on delete cascade,
  body       text not null
);

create index if not exists reactions_memory_idx
  on public.reactions (memory_id, created_at);

-- ── Row Level Security ───────────────────────────────────────────────
-- Hanya user yang sudah login yang bisa membaca/menulis. Karena pendaftaran
-- publik dimatikan dan hanya ada 2 akun, ini efektif membatasi ke kalian
-- berdua. Baris hanya bisa diubah/dihapus oleh pembuatnya.

alter table public.memories  enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "memories read"   on public.memories;
drop policy if exists "memories insert" on public.memories;
drop policy if exists "memories update" on public.memories;
drop policy if exists "memories delete" on public.memories;

create policy "memories read" on public.memories
  for select to authenticated using (true);

create policy "memories insert" on public.memories
  for insert to authenticated with check (auth.uid() = created_by);

create policy "memories update" on public.memories
  for update to authenticated using (auth.uid() = created_by);

create policy "memories delete" on public.memories
  for delete to authenticated using (auth.uid() = created_by);

drop policy if exists "reactions read"   on public.reactions;
drop policy if exists "reactions insert" on public.reactions;
drop policy if exists "reactions delete" on public.reactions;

create policy "reactions read" on public.reactions
  for select to authenticated using (true);

create policy "reactions insert" on public.reactions
  for insert to authenticated with check (auth.uid() = author);

create policy "reactions delete" on public.reactions
  for delete to authenticated using (auth.uid() = author);

-- ── Storage bucket privat untuk foto ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

drop policy if exists "memories files read"   on storage.objects;
drop policy if exists "memories files insert" on storage.objects;
drop policy if exists "memories files delete" on storage.objects;

create policy "memories files read" on storage.objects
  for select to authenticated using (bucket_id = 'memories');

create policy "memories files insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'memories');

create policy "memories files delete" on storage.objects
  for delete to authenticated using (bucket_id = 'memories' and owner = auth.uid());

-- ── Realtime (untuk gallery yang update sendiri) ─────────────────────
-- dibungkus supaya tidak error kalau tabelnya sudah terdaftar
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions'
  ) then
    alter publication supabase_realtime add table public.reactions;
  end if;
end $$;
