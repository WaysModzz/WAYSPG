import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase";

/**
 * GET /api/order/[id]
 * Fallback fetch (non-realtime) untuk detail order — berguna untuk
 * server-side rendering awal atau dipanggil dari luar (misal cek status
 * dari sistem lain), sementara UI utama tetap pakai onSnapshot langsung.
 */
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const db = getAdminDb();
    const snap = await db.collection("orders").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("get order error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
