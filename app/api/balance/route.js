import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase";

/**
 * GET /api/balance?userId=xxx
 * Mengembalikan saldo available (balance - heldAmount yang sedang dalam
 * proses withdrawal PENDING), supaya user tidak salah kira saldo yang
 * sudah "dikunci" untuk WD masih bisa dipakai.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("users").doc(userId).get();
    const data = snap.exists ? snap.data() : { balance: 0, heldAmount: 0 };

    const balance = data.balance || 0;
    const heldAmount = data.heldAmount || 0;

    return NextResponse.json({
      balance: balance - heldAmount, // saldo yang benar-benar bisa ditarik
      rawBalance: balance,
      heldAmount,
    });
  } catch (err) {
    console.error("balance error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
