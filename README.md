# Long Distance Photobooth

Photobooth privat untuk Adriel & Maria, dengan Supabase sebagai backend
(auth, database, storage, realtime).

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Kamera hanya bisa diakses lewat `localhost` atau
HTTPS (aturan browser).

Butuh `.env.local` — salin dari `.env.example`, lalu isi anon/publishable key
dari Supabase Dashboard → Settings → API Keys. **Restart dev server** setiap
kali file itu berubah; Vite hanya membacanya saat start.

## Masuk

| Kolom       | Adriel     | Maria      |
| ----------- | ---------- | ---------- |
| Birthday    | 18/04/2003 | 08/01/2006 |
| Secret Code | 24Juli2026 | 24Juli2026 |

Diatur di [`src/config/couple.ts`](src/config/couple.ts). Cara kerjanya:
pilihan Adriel/Maria menentukan **email** akun Supabase, Secret Code dipakai
sebagai **password**-nya. Birthday hanya dicek di browser sebagai lapisan
personal — bukan pengaman.

`email` di file itu harus sama persis dengan email user di Supabase →
Authentication → Users, kalau tidak login akan ditolak.

## Setup Supabase

1. SQL Editor → jalankan [`supabase/schema.sql`](supabase/schema.sql) (aman
   dijalankan ulang). Membuat tabel `memories` + `reactions`, RLS, bucket
   privat `memories`, dan Realtime. Untuk database yang sudah terlanjur dibuat
   sebelum ada kolom sesi, jalankan juga
   [`supabase/002_session_id.sql`](supabase/002_session_id.sql).
2. Authentication → Sign In / Providers → Email → matikan **Allow new users to
   sign up**.
3. Authentication → Users → Add user, dua kali, dengan **Auto Confirm User**
   dicentang. Password keduanya `24Juli2026`.

## Alur & rute

| Rute            | Halaman                                                       |
| --------------- | ------------------------------------------------------------- |
| `/`             | Landing — pilih Adriel atau Maria                             |
| `/verify/:who`  | Birthday + secret code → Supabase Auth                        |
| `/connect`      | Waiting room — penekan Start Session jadi controller sesi     |
| `/templates`    | Hanya controller yang memilih; pilihannya tersiar ke pasangan |
| `/camera`       | Dua preview (WebRTC); hanya controller yang mulai capture     |
| `/countdown`    | Hitung mundur 3-2-1 per foto, jepret ke canvas                |
| `/preview`      | Frame jadi → caption, mood, Save (upload), Download           |
| `/gallery`      | Masonry + filter mood + pencarian                             |
| `/memory/:id`   | Detail + chat reactions realtime (`/memory/latest` juga jalan) |
| `/share`        | Pratinjau email                                               |

## Struktur

```
src/
  config/couple.ts       nama, tanggal lahir, email, secret code
  lib/supabase.ts        client Supabase
  lib/memories.ts        upload foto + baca/tulis tabel memories
  lib/reactions.ts       chat + langganan realtime
  lib/compose.ts         satu-satunya penggambar frame (hasil + pratinjau)
  lib/skins.ts           template bertema pink & aqua
  lib/types.ts           tipe Memory, Reaction, Template, Mood
  context/RoomContext    presence (sinkron langkah) + signaling WebRTC
  context/               SessionContext (auth) + CameraContext (stream)
  pages/                 satu file per halaman
  styles/theme.css       design token dari Figma
supabase/schema.sql      skema + RLS + bucket
```

## Cara data disimpan

Foto **tidak** disimpan sebagai base64 di database. Tiap sesi mengunggah
`frame.jpg` (hasil komposisi) dan `shot-N.jpg` (foto mentah) ke
`memories/<user-id>/<memory-id>/`, lalu tabel hanya menyimpan path-nya.
Karena bucket-nya privat, setiap URL tampilan dibuat lewat signed URL yang
berlaku 1 jam.

## Sesi berdua

Satu channel Realtime (`booth-room`) dipakai untuk tiga hal: menentukan peran,
menyiarkan state sesi, dan jadi jalur signaling WebRTC. Channel-nya di level
aplikasi (`RoomProvider` di `main.tsx`), bukan per halaman, supaya sinyal tidak
hilang saat berpindah halaman.

**Controller & participant.** Siapa pun yang menekan Start Session lebih dulu
menjadi controller. Seluruh state sesi — tahapan, frame, jumlah foto, dan id
capture — diambil dari presence controller, jadi participant tinggal mengikuti
tanpa menekan apa pun. Kalau keduanya menekan nyaris bersamaan, `CONTROL_TIEBREAK`
di `RoomContext.tsx` yang menentukan pemenangnya dan yang kalah mundur sendiri.

**Satu jepretan memuat berdua.** Tiap kali countdown selesai, perangkat
menggabungkan dua sumber sekaligus dalam satu gambar 1620×1080: kamera sendiri
(potret 3:4, dicermin) di kiri dan stream WebRTC pasangan di kanan. Jadi satu
frame polaroid berisi kalian berdua berdampingan, satu baris per jepretan.

Kalau video pasangan belum tersambung, separuh kanan terisi warna polos —
jepretan tetap jalan, hanya sisi pasangannya kosong.

**Satu hasil, bukan dua.** Saat controller menekan Start Capture, ia membuat
`captureId`. Kedua perangkat menyimpan barisnya sendiri dengan `session_id`
yang sama, sehingga Gallery menampilkannya sebagai satu memory dan halaman
detail memperlihatkan frame keduanya. Isi frame keduanya sama; yang berbeda
hanya sisi mana yang tajam (kamera lokal) dan mana yang dari stream video.

Video pasangan memakai koneksi peer-to-peer langsung dengan STUN publik Google.
Tanpa server TURN, sambungan bisa gagal di jaringan tertentu (kantor, kampus,
sebagian jaringan seluler). Kalau itu terjadi, panel status akan menampilkan
"Sambungan video gagal" — flow foto tetap jalan, hanya preview pasangan yang
kosong.

## Template

Sembilan pilihan, dikelompokkan per tema di halaman Choose your frame.

| Tema | Template |
| --- | --- |
| Pink | Sweet Strip, Bubble Pop, Love Note |
| Aqua Blue | Fresh Wave, Soda Pop, Ocean Tape |
| Klasik | Polaroid Classic, Film Strip, Retro Booth |

Enam template bertema memakai susunan **dua kolom** — dengan pilihan 4 foto
hasilnya grid 2×2, penuh sampai tepi kanvas tanpa margin putih. Definisinya
ada di [`src/lib/skins.ts`](src/lib/skins.ts): latar, bingkai slot, hiasan, dan
posisi teks masing-masing berdiri sendiri, jadi menambah template baru cukup
menambah satu objek di sana.

Frame digambar hanya di satu tempat ([`src/lib/compose.ts`](src/lib/compose.ts)).
Kartu pilihan template memanggil kode yang sama dengan slot dibiarkan kosong,
jadi pratinjaunya tidak mungkin berbeda dari hasil jadinya.

## Belum ada

- Pengiriman email asli (halaman `/share` masih pratinjau)
- Countdown berjalan lokal di tiap perangkat setelah aba-aba controller, jadi
  ada selisih beberapa ratus milidetik antara kedua jepretan
- Sisi pasangan diambil dari stream video, jadi resolusinya mengikuti kualitas
  sambungan — tidak setajam sisi kamera sendiri
