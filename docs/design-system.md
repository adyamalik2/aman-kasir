# AMAN Kasir Design System

Dokumen ini merangkum token visual awal untuk Fase 0. Token dibuat ringan agar UI kasir
tetap cepat, mobile-first, dan konsisten untuk pengguna UMKM Indonesia.

## Fonts

- UI text: Inter via Google Fonts CDN.
- Angka, nominal, dan kode pendek: Roboto Mono via Google Fonts CDN.
- Tailwind class:
  - `font-sans` memakai Inter.
  - `font-mono` memakai Roboto Mono.
  - `font-numeric` tersedia untuk nominal/angka dengan tabular numeric.

## Color Tokens

| Token | Default | Fungsi |
| --- | --- | --- |
| `primary` | `#1e3a8a` | Brand utama, header, aksi primer |
| `accent` | `#0f766e` | Aksen pendukung dan highlight non-kritis |
| `success` | `#15803d` | Status berhasil, tersimpan, synced |
| `warning` | `#b45309` | Peringatan, pending, perhatian |
| `danger` | `#b91c1c` | Error, gagal, aksi destruktif |
| `background` | `#f1f5f9` | Background aplikasi |
| `surface` | `#ffffff` | Panel, kartu, modal, area input |
| `neutral` | `#0f172a` sampai `#f8fafc` | Teks, border, dan UI netral |

## Global CSS

- `body` memakai Inter, background `background`, dan minimum viewport mobile.
- `#root` selalu minimal setinggi viewport.
- Form control mewarisi font UI.
- Roboto Mono tersedia lewat `.font-numeric` untuk nominal Rupiah dan angka penting.
