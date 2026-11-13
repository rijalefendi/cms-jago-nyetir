# Riset produk dan status MVP pengelolaan kursus mobil

Tanggal rangkuman dan inspeksi kode: 10 November 2026.

Dokumen ini merangkum riset sesi sebelumnya, usulan positioning, copywriting,
dan status implementasi frontend di workspace saat ini. Ini bukan spesifikasi
fitur yang seluruhnya sudah disetujui untuk dibangun.

## 1. Arah produk dan batas penilaian

- Produk: aplikasi operasional multi-tenant untuk usaha kursus mobil.
- Pengguna: owner, staff, dan instruktur. Murid adalah data yang dikelola,
  bukan pengguna yang harus membuat akun.
- Tenant: satu usaha. Role adalah kewenangan seseorang di dalam usaha tersebut.
  Multi-tenant tidak otomatis berarti satu akun mengelola banyak cabang/usaha.
- Tujuan pengembang saat ini: belajar backend Go melalui masalah operasional
  nyata, dengan pilot kecil; bukan langsung mengejar pertumbuhan SaaS besar.
- Penawaran awal: ingin menyediakan fitur standar gratis. Batas fitur gratis,
  biaya layanan, dan waktu peluncuran paket berbayar belum diputuskan.
- Nama produk belum final. AturSetir, BeresSetir, dan UrusSetir masih kandidat;
  ketersediaan domain dan merek belum diperiksa.

**Alur inti yang disarankan:**

Staff mencatat murid dan paket → mengatur jadwal murid, instruktur, dan mobil →
instruktur mencatat pelaksanaan sesi → owner/staff melihat progres dan
pekerjaan yang belum beres.

**Cara membaca status implementasi:**

- **Ada di kode:** ada form, tampilan, atau handler untuk kemampuan tersebut.
  Tidak berarti perilakunya sudah diverifikasi lewat browser pada inspeksi ini.
- **Parsial:** sebagian alur ada, tetapi ada kebutuhan frontend yang belum ada.
- **Belum ada:** tidak ditemukan alur/frontend terkait di berkas yang diperiksa.
- Demo lokal dan frontend live dinilai terpisah; menu atau fixture bukan bukti
  fitur operasional lengkap.
- Sesuai permintaan, integrasi BE yang belum selesai **tidak dihitung sebagai
  kekurangan fitur**. API, database, otorisasi server, dan kesiapan produksi
  tidak diaudit. Status di bawah berasal dari kode frontend, bukan audit BE.

## 2. Main concern: pilih satu alur yang tuntas

Jangan menyalin seluruh fitur produk matang menjadi MVP. Jadwal, hak sesi, dan
catatan pelaksanaan yang dapat dipercaya lebih penting daripada menambah
marketplace, materi teori, dashboard penuh grafik, atau AI.

Hipotesis positioning yang disarankan:

> Alat bantu operasional kursus mobil: jadwal lebih rapi, sisa sesi lebih jelas,
> dan owner, staff, serta instruktur memakai catatan yang sama.

Ini arah yang perlu diuji dengan usaha sasaran, bukan hasil validasi pasar.

## 3. Kompetitor dan pembanding

Sumber berikut berasal dari halaman produk/fitur/harga vendor dan satu studi
kasus lokal. Deskripsi pemasaran bukan bukti jumlah pelanggan, kualitas
implementasi, atau keberhasilan penjualan. Model harga bisa berubah; dokumen
ini mencatat pola penawaran, bukan daftar harga untuk keputusan pembelian.

### Indonesia

| Pembanding | Yang terlihat dari sumber publik | Pelajaran dan keterbatasan |
| --- | --- | --- |
| **DriverBridge** [S1] | Profil siswa, progres teori/praktik, validasi instruktur, komentar sesi, pelaporan, dan role admin/instruktur/siswa. Pesannya menekankan perpindahan dari formulir kertas ke pencatatan digital terpusat. | Catatan sesi dan progres layak diperhatikan. Belum cukup bukti untuk memastikan harga, adopsi, atau penawaran SaaS multi-tenant komersial aktif. |
| **Talenta Jaya, studi kasus sistem** [S2] | Membahas pendaftaran/pembayaran yang terpisah antar-cabang, jadwal belum terpusat, serta progres belajar belum terstruktur. | Contoh kebutuhan lokal, **bukan vendor SaaS pembanding** dan bukan bukti bahwa seluruh pasar mengalami masalah yang sama. |

Riset ini belum menemukan cukup informasi publik untuk memetakan beberapa SaaS
Indonesia khusus kursus mobil beserta harga dan adopsinya. Itu keterbatasan
riset, bukan bukti tidak ada kompetitor.

### Luar negeri

| Produk | Fitur dan contoh copy asli | Strategi penawaran yang terlihat |
| --- | --- | --- |
| **Drive Scout** [S3, S4] | Jadwal, siswa, kendaraan, staff, dan pembayaran. “Everything you need in one place. Goodbye admin overload.” | Demo langsung, konten operasional/newsletter, serta harga berbasis pengguna dengan minimum pengguna dan biaya setup. Menjual pengurangan beban administrasi. |
| **Total Drive** [S5–S7] | Kalender, data murid, progres, pengingat, dan pengelolaan multi-instruktur. “Start managing your work-life balance.” | Trial, bantuan setup/migrasi, dan penawaran khusus calon instruktur. Pesan dekat dengan keseharian instruktur. |
| **Teachworks** [S8–S10] | Jadwal, billing, izin pengguna, paket, dan pengelolaan kendaraan. “Save Time”, “Reduce No-Shows”, “Reduce Headaches”. | Halaman khusus driving school, trial, serta biaya dasar ditambah penggunaan student-lesson. Menghubungkan fitur dengan masalah operasional. |
| **Zutobi Instructor** [S11] | Operasional sekolah dan kurikulum video. “Run the school without the paperwork.” | Demo/trial, impor data, pelatihan staff, dan bundling operasional dengan materi mengajar. |
| **SimplyBook.me** [S12, S13] | Booking, paket, pembayaran, dan pengingat. “Maximise your schedule and simplify your business”. | Pendaftaran mandiri, paket gratis terbatas, dan upgrade menurut kapasitas/fitur. Mendukung booking manual serta menonaktifkan booking publik. |

### Kesimpulan strategi dan copywriting kompetitor

1. **Jual hasil, bukan istilah teknis.** Tema yang muncul: waktu admin,
   keteraturan jadwal, pengingat, dan pencatatan yang tidak tercecer.
   “Multi-tenant” dan “dibangun dengan Go” bukan pesan utama untuk owner.
2. **Bantu perpindahan cara kerja.** Total Drive dan Zutobi memasukkan
   impor data/setup ke penawaran. Untuk pilot, pendampingan manual lebih
   masuk akal daripada langsung membuat importer Excel serbaguna.
3. **Gratis perlu batas yang jelas.** SimplyBook.me memakai batas
   kapasitas/fitur; Total Drive punya penawaran khusus calon instruktur.
   Gratis sendiri bukan pembeda.
4. **WhatsApp bukan pembeda otomatis.** SimplyBook.me sudah menawarkan
   notifikasi WhatsApp. Kecocokan alur penggunaan lebih penting daripada
   sekadar menambahkan integrasi.
5. **Internal-only adalah pilihan fokus, bukan klaim keunikan.**
   Pembanding juga dapat melayani booking manual tanpa booking publik.

## 4. Prioritas MVP dan mana yang sudah ada di repo

### Ringkasan enam prioritas

| Prioritas MVP | Implementasi demo/lokal | Implementasi frontend live | Kesimpulan tanpa menilai integrasi BE |
| --- | --- | --- | --- |
| **1. Akun, konteks usaha, dan role owner/staff/instruktur** | Data contoh dipisah per sekolah di browser; demo tidak memiliki login/otorisasi. | Form login/daftar, verifikasi email, restore session, logout, bootstrap sekolah, serta profil/setup sekolah ada. Pengaturan membedakan owner/staff. | **Parsial.** Role instruktur, ruang kerja per role, undangan dan pengelolaan staff belum ada. Pembatasan menu/tindakan operasional tiga role belum lengkap. |
| **2. Murid, paket, pendaftaran paket, dan hak sesi** | Tambah/cari/detail murid, paket CRUD, jumlah sesi, progres `done/total`, dan riwayat jadwal ada. Paket demo memiliki harga, diskon bertanggal, deskripsi, dan status. | Tambah/ubah murid dan paket, tambahkan paket ke murid, serta ringkasan sesi selesai per enrollment ada. | **Dasar sudah ada; parsial untuk siklus hak sesi.** Belum ada riwayat koreksi hak sesi. Detail harga/diskon/deskripsi paket belum setara antara demo dan UI live; ini perbedaan frontend, bukan penilaian BE. |
| **3. Instruktur dan mobil beserta ketersediaan** | CRUD, pencarian/sort/paginasi, transmisi/kompetensi, aktif/nonaktif, dan perlindungan perubahan resource yang masih dipakai ada. | Form dan tabel instruktur/mobil memakai komponen resource bersama. Nama, transmisi/kompetensi, serta aktif/nonaktif tersedia. | **Dasar sudah ada.** Belum ada pengelolaan ketidaksediaan berbasis rentang waktu, misalnya cuti atau mobil servis. Aktif/nonaktif belum sama dengan kalender ketersediaan. |
| **4. Jadwal, ubah waktu, pembatalan, dan pemeriksaan bentrok** | Kalender hari/minggu/daftar, filter status, tambah/ubah waktu, konfirmasi, selesai, batal, serta pemeriksaan bentrok murid/instruktur/mobil ada. Ada pemeriksaan transmisi dan resource aktif. | Daftar dan form sesi dengan murid/enrollment, tanggal, jam, instruktur, mobil, transmisi, dan status ada. | **Alur dasar sudah ada; pengalaman live masih parsial.** Kalender visual live belum setara demo. Pemeriksaan bentrok lokal ada di demo; jaminan konflik/transaksi server sengaja tidak dinilai. |
| **5. Ruang kerja instruktur di HP dan pencatatan hasil sesi** | Admin dapat melihat penugasan resource dan menandai sesi selesai. Ada CSS responsif umum. | Belum ditemukan ruang kerja yang mengidentifikasi instruktur login, menampilkan hanya tugasnya, dan mencatat hasil latihan. | **Belum ada sebagai alur instruktur.** CRUD data instruktur tidak sama dengan akun instruktur. Catatan profil instruktur tidak sama dengan catatan hasil setiap sesi. |
| **6. Ringkasan owner/staff dan tindak lanjut** | Ringkasan, agenda hari ini, permintaan belum direspons, sesi menunggu konfirmasi, serta laporan hitungan sederhana ada. | Navigasi operasional berisi Murid, Paket, Instruktur, Mobil, dan Jadwal; belum ada Ringkasan/Laporan setara demo. | **Parsial.** Dasar action dashboard sudah ada di demo. Antrean sesi lewat belum dilaporkan dan murid bersisa sesi tanpa jadwal berikutnya belum ada. |

**Kesimpulan:** fondasi administrasi dan penjadwalan sudah banyak tersedia.
Gap frontend terbesar bukan kurangnya CRUD baru, melainkan alur instruktur,
pengelolaan akses tim, konsistensi riwayat sesi, dan ringkasan tindak lanjut.
Tidak ada angka persentase “MVP selesai” karena bobot dan penerimaan tiap alur
belum disepakati.

### Bukti kode yang mendasari penilaian

Referensi memakai lokasi saat inspeksi; nomor baris dapat bergeser.

- **Auth dan konteks usaha:** `src/auth-ui.tsx:10` dan
  `src/auth-ui.tsx:136`; penyimpanan profil membedakan owner/staff di
  `src/auth-ui.tsx:204`. Tipe role baru `owner | staff` di `src/auth.ts:8`.
  `LiveApp` menerima profil sekolah, tetapi belum memilih menu operasional
  berdasarkan role (`src/live.tsx:14`).
- **Demo versus live:** pemilihan jalur dan halaman di `src/main.tsx:55`;
  penyimpanan demo per sekolah di `src/demoStore.mjs:6`.
  Pemisahan key localStorage bukan bukti keamanan tenant.
- **Murid, paket, progres:** demo di `src/legacy.js:64` dan
  `src/legacy.js:94`; CRUD paket aktual memakai `packageConfig` di
  `src/resource.tsx:34`, dirender melalui `src/main.tsx:62`.
  Jangan menilai paket hanya dari fungsi katalog legacy yang tidak dipakai
  pada jalur tersebut. Enrollment/ringkasan live ada di `src/live.tsx:66`
  dan `src/live.tsx:72`.
- **Instruktur/mobil:** `src/resource.tsx:77` dan `src/resource.tsx:115`;
  pemakaian komponen live serta form sesi di `src/live.tsx:99`.
- **Jadwal:** kalender demo di `src/legacy.js:68`, form di
  `src/legacy.js:86`, detail/aksi status di `src/legacy.js:95`,
  pemeriksaan bentrok di `src/legacy.js:100`, dan simpan jadwal di
  `src/legacy.js:163`. Simpan sesi live berada di `src/live.tsx:49`.
- **Hak sesi belum berupa ledger:** demo menambah counter `student.done`
  saat status diubah menjadi selesai (`src/legacy.js:115`); UI live
  menghitung sesi berstatus selesai per enrollment (`src/live.tsx:72`).
  Jangan menganggap kedua model ini sudah menjamin koreksi/penutupan
  berulang yang konsisten. Perilakunya belum diuji ulang dalam inspeksi ini.
- **Ringkasan:** `src/legacy.js:54`; laporan sederhana di
  `src/legacy.js:74`. Menu live di `src/live.tsx:11`.
- **Responsif umum:** media queries di `src/style.css:263–267`;
  keberadaan CSS tidak membuktikan alur khusus instruktur nyaman di HP.

### Tambahan yang sudah ada, tetapi bukan alasan memperlebar MVP

- Permintaan calon murid: input manual, status tindak lanjut, dan konversi
  menjadi murid (`src/legacy.js:84`, `src/legacy.js:93`,
  `src/legacy.js:143`).
- Tombol membuka WhatsApp calon murid sudah ada
  (`src/legacy.js:142`), tetapi belum merupakan pembagian ringkasan
  jadwal atau pengingat otomatis.
- Detail/riwayat jadwal murid tersedia pada demo. Belum sama dengan riwayat
  perubahan yang mencatat siapa mengubah data dan alasannya.

### Pembayaran dan fitur yang ditunda

**P1 yang layak divalidasi setelah alur inti:**

- Pencatatan manual nilai paket, DP/pembayaran masuk, dan sisa tagihan.
- Ringkasan jadwal yang mudah disalin/dibagikan.
- Impor data atau laporan tambahan jika pekerjaan manual berulang benar-benar
  menjadi masalah pilot.

Harga paket yang sudah ada **bukan** pencatatan transaksi pembayaran. Batas
produk saat ini menempatkan pembayaran di luar dashboard
(`design.md:100`); menambahnya perlu keputusan scope baru, bukan dianggap
pekerjaan implementasi yang sudah disepakati.

**Tunda:** akun/portal siswa, booking publik, payment gateway, akuntansi penuh,
payroll otomatis, LMS/ujian teori, GPS, marketplace, AI penjadwalan, dan otomasi
membaca chat WhatsApp.

## 5. Ide pembeda yang perlu diuji

Pembeda berikut adalah usulan pengalaman/positioning, bukan klaim fitur
eksklusif atau keunggulan yang sudah terbukti.

| Hipotesis | Bentuk produk minimum | Status di repo |
| --- | --- | --- |
| **“Siswa nggak perlu ikut ribet.”** | Operasional ditangani owner/staff/instruktur; siswa tidak wajib membuat akun. Komunikasi tetap melalui cara yang disepakati usaha. | Model internal-only sudah searah. Pembagian ringkasan jadwal belum ada; tombol WhatsApp lead saja belum memenuhi ini. |
| **“Yang belum beres langsung kelihatan.”** | Daftar pekerjaan: menunggu konfirmasi, sesi lewat belum dilaporkan, serta murid bersisa hak sesi yang belum punya jadwal berikutnya. | Parsial: ringkasan demo punya permintaan dan konfirmasi. Dua antrean terakhir belum ada; ringkasan live juga belum ada. |
| **“Sisa sesi jelas, nggak perlu hitung ulang.”** | Paket awal, sesi selesai/berikutnya, pembatalan, dan koreksi bisa ditelusuri dari catatan yang sama. | Parsial: progres dan riwayat jadwal dasar ada; riwayat koreksi, kebijakan pembatalan/no-show, dan penutupan sesi berulang belum menjadi alur lengkap. |

Pilihan fokus yang disarankan: keteraturan jadwal dan kejelasan hak sesi.
Jangan membangun ketiganya sebagai proyek terpisah.

## 6. Copywriting yang bisa dipakai sebagai draft

Gunakan hanya klaim yang sudah didukung produk. Contoh berikut bukan copy
yang sudah dipasang di aplikasi.

### Halaman pengenalan

**Label pembuka**

> Untuk pengelola usaha kursus mobil

**Headline**

> Jadwal rapi. Sisa sesi jelas. Ngurus kursus nggak kusut.

**Penjelasan**

> Atur jadwal murid, instruktur, dan mobil dalam satu tempat. Staff lebih
> mudah mengatur, instruktur tahu tugasnya, owner bisa memantau.

Bagian instruktur jangan dijanjikan sebagai ruang kerja mandiri sebelum alur
tersebut tersedia.

**Tombol**

> Lihat demo
>
> Ngobrol dulu

**Pesan fitur**

- “Siapa mengajar siapa, pakai mobil apa? Langsung kelihatan.”
- “Sisa sesi murid nggak perlu dihitung ulang.”
- “Ada perubahan jadwal? Catatannya ikut berubah.”
- “Instruktur cukup buka jadwal dan isi hasil latihan.”
  Gunakan kalimat terakhir setelah ruang kerja instruktur tersedia.

**Pesan versi awal, jika statusnya masih demikian**

> Versi awal. Saat ini belum ada biaya berlangganan.
> Hubungi kami untuk mencoba dan mendapatkan bantuan setup.

Ini tidak menetapkan bahwa fitur standar akan berbayar. Jika memilih
freemium permanen, jelaskan fitur gratisnya secara konkret sebelum menjanjikan
“gratis selamanya” atau “tanpa batas”.

### Pesan pendek untuk menawarkan demo

> Saya sedang mengembangkan aplikasi untuk membantu pengelola kursus mobil
> mengatur jadwal dan catatan sesi. Saya mencari beberapa usaha yang bersedia
> mencoba dan memberi masukan. Boleh saya tunjukkan demo singkat dan melihat
> apakah cocok dengan cara kerja di tempat Bapak/Ibu?

### Klaim yang perlu dihindari

- “Hemat 80% waktu admin” tanpa pengukuran.
- “Pasti menaikkan omzet” tanpa bukti.
- “Bebas bentrok” sebelum perilaku konflik benar-benar diuji.
- “Semua administrasi beres” saat pembayaran dan kebutuhan penting lain
  masih di luar produk.
- “Terintegrasi WhatsApp” untuk tombol yang hanya membuka percakapan.

### Bentuk website

Landing page membantu pengenalan produk, tetapi bukan syarat multi-tenant.
Tidak perlu website/repository frontend kedua. Contoh struktur yang
**diusulkan, bukan route yang sudah diimplementasikan**:

```text
atursetir.com          → pengenalan produk
atursetir.com/login    → login
atursetir.com/app      → area operasional setelah login
```

Frontend saat ini memilih demo atau auth/workspace dari konfigurasi
(`src/main.tsx:75`); halaman pemasaran publik terpisah belum ditemukan.

## 7. Strategi pilot, gratis, dan pembelajaran backend

### Akuisisi awal yang disarankan

1. Wawancarai sekitar lima usaha. Minta contoh proses terakhir mengubah jadwal,
   menghitung sisa sesi, atau mengecek pelaksanaan latihan.
2. Pilih dua–tiga usaha yang bersedia melibatkan staff/instruktur, bukan
   hanya owner yang menyukai demo.
3. Demonstrasikan satu alur nyata: murid → paket → jadwal → perubahan
   jadwal → sesi selesai → progres.
4. Bantu memasukkan data awal secara manual dan amati penggunaan harian.
5. Setelah beberapa minggu, evaluasi apakah aplikasi benar-benar dipakai
   untuk kerja dan mengurangi pertanyaan/pencatatan ulang.

Jumlah usaha dan periode tersebut adalah usulan skala pilot, bukan angka
hasil riset pasar.

**Indikator manfaat awal:**

- Staff menggunakan aplikasi untuk mengatur jadwal aktual.
- Instruktur dapat mengakses dan menutup sesi yang menjadi tugasnya.
- Owner/staff bisa menjawab pertanyaan jadwal dan progres dari aplikasi.
- Pengguna dapat menjelaskan manfaat tanpa diarahkan oleh pengembang.

### Hal yang perlu ditanyakan, bukan ditebak

- Paket dijual per pertemuan atau jumlah jam?
- Kapan hak sesi terpakai: terjadwal, selesai, atau kondisi lain?
- Bagaimana aturan reschedule, pembatalan, dan tidak hadir?
- Siapa boleh mengoreksi sesi yang sudah selesai?
- Apakah pencatatan DP/tagihan wajib agar mereka mau menggunakan produk?
- Apakah pilot berada dalam satu zona waktu? Referensi live saat ini
  menggunakan WITA (`design.md:98`); jangan otomatis memperluas ke seluruh
  Indonesia tanpa meninjau batas ini.

### Gratis dan kemungkinan berbayar

Jangan membangun billing atau banyak tier sebelum nilai operasional terbukti.
Pisahkan keputusan “fitur standar gratis” dari janji dukungan, kapasitas,
atau biaya integrasi tanpa batas.

Jika kelak ada fitur berbayar, validasi kebutuhan seperti pengelolaan banyak
cabang, otomasi berbiaya, atau laporan lanjutan. Ini kandidat, bukan roadmap
yang telah disepakati. Jangan menjadikan keamanan antar-tenant sebagai
pembeda paket premium.

### Bahan belajar Go dari masalah nyata

- Dua staff memilih slot sama: konsistensi penjadwalan dan konkurensi.
- Aksi selesai terkirim dua kali: idempotensi dan aturan hak sesi.
- Pengguna membuka data usaha lain: otorisasi dan pengujian akses negatif.
- Proses gagal di tengah perubahan: transaksi dan penanganan kegagalan.
- Owner perlu menelusuri perubahan: riwayat/audit yang relevan.

Dokumentasi transaksi database Go [S14] adalah salah satu referensi teknis,
bukan keputusan untuk menambah arsitektur tertentu. Microservices, event bus,
atau antrean pekerjaan tidak otomatis diperlukan agar pembelajarannya
“advanced”.

## 8. Urutan tindak lanjut frontend yang disarankan

Ini rekomendasi produk, bukan instruksi untuk membangun semuanya sekaligus.

1. Validasi aturan sesi/paket dan kebutuhan akses tiga role bersama calon
   pengguna.
2. Lengkapi alur instruktur: akses tugas sendiri, detail sesi, catatan hasil,
   dan penutupan sesi; serta akses tim yang memungkinkan alur tersebut.
3. Perjelas progres dan riwayat/koreksi sesi agar perhitungan tidak menjadi
   sumber perdebatan.
4. Lengkapi ringkasan tindak lanjut dan pengalaman jadwal di frontend live,
   dengan memakai pola demo yang sudah ada daripada redesign baru.
5. Buat halaman pengenalan sederhana ketika siap mengajak peserta pilot.
6. Tinjau pencatatan pembayaran manual jika pilot membuktikannya perlu.

Prioritasnya menutup alur yang terputus, bukan menambah jumlah menu.

## 9. Sumber dan batas verifikasi

### Referensi riset

- **[S1] DriverBridge:** https://driverbridge.minori.co.id/
- **[S2] Studi kasus Talenta Jaya:** https://jicnusantara.com/index.php/jicn/article/view/8150
- **[S3] Drive Scout, produk:** https://drivescout.com/
- **[S4] Drive Scout, harga:** https://drivescout.com/pricing/
- **[S5] Total Drive, produk:** https://totaldrive.co.uk/
- **[S6] Total Drive, sekolah/migrasi:** https://totaldrive.co.uk/driving-school-software/
- **[S7] Total Drive, calon instruktur:** https://totaldrive.co.uk/become-driving-instructor/
- **[S8] Teachworks, driving school:** https://www.teachworks.com/driving-school-management-software
- **[S9] Teachworks, kendaraan:** https://www.teachworks.com/addons/vehicle-manager
- **[S10] Teachworks, harga:** https://www.teachworks.com/pricing
- **[S11] Zutobi, driving school:** https://zutobi.com/us/driving-schools
- **[S12] SimplyBook.me, driving school:** https://simplybook.me/en/driving-lessons-scheduling-software
- **[S13] SimplyBook.me, harga:** https://simplybook.me/en/pricing
- **[S14] Go, transaksi database:** https://go.dev/doc/database/execute-transactions

### Batas inspeksi repo

- Dasar penilaian: entrypoint frontend, auth/workspace, demo store,
  resource CRUD, halaman/handler legacy, UI live, CSS terkait, serta
  pembacaan bagian tes/dokumentasi yang relevan.
- Tidak menjalankan browser, aplikasi kompetitor, tes aplikasi, atau build
  untuk perubahan dokumentasi ini.
- Tidak mengecek integrasi BE, keamanan tenant di server, pengiriman email,
  transaksi/konkurensi database, atau kesiapan produksi.
- Tidak melakukan wawancara pengguna, verifikasi domain/merek, atau
  pembaruan riset harga pada langkah perangkuman ini.
- Status hanya menggambarkan kode workspace pada tanggal inspeksi,
  termasuk perubahan lokal yang sudah ada; bukan penilaian rilis/deployment.
