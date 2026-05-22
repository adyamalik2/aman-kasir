# AMAN Kasir Project Guide

## Identitas Proyek

AMAN Kasir adalah aplikasi kasir offline-first untuk UMKM Indonesia. Aplikasi ini
ditujukan untuk warung, toko kecil, dan pelaku usaha harian yang butuh transaksi cepat,
data aman, dan tetap bisa berjualan saat koneksi internet hilang.

Tagline utama:

"Kasir yang Jalan Terus, Walau Sinyal Pergi."

## Target User

- UMKM Indonesia yang membutuhkan aplikasi kasir sederhana, cepat, dan stabil.
- Pemilik warung dan toko yang sering bekerja dengan koneksi internet tidak stabil.
- Operator kasir yang perlu UI berbahasa Indonesia, format Rupiah, dan alur kerja ringkas.

## Stack Teknologi Blueprint

- Vite, React 18, dan TypeScript untuk aplikasi utama.
- Tailwind CSS 3 untuk styling utility-first.
- ESLint dan Prettier untuk kualitas kode dan format konsisten.
- Vitest untuk unit dan integration test.
- PWA dengan IndexedDB via Dexie.js untuk penyimpanan lokal browser.
- Android native via Capacitor, dengan SQLite via `@capacitor-community/sqlite` untuk fase
  Android.
- React Router v6 untuk navigasi aplikasi.
- Zustand untuk state global ringan.
- Firebase/cloud sync direncanakan untuk fase sinkronisasi berikutnya.

Catatan: item stack yang belum diperlukan pada langkah saat ini tidak boleh dipasang lebih awal.

## Aturan Kerja Project

- Kerjakan bertahap sesuai langkah yang sudah dikonfirmasi user.
- Jaga perubahan tetap kecil, jelas, dan sesuai scope langkah aktif.
- Baca struktur dan pola kode yang sudah ada sebelum mengubah file.
- Jalankan validasi yang relevan setelah perubahan, minimal lint dan build untuk fondasi.
- Gunakan Bahasa Indonesia untuk copy utama aplikasi.
- Gunakan format lokal Indonesia untuk mata uang, tanggal, dan teks operasional.
- Prioritaskan data transaksi: jangan mengambil risiko yang dapat menyebabkan data hilang.

## Prinsip Desain Utama

- Offline is the Default: transaksi harus tetap berjalan tanpa internet.
- Speed over Beauty: halaman kasir harus cepat, ringan, dan bebas animasi berat.
- Made for Indonesia: bahasa, Rupiah, tanggal, dan konteks kerja disesuaikan untuk Indonesia.
- Zero Data Loss: setiap transaksi harus disimpan secara lokal terlebih dahulu.
- Simple Daily Workflow: alur kasir harus jelas untuk pengguna non-teknis.

## Scope Fase 0

1. Init project dan tooling.
2. `CLAUDE.md` dan folder structure.
3. Design tokens dan fonts.
4. Domain types dan helper dasar.
5. Repository interfaces dan skeleton database lokal.
6. Store, layout, dan router.
7. Dashboard dummy dan validasi akhir Fase 0.

## Batasan Kerja

- Jangan refactor besar tanpa instruksi eksplisit.
- Jangan auto-commit Git.
- Jangan lanjut fase atau langkah berikutnya tanpa konfirmasi user.
- Jangan install dependency baru kecuali memang diperlukan untuk langkah yang aktif.
- Jangan menghapus file yang sudah ada tanpa persetujuan user.
- Jangan mengubah UI, router, database, store, atau domain di luar scope langkah aktif.
