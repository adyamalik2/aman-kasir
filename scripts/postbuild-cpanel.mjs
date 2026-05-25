/**
 * Postbuild script untuk cPanel deployment.
 * Setelah `vite build --base=/aman-kasir/`, Vite meng-copy public/manifest.webmanifest
 * ke dist/ dengan path yang masih mengacu ke "/" (bukan "/aman-kasir/").
 * Script ini menggantinya dengan manifest-cpanel.webmanifest yang sudah benar.
 */
import { copyFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const src = join(root, 'public', 'manifest-cpanel.webmanifest')
const dest = join(root, 'dist', 'manifest.webmanifest')

copyFileSync(src, dest)
console.log('✓ dist/manifest.webmanifest diganti dengan manifest-cpanel.webmanifest')
