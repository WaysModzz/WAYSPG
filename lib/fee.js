/**
 * lib/fee.js
 * ---------------------------------------------------------------------------
 * Semua kalkulasi potongan fee dipusatkan di sini supaya konsisten antara
 * create-order (estimasi ke user) dan webhook (settlement final ke saldo).
 * ---------------------------------------------------------------------------
 */

const QRIS_FEE_PERCENT = parseFloat(process.env.QRIS_FEE_PERCENT || "0.007"); // 0.7% MDR default
const WD_FEE_FIXED = parseInt(process.env.WD_FEE_FIXED || "2500", 10);

/**
 * Hitung fee QRIS (MDR) dari nominal transaksi.
 * Dibulatkan ke atas (ceil) supaya merchant tidak dirugikan pembulatan.
 * @param {number} amount - nominal gross yang dibayar customer
 * @returns {{ gross:number, fee:number, net:number }}
 */
function calculateQrisFee(amount) {
  const gross = Math.round(amount);
  const fee = Math.ceil(gross * QRIS_FEE_PERCENT);
  const net = gross - fee;
  return { gross, fee, net };
}

/**
 * Hitung fee penarikan saldo (withdrawal). Flat fee per transaksi.
 * @param {number} amount - nominal yang diminta merchant untuk ditarik
 * @returns {{ requested:number, fee:number, totalDeducted:number, willReceive:number }}
 */
function calculateWithdrawalFee(amount) {
  const requested = Math.round(amount);
  const fee = WD_FEE_FIXED;
  // Saldo yang dipotong dari merchant = nominal yang mereka minta diterima + fee
  const totalDeducted = requested + fee;
  return { requested, fee, totalDeducted, willReceive: requested };
}

module.exports = {
  QRIS_FEE_PERCENT,
  WD_FEE_FIXED,
  calculateQrisFee,
  calculateWithdrawalFee,
};
