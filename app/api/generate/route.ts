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
  getGenerateModel,
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

    /* ── 2. Kirim ke Gemini 1.5 Flash ─────────────────── */
    const model = getGenerateModel();

    const prompt = `Buatkan draf Surat Perjanjian Kerja (SPK) yang formal, seimbang, dan melindungi UMKM (Pihak Kedua). Gunakan data berikut:

---ATURAN FORMAT KRITIS (WAJIB DIIKUTI)---
- DILARANG KERAS menggunakan karakter ** (double asterisk) atau * (single asterisk) di mana pun di dalam teks.
- Gunakan # untuk judul dokumen, ## untuk judul pasal, ### untuk sub-bagian.
- Gunakan tanda - (minus/strip) untuk daftar poin, BUKAN tanda *.
- Teks paragraf ditulis biasa tanpa asterisk apa pun. Jika ingin menekankan kata, gunakan HURUF KAPITAL.

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

${body.instruksiKhusus ? `INSTRUKSI TAMBAHAN KHUSUS PENGGUNA (Prioritaskan ketentuan ini):
- ${body.instruksiKhusus}` : ""}

---ATURAN PERUMUSAN DRAF---
- Pastikan hak dan kewajiban kedua belah pihak diatur secara adil dan seimbang.
- Masukkan pasal perlindungan UMKM: denda keterlambatan pembayaran oleh Pihak Pertama (berlaku dua arah), batas tanggung jawab maksimal (Limit of Liability), klausul pengalihan HAKI setelah pelunasan 100%, kondisi force majeure yang rasional, dan kompensasi jika proyek dibatalkan sepihak oleh klien.
- Draf harus LENGKAP: pembuka & dasar hukum, identitas para pihak, lingkup pekerjaan, jangka waktu, nilai & termin pembayaran, hak & kewajiban, HAKI, force majeure, wanprestasi & sanksi, pembatalan & ganti rugi, penyelesaian sengketa (musyawarah/mediasi/arbitrase), dan penutup.
- Buat minimal 12 pasal yang detail, setiap pasal minimal 2-3 ayat.`;

    const result = await model.generateContent(prompt);
    let draftMarkdown = extractResponseText(result);

    // Post-processing: bersihkan karakter ** dan * yang tersesat dari output AI
    draftMarkdown = draftMarkdown
      .replace(/\*\*(.*?)\*\*/g, "$1")  // Ubah **bold** jadi teks biasa
      .replace(/\*(.*?)\*/g, "$1")       // Ubah *italic* jadi teks biasa
      .replace(/\*{1,2}/g, "");          // Hapus sisa * yang tersendiri

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
          error: "Batas kuota harian Gemini API gratis Anda telah habis (Maksimum 20 permintaan/hari untuk model gemini-2.5-flash). Silakan gunakan API Key yang berbeda di file .env.local atau coba lagi setelah kuota harian Anda di-reset secara otomatis oleh Google.",
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
