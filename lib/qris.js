/**
 * lib/qris.js
 * ---------------------------------------------------------------------------
 * Alur data:
 *  1. Merchant punya 1 QRIS STATIS (dari PJSP/acquirer, tersimpan di ENV).
 *  2. Saat ada order baru, kita "suntik" nominal transaksi ke body QRIS
 *     (tag 54) dan ubah flag Point of Initiation Method (tag 01) dari
 *     "11" (statis, reusable) -> "12" (dinamis, sekali pakai / bernilai).
 *  3. Setelah body berubah, CRC16 (tag 63) WAJIB dihitung ulang karena
 *     checksum lama sudah tidak valid untuk payload baru.
 *  4. String hasil inilah yang di-render jadi QR image di /order/[id].
 * ---------------------------------------------------------------------------
 */

/**
 * Hitung CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) sesuai spesifikasi
 * EMVCo QR Code Specification for Payment Systems yang dipakai QRIS.
 * @param {string} str - payload tanpa tag 63 (CRC), tapi SUDAH termasuk "6304"
 * @returns {string} CRC 4 digit hex uppercase
 */
function crc16ccitt(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Bangun 1 elemen TLV (Tag-Length-Value) format EMVCo.
 * @param {string} tag - 2 digit tag, misal "54"
 * @param {string} value
 */
function tlv(tag, value) {
  const length = String(value.length).padStart(2, "0");
  return `${tag}${length}${value}`;
}

/**
 * Ambil value dari 1 tag tertentu di payload EMVCo (untuk parsing/debug).
 * @param {string} payload
 * @param {string} tag
 */
function getTagValue(payload, tag) {
  let i = 0;
  while (i < payload.length) {
    const t = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    const value = payload.substring(i + 4, i + 4 + len);
    if (t === tag) return value;
    i += 4 + len;
  }
  return null;
}

/**
 * Parsing seluruh payload EMVCo jadi object { tag: value } — berguna untuk
 * debugging / menampilkan isi QRIS statis di dashboard admin.
 */
function parseEmvco(payload) {
  const result = {};
  let i = 0;
  while (i < payload.length) {
    const t = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const value = payload.substring(i + 4, i + 4 + len);
    result[t] = value;
    i += 4 + len;
  }
  return result;
}

/**
 * Konversi QRIS STATIS -> QRIS DINAMIS dengan nominal tertentu.
 * @param {string} qrisStatis - raw string QRIS statis dari merchant/acquirer
 * @param {number} amount - nominal transaksi (integer, rupiah)
 * @param {object} [opts]
 * @param {number} [opts.serviceFee] - opsional, nominal fee yang mau
 *        ditampilkan terpisah di tag 55/56 (jarang dipakai, default skip)
 * @returns {string} QRIS dinamis siap di-generate jadi gambar QR
 */
function generateDynamicQris(qrisStatis, amount, opts = {}) {
  if (!qrisStatis) throw new Error("QRIS_STATIC_STRING belum dikonfigurasi");
  if (!amount || amount <= 0) throw new Error("Nominal QRIS tidak valid");

  // 1. Buang 4 karakter terakhir (tag 63 CRC lama) supaya bisa dihitung ulang
  let body = qrisStatis.slice(0, -4);

  // 2. Ubah Point of Initiation Method: 010211 (statis) -> 010212 (dinamis)
  if (body.includes("010211")) {
    body = body.replace("010211", "010212");
  }

  // 3. Sisipkan tag 54 (Transaction Amount) SEBELUM tag 58 (Country Code "ID")
  //    karena urutan tag EMVCo bersifat sequential dan tag 58 wajib ada.
  const amountTag = tlv("54", String(Math.round(amount)));
  const countryTagIndex = body.indexOf("5802ID");

  if (countryTagIndex === -1) {
    throw new Error("Format QRIS statis tidak dikenali (tag 58 tidak ditemukan)");
  }

  body =
    body.slice(0, countryTagIndex) + amountTag + body.slice(countryTagIndex);

  // 4. Hitung ulang CRC atas body + prefix tag "6304"
  const payloadForCrc = `${body}6304`;
  const crc = crc16ccitt(payloadForCrc);

  return `${payloadForCrc}${crc}`;
}

module.exports = {
  crc16ccitt,
  tlv,
  getTagValue,
  parseEmvco,
  generateDynamicQris,
};
