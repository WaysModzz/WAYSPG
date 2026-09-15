/**
 * lib/firebase.js
 * ---------------------------------------------------------------------------
 * Satu file untuk 2 SDK berbeda:
 *  - Firebase CLIENT SDK  -> dipakai di Client Component (browser) untuk
 *    realtime listener (onSnapshot) di halaman /order/[id].
 *  - Firebase ADMIN SDK   -> dipakai di API Route (server) untuk operasi
 *    yang butuh privilege penuh (runTransaction saldo, bypass security rules).
 *
 * Keduanya di-export dari file yang sama tapi TIDAK saling bentrok karena
 * Next.js App Router memisahkan bundle server & client secara otomatis
 * ("use client" di file pemanggil menentukan bundle mana yang dipakai).
 * ---------------------------------------------------------------------------
 */

const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

const admin = require("firebase-admin");

// ---------------------------------------------------------------------------
// CLIENT SDK (aman untuk browser, hanya berisi public API key)
// ---------------------------------------------------------------------------
const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const clientApp = getApps().length ? getApp() : initializeApp(clientConfig);
const db = getFirestore(clientApp);

// ---------------------------------------------------------------------------
// ADMIN SDK (server only — JANGAN pernah import file ini dari Client Component)
// ---------------------------------------------------------------------------
function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 belum di-set di .env.local"
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(b64, "base64").toString("utf-8")
  );

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function getAdminDb() {
  getAdminApp();
  return admin.firestore();
}

module.exports = {
  db, // Firestore client instance (browser)
  getAdminDb, // Firestore admin instance (server, lazy-init singleton)
  admin,
};
