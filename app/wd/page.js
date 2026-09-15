"use client";

import { useEffect, useState } from "react";

/**
 * app/wd/page.js (Client Component)
 * Alur data:
 *  1. Saat mount, fetch saldo merchant via GET /api/balance.
 *  2. User isi form WD -> POST /api/wd.
 *  3. API akan menahan (hold) sebagian saldo secara atomic di server
 *     supaya tidak terjadi double-withdraw sebelum admin approve.
 */
export default function WithdrawalPage() {
  const [userId] = useState("merchant_demo");
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    fetchBalance();
  }, []);

  async function fetchBalance() {
    try {
      const res = await fetch(`/api/balance?userId=${userId}`);
      const data = await res.json();
      setBalance(data.balance ?? 0);
    } catch {
      setBalance(0);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/wd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: Number(amount),
          bank,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan WD");

      setMessage({ type: "success", text: "Pengajuan WD berhasil dikirim, menunggu approval admin." });
      setAmount("");
      fetchBalance();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Tarik Saldo</h1>

      <div className="glass-panel">
        <p className="text-slate-400 text-sm">Saldo Tersedia</p>
        <p className="text-3xl font-extrabold">
          {balance === null ? "..." : `Rp${Number(balance).toLocaleString("id-ID")}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nominal Ditarik (Rp)</label>
          <input
            type="number"
            min="10000"
            className="input-neon"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Bank / E-Wallet</label>
          <input
            type="text"
            className="input-neon"
            placeholder="BCA / DANA / OVO"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nomor Rekening/Akun</label>
          <input
            type="text"
            className="input-neon"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nama Pemilik Akun</label>
          <input
            type="text"
            className="input-neon"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />
        </div>

        {message && (
          <p className={message.type === "error" ? "text-rose-400 text-sm" : "text-emerald-400 text-sm"}>
            {message.text}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-neon">
          {loading ? "Mengirim..." : "Ajukan Penarikan"}
        </button>
      </form>
    </main>
  );
}
