/**
 * App.tsx — Komponen root sementara untuk validasi Langkah 1
 *
 * File ini akan DIGANTI sepenuhnya di Langkah 6 (Layout & Routing)
 * dengan AppLayout + React Router yang sesungguhnya.
 *
 * Saat ini hanya untuk memastikan: Tailwind jalan, build sukses, dev server nyala.
 */

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        {/* Logo placeholder */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 text-2xl text-white">
          🧾
        </div>

        <h1 className="text-xl font-bold text-gray-900">AMAN Kasir</h1>

        <p className="mt-1 text-sm italic text-gray-500">
          Kasir yang Jalan Terus, Walau Sinyal Pergi
        </p>

        <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ Langkah 1 — Foundation Setup berhasil
        </div>

        <p className="mt-4 text-xs text-gray-400">
          File ini akan diganti saat Langkah 6 (Layout & Routing)
        </p>
      </div>
    </div>
  )
}

export default App
