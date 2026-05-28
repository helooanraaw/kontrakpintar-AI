/**
 * app/api/analyze/route.ts
 * ─────────────────────────────────────────────────────────────
 * Route Handler (POST) — Analisis Dokumen Kontrak
 *
 * Menerima teks kontrak dari frontend, mengirimnya ke
 * Gemini 1.5 Flash, dan mengembalikan JSON terstruktur
 * berisi skor keamanan, red flags, dan rekomendasi.
 * ─────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import {
  getAnalyzeModel,
  extractResponseText,
  type AnalyzeRequest,
  type AnalysisResult,
} from "@/lib/gemini";

/* ──────────────────────────────────────────────────────────
   POST /api/analyze
   Body: { contractText: string }
   Response: AnalysisResult (JSON)
   ────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    /* ── 1. Parse & validasi payload ───────────────────── */
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.contractText || typeof body.contractText !== "string") {
      return Response.json(
        {
          error: "Teks kontrak wajib diisi.",
          code: "MISSING_CONTRACT_TEXT",
        },
        { status: 400 }
      );
    }

    const contractText = body.contractText.trim();

    if (contractText.length < 50) {
      return Response.json(
        {
          error:
            "Teks kontrak terlalu pendek. Minimal 50 karakter agar analisis akurat.",
          code: "CONTRACT_TOO_SHORT",
        },
        { status: 400 }
      );
    }

    if (contractText.length > 50_000) {
      return Response.json(
        {
          error:
            "Teks kontrak terlalu panjang. Maksimal 50.000 karakter.",
          code: "CONTRACT_TOO_LONG",
        },
        { status: 400 }
      );
    }

    /* ── 2. Kirim ke Gemini 1.5 Flash ─────────────────── */
    const model = getAnalyzeModel();

    const prompt = `Analisis kontrak berikut dan identifikasi semua pasal yang berpotensi merugikan pihak UMKM:

---MULAI KONTRAK---
${contractText}
---AKHIR KONTRAK---

Berikan analisis lengkap sesuai format JSON yang diminta.`;

    const result = await model.generateContent(prompt);
    const responseText = extractResponseText(result);

    /* ── 3. Parse respons JSON dari Gemini ────────────── */
    let analysis: AnalysisResult;

    try {
      analysis = JSON.parse(responseText) as AnalysisResult;
    } catch {
      // Fallback: coba extract JSON dari dalam teks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;
      } else {
        throw new Error("Respons Gemini bukan JSON valid.");
      }
    }

    /* ── 4. Validasi & normalisasi data ───────────────── */
    // Pastikan skor keamanan berada di range 0-100
    analysis.skorKeamanan = Math.max(
      0,
      Math.min(100, Math.round(analysis.skorKeamanan))
    );

    // Pastikan jumlah bahaya tidak melebihi total pasal
    if (analysis.jumlahBahaya > analysis.totalPasal) {
      analysis.jumlahBahaya = analysis.totalPasal;
    }

    // Normalisasi tingkat keparahan
    analysis.redFlags = analysis.redFlags.map((flag) => ({
      ...flag,
      tingkatKeparahan: (["kritis", "sedang", "ringan"] as const).includes(
        flag.tingkatKeparahan
      )
        ? flag.tingkatKeparahan
        : "sedang",
    }));

    /* ── 5. Kembalikan respons sukses ─────────────────── */
    return Response.json(analysis, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[/api/analyze] Error:", error);

    /* ── Error handling granular ──────────────────────── */
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";

    // Deteksi rate limit / kuota habis dari Gemini
    const isRateLimit =
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("quota") ||
      message.includes("Quota");

    if (isRateLimit) {
      return Response.json(
        {
          error:
            "Batas kuota harian Gemini API gratis Anda telah habis (Maksimum 20 permintaan/hari untuk model gemini-2.5-flash). Silakan gunakan API Key yang berbeda di file .env.local atau coba lagi setelah kuota harian Anda di-reset secara otomatis oleh Google.",
          code: "RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        error: "Gagal menganalisis kontrak. Silakan coba lagi.",
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
