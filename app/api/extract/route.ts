/**
 * app/api/extract/route.ts
 * ─────────────────────────────────────────────────────────────
 * Route Handler (POST) — Ekstraksi Teks dari File Kontrak
 *
 * Menerima file unggahan (.pdf, .docx, .txt) melalui multipart/form-data,
 * membaca isinya di peladen, lalu mengembalikan teks mentah hasil ekstraksi.
 * ─────────────────────────────────────────────────────────────
 */

import { NextRequest } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function extractTextFromImageWithFallback(
  genAI: GoogleGenerativeAI,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const models = ["gemini-2.5-flash"];
  let lastError: any = null;

  const imagePart = {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: mimeType || "image/jpeg"
    }
  };

  const prompt = "Ekstrak seluruh teks dokumen hukum dalam gambar ini secara lengkap, terstruktur, dan verbatim (tanpa diubah/dikurangi). Jangan lewatkan satupun kata atau angka. JANGAN berikan penjelasan, pendahuluan, kesimpulan, atau komentar apa pun. Cukup kembalikan teks mentah aslinya saja.";

  for (const modelName of models) {
    let retries = 3; // Coba 3 kali untuk model stabil ini
    while (retries > 0) {
      try {
        console.log(`[OCR] Mencoba mengekstrak teks dengan model: ${modelName} (Sisa percobaan: ${retries - 1})`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        if (text && text.trim()) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || "";
        console.warn(`[OCR] Gagal menggunakan ${modelName}:`, errMsg);

        const isTransient = 
          errMsg.includes("503") || 
          errMsg.includes("429") || 
          errMsg.includes("RESOURCE_EXHAUSTED") || 
          errMsg.includes("Service Unavailable") ||
          errMsg.includes("Overloaded") ||
          errMsg.includes("fetch failed") || 
          errMsg.includes("Unavailable");
          
        if (!isTransient) {
          throw err;
        }

        retries--;
        if (retries > 0) {
          console.log(`[OCR] Menunggu 1.5 detik sebelum mencoba lagi...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  throw lastError || new Error("Gagal mengekstrak teks dari gambar setelah beberapa kali percobaan.");
}

export async function POST(request: NextRequest) {
  try {
    /* ── 1. Parse Multipart Form Data ───────────────────── */
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { error: "Berkas tidak ditemukan dalam unggahan.", code: "FILE_NOT_FOUND" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    let extractedText = "";

    /* ── 2. Proses Berdasarkan Tipe Berkas ─────────────── */
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      // Ekstraksi PDF menggunakan kelas PDFParse dari esm build
      let parser: PDFParse | null = null;
      try {
        parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result.text || "";
      } catch (pdfErr) {
        console.error("PDF Parse error:", pdfErr);
        return Response.json(
          { error: "Gagal membaca struktur PDF. Pastikan file tidak rusak.", code: "PDF_PARSE_FAILED" },
          { status: 422 }
        );
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch (destroyErr) {
            console.error("Gagal membersihkan resources PDFParse:", destroyErr);
          }
        }
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      // Ekstraksi DOCX menggunakan mammoth
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || "";
      } catch (docxErr) {
        console.error("Word Parse error:", docxErr);
        return Response.json(
          { error: "Gagal membaca struktur dokumen Word (.docx).", code: "WORD_PARSE_FAILED" },
          { status: 422 }
        );
      }
    } else if (
      mimeType === "text/plain" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".law")
    ) {
      // Membaca file teks mentah
      extractedText = buffer.toString("utf-8");
    } else if (
      mimeType.startsWith("image/") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".webp")
    ) {
      // Ekstraksi gambar menggunakan Gemini Multimodal OCR
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
        }
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        extractedText = await extractTextFromImageWithFallback(genAI, buffer, mimeType);
      } catch (ocrErr: any) {
        console.error("Gemini OCR error:", ocrErr);
        const errMsg = ocrErr.message || "";
        const isRateLimit = errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
        const customErr = isRateLimit
          ? "Batas kuota harian Gemini API gratis Anda telah habis (Maksimum 20 permintaan/hari untuk model gemini-2.5-flash). Silakan gunakan API Key yang berbeda di file .env.local atau coba lagi setelah kuota harian Anda di-reset secara otomatis oleh Google."
          : `Gagal mengekstrak teks dari gambar (OCR): ${errMsg}`;
        return Response.json(
          { error: customErr, code: "IMAGE_OCR_FAILED" },
          { status: isRateLimit ? 429 : 422 }
        );
      }
    } else {
      return Response.json(
        {
          error: "Format berkas tidak didukung. Harap unggah berkas .pdf, .docx, .txt, atau gambar (.png, .jpg, .jpeg, .webp).",
          code: "UNSUPPORTED_FORMAT",
        },
        { status: 415 }
      );
    }

    /* ── 3. Validasi Teks Hasil Ekstraksi ───────────────── */
    const cleanedText = extractedText.trim();

    if (!cleanedText) {
      return Response.json(
        { error: "Dokumen berhasil dibaca tetapi tidak ditemukan teks di dalamnya.", code: "EMPTY_DOCUMENT" },
        { status: 422 }
      );
    }

    return Response.json({ text: cleanedText, fileName: file.name }, { status: 200 });
  } catch (error: unknown) {
    console.error("[/api/extract] Global Error:", error);
    return Response.json(
      { error: "Terjadi gangguan sistem saat memproses berkas.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
