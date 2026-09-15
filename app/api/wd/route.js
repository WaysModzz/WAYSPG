import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase";
import { calculateWithdrawalFee } from "@/lib/fee";

/**
 * POST /api/wd
 * Alur data & anti race-condition:
 *  - Sesuai spesifikasi bisnis, saldo BARU benar-benar dipotong saat admin
 *    APPROVE. Tapi supaya merchant tidak bisa mengajukan WD berkali-kali
 *    melebihi saldo yang dimiliki SEBELUM admin sempat approve, kita pakai
 *    field `heldAmount` di dokumen user:
 *      - Saat request WD dibuat -> heldAmount bertambah (dana "dikunci").
 *      - Saat admin APPROVE -> balance dipotong & heldAmount dilepas.
 *      - Saat admin REJECT  -> heldAmount dilepas, balance tidak berubah.
 *  - Proses baca-saldo + tulis-hold + buat-dokumen WD dibungkus dalam
 *    1 db.runTransaction() supaya atomic terhadap request WD paralel.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, amount, bank, accountNumber, accountName } = body;

    if (!userId || !amount || !bank || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }
    if (Number(amount) < 10000) {
      return NextResponse.json(
        { error: "Minimal penarikan Rp10.000" },
        { status: 400 }
      );
    }

    const { requested, fee, totalDeducted } = calculateWithdrawalFee(Number(amount));

    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);
    const wdRef = db.collection("withdrawals").doc(); // auto-id

    const wdData = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : { balance: 0, heldAmount: 0 };

      const balance = userData.balance || 0;
      const heldAmount = userData.heldAmount || 0;
      const available = balance - heldAmount;

      if (available < totalDeducted) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Kunci dana sebesar totalDeducted (nominal + fee) supaya tidak
      // bisa dipakai lagi oleh request WD lain sebelum ini diproses admin.
      tx.set(
        userRef,
        { heldAmount: heldAmount + totalDeducted, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      const data = {
        userId,
        amount: requested,
        fee,
        totalDeducted,
        bank,
        accountNumber,
        accountName,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };

      tx.set(wdRef, data);

      return { id: wdRef.id, ...data };
    });

    return NextResponse.json({ ok: true, withdrawal: wdData });
  } catch (err) {
    console.error("wd request error:", err);

    if (err.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Saldo tidak mencukupi untuk penarikan ini" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
