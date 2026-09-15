import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase";

/**
 * POST /api/webhook
 * Dipanggil oleh Payment Provider / PJSP saat QRIS berhasil dibayar.
 *
 * Alur data & keamanan:
 *  1. Verifikasi signature (HMAC-SHA256) memakai WEBHOOK_SECRET supaya
 *     hanya provider asli yang bisa memicu perubahan saldo.
 *  2. Cari order berdasarkan orderId yang dikirim provider.
 *  3. Jalankan db.runTransaction() supaya:
 *       a. Order hanya bisa diproses SEKALI (idempotent, cegah race
 *          condition kalau provider retry webhook).
 *       b. Status PENDING -> PAID dan penambahan saldo user terjadi
 *          ATOMIC (all-or-nothing).
 *
 * Payload contoh (sesuaikan dengan provider asli yang dipakai):
 * { "orderId": "abc123", "amount": 50000, "referenceId": "PRV-999" }
 * Header: x-signature: HMAC-SHA256(body, WEBHOOK_SECRET)
 */
export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { orderId, amount, referenceId } = payload;

    if (!orderId) {
      return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
    }

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);

    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const order = orderSnap.data();

      // Idempotency guard: kalau sudah PAID, jangan diproses lagi meski
      // webhook dikirim berkali-kali oleh provider (retry mechanism).
      if (order.status === "PAID") {
        return { alreadyProcessed: true, order };
      }

      if (order.status !== "PENDING") {
        throw new Error(`ORDER_STATUS_INVALID:${order.status}`);
      }

      // Validasi nominal cocok dengan yang tercatat di order (anti tampering)
      if (amount && Number(amount) !== Number(order.amount)) {
        throw new Error("AMOUNT_MISMATCH");
      }

      const userRef = db.collection("users").doc(order.userId);
      const userSnap = await tx.get(userRef);

      const currentBalance = userSnap.exists ? userSnap.data().balance || 0 : 0;
      const newBalance = currentBalance + order.netAmount;

      // 1. Update status order
      tx.update(orderRef, {
        status: "PAID",
        paidAt: new Date().toISOString(),
        providerReferenceId: referenceId || null,
      });

      // 2. Tambah saldo merchant (create doc user jika belum ada)
      tx.set(
        userRef,
        { balance: newBalance, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      return { alreadyProcessed: false, order: { ...order, status: "PAID" } };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("webhook error:", err);

    const knownErrors = ["ORDER_NOT_FOUND", "AMOUNT_MISMATCH"];
    const isKnown = knownErrors.some((k) => err.message?.startsWith(k));

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: isKnown ? 400 : 500 }
    );
  }
}

/**
 * Verifikasi HMAC-SHA256 signature dari header x-signature.
 * Menggunakan timingSafeEqual untuk mencegah timing attack.
 */
function verifySignature(rawBody, signature) {
  if (!signature) return false;

  const secret = process.env.WEBHOOK_SECRET;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
