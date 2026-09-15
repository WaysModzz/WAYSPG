import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase";
import { generateDynamicQris } from "@/lib/qris";
import { calculateQrisFee } from "@/lib/fee";

/**
 * POST /api/create-order
 * Alur data:
 *  1. Terima { amount, userId } dari form /pay.
 *  2. Hitung fee & net amount (lib/fee.js).
 *  3. Generate QRIS dinamis berisi nominal gross (lib/qris.js).
 *  4. Simpan dokumen baru ke koleksi `orders` status PENDING.
 *  5. Balikin orderId supaya client redirect ke /order/[id].
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { amount, userId } = body;

    if (!amount || Number(amount) < 1000) {
      return NextResponse.json(
        { error: "Nominal minimal Rp1.000" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { error: "userId (merchant) wajib diisi" },
        { status: 400 }
      );
    }

    const { gross, fee, net } = calculateQrisFee(Number(amount));

    const qrisStatic = process.env.QRIS_STATIC_STRING;
    const qrisString = generateDynamicQris(qrisStatic, gross);

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(); // auto-id

    const orderData = {
      userId,
      amount: gross,
      fee,
      netAmount: net,
      qrisString,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      // expiredAt bisa dipakai cron/scheduled function untuk auto-expire
      expiredAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    await orderRef.set(orderData);

    return NextResponse.json({ orderId: orderRef.id, ...orderData });
  } catch (err) {
    console.error("create-order error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
