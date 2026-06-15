/**
 * Generate ikon PWA dari logo brand.
 *
 * Alat build sekali pakai — butuh `sharp` (devtool, tidak di package.json):
 *   npm install --no-save sharp
 *   node scripts/generate-icons.mjs
 *
 * Sumber: "Logo Brand AMAN Kasir ory.png" (di root proyek).
 * Output: public/icons/icon-192.png, icon-512.png (purpose any),
 *         public/icons/icon-maskable-512.png (purpose maskable, padding zona aman).
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'Logo Brand AMAN Kasir ory.png')
const OUT = resolve(ROOT, 'public', 'icons')
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

/** Logo di-fit di tengah kanvas putih `size`px dengan skala `scale`. */
async function gen(size, scale, outName) {
  const inner = Math.round(size * scale)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .toBuffer()
  const pad = Math.round((size - inner) / 2)
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, outName))
  console.log('✓', outName, `(${size}px, logo ${Math.round(scale * 100)}%)`)
}

await gen(192, 0.9, 'icon-192.png')
await gen(512, 0.9, 'icon-512.png')
// Maskable: logo dikecilkan agar muat di zona aman lingkaran (~tengah 80%).
await gen(512, 0.64, 'icon-maskable-512.png')
console.log('Selesai.')
