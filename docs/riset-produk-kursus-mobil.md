# Riset produk dan status MVP pengelolaan kursus mobil

Rangkuman awal: 10 November 2026. Pembaruan riset publik dan inspeksi
frontend terarah: **19 November 2026**.

Dokumen ini merangkum riset sesi sebelumnya, usulan positioning, copywriting,
dan status implementasi frontend di workspace saat ini. Ini bukan spesifikasi
fitur yang seluruhnya sudah disetujui untuk dibangun.

**Keputusan yang disarankan sekarang:** cukupkan scope untuk pilot operasional
yang dikelola owner/staff, tetapi tuntaskan perubahan status sesi yang sudah
ada dan sepakati aturan kuota sebelum memakai data nyata. Akun instruktur
menjadi wajib bila pilot menuntut pelaporan mandiri. Pembaruan ini tidak
mengimplementasikan fitur atau menyatakan aplikasi siap produksi.

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
- Antarmuka saat ini memakai AturSetir. Ketersediaan domain/merek dan
  keputusan merek final belum diverifikasi dalam riset ini.

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
| **DriverBridge** [S1] | Memperkenalkan diri sebagai sistem manajemen sekolah mengemudi yang menggantikan formulir kertas. Mencakup profil dan progres siswa, validasi dan komentar instruktur, serta laporan admin; siswa juga memiliki akses baca. | Pembanding khusus kursus mengemudi, tetapi bukan internal-only. Belum cukup bukti untuk memastikan harga, adopsi, atau penawaran SaaS multi-tenant komersial aktif. |
| **Bukujanji** [S15] | Memasarkan sistem booking dan manajemen kelas untuk lembaga kursus dan learning center di Indonesia, dengan jadwal, peserta, kehadiran, dan pembayaran. Pesannya menjelaskan pekerjaan pengelola secara langsung. | **Pembanding tidak langsung**, bukan produk khusus kursus mobil. Halaman yang diperiksa tidak menunjukkan penjadwalan mobil dan instruktur; deskripsi fitur adalah klaim vendor, belum diuji. |
| **Talenta Jaya, studi kasus sistem** [S2] | Membahas pendaftaran/pembayaran yang terpisah antar-cabang, jadwal belum terpusat, serta progres belajar belum terstruktur. | Contoh kebutuhan lokal, **bukan vendor SaaS pembanding** dan bukan bukti bahwa seluruh pasar mengalami masalah yang sama. |
| **LPK Jeftco Jepara, studi kasus** [S16] | Skripsi membahas jadwal kursus yang dicatat manual serta usulan aplikasi untuk jadwal, mobil, laporan, dan pengingat. | Bukti masalah yang diteliti pada satu lembaga, **bukan bukti produk SaaS yang dipasarkan** atau hasil validasi seluruh pasar. |

Riset ini belum menemukan cukup informasi publik untuk memetakan beberapa SaaS
Indonesia khusus kursus mobil beserta harga dan adopsinya. Pencarian tambahan
16 November 2026 menemukan pembanding umum dan studi kasus di atas, bukan
bukti bahwa tidak ada kompetitor khusus lain. Fitur yang disebut berasal dari
materi publik, bukan pengujian langsung atau bukti adopsi.

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
6. **Nama perlu penjelas yang spesifik.** DriverBridge memakai deskripsi
   “sistem manajemen sekolah mengemudi”; Bukujanji menyebut pengelola dan
   pekerjaan kelas secara langsung. Untuk produk ini, nama dapat disertai
   “aplikasi pengelolaan kursus mobil” dan contoh pekerjaan seperti mengatur
   jadwal murid, instruktur, dan mobil. Ini interpretasi positioning, bukan
   bukti bahwa salah satu nama lebih efektif bagi calon pengguna.

### Alur admin menambahkan paket ke murid

Riset tambahan 14 November 2026: sumber di atas belum menjelaskan langkah
admin saat pembuatan murid dan enrollment. Panduan publik berikut memberi
contoh alur, tetapi belum diverifikasi dengan mencoba aplikasinya.

| Produk dan sumber | Alur yang didokumentasikan | Batas temuan |
| --- | --- | --- |
| [AutoviaTest](https://school.autoviatest.com/guide/schools) | Admin membuat murid di Students; untuk assign paket, buka profil murid → Packages → Assign Package, lalu pilih paket dan tanggal mulai. Paket disiapkan sebelumnya. | Panduan menyarankan paket dapat di-assign segera setelah murid ditambahkan, tetapi tidak menunjukkan pilihan paket di form Add Student. |
| [Software for Driving School](https://softwarefordrivingschool.com/manual/enrollments/) | Buat murid dan paket terlebih dahulu, lalu buka Enrollments untuk membuat atau meninjau enrollment. | Form enrollment publik dapat membuat keduanya dalam satu alur, tetapi itu alur pendaftaran publik, bukan bukti form admin melakukannya. |
| [Pinkapple ERP](https://docs.pinkapple-erp.com/guide/driving/learner-enrollment-to-certificate.html) | Daftarkan atau pilih murid di Students, kemudian buat enrollment di menu Enrollments dengan memilih murid dan produk. | Contoh ERP dengan cakupan lebih luas; bukan bukti menu terpisah dibutuhkan untuk MVP. |
| [DriversEdPro](https://driversedpro.com/help/enroll-a-student) | Admin membuka Students → Add Student; pendaftaran publik memilih kelas dan membuat data murid dalam satu alur. | Panduan tidak menjelaskan apakah form admin memilih kelas saat membuat murid; kelas tidak selalu setara paket sesi. |

**Implikasi untuk Jago Nyetir:** pemisahan data murid dan enrollment adalah
pola yang ditemukan, tetapi tidak membuktikan staff harus berpindah layar.
UI live saat ini membuat murid terlebih dahulu, lalu menambahkan paket dari
detail murid. Hipotesis yang layak diuji: setelah simpan murid, tawarkan
langsung pilihan tambah paket atau nanti; pertahankan penambahan paket dari
detail untuk murid lama. Jika pilot hampir selalu memilih paket saat daftar,
uji pilihan paket opsional dalam alur pembuatan murid. Jangan membuat menu
enrollment terpisah hanya karena ERP lain memilikinya.

Jika penyimpanan murid dan paket tetap dua operasi, kegagalan operasi kedua
harus menjelaskan bahwa murid sudah tersimpan dan menyediakan cara melanjutkan
tanpa membuat duplikat. Enrollment mencatat hak sesi, bukan bukti pembayaran.
Validasi dengan staff: apakah paket biasanya sudah dipilih saat murid dicatat,
apakah murid lama membeli paket lagi, dan kapan jadwal dibuat.

## 3A. Pembaruan riset bisnis: aturan operasional menentukan MVP

Riset meja 19 November 2026 memakai halaman usaha dan dokumentasi vendor.
Contoh berikut menunjukkan variasi, bukan prevalensi seluruh pasar. Tidak
ada wawancara, pengujian aplikasi usaha, atau bukti kesediaan membayar.

### Temuan baru dari pelaku usaha Indonesia

| Sumber primer | Yang dipublikasikan | Implikasi untuk produk ini (interpretasi) |
| --- | --- | --- |
| [Satria Driving Center, FAQ](https://www.sdc.co.id/faq/) [S17] | Perubahan/pembatalan diminta melalui layanan pelanggan setidaknya 24 jam sebelumnya. FAQ tidak menjelaskan konsekuensi pembatalan terlambat. | Jalur staff mengubah jadwal layak diuji; jangan mengarang aturan hangus dari tenggat saja. |
| [Dirgantara Jaya](https://www.dirgantarajaya.com/) [S18] | Cabang Putri Tunggal menerbitkan aturan pembatalan minimal 5 jam; terlambat dihitung satu pertemuan. Paket berlaku 3 bulan, durasi sekitar 60 menit, tersedia kombinasi manual/matic. Situs menyebut aplikasi pendaftaran/jadwal/catatan belajar di cabang ini; pusat Kelapa Dua melayani pendaftaran melalui admin WhatsApp. | Batas pembatalan berbeda antar-usaha. Pilihan alur digital pun bisa berbeda per lokasi. Ini contoh sistem internal usaha, bukan bukti vendor SaaS umum yang dapat dibeli. |
| [ASRI, ketentuan pendaftaran](https://kursusasri.co.id/stdregchk.php?pakej=Manual+10+Jam+Automatic+2+Jam+Weekday) [S19] | Teks terindeks menyebut absensi setiap latihan, pemberitahuan ketidakhadiran sehari sebelumnya, tanpa pemberitahuan dianggap telah belajar, dan penghentian latihan bila pembayaran melewati batas. Bukti bayar online dikirim lewat WhatsApp; offline memakai kuitansi. | Hasil kehadiran, kuota, dan uang adalah catatan berbeda yang saling memengaruhi. Halaman langsung hanya terbaca sebagian; temuan ini dari cuplikan indeks dan perlu konfirmasi ulang kepada usaha. |
| [Arrahman KJ, FAQ](https://kursusmengemudiarrahmankj.com/) [S20] | Durasi reguler 60–120 menit per pertemuan, VIP 120–240 menit; tambahan antar-jemput menurut jarak dari cabang terdekat. | Asumsi satu pertemuan selalu berdurasi tetap tidak berlaku untuk semua usaha. Antar-jemput dapat memengaruhi ketersediaan resource dan biaya. |

Jangan menyalin syarat usaha di atas sebagai aturan aplikasi atau pernyataan
hukum. Tidak ada dasar dari sampel ini untuk menyimpulkan ukuran pasar,
margin rata-rata, harga SaaS yang diterima, atau kewajiban administratif
yang berlaku bagi semua usaha. Sampel dominan Jabodetabek (WIB), sementara
aplikasi memakai WITA; kecocokan usaha sasaran WITA masih perlu diuji.

### Masalah bisnis yang perlu diselesaikan

**Main concern:** produk menjual keteraturan pemakaian waktu instruktur/mobil
dan kejelasan kewajiban terhadap murid. Untuk pilot, hasil yang perlu terlihat
adalah staff bisa menjawab siapa latihan kapan, sesi mana sudah terlaksana,
dan berapa hak murid yang belum digunakan. Pengurangan bentrok atau kerja
ulang harus diukur saat pilot, bukan dijanjikan berdasarkan daftar fitur.

**Weakest assumption:** semua sekolah memakai definisi sesi yang sama.
Kontrak saat ini menghitung pending/terkonfirmasi/selesai terhadap kuota;
dibatalkan/tidak hadir tidak terhitung. `remaining_sessions` berarti kuota
yang belum dipesan, bukan seluruh hak latihan yang belum selesai. Tidak hadir
yang menghanguskan hak juga tidak boleh dilaporkan sebagai latihan selesai:
angka penyelesaian belajar akan menjadi salah.

| Keputusan yang wajib dipastikan | Konsekuensi minimum |
| --- | --- |
| Hak dijual per pertemuan tetap atau kumpulan jam? | Pertahankan snapshot jumlah sesi + durasi untuk pilot yang cocok. Jangan mengubah menjadi saldo menit sebelum ada calon pengguna yang membutuhkan. |
| Pembatalan tepat waktu, terlambat, dan tidak hadir memakai hak atau tidak? | Pisahkan hasil kehadiran dari dampak kuota bila pilot memerlukan hangus. Putuskan kontrak BE dan tampilan progres bersama sebelum implementasi. |
| Paket kedaluwarsa atau boleh ditunda? | Sepakati prosedur pengecekan manual dan siapa penanggung jawabnya untuk pilot kecil; bangun masa berlaku jika aturan ini sering memengaruhi penjadwalan. Jangan diam-diam menghapus hak. |
| Perlu paket campuran manual/matic atau ganti durasi tiap sesi? | Model satu transmisi/durasi per enrollment belum mewakili kebutuhan ini. Pilih pilot yang cocok atau nyatakan perluasan scope; jangan menyamarkan satu pembelian menjadi dua tanpa persetujuan usaha. |
| Ada jemput, jeda perjalanan, cuti, atau servis mobil? | Jadwal tidak bertumpuk belum menjamin resource bisa tiba tepat waktu. Uji contoh dua sesi berurutan; tentukan buffer/blok waktu minimum jika benar-benar dibutuhkan. |
| Siapa memeriksa DP/lunas sebelum latihan? | Pembayaran manual bisa menjadi penghalang adopsi meskipun gateway tetap ditunda. Penyimpanan paket saja tidak cukup menjawab saldo tagihan. |

### Pilihan segmen dan penawaran awal

**Rekomendasi segmen (hipotesis):** satu usaha/lokasi dengan beberapa
instruktur dan mobil, satu staff penjadwal yang jelas, serta paket pertemuan
berdurasi tetap. Pilih wilayah WITA untuk mempertahankan batas saat ini;
jika calon pilot yang tersedia di WIB, putuskan dukungan zona waktu sebelum
memasukkan jadwal nyata. Jangan merekrut pilot yang memerlukan paket jam,
campuran transmisi, atau lintas cabang lalu menganggap kebutuhannya sudah
terwakili model sekarang.

Owner memberi izin dan menilai manfaat; staff penjadwal adalah pengguna
harian yang perlu diamati; instruktur memberi laporan pelaksanaan. Untuk
pilot pertama, staff boleh mencatat laporan instruktur dari WhatsApp bila
usaha menyepakati siapa mencatat dan kapan. Ini menguji nilai administrasi,
belum membuktikan nilai ruang kerja instruktur mandiri.

Alternatif yang perlu dikalahkan adalah cara kerja yang benar-benar dipakai
calon pilot, misalnya buku/lembar kerja dan chat; jangan menganggap semuanya
menggunakan Excel. Minta melihat catatan terakhir, bukan menanyakan apakah
mereka menyukai ide aplikasi. Sistem internal digital seperti yang
dipublikasikan Dirgantara juga berarti pasar lokal tidak boleh dianggap
masih sepenuhnya manual.

Sebagai pembanding penawaran, [Total Drive](https://totaldrive.co.uk/) [S5]
menawarkan trial 30 hari dan bantuan setup/migrasi. [Teachworks](https://www.teachworks.com/driving-school-management-software)
[S8] memasarkan pengelolaan kendaraan, konfirmasi jadwal, catatan sesi, dan
saldo paket. [Drive Scout](https://drivescout.com/pricing/) [S4] mencantumkan
kebijakan pembatalan, ketersediaan, dan akses instruktur. Ini mendukung
prioritas alur operasional; bukan bukti semua fiturnya wajib untuk MVP lokal.

Penawaran pilot yang disarankan: bantuan memasukkan data awal, uji operasional
terbatas tanpa biaya langganan selama periode yang disepakati, dan evaluasi
bersama. Jangan menjanjikan dukungan tanpa batas atau gratis selamanya.
Jika fitur standar tetap gratis, catat waktu dukungan dan biaya layanan per
usaha; pemasukan dari fitur tambahan masih hipotesis sampai diuji. Harga
vendor asing tidak cukup untuk menetapkan harga Indonesia.

## 4. Prioritas MVP dan mana yang sudah ada di repo

**Bagian ini diperbarui 19 November 2026.** Status berasal dari kode lokal,
termasuk perubahan yang belum di-commit; bukan bukti perilaku deployment.

### Ringkasan enam prioritas

| Prioritas MVP | Implementasi demo/lokal | Implementasi frontend live | Kesimpulan tanpa menilai integrasi BE |
| --- | --- | --- | --- |
| **1. Akun, konteks usaha, dan akses tim** | Data contoh dipisah per sekolah di browser; demo tidak memiliki login/otorisasi. | Auth, pemulihan kata sandi, setup sekolah, undangan/aktivasi staff, pembatalan undangan, dan penghapusan akses staff ada. Pengaturan dan pengelolaan staff dibatasi owner di UI. | **Dasar owner/staff ada.** Role dan ruang kerja instruktur belum ada. Form aktivasi staff saat ini hanya mendukung email yang belum memiliki akun; pengiriman email dan otorisasi server belum diverifikasi. |
| **2. Murid, paket, pendaftaran paket, dan hak sesi** | Data murid, paket CRUD, progres, dan riwayat jadwal demo ada. Promosi paket tidak termasuk alur aktif menurut design.md. | Tambah/ubah murid; setelah tambah ditawarkan tambah paket. Enrollment menyimpan snapshot; detail menampilkan progres server, sesi berikutnya, serta seluruh halaman riwayat. Setelah tambah paket ditawarkan buat jadwal. | **Dasar sudah ada.** Progres membedakan selesai, terjadwal belum selesai, dan belum dijadwalkan. Belum ditemukan alur koreksi hak sesi dengan jejak perubahan; harga/enrollment bukan bukti pembayaran. |
| **3. Instruktur dan mobil beserta ketersediaan** | CRUD, pencarian/sort/paginasi, transmisi/kompetensi, aktif/nonaktif, dan perlindungan perubahan resource yang masih dipakai ada. | Form dan tabel instruktur/mobil memakai komponen resource bersama. Nama, transmisi/kompetensi, serta aktif/nonaktif tersedia. | **Dasar sudah ada.** Belum ada pengelolaan ketidaksediaan berbasis rentang waktu, misalnya cuti atau mobil servis. Aktif/nonaktif belum sama dengan kalender ketersediaan. |
| **4. Jadwal, ubah waktu, pembatalan, dan hasil sesi** | Kalender serta aksi status dan pemeriksaan bentrok lokal ada. | Agenda mingguan WITA, pemilihan murid/enrollment, durasi snapshot, resource kompatibel, ubah waktu, dan pembatalan ada. Pilihan status hanya muncul saat membuat sesi; edit mempertahankan status lama. | **Penghalang pilot:** belum ditemukan aksi mengonfirmasi/menyelesaikan/menandai tidak hadir pada sesi yang sudah ada. Membuat sesi baru berstatus selesai tidak menutup alur sesi terjadwal. Kontrak BE mencantumkan konflik; pelaksanaannya belum diuji. |
| **5. Ruang kerja instruktur di HP dan pencatatan hasil sesi** | Admin dapat melihat penugasan resource dan menandai sesi selesai. Ada CSS responsif umum. | Belum ditemukan ruang kerja yang mengidentifikasi instruktur login, menampilkan hanya tugasnya, dan mencatat hasil latihan. | **Belum ada sebagai alur instruktur.** CRUD data instruktur tidak sama dengan akun instruktur. Catatan profil instruktur tidak sama dengan catatan hasil setiap sesi. |
| **6. Ringkasan owner/staff dan tindak lanjut** | Ringkasan, agenda, dan laporan sederhana ada; Permintaan dikeluarkan dari alur aktif. | Beranda menampilkan agenda hari ini, jumlah menunggu konfirmasi hari ini, dan sesi lewat belum diperbarui dalam 30 hari terakhir, dengan tautan ke minggu jadwal terkait. | **Dasar sudah ada.** Belum ada antrean lintas murid untuk hak sesi tersisa tanpa jadwal berikutnya. Batas 30 hari harus dipahami saat menangani tunggakan lama. |

**Kesimpulan:** fondasi administrasi dan penjadwalan sudah banyak tersedia.
Gap frontend paling mendesak adalah perubahan status sesi yang sudah ada,
kecocokan aturan pemakaian kuota, dan keputusan siapa yang melaporkan hasil.
Pengelolaan staff serta ringkasan dasar sudah tidak tepat disebut belum ada.
Tidak ada angka persentase “MVP selesai” karena bobot dan penerimaan tiap alur
belum disepakati.

### Bukti kode yang mendasari penilaian (19 November 2026)

- `src/auth.ts`, `src/auth-ui.tsx`, `src/AcceptInvitation.tsx`,
  `src/PasswordRecovery.tsx`: auth dan konteks akses owner/staff.
- `src/Invitations.tsx`, `src/DashboardShell.tsx`: aktivasi staff,
  pembatalan undangan, penghapusan akses, dan menu owner.
- `src/StudentsPage.tsx`: pembuatan murid, penambahan paket, progres
  `completed_sessions`/`scheduled_sessions`/`remaining_sessions`, sesi
  berikutnya, dan riwayat semua halaman. Progres tidak dihitung dari
  kalender mingguan yang parsial.
- `src/live.tsx`, fungsi `Home`: agenda hari ini dan tindak lanjut sesi lewat.
- `src/live.tsx`, `saveRecord`: saat edit memakai
  `if (editing) body.status = editing.status`; form status dibungkus
  `!editing`. Aksi pembatalan tersedia terpisah, tetapi aksi selesai,
  konfirmasi, dan tidak hadir untuk sesi yang sudah ada belum ditemukan.
- `src/resource.tsx`: komponen CRUD bersama untuk resource; CRUD instruktur
  adalah pengelolaan data, bukan akun instruktur.
- `src/DemoDashboard.tsx`, `src/demoStore.mjs`: simulasi lokal terpisah;
  aksi status demo tidak membuktikan fitur live tersedia.
- `design.md`, bagian scope aktif dan alur live: promosi paket, Permintaan,
  logo sekolah, dan foto mobil bukan fitur alur aktif. Referensi historis
  `src/legacy.js` sudah tidak dipakai.
- `references/be/frontend-sessions.md`: kontrak perubahan status, konflik,
  snapshot, dan kuota. Ini referensi handoff, bukan audit backend berjalan.

Tidak dilakukan browser run, tes, atau build untuk inspeksi dokumen ini.
Riwayat status yang terlihat belum setara audit siapa mengubah apa dan kapan.

### Pembayaran dan fitur yang ditunda

**Kandidat yang diputuskan dari kebutuhan pilot, bukan otomatis P1:**

- Pencatatan manual nilai kesepakatan paket, DP/pembayaran masuk, dan sisa
  tagihan. Naik menjadi syarat pilot jika tanpa ini staff tetap harus
  mencocokkan buku pembayaran setiap kali membuat jadwal; lihat bagian 3A.
- Ringkasan jadwal yang mudah disalin/dibagikan.
- Impor data atau laporan tambahan jika pekerjaan manual berulang benar-benar
  menjadi masalah pilot.

Harga paket yang sudah ada **bukan** pencatatan transaksi pembayaran. Batas
produk saat ini menempatkan pembayaran di luar dashboard
(lihat batas produk di `design.md`); menambahnya perlu keputusan scope baru,
bukan dianggap pekerjaan implementasi yang sudah disepakati.

**Tunda:** akun/portal siswa, booking publik, payment gateway, akuntansi penuh,
payroll otomatis, LMS/ujian teori, GPS, marketplace, AI penjadwalan, dan otomasi
membaca chat WhatsApp.

## 5. Ide pembeda yang perlu diuji

Pembeda berikut adalah usulan pengalaman/positioning, bukan klaim fitur
eksklusif atau keunggulan yang sudah terbukti.

| Hipotesis | Bentuk produk minimum | Status di repo |
| --- | --- | --- |
| **“Siswa nggak perlu ikut ribet.”** | Operasional ditangani owner/staff/instruktur; siswa tidak wajib membuat akun. Komunikasi tetap melalui cara yang disepakati usaha. | Model internal-only sudah searah. Pembagian ringkasan jadwal belum ditemukan pada alur aktif; akun instruktur juga belum ada. |
| **“Yang belum beres langsung kelihatan.”** | Daftar pekerjaan: menunggu konfirmasi, sesi lewat belum dilaporkan, serta murid bersisa hak sesi yang belum punya jadwal berikutnya. | Beranda live sudah punya agenda, jumlah menunggu konfirmasi hari ini, dan sesi lewat 30 hari terakhir. Antrean murid bersisa hak tanpa jadwal berikutnya belum ada. |
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

Gambaran awal berikut dipersempit oleh bagian 8: mulai dengan satu pilot
staff sebelum memperluas ke dua–tiga usaha atau akses instruktur mandiri.

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
- Pada pilot staff: laporan instruktur dicatat staff dan hasilnya cocok
  dengan pelaksanaan. Pada pilot mandiri: instruktur mengakses dan menutup
  tugasnya sendiri; ini memerlukan alur/role yang belum tersedia.
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

## 8. Langkah berikutnya dan syarat mulai pilot

Urutan ini menggantikan rekomendasi lama yang menempatkan akun instruktur
sebagai pekerjaan pertama. Ini rekomendasi, belum backlog implementasi
seluruh fitur.

### 1. Mulai dari calon pengguna dan aturan operasional

Hubungi sekitar lima usaha, pilih satu calon pilot yang dapat memperlihatkan
proses aktual. Wawancarai owner dan orang yang menyusun jadwal, bukan owner
saja. Jumlah tersebut adalah target kerja, bukan sampel representatif.

Minta mereka memperagakan contoh terakhir:

- Murid mendaftar, memilih paket, membayar DP/lunas, lalu mendapat jadwal.
- Murid mengubah jadwal mendadak atau tidak datang; apa yang dicoret dan
  berapa hak yang tersisa?
- Instruktur/mobil tidak tersedia; siapa mengabari siapa dan bagaimana
  jadwal pengganti dibuat?
- Staff menjawab pertanyaan sisa sesi atau tunggakan; catatan mana yang
  dipercaya dan berapa lama mencarinya?

**Hasil yang harus kamu bawa pulang:** satu contoh paket nyata, zona waktu,
aturan kuota/pembatalan, masa berlaku, cara memeriksa pembayaran, siapa
menutup sesi, dan contoh jadwal seminggu. Gunakan data yang diizinkan atau
samarkan identitas murid. Putuskan tiga hal: model paket cocok atau tidak;
staff boleh mencatat hasil atau instruktur wajib login; pembayaran boleh
sementara dicatat terpisah atau menjadi syarat penggunaan.

### 2. Pekerjaan kode pertama: tutup siklus sesi live

Lengkapi aksi pada **sesi yang sudah ada** untuk konfirmasi, selesai, dan
tidak hadir, memakai kontrak BE yang berlaku. Pembatalan sudah ada. Setelah
berhasil, muat ulang agenda dan progres; kesalahan simpan harus terlihat
serta tidak mengubah angka lokal seolah sudah berhasil.

Sebelum mengubah aturan kuota, cocokkan hasil langkah 1 dengan kontrak saat
ini. Jika tidak hadir harus menghanguskan hak, perubahan kontrak/perhitungan
BE dan penjelasan progres menjadi satu pekerjaan tersendiri. Jangan cukup
menambahkan pilihan status di FE lalu mengklaim kebijakan bisnis sudah
terpenuhi. Untuk koreksi hasil yang sudah final, tetapkan siapa boleh
melakukannya dan alasan/jejak minimum yang diperlukan; hindari penghapusan
riwayat sebagai cara mengoreksi saldo.

**Kriteria selesai:** buat jadwal pending, konfirmasi, ubah waktu, selesaikan,
dan tandai sesi lain tidak hadir/batal; progres sesuai aturan yang dipilih.
Sesi selesai tidak terhitung dua kali saat permintaan diulang. Sesi lewat
hilang dari antrean setelah hasil tersimpan. Perubahan gagal tidak hilang
atau dianggap sukses. Jadwal lama tetap terbaca setelah muat ulang.

### 3. Buktikan alur pada lingkungan terhubung

Jalankan satu skenario murid → paket → jadwal → perubahan → pelaksanaan →
progres dengan API/DB yang dituju. Periksa dua staff memesan resource sama,
kuota habis, resource nonaktif/tidak kompatibel, pembatalan, akses sekolah
lain, email aktivasi staff, serta kegagalan simpan/muat ulang. Uji layar HP
pada peran yang benar-benar dipakai pilot. Ini syarat kepercayaan operasional,
bukan penambahan fitur; inspeksi frontend ini belum membuktikannya.

Siapkan cara mengambil salinan data pilot dan pemulihannya dari backend,
serta siapa dihubungi bila aplikasi gagal. Tidak harus membangun menu ekspor
serbaguna. Jangan meminta usaha memindahkan catatan utama sebelum alur ini
lulus dan cara pemulihan jelas.

### 4. Jalankan satu pilot dengan pendampingan

Usulkan dua minggu operasional sebagai periode awal, disesuaikan frekuensi
latihan. Masukkan data awal bersama staff dan cocokkan hak sesi awal dengan
catatan usaha; jangan menandai semua sesi lama selesai hanya untuk menyamakan
saldo. Sepakati aplikasi menjadi catatan utama jadwal/hasil untuk kelompok
murid pilot; pembayaran boleh tetap di catatan terpisah bila disetujui.

Catat baseline sebelum mulai, lalu bandingkan pada akhir periode:

| Ukuran | Cara mencatat | Sinyal keputusan |
| --- | --- | --- |
| Adopsi kerja harian | Sesi aktual kelompok pilot yang dicatat di aplikasi / semua sesi aktual kelompok itu, termasuk perubahan di luar aplikasi | Apakah staff memakainya tanpa terus kamu ingatkan? |
| Ketepatan hasil/kuota | Cocokkan sampel seluruh siklus beberapa murid dengan laporan pelaksanaan dan aturan usaha | Selisih yang belum dapat dijelaskan menghalangi perluasan pilot. |
| Ketertiban penutupan | Sesi yang hasilnya belum dicatat pada akhir hari operasional berikutnya | Jika terus menumpuk, cari hambatan pelaporan sebelum membuat dashboard baru. |
| Beban admin | Waktu mencari sisa sesi/mengubah jadwal sebelum dan selama pilot; frekuensi mencatat ulang | Apakah pekerjaan nyata berkurang, atau hanya bertambah satu aplikasi? |
| Biaya melayani | Waktu setup/dukungan kamu, jenis bantuan, serta biaya layanan yang timbul | Apakah bisa melayani usaha berikutnya dengan kapasitas solo developer? |

Definisi dan ambang penerimaan disepakati dengan pilot sebelum mulai; jangan
memasang persentase sukses sebagai hasil riset. Dengan izin, minta contoh
kasus yang membaik dan yang masih gagal. Setelahnya tanyakan apakah mereka
mau terus memakai, siapa yang memutuskan, dan untuk manfaat apa mereka
bersedia membayar jika ada layanan tambahan; pujian demo bukan komitmen.

### 5. Tambah satu kemampuan dari hambatan yang terbukti

| Hambatan yang terlihat | Pekerjaan berikut yang paling kecil |
| --- | --- |
| Staff tidak mau memakai karena harus terus membuka buku DP/tagihan | Pencatatan pembayaran manual per enrollment: nilai kesepakatan, tanggal/jumlah/cara bayar, sisa tagihan, dan koreksi berjejak. Validasi scope; gateway/akuntansi/payroll tetap ditunda. |
| Hasil sesi terlambat karena instruktur harus melapor sendiri | Role instruktur, tautan akun ke resource, tugas sendiri di HP, hasil singkat per sesi, dan otorisasi server untuk tugasnya. Jangan memberi role staff sebagai jalan pintas ke seluruh data. |
| Resource sering kosong di sistem padahal cuti/servis/perjalanan | Blok ketidaktersediaan/buffer minimum dengan pemeriksaan konflik yang sama; belum perlu optimasi rute. |
| Murid sering bingung setelah perubahan jadwal | Ringkasan teks yang bisa disalin/dibagikan manual lebih dulu; ukur kebutuhan otomasi. |
| Banyak hak tersisa tetapi latihan tidak berlanjut | Daftar tindak lanjut murid bersisa hak tanpa jadwal mendatang. Detail murid sudah menyediakan dasar pengecekan manual. |

**Recommendation:** mulai menghubungi calon pilot sekarang, lalu kerjakan
penutupan status sesi live sebagai perubahan kode pertama. Jangan menunggu
landing page, kesetaraan seluruh demo/live, akun murid, AI, atau pembayaran
online. Bila model paket/aturan kuota calon pilot bertentangan dengan model
sekarang, selesaikan keputusan itu sebelum menerima jadwal nyata. Jika
pilot tidak mau berpindah dari cara kerja lama, cari penyebabnya sebelum
menambah fitur atau merekrut usaha berikutnya.

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
- **[S15] Bukujanji, manajemen kelas:** https://app.bukujanji.com/id/sistem-booking/kelas
- **[S16] LPK Jeftco Jepara, skripsi penjadwalan:** https://eprints.unisnu.ac.id/id/eprint/652/
- **[S17] Satria Driving Center, FAQ:** https://www.sdc.co.id/faq/
- **[S18] Dirgantara Jaya, paket/ketentuan/alur digital per lokasi:** https://www.dirgantarajaya.com/
- **[S19] ASRI, ketentuan pendaftaran (pembacaan langsung parsial; cuplikan indeks):** https://kursusasri.co.id/stdregchk.php?pakej=Manual+10+Jam+Automatic+2+Jam+Weekday
- **[S20] Arrahman KJ, FAQ durasi dan antar-jemput:** https://kursusmengemudiarrahmankj.com/

S17–S20 ditelusuri pada 19 November 2026; tanggal akses bukan tanggal
penerbitan kebijakan. S4, S5, dan S8 juga dibuka ulang pada pembaruan ini.
Sumber lama lain tetap referensi historis, belum seluruhnya dicek ulang.
Klaim aplikasi pada S18 berasal dari situs usaha, bukan hasil login/pengujian.
Penafsiran bisnis/urutan pekerjaan dalam bagian 3A dan 8 adalah rekomendasi
penulis, bukan permintaan pengguna yang sudah divalidasi.

### Batas inspeksi repo

- Dasar penilaian: entrypoint frontend, auth/workspace, demo store,
  resource CRUD, halaman/handler legacy, UI live, CSS terkait, serta
  pembacaan bagian tes/dokumentasi yang relevan.
- Tidak menjalankan browser, aplikasi kompetitor, tes aplikasi, atau build
  untuk perubahan dokumentasi ini.
- Tidak mengecek integrasi BE, keamanan tenant di server, pengiriman email,
  transaksi/konkurensi database, atau kesiapan produksi.
- Tidak melakukan wawancara pengguna atau verifikasi domain/merek. Riset
  publik tambahan 19 November memeriksa contoh ketentuan usaha lokal dan
  beberapa halaman vendor; bukan pembaruan menyeluruh semua sumber lama
  atau audit harga/adopsi pasar.
- Status hanya menggambarkan kode workspace pada tanggal inspeksi,
  termasuk perubahan lokal yang sudah ada; bukan penilaian rilis/deployment.
