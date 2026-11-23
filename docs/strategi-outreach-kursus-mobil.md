# Strategi GTM, Cold Outreach, dan Panduan Validasi Pilot (AturSetir)

Dokumen kerja untuk eksekusi cold outreach dan uji coba (pilot) pertama menggunakan MVP saat ini.
Disusun 19 November 2026. Perbarui bagian batas MVP (bagian 1) setiap kali fitur berubah,
jangan sampai klaim demo meleset dari aplikasi.

---

## 1. Apa yang Sudah Bisa Dijual / Didemokan Hari Ini (Batas Jujur MVP)

Saat bicara dengan admin atau owner, fokuskan demo hanya pada **3 kekuatan utama yang sudah jalan di aplikasi**:

1. **Kartu Kontrol Kuota Otomatis (Menu Murid -> Lihat Detail):**
   - Begitu murid didaftarkan paket, sistem otomatis memisahkan: berapa sesi **Selesai**, berapa yang **Terjadwal belum selesai**, dan berapa **Sisa kuota yang belum dijadwalkan**.
   - Admin tidak perlu scroll grup WhatsApp atau menghitung ulang dari buku setiap kali murid bertanya sisa pertemuan.
2. **Anti-Bentrok Mobil & Instruktur (Menu Jadwal):**
   - Pilihan mobil dan instruktur otomatis mengikuti transmisi paket murid (`Matic` atau `Manual`).
   - Sistem menolak penyimpanan jika ada mobil, instruktur, atau murid yang tidak sengaja dijadwalkan di jam yang bertabrakan. Jika sesi dibatalkan, slot jam tersebut otomatis terbuka kembali.
3. **Deteksi Jadwal Menggantung (Menu Beranda):**
   - Panel **Perlu ditindaklanjuti** menampilkan sesi 30 hari terakhir yang jamnya sudah lewat tapi belum ditandai `Selesai`, `Dibatalkan`, atau `Tidak hadir` oleh admin.

**Hal yang JANGAN dijanjikan saat outreach (jadikan pertanyaan validasi):**

- Jangan klaim sistem punya pencatatan cicilan/DP pembayaran (saat ini baru mencatat harga kesepakatan paket).
- Jangan klaim aturan hangus otomatis; jelaskan bahwa saat ini `Dibatalkan` dan `Tidak hadir` mengembalikan kuota, lalu tanyakan aturan hangus di tempat mereka.
- Jangan janjikan akun/portal untuk murid atau instruktur; saat ini pengguna adalah owner dan staff, murid hanya data.
- Jangan janjikan ruang kerja mandiri instruktur di HP; laporan instruktur masih dicatat oleh staff.
- Jangan klaim "terintegrasi WhatsApp" atau notifikasi otomatis ke murid; semuanya masih manual.
- Semua jam memakai WITA (`Asia/Makassar`). Untuk usaha WIB, jujur bahwa dukungan zona waktu masih perlu disesuaikan sebelum jadwal nyata.

---

## 2. Kriteria Memilih Target Kursus (Sourcing via Google Maps & Instagram)

Target minggu pertama: **15 tempat kursus mengemudi**.

### Cara mencari

1. **Google Maps:** Cari `kursus mengemudi [nama kota]` atau `kursus stir mobil [nama kota]`.
   Buka foto lokasi dan ulasan terbaru (1–3 bulan terakhir). Catat nama kursus dan nomor WA.
2. **Instagram:** Cari nama kursus tersebut di IG. Lihat highlight/feed untuk brosur paket.
   Dari situ tahu istilah yang mereka pakai (misal "5x pertemuan" atau "paket 10 jam") supaya pesan tidak terasa spam massal.
3. **Facebook:** Skip. Fanpage kursus mobil lokal rata-rata sudah tidak aktif.

### Checklist Filter Target (pilih yang memenuhi minimal 3 poin)

- [ ] Dari foto Maps/IG terlihat punya **minimal 3–8 mobil latihan** (kalau hanya 1–2 mobil, jadwal masih hafal di luar kepala dan tidak butuh aplikasi).
- [ ] Menjual **paket multi-pertemuan** (misal paket 5x, 8x, 10x pertemuan) yang jadwalnya sering digeser oleh murid.
- [ ] Memiliki ulasan Google Maps baru dalam **1–3 bulan terakhir** (tanda usaha aktif beroperasi).
- [ ] Punya kantor/tempat pendaftaran fisik yang jelas (mudah didatangi jika satu kota).
- [ ] Kelihatan punya admin/staff khusus yang urus pendaftaran/jadwal (bukan owner nyetir sendiri semua).

---

## 3. Persiapan Sebelum Kirim Pesan (Aset 60 Detik)

Jangan kirim link login di chat pertama. Siapkan **1 video rekaman layar (45–60 detik)** yang memperlihatkan:

1. Layar **Detail Murid** (paket 6x pertemuan, sisa kuota jelas, riwayat tanggal latihan).
2. Layar **Jadwal Mingguan** (klik `Ubah` pada satu jadwal latihan -> ganti status dari `Terkonfirmasi` menjadi `Selesai` -> simpan).
3. Layar **Beranda** (angka jadwal hari ini dan sesi lewat yang perlu ditindaklanjuti).

Pakai nama murid/paket yang masuk akal, bukan "Test 1". Pastikan demo tidak memperlihatkan data sekolah lain.

---

## 4. Copywriting & Skrip Outreach

### A. Chat Pertama WhatsApp (untuk nomor CS/Admin dari Google Maps/IG)

Tujuan: merangkul admin agar tidak merasa terancam dan memancing balasan singkat.

> Selamat siang Kak, saya lihat di Maps/IG **[Nama Kursus]** ada paket latihan beberapa kali pertemuan (Matic/Manual).
>
> Boleh tanya sebentar ke bagian yang atur jadwal: kalau ada murid paket yang batal atau minta geser jadwal berkali-kali, selama ini rekap sisa pertemuannya masih dicatat manual di buku/WA atau sudah pakai aplikasi khusus?
>
> Kebetulan saya buat alat bantu gratis khusus kursus mobil supaya jadwal mobil/instruktur nggak pernah bentrok dan sisa pertemuan murid otomatis terhitung. Kalau berkenan, boleh saya kirim video contoh tampilannya (45 detik) lewat WA ini?

### B. Balasan Kedua WhatsApp (setelah admin/owner merespons)

Tujuan: mengirim video 45 detik + memancing diskusi aturan pembatalan.

> Terima kasih responnya Kak/Pak. Ini video singkat tampilannya (45 detik).
>
> Jadi begitu murid ambil paket, admin nggak perlu hitung manual lagi. Kalau jadwalnya diklik **Selesai** atau **Dibatalkan**, sisa jatah pertemuan murid langsung terhitung otomatis dan mobilnya nggak bisa dobel jadwal di jam yang sama.
>
> Saya mau tanya 1 hal supaya pas dengan aturan di **[Nama Kursus]**: kalau di sana ada murid batal mendadak di hari-H atau tidak datang, itu aturannya jatah pertemuannya **hangus** atau **masih boleh dijadwalkan ulang** di hari lain?

### C. Skrip Walk-In / Datang Langsung (untuk kursus di kota yang sama)

Waktu terbaik: Selasa–Kamis pukul 10.00–14.00 (hindari akhir pekan karena admin sibuk melayani latihan).

> "Selamat siang Kak/Pak, maaf mengganggu sebentar. Saya bukan mau daftar kursus—saya developer lokal yang sedang buat aplikasi jadwal khusus untuk kursus mengemudi.
>
> Biasanya kalau murid ambil paket 5–10 kali pertemuan dan sering minta ganti hari, admin suka repot mencocokkan jadwal mobil yang kosong dan menghitung ulang sisa pertemuan murid. Saya sudah buat aplikasinya—gratis, murid tidak perlu install apa-apa, murni untuk pegangan admin dan owner.
>
> Boleh minta waktu 3 menit untuk saya tunjukkan di layar HP/laptop, sekalian saya mau tanya apakah hitungan sisa sesinya sudah cocok dengan aturan di sini?"

### D. Follow-Up Singkat (jika chat pertama dibaca tapi belum dibalas 3 hari)

> Selamat siang Kak, menyambung pesan saya sebelumnya soal alat bantu rekap jadwal & sisa pertemuan murid untuk **[Nama Kursus]**. Kalau minggu ini admin sedang padat, boleh saya titip video singkatnya (45 detik) di sini untuk diteruskan ke owner/pengelola jadwal saat senggang? Terima kasih sebelumnya Kak.

---

## 5. Checklist Pertanyaan Saat Ngobrol dengan Owner / Staff

Jangan tanya *"Menurut Bapak aplikasinya bagus tidak?"*. Tanyakan 5 pertanyaan operasional ini dan catat jawabannya:

- [ ] **1. Cara kerja sekarang:**
  *"Sekarang kalau murid WA minta jadwal hari Kamis jam 10 pagi pakai mobil Matic, urutan yang dicek admin itu buka buku apa dulu?"*
- [ ] **2. Masalah sisa sesi (validasi pain point):**
  *"Pernah nggak kejadian murid merasa jatah latihannya masih sisa 2 kali, tapi di catatan kursus sudah habis? Biasanya kalau begitu ngecek buktinya di mana?"*
- [ ] **3. Aturan batal & hangus (validasi logika kuota MVP):**
  *"Kalau murid batal mendadak atau tidak hadir, di sistem saya sekarang kuotanya otomatis balik lagi. Kalau aturan di tempat Bapak/Ibu, apakah perlu ada pilihan 'Hangus' yang tetap memotong jatah pertemuan?"*
- [ ] **4. Siapa yang menutup sesi (validasi butuh akun instruktur atau tidak):**
  *"Untuk tahu latihan hari ini sudah selesai atau muridnya tidak datang, itu admin sudah langsung tahu di kantor atau harus tunggu laporan instruktur sore hari?"*
- [ ] **5. Hambatan pembayaran (validasi butuh catatan DP atau tidak):**
  *"Sebelum admin menjadwalkan pertemuan berikutnya, apakah admin wajib ngecek murid ini sudah lunas atau baru bayar DP? Kalau iya, selama ini tandanya di mana?"*

Tambahan sesuai jenis jawaban:

- Kalau jawaban #1 "masih buku/chat": minta lihat contoh catatan terakhir (atau foto samarkan). Itu baseline untuk mengukur manfaat pilot.
- Kalau jawaban #2 "sering kejadian": tanya frekuensinya per bulan; ini amunisi positioning "sisa sesi jelas, nggak perlu hitung ulang".
- Kalau jawaban #3 "harus hangus": itu keputusan perubahan kontrak BE/FE setelah pilot; catat dulu, jangan janji tanggal.
- Kalau jawaban #4 "tunggu laporan instruktur": catat sebagai kandidat alasan untuk role instruktur nanti, bukan pekerjaan sekarang.
- Kalau jawaban #5 "wajib cek DP": catat sebagai kandidat fitur pencatatan pembayaran manual; jangan bangun sebelum pilot menyatakan butuh.

---

## 6. Cara Menawarkan Uji Coba (Closing ke Pilot 2 Minggu)

Jika mereka bilang *"Iya, kami sering repot di situ"*, jangan minta mereka langsung mengganti seluruh buku mereka. Tawarkan pilot kecil berisiko nol:

> "Kalau Bapak/Ibu berkenan, kita coba untuk **5–10 murid baru saja selama 2 minggu ke depan**, gratis tanpa biaya apa-apa. Data paket, nama mobil, dan nama instrukturnya saya yang bantu masukkan semua hari ini, jadi admin tinggal pakai saja.
>
> Selama 2 minggu itu buku lama tetap dipakai seperti biasa nggak apa-apa. Kita lihat saja apakah admin jadi lebih cepat ngecek sisa pertemuan murid. Kalau dalam 2 minggu dirasa malah bikin ribet, boleh langsung berhenti kapan saja."

Syarat mulai pilot (dari dokumen riset, bagian 8):

- [ ] Model paket mereka cocok: pertemuan tetap dengan durasi tetap, satu transmisi per paket. Kalau mereka pakai saldo jam atau paket campuran manual/matic, jangan terima jadwal nyata sebelum keputusan scope baru.
- [ ] Sepakati siapa yang menutup sesi (staff mencatat laporan instruktur via WA diperbolehkan untuk pilot pertama).
- [ ] Sepakati pembayaran tetap dicatat terpisah (buku/kwitansi) selama pilot.
- [ ] Satu zona waktu (WITA) atau keputusan dukungan zona waktu sudah dibuat sebelum jadwal nyata masuk.
- [ ] Baseline sebelum mulai: catat cara kerja lama mereka (foto buku/catatan) supaya evaluasi 2 minggu ada pembanding.

---

## 7. Tabel Pelacakan Outreach (Target 15 Kursus)

| No | Nama Kursus | Kota / Area | Kanal (WA / Walk-in) | Tanggal Kontak | Status Balasan | Aturan Batal (Hangus / Geser?) | Catatan Hambatan Utama |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |
| 11 | | | | | | | |
| 12 | | | | | | | |
| 13 | | | | | | | |
| 14 | | | | | | | |
| 15 | | | | | | | |

Aturan main: jangan ubah kode lagi sampai minimal 3 usaha membalas dan memberi jawaban
tentang cara mereka menangani murid batal/geser jadwal. Balasan itu yang menentukan
apakah aturan kuota `Tidak hadir` perlu diubah atau cukup seperti sekarang.
