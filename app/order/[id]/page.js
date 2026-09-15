"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";

/**
 * app/order/[id]/page.js (Client Component)
 * Alur data:
 *  1. Ambil orderId dari route param.
 *  2. Pasang onSnapshot() langsung ke Firestore client SDK -> setiap
 *     kali dokumen `orders/{id}` berubah (misal PENDING -> PAID oleh
 *     webhook di server), UI ter-update REALTIME tanpa polling.
 *  3. QR di-render dari field `qrisString` yang sudah dinamis (ada nominal).
 */
export default function OrderPage({ params }) {
  const { id } = params;
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const ref = doc(db, "orders", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        setOrder({ id: snap.id, ...snap.data() });
      },
      (err) => {
        console.error("Realtime listener error:", err);
      }
    );

    return () => unsub(); // cleanup listener saat komponen unmount
  }, [id]);

  if (notFound) {
    return <p className="text-rose-400 text-center mt-10">Order tidak ditemukan.</p>;
  }

  if (!order) {
    return <p className="text-slate-400 text-center mt-10">Memuat order...</p>;
  }

  const statusBadge = {
    PENDING: (
      <span className="badge-pending">
        <span className="dot" /> Menunggu Pembayaran
      </span>
    ),
    PAID: <span className="badge-success">✓ Sudah Dibayar</span>,
    EXPIRED: <span className="badge-rejected">Kedaluwarsa</span>,
  }[order.status];

  return (
    <main className="flex flex-col gap-6 items-center">
      <h1 className="text-xl font-bold">Scan QRIS untuk Bayar</h1>

      <div className="glass-panel flex flex-col items-center gap-4 w-full">
        {statusBadge}

        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={order.qrisString} size={220} />
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm">Total Bayar</p>
          <p className="text-3xl font-extrabold">
            Rp{Number(order.amount).toLocaleString("id-ID")}
          </p>
        </div>

        <div className="w-full text-sm text-slate-400 border-t border-white/10 pt-3 flex flex-col gap-1">
          <div className="flex justify-between">
            <span>Order ID</span>
            <span className="text-slate-200">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Fee</span>
            <span className="text-slate-200">
              Rp{Number(order.fee).toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Diterima Merchant</span>
            <span className="text-slate-200">
              Rp{Number(order.netAmount).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {order.status === "PAID" && (
          <p className="text-emerald-400 text-sm text-center">
            Pembayaran berhasil diverifikasi ✅ Saldo sudah masuk ke merchant.
          </p>
        )}
      </div>
    </main>
  );
}
