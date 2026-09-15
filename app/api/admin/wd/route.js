import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase";

/**
 * GET  /api/admin/wd   -> list withdrawal berstatus PENDING
 * POST /api/admin/wd   -> { wdId, action: "APPROVE" | "REJECT" }
 *
 * Keamanan: divalidasi via header x-admin-key dibandingkan ADMIN_SECRET_KEY.
 * Di produksi sebaiknya diganti Firebase Auth + custom claim `role: admin`
 * supaya tercatat siapa admin yang melakukan approval (audit trail).
 *
 * Alur data approve/reject (db.runTransaction, atomic):
 *  - APPROVE: balance dipotong sebesar totalDeducted, heldAmount dilepas
 *    sebesar totalDeducted yang sama, status WD -> SUCCESS.
 *  - REJECT : heldAmount dilepas, balance TIDAK berubah, status WD -> REJECTED.
 *  - Kedua aksi memvalidasi status WD masih PENDING di dalam transaksi
 *    supaya tidak bisa di-approve/reject dua kali (idempotent & race-safe).
 */
function isAuthorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && key === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("withdrawals")
      .where("status", "==", "PENDING")
      .orderBy("createdAt", "desc")
      .get();

    const withdrawals = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ withdrawals });
  } catch (err) {
    console.error("admin list wd error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { wdId, action } = body;

    if (!wdId || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "wdId/action tidak valid" }, { status: 400 });
    }

    const db = getAdminDb();
    const wdRef = db.collection("withdrawals").doc(wdId);

    const result = await db.runTransaction(async (tx) => {
      const wdSnap = await tx.get(wdRef);
      if (!wdSnap.exists) throw new Error("WD_NOT_FOUND");

      const wd = wdSnap.data();
      if (wd.status !== "PENDING") {
        throw new Error(`WD_STATUS_INVALID:${wd.status}`);
      }

      const userRef = db.collection("users").doc(wd.userId);
      const userSnap = await tx.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : { balance: 0, heldAmount: 0 };

      const balance = userData.balance || 0;
      const heldAmount = userData.heldAmount || 0;

      if (action === "APPROVE") {
        // Potong balance riil, lepas hold
        tx.set(
          userRef,
          {
            balance: balance - wd.totalDeducted,
            heldAmount: Math.max(0, heldAmount - wd.totalDeducted),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        tx.update(wdRef, {
          status: "SUCCESS",
          processedAt: new Date().toISOString(),
        });

        return { status: "SUCCESS" };
      } else {
        // REJECT: balance tidak berubah, cuma lepas hold
        tx.set(
          userRef,
          {
            heldAmount: Math.max(0, heldAmount - wd.totalDeducted),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        tx.update(wdRef, {
          status: "REJECTED",
          processedAt: new Date().toISOString(),
        });

        return { status: "REJECTED" };
      }
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("admin wd action error:", err);

    const knownErrors = ["WD_NOT_FOUND", "WD_STATUS_INVALID"];
    const isKnown = knownErrors.some((k) => err.message?.startsWith(k));

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: isKnown ? 400 : 500 }
    );
  }
}
