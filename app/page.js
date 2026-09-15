import Link from "next/link";

/**
 * app/page.js (Server Component)
 * Landing dashboard: hanya navigasi statis ke 3 modul utama.
 * Tidak fetch data apapun -> aman di-render di server tanpa cost tambahan.
 */
export default function HomePage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="text-center py-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
          WAYS TAMVANZ
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          QRIS Dinamis & Withdrawal Gateway
        </p>
      </header>

      <nav className="flex flex-col gap-4">
        <Link href="/pay" className="glass-panel hover:shadow-glow-cyan transition-shadow">
          <p className="text-lg font-bold">💸 Buat Transaksi QRIS</p>
          <p className="text-slate-400 text-sm mt-1">
            Generate QRIS dinamis untuk terima pembayaran
          </p>
        </Link>

        <Link href="/wd" className="glass-panel hover:shadow-glow-purple transition-shadow">
          <p className="text-lg font-bold">🏦 Tarik Saldo (Withdrawal)</p>
          <p className="text-slate-400 text-sm mt-1">
            Ajukan pencairan saldo merchant ke rekening/e-wallet
          </p>
        </Link>

        <Link href="/admin" className="glass-panel hover:shadow-glow-cyan transition-shadow">
          <p className="text-lg font-bold">🛡️ Admin Panel</p>
          <p className="text-slate-400 text-sm mt-1">
            Approve / reject pengajuan withdrawal
          </p>
        </Link>
      </nav>
    </main>
  );
}
