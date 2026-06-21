# Ringkasan AMAN Kasir untuk Landing Page AMAN Digital

## Identitas Produk

**Nama produk:** AMAN Kasir  
**Brand:** AMAN Digital  
**Tagline:** Kasir yang jalan terus, walau sinyal pergi.  
**Kategori:** Aplikasi kasir / POS offline-first untuk UMKM Indonesia  
**Platform:** Web PWA dan Android

## Deskripsi Singkat

AMAN Kasir adalah aplikasi kasir modern untuk UMKM yang membantu pemilik usaha mencatat transaksi, mengelola produk dan stok, memantau laporan penjualan, mencatat piutang, mencetak atau membagikan struk digital, serta melakukan backup data secara lokal maupun cloud.

Aplikasi ini dirancang agar tetap bisa digunakan walau koneksi internet tidak stabil, sehingga cocok untuk toko kecil, usaha fotokopi, percetakan, ATK, ritel harian, warung, kios, dan bisnis lokal lainnya.

## Value Proposition

AMAN Kasir membantu UMKM bekerja lebih rapi, cepat, dan aman dengan sistem kasir yang:

- Tetap berjalan tanpa internet.
- Mudah digunakan di HP Android maupun browser.
- Mencatat transaksi, stok, pelanggan, dan piutang dalam satu tempat.
- Menampilkan laporan omzet, laba, produk terlaris, dan histori stok.
- Menyediakan struk digital yang bisa dicetak, diunduh, atau dibagikan via WhatsApp.
- Mendukung backup data lokal dan cloud.

## Target Pengguna

- Pemilik UMKM.
- Toko fotokopi dan percetakan.
- Toko ATK.
- Warung, kios, dan toko ritel kecil.
- Usaha rumahan yang butuh pencatatan transaksi sederhana.
- Pemilik toko yang ingin mengganti catatan manual dengan sistem digital ringan.

## Fitur Utama

### 1. Kasir POS Cepat

AMAN Kasir menyediakan halaman transaksi baru dengan pencarian produk, scan barcode, keranjang belanja, pengaturan jumlah barang, diskon transaksi, metode pembayaran, dan kembalian otomatis.

Metode pembayaran yang didukung:

- Tunai
- QRIS
- Transfer
- Piutang

### 2. Scan Barcode

Produk bisa dicari lewat nama, SKU, atau barcode. Aplikasi mendukung input barcode dari scanner USB/Bluetooth di web, serta scan kamera pada perangkat yang mendukung Barcode Detector API.

### 3. Manajemen Produk dan Stok

Pengguna dapat menambah, mengedit, menonaktifkan, menghapus, mencari, dan mengelompokkan produk berdasarkan kategori.

Data produk mencakup:

- Nama produk
- SKU
- Barcode
- Kategori
- Harga jual
- Harga modal
- Stok
- Stok minimum
- Satuan
- Status aktif/nonaktif

AMAN Kasir juga mendukung import dan export produk via CSV.

### 4. Restock dan Histori Stok

Setiap perubahan stok dicatat sebagai histori, termasuk:

- Stok awal
- Penjualan
- Restock
- Koreksi stok
- Pembatalan transaksi

Fitur ini membantu pemilik usaha mengetahui pergerakan barang secara lebih transparan.

### 5. Dashboard Harian

Dashboard menampilkan informasi penting secara cepat:

- Omzet hari ini
- Jumlah transaksi hari ini
- Status backup data
- Peringatan stok habis
- Peringatan stok menipis
- Akses cepat ke kasir, produk, laporan, dan pelanggan

### 6. Laporan Penjualan

AMAN Kasir menyediakan berbagai laporan bisnis, seperti:

- Ringkasan penjualan
- Laporan transaksi harian, bulanan, dan tahunan
- Produk terlaris berdasarkan jumlah terjual dan omzet
- Stok menipis
- Piutang
- Laba dan margin
- Histori stok

Beberapa laporan mendukung export CSV.

### 7. Laporan Laba dan Margin

Aplikasi menghitung laba kotor berdasarkan harga jual dan harga modal produk. Laporan dapat dilihat per produk maupun per kategori, sehingga pemilik usaha bisa mengetahui produk mana yang paling menguntungkan.

### 8. Piutang dan Pelanggan

AMAN Kasir mendukung transaksi piutang dan manajemen pelanggan.

Fitur pelanggan mencakup:

- Nama pelanggan
- Nomor telepon
- Alamat
- Catatan
- Riwayat transaksi
- Total belanja
- Total piutang
- Status piutang belum lunas atau sudah lunas

Piutang dapat ditandai lunas dengan metode pembayaran dan catatan pelunasan.

### 9. Struk Digital dan Printer

Setelah transaksi selesai, pengguna dapat membuka struk transaksi dan melakukan beberapa aksi:

- Cetak struk
- Bagikan ke WhatsApp
- Salin teks struk
- Download JPG
- Download PDF
- Share JPG
- Share PDF

Struk dapat dikustomisasi melalui pengaturan printer dan struk, termasuk nama toko, nomor transaksi, header, footer, auto print, dan margin bawah.

### 10. Backup dan Restore

AMAN Kasir menyediakan backup lokal dalam format JSON dan backup cloud setelah login Google.

Fitur restore mendukung:

- Merge data
- Replace data
- Preview isi backup sebelum restore

Dashboard juga menampilkan status apakah data sudah aman atau masih perlu dibackup.

### 11. Offline-First

Aplikasi menggunakan IndexedDB sebagai penyimpanan lokal, sehingga transaksi dan data utama tetap bisa digunakan tanpa koneksi internet.

Service worker digunakan untuk mendukung pengalaman PWA dan cache aplikasi.

### 12. PWA dan Android

AMAN Kasir dibuat sebagai aplikasi web installable dan juga dikemas sebagai aplikasi Android menggunakan Capacitor.

Fitur native yang tersedia meliputi:

- Deteksi online/offline
- Haptic feedback
- Share file di Android
- Tombol back Android
- Dukungan kamera untuk scan barcode
- Update banner saat versi baru tersedia

## Teknologi

AMAN Kasir dibangun dengan:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Dexie.js / IndexedDB
- Firebase Auth
- Firestore untuk backup cloud
- Capacitor Android
- Recharts
- html2canvas
- jsPDF
- LZ-String

## Copy Landing Page

### Hero Headline

**Kasir UMKM yang tetap jalan, walau sinyal hilang.**

### Subheadline

AMAN Kasir membantu toko mencatat transaksi, stok, piutang, struk, dan laporan bisnis dalam satu aplikasi ringan untuk web dan Android.

### CTA

- Coba AMAN Kasir
- Download Aplikasi
- Lihat Fitur

## Poin Diferensiasi

- Offline-first, cocok untuk kondisi internet tidak stabil.
- Dibuat untuk kebutuhan UMKM Indonesia.
- Mendukung kasir, stok, laporan, piutang, pelanggan, dan struk dalam satu aplikasi.
- Bisa digunakan sebagai PWA maupun aplikasi Android.
- Data bisa diamankan lewat backup lokal dan cloud.

## Rekomendasi Section Landing Page

1. Hero: Kasir yang jalan terus walau sinyal pergi.
2. Masalah UMKM: transaksi manual, stok tidak rapi, piutang sering lupa, laporan sulit dibuat.
3. Solusi AMAN Kasir: satu aplikasi untuk kasir, stok, laporan, struk, dan backup.
4. Fitur unggulan: POS, produk, laporan, piutang, struk, backup.
5. Offline-first: tetap bisa transaksi tanpa internet.
6. Cocok untuk: fotokopi, percetakan, ATK, warung, toko ritel, usaha rumahan.
7. CTA akhir: mulai rapikan toko dengan AMAN Kasir.

## SEO Keywords

- aplikasi kasir offline
- aplikasi kasir UMKM
- aplikasi POS Android
- aplikasi kasir toko
- aplikasi kasir fotocopy
- aplikasi kasir percetakan
- aplikasi stok barang
- aplikasi laporan penjualan
- aplikasi piutang toko
- aplikasi kasir Indonesia