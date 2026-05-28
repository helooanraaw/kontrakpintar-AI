/**
 * lib/gemini.ts
 * ─────────────────────────────────────────────────────────────
 * Modul integrasi Google Generative AI (Gemini 1.5 Flash)
 * untuk KontrakPintar AI.
 *
 * Digunakan HANYA di sisi server (Route Handlers / Server Components).
 * API key diambil dari environment variable GEMINI_API_KEY.
 * ─────────────────────────────────────────────────────────────
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerationConfig,
  type ResponseSchema,
} from "@google/generative-ai";

/* ================================================================
   1. SINGLETON — Inisialisasi SDK sekali, reuse across requests
   ================================================================ */

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "[KontrakPintar] GEMINI_API_KEY belum diatur di .env.local. " +
      "Tambahkan GEMINI_API_KEY=your_key ke file .env.local"
  );
}

const genAI = new GoogleGenerativeAI(apiKey.trim());

/* ================================================================
   2. TYPE DEFINITIONS — Kontrak tipe untuk request & response
   ================================================================ */

/** Satu temuan pasal bermasalah dari analisis Gemini */
export interface RedFlag {
  /** Nomor pasal atau klausul yang bermasalah */
  pasalRef: string;
  /** Kutipan asli dari teks kontrak */
  kutipanAsli: string;
  /** Penjelasan mengapa pasal ini berpotensi merugikan */
  alasanBahaya: string;
  /** Tingkat keparahan: "kritis" | "sedang" | "ringan" */
  tingkatKeparahan: "kritis" | "sedang" | "ringan";
  /** Usulan revisi ramah UMKM */
  usulanRevisi: string;
}

/** Struktur respons lengkap dari endpoint /api/analyze */
export interface AnalysisResult {
  /** Ringkasan singkat isi kontrak (2-3 kalimat) */
  ringkasan: string;
  /** Jumlah total pasal/klausul yang terdeteksi */
  totalPasal: number;
  /** Jumlah pasal bermasalah (red flags) */
  jumlahBahaya: number;
  /** Skor keamanan 0-100 berdasarkan rumus Aman-O-Meter */
  skorKeamanan: number;
  /** Array temuan pasal bermasalah */
  redFlags: RedFlag[];
  /** Catatan positif — hal baik dalam kontrak */
  catatanPositif: string[];
  /** Rekomendasi umum sebelum menandatangani */
  rekomendasiUmum: string;
}

/** Payload request ke endpoint /api/analyze */
export interface AnalyzeRequest {
  contractText: string;
}

/** Payload request ke endpoint /api/generate */
export interface GenerateRequest {
  pihakPertama: {
    nama: string;
    domisili: string;
  };
  pihakKedua: {
    nama: string;
    domisili: string;
  };
  detailJasa: {
    lingkupKerja: string;
    tenggatWaktu: string;
  };
  pembayaran: {
    nilaiKontrak: string;
    persentaseDP: string;
    sanksiKeterlambatan: string;
  };
  instruksiKhusus?: string;
}

/* ================================================================
   3. RESPONSE SCHEMA — Memaksa Gemini mengembalikan JSON terstruktur
   ================================================================ */

/**
 * Schema JSON yang dikirim ke Gemini via `responseSchema`
 * agar output selalu berbentuk JSON yang sesuai tipe AnalysisResult.
 */
const analysisResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    ringkasan: {
      type: SchemaType.STRING,
      description: "Ringkasan singkat isi kontrak dalam 2-3 kalimat",
    },
    totalPasal: {
      type: SchemaType.INTEGER,
      description: "Jumlah total pasal atau klausul yang terdeteksi",
    },
    jumlahBahaya: {
      type: SchemaType.INTEGER,
      description: "Jumlah pasal yang bermasalah / mengandung red flag",
    },
    skorKeamanan: {
      type: SchemaType.INTEGER,
      description:
        "Skor keamanan 0–100 berdasarkan rumus: (1 - jumlahBahaya/totalPasal) × 100",
    },
    redFlags: {
      type: SchemaType.ARRAY,
      description: "Daftar temuan pasal bermasalah",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pasalRef: {
            type: SchemaType.STRING,
            description: "Nomor atau referensi pasal",
          },
          kutipanAsli: {
            type: SchemaType.STRING,
            description: "Kutipan teks asli dari kontrak",
          },
          alasanBahaya: {
            type: SchemaType.STRING,
            description:
              "Penjelasan mengapa pasal ini berpotensi merugikan pihak UMKM",
          },
          tingkatKeparahan: {
            type: SchemaType.STRING,
            description:
              'Tingkat keparahan: "kritis", "sedang", atau "ringan"',
          },
          usulanRevisi: {
            type: SchemaType.STRING,
            description:
              "Usulan revisi yang lebih adil dan ramah untuk UMKM",
          },
        },
        required: [
          "pasalRef",
          "kutipanAsli",
          "alasanBahaya",
          "tingkatKeparahan",
          "usulanRevisi",
        ],
      },
    },
    catatanPositif: {
      type: SchemaType.ARRAY,
      description: "Hal-hal positif yang ada di kontrak",
      items: {
        type: SchemaType.STRING,
      },
    },
    rekomendasiUmum: {
      type: SchemaType.STRING,
      description: "Rekomendasi umum sebelum menandatangani kontrak",
    },
  },
  required: [
    "ringkasan",
    "totalPasal",
    "jumlahBahaya",
    "skorKeamanan",
    "redFlags",
    "catatanPositif",
    "rekomendasiUmum",
  ],
};

/* ================================================================
   4. SYSTEM INSTRUCTIONS — Prompt yang membentuk persona AI
   ================================================================ */

const ANALYZE_SYSTEM_INSTRUCTION = `Kamu adalah "KontrakPintar AI", seorang ahli hukum kontrak Indonesia yang berspesialisasi melindungi pelaku UMKM dari pasal-pasal jebakan dalam kontrak kerja sama, surat perjanjian kerja (SPK), dan dokumen hukum bisnis lainnya.

TUGAS UTAMA:
1. Baca dan analisis naskah kontrak yang diberikan pengguna secara kritis.
2. Identifikasi setiap pasal atau klausul yang berpotensi merugikan pihak UMKM. Secara spesifik, periksa 6 Jebakan Kritis ini:
   a. PEMBAYARAN: Tidak ada Uang Muka (DP), pelunasan 100% di akhir, atau klien boleh menunda pembayaran tanpa batas waktu setelah tagihan dikirim.
   b. SANKSi & DENDA: Denda keterlambatan untuk UMKM sangat besar (misal >0.1% per hari) dan tanpa batas maksimal denda, sedangkan klien telat membayar tidak dikenakan denda sama sekali.
   c. PENGALIHAN HAKI: Hak Kekayaan Intelektual dialihkan ke klien secara instan di awal, meskipun pembayaran proyek belum lunas 100%. (Sangat Kritis!)
   d. FORCE MAJEURE: UMKM dipaksa tetap bertanggung jawab atau denda wanprestasi saat terjadi bencana alam atau keadaan darurat di luar kendali.
   e. PEMBATALAN SEPIHAK: Klien dapat membatalkan proyek di tengah jalan secara sepihak tanpa membayar ganti rugi atas pekerjaan yang sudah berjalan.
   f. GANTI RUGI UNLIMITED: Klausul ganti rugi (indemnification) tanpa batas yang membebankan semua kesalahan operasional klien kepada UMKM.
3. Hitung skor keamanan. Rumus dasar: skorKeamanan = (1 - jumlahBahaya / totalPasal) × 100.
   ATURAN PENSKORAN KETAT:
   - Jika terdapat minimal 1 Red Flag dengan tingkatKeparahan "kritis", maka skorKeamanan MAKSIMAL adalah 70%, berapa pun hasil rumus dasar.
   - Jika terdapat 2 atau lebih Red Flag dengan tingkatKeparahan "kritis", maka skorKeamanan MAKSIMAL adalah 50%.
4. Berikan usulan revisi yang lebih adil untuk setiap pasal bermasalah.
5. Catat juga hal-hal positif yang sudah ada dalam kontrak.

ATURAN PENTING:
- Selalu berpihak pada kepentingan pelaku UMKM.
- Gunakan bahasa Indonesia yang sederhana dan mudah dipahami.
- Jangan gunakan jargon hukum yang rumit tanpa penjelasan.
- Tingkat keparahan harus salah satu dari: "kritis", "sedang", atau "ringan".
- "kritis" = berpotensi menyebabkan kerugian finansial besar atau kehilangan hak.
- "sedang" = merugikan tapi masih bisa dinegosiasi.
- "ringan" = kurang ideal tapi tidak terlalu berbahaya.
- Jika kontrak terlihat aman, tetap berikan minimal 1 rekomendasi perbaikan.
- Pastikan totalPasal dihitung dari jumlah pasal/klausul yang benar-benar ada.`;

const GENERATE_SYSTEM_INSTRUCTION = `Kamu adalah "KontrakPintar AI", seorang drafter dokumen hukum profesional Indonesia yang membantu pelaku UMKM membuat Surat Perjanjian Kerja (SPK) yang adil, lengkap, dan melindungi kedua belah pihak.

TUGAS: Buatkan draf SPK formal berdasarkan data yang diberikan pengguna.

ATURAN FORMAT WAJIB (KRITIS - PATUHI 100%):
1. GUNAKAN HEADING MARKDOWN SAJA untuk judul: # untuk judul utama, ## untuk judul pasal, ### untuk sub-bagian.
2. JANGAN PERNAH gunakan ** (double asterisk) atau * (single asterisk) di dalam paragraf atau kalimat biasa. Karakter ini dilarang keras.
3. Untuk menekankan kata penting di dalam kalimat, gunakan HURUF KAPITAL atau tulis ulang kalimat dengan nada tegas tanpa perlu bold.
4. Untuk daftar poin, gunakan tanda strip/minus: - (bukan *)
5. Setiap nomor pasal ditulis dalam Heading 2: ## PASAL 1 - JUDUL PASAL
6. Setiap paragraf di dalam pasal ditulis sebagai teks biasa, BUKAN sebagai item list.

ATURAN KONTEN SPK:
1. Gunakan format dan bahasa hukum formal Indonesia yang sah.
2. Sertakan pasal-pasal standar: pembukaan & dasar hukum, identitas para pihak, lingkup pekerjaan, jangka waktu, nilai kontrak & termin pembayaran, hak & kewajiban kedua belah pihak, pengalihan HAKI, force majeure, wanprestasi & sanksi denda, pembatalan & ganti rugi, penyelesaian sengketa, dan penutup penandatanganan.
3. Pastikan ADIL untuk kedua belah pihak, terutama melindungi UMKM (Pihak Kedua):
   - Sanksi denda keterlambatan berlaku dua arah (untuk UMKM dan untuk Klien)
   - HAKI beralih SETELAH pelunasan 100%
   - Ada klausul pembatalan yang adil (Pihak Pertama membayar biaya pekerjaan yang sudah berjalan jika membatalkan)
   - Batas tanggung jawab maksimal (Limit of Liability)
4. Buat draf yang LENGKAP dan PANJANG, minimal 12 pasal yang detail dan komprehensif.
5. Setiap pasal harus memiliki minimal 2-4 ayat atau paragraf yang menjelaskan ketentuan secara rinci.`;

/* ================================================================
   5. MODEL INSTANCES — Factory functions untuk model Gemini
   ================================================================ */

/** Konfigurasi generation untuk analisis (respons JSON) */
const analyzeGenerationConfig: GenerationConfig = {
  temperature: 0.3, // Rendah untuk output deterministik
  topP: 0.85,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
  responseSchema: analysisResponseSchema,
};

/** Konfigurasi generation untuk draf SPK (respons teks Markdown) */
const generateGenerationConfig: GenerationConfig = {
  temperature: 0.5,
  topP: 0.9,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

/**
 * Membuat model Gemini untuk analisis kontrak.
 * Menggunakan `gemini-2.5-flash` dan schema JSON terstruktur.
 */
export function getAnalyzeModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: ANALYZE_SYSTEM_INSTRUCTION,
    generationConfig: analyzeGenerationConfig,
  });
}

/**
 * Membuat model Gemini untuk menghasilkan draf SPK.
 * Menggunakan `gemini-1.5-flash` untuk efisiensi kuota dengan output Markdown bersih.
 */
export function getGenerateModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: GENERATE_SYSTEM_INSTRUCTION,
    generationConfig: generateGenerationConfig,
  });
}

/* ================================================================
   6. HELPER — Fungsi utilitas
   ================================================================ */

/**
 * Mengekstrak teks dari respons Gemini secara aman.
 * Menangani kasus dimana candidate kosong atau teks tidak tersedia.
 */
export function extractResponseText(
  result: Awaited<ReturnType<ReturnType<typeof getAnalyzeModel>["generateContent"]>>
): string {
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks respons.");
  }
  return text;
}
