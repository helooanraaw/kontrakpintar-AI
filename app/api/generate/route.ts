/**
 * app/api/generate/route.ts
 * ─────────────────────────────────────────────────────────────
 * Route Handler (POST) — Pembuatan Surat Perjanjian Kerja (SPK)
 *
 * Menerima formulir data pihak dan nilai transaksi, mengirimnya
 * ke Gemini 1.5 Flash, dan mengembalikan teks draf hukum formal
 * berbasis Markdown.
 * ─────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import {
  generateContentWithFallback,
  extractResponseText,
  type GenerateRequest,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    /* ── 1. Parse & validasi payload ───────────────────── */
    const body = (await request.json()) as GenerateRequest;

    if (!body.pihakPertama?.nama || !body.pihakKedua?.nama) {
      return Response.json(
        {
          error: "Nama Pihak Pertama dan Pihak Kedua wajib diisi.",
          code: "MISSING_NAMES",
        },
        { status: 400 }
      );
    }

    if (!body.detailJasa?.lingkupKerja || !body.detailJasa?.tenggatWaktu) {
      return Response.json(
        {
          error: "Lingkup pekerjaan dan tenggat waktu wajib diisi.",
          code: "MISSING_SERVICE_DETAILS",
        },
        { status: 400 }
      );
    }

    if (!body.pembayaran?.nilaiKontrak) {
      return Response.json(
        {
          error: "Nilai kontrak wajib diisi.",
          code: "MISSING_PAYMENT_DETAILS",
        },
        { status: 400 }
      );
    }

    /* ── 2. Kirim ke Gemini (dengan Fallback otomatis) ── */

    const prompt = `Buatkan draf Surat Perjanjian Kerja (SPK) yang formal, seimbang, sangat lengkap, dan melindungi UMKM (Pihak Kedua). Ikuti instruksi di bawah ini dengan disiplin penuh:

---DATA PERJANJIAN---
PIHAK PERTAMA (Pemberi Tugas/Klien):
- Nama: ${body.pihakPertama.nama}
- Domisili: ${body.pihakPertama.domisili || "Kota Domisili Pihak Pertama"}

PIHAK KEDUA (Penerima Kerja/UMKM/Penyedia Jasa):
- Nama: ${body.pihakKedua.nama}
- Domisili: ${body.pihakKedua.domisili || "Kota Domisili Pihak Kedua"}

DETAIL PEKERJAAN:
- Lingkup Kerja: ${body.detailJasa.lingkupKerja}
- Jangka Waktu Penyelesaian: ${body.detailJasa.tenggatWaktu}

NILAI KONTRAK & PEMBAYARAN:
- Total Nilai Kontrak: Rp ${body.pembayaran.nilaiKontrak}
- Uang Muka (DP): ${body.pembayaran.persentaseDP || "0"}%
- Sanksi Keterlambatan Pihak Kedua: ${body.pembayaran.sanksiKeterlambatan || "Standar (0.1% per hari, maks 5% dari nilai kontrak)"}

${body.instruksiKhusus ? `INSTRUKSI TAMBAHAN KHUSUS PENGGUNA (Prioritaskan ketentuan ini):\n- ${body.instruksiKhusus}` : ""}

---ATURAN FORMAT DRAF---
1. JANGAN PERNAH menyisipkan tag HTML seperti <p>, <p align="center">, <center>, atau tag HTML lainnya ke dalam dokumen draf. Gunakan Markdown murni saja.
2. Gunakan # untuk judul dokumen, ## untuk judul pasal (e.g., ## PASAL 1 - RUANG LINGKUP PEKERJAAN), ### untuk sub-bagian.
3. Gunakan ** (double asterisk) HANYA untuk menebalkan kata atau teks penting di dalam kalimat, seperti nama Pihak (**PIHAK PERTAMA**, **PIHAK KEDUA**, **PARA PIHAK**). JANGAN menebalkan nomor ayat, nomor pasal, atau judul rincian daftar.
4. JANGAN menggunakan bullet points (- atau *) di dalam pasal hukum. Di dalam pasal, jika ada daftar rincian/poin, gunakan huruf kecil (a., b., c., dst.) atau angka (1., 2., 3., dst.) dengan lekukan 4 spasi di depannya. Simbol bullet/minus (-) hanya boleh digunakan di bagian luar pasal, seperti pada Klausul Premis (Bahwa...).
5. JANGAN menggunakan bullet points (- atau *) untuk menuliskan detail identitas pihak (Nama, Domisili, Jabatan, dll.). Tulis identitas pihak sebagai paragraf biasa dengan titik dua (:) sejajar tanpa simbol poin atau angka di depannya.
6. JANGAN PERNAH membuat area tanda tangan, kolom tanda tangan, tabel tanda tangan, atau kolom nama penandatangan di bagian akhir dokumen SPK. Sistem kami secara otomatis menambahkan area tanda tangan di bagian paling bawah.
7. PENULISAN NOMOR AYAT: Setiap ayat di dalam pasal harus ditulis di baris baru dan diawali dengan nomor ayat dalam tanda kurung biasa seperti (1), (2), (3) dst. DILARANG KERAS menuliskan nomor ayat menggunakan cetak tebal seperti **1** atau **(1)**. Gunakan teks biasa.
8. PENULISAN DAFTAR BERSARANG (NESTED LISTS): Jika rincian daftar berada di bawah suatu ayat, gunakan indentasi 4 spasi di depan huruf/angka sub-daftar.

---PERINGATAN KERAS - BACA DAN PATUHI SEPENUHNYA---
KAMU WAJIB MENULISKAN SELURUH 14 PASAL DAN KLAUSUL PEMBUKA & PENUTUP SECARA PENUH DAN SELESAI.
DILARANG KERAS BERHENTI DI TENGAH JALAN atau MEMOTONG isi pasal dengan frasa seperti "... (dan seterusnya)", "(dilanjutkan)", "(silakan lengkapi)", atau sejenisnya.
Setiap pasal HARUS BERISI KALIMAT HUKUM YANG UTUH DAN LENGKAP — bukan ringkasan, bukan poin singkat satu baris saja.

---CONTOH STANDAR KUALITAS PENULISAN PASAL---
Berikut adalah CONTOH standar minimum kualitas satu pasal. Setiap pasal yang kamu hasilkan harus setara atau lebih panjang dari contoh ini:

## PASAL 9 - WANPRESTASI DAN SANKSI KETERLAMBATAN

(1) Suatu pihak dinyatakan telah melakukan wanprestasi apabila terbukti tidak memenuhi satu atau lebih kewajiban yang diatur dalam Perjanjian ini setelah menerima surat peringatan tertulis dari pihak lainnya dan tidak melakukan perbaikan dalam jangka waktu 7 (tujuh) hari kalender sejak surat peringatan diterima.

(2) Dalam hal **PIHAK KEDUA** terlambat menyelesaikan pekerjaan melampaui batas waktu yang telah ditetapkan dalam Pasal 2 Perjanjian ini yang bukan disebabkan oleh keadaan memaksa sebagaimana diatur dalam Pasal 12 atau kelalaian **PIHAK PERTAMA** dalam menyediakan data dan materi yang diperlukan, maka **PIHAK KEDUA** dikenakan denda keterlambatan sebesar 0,1% (nol koma satu persen) dari total nilai kontrak untuk setiap hari keterlambatan.

(3) Akumulasi denda keterlambatan yang dapat dikenakan kepada **PIHAK KEDUA** sebagaimana dimaksud pada ayat (2) pasal ini dibatasi secara mutlak paling banyak sebesar 5% (lima persen) dari total nilai kontrak. Apabila batas maksimal denda tersebut telah tercapai, **PIHAK PERTAMA** berhak mengajukan pemutusan perjanjian sesuai ketentuan Pasal 13.

(4) Dalam hal **PIHAK PERTAMA** terlambat melakukan pembayaran melampaui batas waktu yang telah ditetapkan dalam Pasal 4 Perjanjian ini, maka **PIHAK PERTAMA** dikenakan bunga keterlambatan pembayaran sebesar 0,1% (nol koma satu persen) dari jumlah yang terutang untuk setiap hari keterlambatan, yang wajib dibayarkan bersama-sama dengan pokok pembayaran yang tertunggak.

---ATURAN ISI PER PASAL (WAJIB DIIKUTI)---
Susun pasal-pasal berikut secara berurutan. Setiap pasal yang kamu tulis HARUS memuat SELURUH ayat yang disebutkan, ditulis secara PANJANG, PENUH, dan DETAIL:

1. # SURAT PERJANJIAN KERJA (Judul Utama)
2. Paragraf pembuka berisi hari, tanggal, bulan, tahun, dan tempat kesepakatan dibuat.
3. Identitas Lengkap Para Pihak (PIHAK PERTAMA dan PIHAK KEDUA) tanpa simbol poin/bullet. Sertakan nama lengkap, jabatan/pekerjaan, nomor identitas, dan domisili.
4. Klausul Premis (minimal 3 poin "Bahwa..." yang melatarbelakangi kesepakatan).
5. ## PASAL 1 - LINGKUP PEKERJAAN
   Ayat (1) Deskripsikan secara detail rincian keseluruhan lingkup pekerjaan yang menjadi tanggung jawab Pihak Kedua, mencakup semua sub-pekerjaan.
   Ayat (2) Daftar sub-ruang lingkup pekerjaan secara terperinci (minimal 4 poin a., b., c., d. dst.).
   Ayat (3) Standar kualitas dan kriteria penerimaan hasil kerja yang harus dipenuhi.
   Ayat (4) Batasan lingkup pekerjaan — pekerjaan apa saja yang TIDAK termasuk dalam kontrak ini.
6. ## PASAL 2 - JANGKA WAKTU PERJANJIAN
   Ayat (1) Masa berlaku perjanjian (tanggal mulai dan berakhir).
   Ayat (2) Batas waktu penyelesaian pekerjaan oleh Pihak Kedua secara spesifik.
   Ayat (3) Definisi Hari Kerja yang berlaku dalam perjanjian ini.
   Ayat (4) Prosedur dan syarat perpanjangan jangka waktu secara tertulis jika ada hambatan yang sah.
7. ## PASAL 3 - NILAI KONTRAK DAN BIAYA JASA
   Ayat (1) Total nilai nominal kontrak secara terperinci dalam angka dan huruf.
   Ayat (2) Sifat biaya (harga tetap/fixed price) dan cakupannya.
   Ayat (3) Status pembebanan pajak (PPN/PPh) yang berlaku sesuai peraturan perundang-undangan Republik Indonesia.
   Ayat (4) Ketentuan bahwa segala biaya di luar lingkup pekerjaan harus disepakati tertulis terlebih dahulu.
8. ## PASAL 4 - SKEMA DAN TAHAPAN PEMBAYARAN
   Ayat (1) Rincian tahapan pembayaran (Termin 1/Uang Muka dan Termin 2/Pelunasan) secara nominal rupiah dan persentase.
   Ayat (2) Batas waktu pembayaran setelah tagihan resmi diterima secara tertulis.
   Ayat (3) Keterangan rekening bank tujuan transfer Pihak Kedua (nama bank, nama pemilik rekening).
   Ayat (4) Ketentuan bahwa pembayaran dinyatakan lunas hanya setelah dana diterima dan terkredit di rekening Pihak Kedua.
9. ## PASAL 5 - HAK DAN KEWAJIBAN PIHAK PERTAMA
   Ayat (1) Hak-hak Pihak Pertama (minimal 3 poin rinci: menerima hasil kerja, meminta laporan kemajuan, dll.).
   Ayat (2) Kewajiban-kewajiban Pihak Pertama (minimal 4 poin rinci: membayar tepat waktu, menyediakan data pendukung, memberikan akses, merespons revisi, dll.).
10. ## PASAL 6 - HAK DAN KEWAJIBAN PIHAK KEDUA
    Ayat (1) Hak-hak Pihak Kedua (minimal 3 poin rinci: menerima pembayaran tepat waktu, meminta data pendukung, dll.).
    Ayat (2) Kewajiban-kewajiban Pihak Kedua (minimal 4 poin rinci: menyelesaikan pekerjaan sesuai standar, memberikan laporan berkala, menjaga kerahasiaan, dll.).
11. ## PASAL 7 - HAK KEKAYAAN INTELEKTUAL
    Ayat (1) Status kepemilikan sementara atas hasil karya selama proses pengerjaan.
    Ayat (2) Ketentuan TEGAS bahwa pengalihan penuh Hak Kekayaan Intelektual atas seluruh hasil kerja hanya terjadi secara sah setelah pembayaran LUNAS 100% diterima oleh Pihak Kedua.
    Ayat (3) Status lisensi komponen pihak ketiga, perangkat lunak sumber terbuka (open source), atau aset pihak ketiga yang digunakan.
    Ayat (4) Larangan bagi Pihak Pertama untuk memperbanyak, memodifikasi, atau mengkomersilkan hasil kerja sebelum pelunasan.
12. ## PASAL 8 - PERNYATAAN DAN JAMINAN
    Ayat (1) Jaminan Pihak Kedua bahwa seluruh karya adalah orisinal, dibuat sendiri, dan bebas dari klaim pihak ketiga.
    Ayat (2) Jaminan Pihak Pertama bahwa seluruh data, konten, dan materi yang diserahkan adalah milik sah dan bebas dari sengketa.
    Ayat (3) Jaminan kewenangan hukum masing-masing pihak untuk menandatangani dan melaksanakan perjanjian ini.
13. ## PASAL 9 - WANPRESTASI DAN SANKSI KETERLAMBATAN
    (Tulis LENGKAP seperti contoh di atas — 4 ayat penuh dengan nominal persen yang jelas)
14. ## PASAL 10 - BATAS TANGGUNG JAWAB
    Ayat (1) Batas maksimal ganti rugi Pihak Kedua dibatasi sebesar total nilai kontrak yang diterima.
    Ayat (2) Pengecualian ganti rugi atas kerugian tidak langsung seperti hilangnya keuntungan bisnis, reputasi, atau peluang.
    Ayat (3) Batas waktu pengajuan klaim ganti rugi (maksimal 30 hari setelah proyek diserahterimakan).
15. ## PASAL 11 - KERAHASIAAN INFORMASI
    Ayat (1) Definisi informasi rahasia yang termasuk data bisnis, teknis, keuangan, dan operasional.
    Ayat (2) Kewajiban kedua pihak untuk menjaga kerahasiaan dan tidak mengungkapkan kepada pihak mana pun tanpa izin tertulis.
    Ayat (3) Masa berlaku kewajiban kerahasiaan (tetap mengikat minimal 3 tahun setelah perjanjian berakhir).
    Ayat (4) Pengecualian informasi yang tidak termasuk rahasia (misalnya informasi yang sudah bersifat publik).
16. ## PASAL 12 - KEADAAN MEMAKSA
    Ayat (1) Definisi dan kriteria keadaan memaksa yang mencakup bencana alam, wabah, huru-hara, kebakaran besar, dan kebijakan pemerintah yang melarang pelaksanaan pekerjaan.
    Ayat (2) Prosedur pelaporan keadaan memaksa: pemberitahuan tertulis dalam 3x24 jam dan disertai bukti.
    Ayat (3) Akibat hukum: pembebasan dari denda keterlambatan selama masa keadaan memaksa berlangsung.
    Ayat (4) Prosedur pemulihan dan kelanjutan pekerjaan setelah keadaan memaksa berakhir.
17. ## PASAL 13 - PENGAKHIRAN PERJANJIAN DAN KOMPENSASI
    Ayat (1) Larangan pengakhiran sepihak tanpa kesepakatan tertulis bersama Para Pihak.
    Ayat (2) Kewajiban Pihak Pertama membayar seluruh tagihan atas pekerjaan yang telah diselesaikan secara proporsional jika Pihak Pertama memilih mengakhiri perjanjian.
    Ayat (3) Konsekuensi hukum bahwa Uang Muka menjadi hangus dan tidak dapat dikembalikan jika Pihak Pertama mengakhiri perjanjian tanpa alasan sah.
    Ayat (4) Prosedur pengakhiran atas kesepakatan bersama dan kewajiban masing-masing pihak dalam proses serah terima.
18. ## PASAL 14 - PENYELESAIAN SENGKETA DAN HUKUM YANG BERLAKU
    Ayat (1) Para Pihak sepakat mengutamakan penyelesaian sengketa melalui musyawarah untuk mufakat dalam jangka waktu 30 hari.
    Ayat (2) Jika musyawarah gagal, sengketa diselesaikan melalui mediasi dengan mediator independen yang disepakati bersama.
    Ayat (3) Jika mediasi gagal, Para Pihak sepakat menyelesaikan sengketa melalui Pengadilan Negeri yang berwenang sesuai domisili hukum yang dipilih.
    Ayat (4) Perjanjian ini tunduk pada hukum Republik Indonesia.
19. Paragraf penutup formal (menyatakan perjanjian dibuat dalam rangkap 2, masing-masing memiliki kekuatan hukum yang sama) tanpa menyertakan kolom tanda tangan.
   Setiap pasal di atas WAJIB kamu tuliskan nomor pasalnya dalam format ## PASAL X - NAMA PASAL dan isi setiap ayat secara PENUH LENGKAP dalam kalimat hukum formal yang panjang.`;

    const result = await generateContentWithFallback("generate", prompt);
    let draftMarkdown = extractResponseText(result);

    // Post-processing: normalisasi jika ada asterisks berlebih, tapi pertahankan **
    draftMarkdown = draftMarkdown.replace(/\*{3,}/g, "**");

    /* \u2500\u2500 3. Kembalikan draf SPK \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
    return Response.json(
      { draft: draftMarkdown },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    console.error("[/api/generate] Error:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";

    const isRateLimit =
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("quota") ||
      message.includes("Quota");

    if (isRateLimit) {
      return Response.json(
        {
          error: "Batas kuota harian Gemini API gratis Anda telah habis. Silakan gunakan API Key yang berbeda di file .env.local atau coba lagi setelah beberapa saat.",
          code: "RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        error: "Gagal meramu draf SPK. Silakan coba lagi.",
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
