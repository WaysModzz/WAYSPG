# Ways Tamvanz — QRIS Dinamis & Withdrawal Gateway

## Setup

1. `npm install`
2. Copy `.env.example` -> `.env.local`, isi:
   - Kredensial Firebase Client (dari Firebase Console -> Project Settings).
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: base64 dari file JSON service account
     Firebase Admin. Generate dengan:
     ```bash
     base64 -i service-account.json | tr -d '\n'
     ```
   - `QRIS_STATIC_STRING`: string QRIS statis asli dari PJSP/acquirer kamu.
   - `WEBHOOK_SECRET` & `ADMIN_SECRET_KEY`: ganti dengan random string kuat.
3. `npm run dev`

## Struktur Data Firestore

**`orders/{orderId}`**
```
userId, amount, fee, netAmount, qrisString, status (PENDING|PAID|EXPIRED),
createdAt, paidAt, expiredAt
```

**`users/{userId}`**
```
balance, heldAmount, updatedAt
```

**`withdrawals/{wdId}`**
```
userId, amount, fee, totalDeducted, bank, accountNumber, accountName,
status (PENDING|SUCCESS|REJECTED), createdAt, processedAt
```

## Catatan Produksi

- Ganti auth admin (`x-admin-key`) dengan Firebase Auth + custom claim.
- Tambahkan Firestore Security Rules yang ketat (client hanya boleh READ
  `orders`, semua WRITE lewat Admin SDK di server).
- Tambahkan scheduled function untuk auto-expire order PENDING yang lewat
  `expiredAt`.
- Sesuaikan format payload `/api/webhook` dengan dokumentasi PJSP/payment
  provider yang benar-benar dipakai (nama field & mekanisme signature bisa
  berbeda per provider).
