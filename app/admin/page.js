"use client";

import { useEffect, useState } from "react";

/**
 * app/admin/page.js (Client Component)
 * Alur data:
 *  1. Fetch daftar withdrawal PENDING dari GET /api/admin/wd.
 *  2. Admin klik Approve/Reject -> POST /api/admin/wd { wdId, action }.
 *  3. Setelah sukses, refresh list.
 *
 * Catatan keamanan: endpoint /api/admin/wd di server WAJIB divalidasi
 * dengan header x-admin-key (lihat api/admin/wd/route.js). Di produksi
 * ganti dengan Firebase Auth + custom claim role=admin.
 */
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);

  async function fetchList(key) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wd", {
        headers: { "x-admin-key": key },
      });
      if (res.status === 401) {
        setAuthorized(false);
        return;
      }
      const data = await res.json();
      setList(data.withdrawals || []);
      setAuthorized(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(wdId, action) {
    setActingId(wdId);
    try {
      const res = await fetch("/api/admin/wd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ wdId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      await fetchList(adminKey);
    } catch (err) {
      alert(err.message);
    } finally {
      setActingId(null);
    }
  }

  if (!authorized) {
    return (
      <main className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <div className="glass-panel flex flex-col gap-4">
          <input
            type="password"
            className="input-neon"
            placeholder="Admin Secret Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <button className="btn-neon" onClick={() => fetchList(adminKey)}>
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Approval Withdrawal</h1>

      {loading && <p className="text-slate-400 text-sm">Memuat...</p>}

      {list.length === 0 && !loading && (
        <p className="text-slate-400 text-sm">Tidak ada pengajuan pending.</p>
      )}

      <div className="flex flex-col gap-4">
        {list.map((wd) => (
          <div key={wd.id} className="glass-panel flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">
                  Rp{Number(wd.amount).toLocaleString("id-ID")}
                </p>
                <p className="text-slate-400 text-xs">{wd.userId}</p>
              </div>
              <span className="badge-pending">
                <span className="dot" /> PENDING
              </span>
            </div>

            <div className="text-sm text-slate-300">
              <p>{wd.bank} — {wd.accountNumber}</p>
              <p className="text-slate-400">a.n {wd.accountName}</p>
            </div>

            <div className="flex gap-3">
              <button
                disabled={actingId === wd.id}
                onClick={() => handleAction(wd.id, "APPROVE")}
                className="flex-1 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold hover:shadow-glow-cyan transition-shadow disabled:opacity-40"
              >
                {actingId === wd.id ? "..." : "Approve"}
              </button>
              <button
                disabled={actingId === wd.id}
                onClick={() => handleAction(wd.id, "REJECT")}
                className="flex-1 py-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300 font-semibold hover:shadow-glow-purple transition-shadow disabled:opacity-40"
              >
                {actingId === wd.id ? "..." : "Reject"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
