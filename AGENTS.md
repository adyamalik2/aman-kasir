# AMAN Kasir — Panduan Proyek

Aplikasi kasir **offline-first** untuk UMKM Indonesia. Bagian dari ekosistem
**AMAN Digital** milik Malik (Adya Malik).

Bahasa kerja: **Bahasa Indonesia**, termasuk komentar kode dan pesan commit.

> **`CLAUDE.md` di repo ini sudah memuat** identitas produk, target pengguna,
> stack, prinsip desain, dan aturan kerja. **Baca itu dulu** — berkas ini
> hanya melengkapi dengan hal yang belum tercakup di sana.
>
> Satu bagian di `CLAUDE.md` sudah usang: **"Scope Fase 0"**. Aplikasi ini
> sekarang sudah live di `kasir.amandigital.my.id` dan APK-nya sudah terpasang
> — jauh melewati Fase 0. Abaikan daftar langkah itu.

---

## Login opsional — ini disengaja

Dashboard dan layar transaksi **bisa dibuka tanpa login**. Tidak ada route
guard, dan itu memang benar.

Tertulis eksplisit di `src/services/auth/AuthService.ts`:

```
Login bersifat OPSIONAL. Tidak ada fitur kasir yang bergantung pada login.
```

Google OAuth via Firebase hanya dipakai untuk **cloud backup**. Menambahkan
gerbang login akan merusak alasan utama aplikasi ini ada — "kasir yang jalan
terus walau sinyal pergi".

**Jangan** menambahkan `ProtectedRoute`/`RequireAuth` tanpa diminta.

---

## APK

- Capacitor 8, `webDir: "dist"`, **tanpa `server.url`** → aset dibundel di
  dalam APK. Tidak ada live-update, tidak ada Remote Config.
- **Deploy web tidak memengaruhi APK terpasang sama sekali.** Perubahan
  source baru berlaku kalau APK dibangun ulang dan dipasang. Jangan klaim
  sebaliknya.
- **Jangan** jalankan `adb`, `npx cap sync`, Gradle build, membuat signed
  APK, atau menyentuh keystore tanpa diminta.
- Firebase project aplikasi ini **terpisah** dari aplikasi AMAN lain.

---

## Berkas yang jangan dihapus

`aman-kasir-cpanel-build.zip` di akar repo adalah berkas **untracked** milik
Malik — kemungkinan arsip build lama dari upaya hosting cPanel. Biarkan apa
adanya, jangan dihapus atau di-commit tanpa diminta.

---

## Sejarah yang perlu diketahui

Proyek Cloudflare Pages `aman-kasir` pernah **tersambung ke repo situs utama
yang salah**, sehingga `kasir.amandigital.my.id` sempat menyajikan situs yang
keliru, dan proyeknya mewarisi binding produksi (KV/D1/R2) yang tidak
seharusnya dia punya. Sudah dibereskan Agustus 2026 — koneksi Git diputus dan
binding dibersihkan.

Pelajarannya: **status HTTP 200 bukan bukti isinya benar.** Kalau memverifikasi
deployment, periksa isi halamannya, bukan hanya kode statusnya.

---

## Perintah

```bash
npm run dev
npm run build
npm run lint
npm test
```

---

## Merawat dokumen

Kalau Anda menemukan jebakan baru di repo ini, atau Malik memutuskan sesuatu
yang tidak terlihat dari kode, **perbarui berkas ini dalam commit yang sama**.
Dokumen basi lebih berbahaya daripada tidak ada dokumen.

Keputusan yang berdampak ke seluruh ekosistem dicatat di `KEPUTUSAN.md` repo
situs utama (`aman-digital`), bukan di sini. Yang di sini khusus repo ini saja.

---

Konteks ekosistem yang lebih luas ada di repo situs utama
(`aman-digital`): `AGENTS.md`, `KEPUTUSAN.md`, `STATUS.md`.
