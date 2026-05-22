# AMAN Kasir

AMAN Kasir adalah aplikasi kasir berbasis Vite, React, dan TypeScript.

## Setup

Pastikan Node.js dan npm sudah terpasang, lalu jalankan:

```bash
npm install
```

Di Windows PowerShell, jika `npm` terkena execution policy, gunakan `npm.cmd`:

```bash
npm.cmd install
```

## Run Development

```bash
npm run dev
```

Alternatif PowerShell:

```bash
npm.cmd run dev
```

## Build

```bash
npm run build
```

Alternatif PowerShell:

```bash
npm.cmd run build
```

## Struktur Folder

```text
aman-kasir/
|-- public/              # aset publik dan manifest PWA
|-- src/                 # kode aplikasi React
|   |-- App.tsx          # komponen utama
|   |-- main.tsx         # entry point React
|   `-- index.css        # Tailwind dan global style
|-- index.html           # HTML shell aplikasi
|-- package.json         # scripts dan dependency
|-- tailwind.config.js   # konfigurasi Tailwind CSS
|-- postcss.config.js    # konfigurasi PostCSS
|-- eslint.config.js     # konfigurasi ESLint
`-- tsconfig*.json       # konfigurasi TypeScript
```
