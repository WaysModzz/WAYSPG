"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * app/pay/page.js (Client Component)
 * Alur data:
 *  1. User isi nominal (+ optional userId merchant tujuan).
 *  2. Submit -> POST /api/create-order.
 *  3. API balikin { orderId } -> kita redirect ke /order/[id] untuk
 *     menampilkan QR + listen status realtime.
 */
export default function PayPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState("merchant_demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1000) {
      setError("Minimal nominal transaksi Rp1.000");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat order");

      router.push(`/order/${data.orderId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Buat Transaksi QRIS</h1>

      <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">
            Nominal (Rp)
          </label>
          <input
            type="number"
            min="1000"
            className="input-neon"
            placeholder="50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">
            Merchant ID
          </label>
          <input
            type="text"
            className="input-neon"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-neon">
          {loading ? "Membuat QRIS..." : "Generate QRIS Dinamis"}
        </button>
      </form>
    </main>
  );
}
