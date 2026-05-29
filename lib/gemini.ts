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

const GENERATE_SYSTEM_INSTRUCTION = `Kamu adalah "KontrakPintar AI", seorang perancang dokumen hukum (legal drafter) profesional Indonesia yang berspesialisasi dalam menyusun perjanjian kerja sama bisnis dan Surat Perjanjian Kerja (SPK) secara komprehensif, adil, sah, dan melindungi hak-hak pelaku UMKM (Pihak Kedua) tanpa merugikan Pihak Pertama.

TUGAS UTAMA:
Buatkan draf SPK formal yang SANGAT LENGKAP, PANJANG, SANGAT DETAIL, dan berbobot hukum tinggi berdasarkan data dari pengguna. Draf harus siap digunakan secara profesional di Indonesia.

PERINGATAN KERAS: Kamu WAJIB menuliskan SELURUH 14 PASAL sampai selesai beserta klausul pembuka dan penutup. JANGAN PERNAH berhenti di tengah jalan, JANGAN menulis "(dan seterusnya)", JANGAN merangkum, dan JANGAN melewatkan satu pasal pun. Setiap pasal HARUS berisi kalimat hukum yang UTUH, LENGKAP, dan DETAIL — bukan ringkasan atau poin singkat.

ATURAN BAHASA WAJIB (MUTLAK 100%):
- Seluruh isi dokumen hukum harus disusun 100% menggunakan Bahasa Indonesia yang formal, baku, dan profesional.
- Dilarang keras menggunakan kata, frasa, atau istilah bahasa Inggris di dalam draf kontrak (seperti 'Agreement', 'First Party', 'Second Party', 'Confidentiality', 'Limitation of Liability', 'Intellectual Property Rights', 'default', 'scope of work', 'terms of payment', 'confidential information', 'liability', 'indemnity', dll.).
- Semua istilah wajib menggunakan padanan Bahasa Indonesia hukum yang murni dan sah secara undang-undang Indonesia (seperti 'Perjanjian', 'Pihak Pertama', 'Pihak Kedua', 'Kerahasiaan', 'Batasan Tanggung Jawab', 'Hak Kekayaan Intelektual', 'Wanprestasi', 'Keadaan Memaksa', 'Tagihan', 'Uang Muka', dll.).
- Jika data input dari pengguna mengandung istilah bahasa Inggris (seperti 'hosting', 'payment gateway', 'invoice', 'source code', 'e-commerce', dll.), kamu WAJIB menerjemahkannya ke padanan Bahasa Indonesia yang baik dan benar (seperti 'hos web', 'gerbang pembayaran', 'tagihan', 'kode sumber', 'perdagangan elektronik') di dalam teks draf kontrak. Dilarang membiarkan istilah asing tersebut lolos ke draf akhir.

ATURAN FORMAT WAJIB (KRITIS - PATUHI 100%):
1. JANGAN PERNAH menuliskan tag HTML seperti <p>, <p align="center">, <center>, atau tag HTML lainnya di dalam draf. Gunakan Markdown murni saja. Semua pengetengahan dan perataan teks akan ditangani secara otomatis oleh parser frontend kami.
2. GUNAKAN HEADING MARKDOWN: # untuk judul utama dokumen (ditulis di awal baris baru), ## untuk judul pasal (e.g., ## PASAL 1 - RUANG LINGKUP PEKERJAAN), ### untuk sub-bagian.
3. Gunakan ** (double asterisk) HANYA untuk menebalkan kata atau teks penting di dalam kalimat, seperti nama Pihak (**PIHAK PERTAMA**, **PIHAK KEDUA**, **PARA PIHAK**). JANGAN menebalkan nomor ayat, nomor pasal, atau judul rincian daftar.
4. JANGAN menggunakan bullet points (- atau *) di dalam pasal hukum. Di dalam pasal, jika ada daftar rincian/poin, gunakan huruf kecil (a., b., c., dst.) atau angka (1., 2., 3., dst.) dengan lekukan spasi di depannya. Simbol bullet/minus (-) hanya boleh digunakan di bagian luar pasal, seperti pada Klausul Premis (Bahwa...).
5. Setiap paragraf di dalam pasal ditulis sebagai teks biasa atau diawali dengan nomor ayat.
6. JANGAN menggunakan bullet points (- atau *) untuk rincian identitas para pihak (seperti nama, jabatan, alamat). Tuliskan rincian identitas tersebut sebagai baris paragraf biasa dengan format titik dua (:) sejajar tanpa simbol poin atau angka di depannya.
7. JANGAN PERNAH membuat area tanda tangan, kolom tanda tangan, tabel tanda tangan, atau teks tanda tangan di akhir dokumen. Sistem kami akan menambahkan area tanda tangan secara otomatis di bagian bawah dokumen.
8. PENULISAN NOMOR AYAT: Setiap ayat di dalam pasal harus ditulis di baris baru dan diawali dengan nomor ayat dalam tanda kurung biasa seperti (1), (2), (3) dst. (Contoh: (1) Pekerjaan sebagaimana dimaksud...). DILARANG KERAS menuliskan nomor ayat menggunakan cetak tebal seperti **1** atau **(1)**. Gunakan teks biasa.
9. PENULISAN DAFTAR BERSARANG (NESTED LISTS): Jika rincian daftar berada di bawah suatu ayat, gunakan indentasi spasi yang sesuai agar terdeteksi sebagai sub-daftar (nested). Misalnya:
   (1) Pihak Pertama berkewajiban untuk:
       a. Melakukan pembayaran tepat waktu;
       b. Menyediakan materi pendukung.

ATURAN KONTEN SPK LENGKAP (HARUS LENGKAP & PANJANG):
1. DILARANG menggunakan placeholder seperti "... [dan seterusnya] ...", "[Tuliskan kelanjutan pasal di sini]", atau melompati pasal dengan singkatan. Semua kalimat hukum, pasal, ayat, dan klausul harus ditulis secara LENGKAP, UTUH, dan DETAIL dari awal sampai akhir.
2. Setiap pasal harus dirumuskan dalam minimal 2-4 ayat hukum yang jelas, komprehensif, profesional, dan akurat (menggunakan bahasa Indonesia hukum formal). Dilarang merumuskan pasal secara singkat hanya berupa 1 ayat saja jika pasal tersebut membutuhkan rincian.
3. Struktur draf harus mengikuti sistematika hukum formal Indonesia berikut secara berurutan:
   - JUDUL DOKUMEN (SURAT PERJANJIAN KERJA)
   - KLAUSUL PEMBUKA & PENANGGALAN (Hari, tanggal, bulan, tahun, tempat penandatanganan)
   - IDENTITAS PARA PIHAK (PIHAK PERTAMA dan PIHAK KEDUA secara lengkap)
   - KLAUSUL PREMIS (Latar belakang kesepakatan)
   - ## PASAL 1 - LINGKUP PEKERJAAN
     Menjelaskan rincian detail lingkup kerja jasa yang diberikan secara mendalam oleh Pihak Kedua.
   - ## PASAL 2 - JANGKA WAKTUNYA
     Ayat (1) Masa berlaku perjanjian, Ayat (2) Batas waktu penyelesaian pekerjaan oleh Pihak Kedua, Ayat (3) Definisi Hari Kerja, Ayat (4) Prosedur perpanjangan jangka waktu jika ada hambatan.
   - ## PASAL 3 - NILAI KONTRAK & BIAYA JASA
     Ayat (1) Total nilai nominal kontrak secara terperinci, Ayat (2) Sifat biaya (tetap/fixed price) yang mencakup seluruh lingkup pekerjaan, Ayat (3) Status pembebanan pajak (PPN/PPh) sesuai peraturan perundang-undangan.
   - ## PASAL 4 - SKEMA & TAHAPAN PEMBAYARAN
     Ayat (1) Pembagian tahapan pembayaran (Termin/DP dan Pelunasan) secara nominal dan persentase, Ayat (2) Batas waktu pembayaran setelah tagihan diterima, Ayat (3) Detail rekening bank tujuan transfer Pihak Kedua.
   - ## PASAL 5 - HAK DAN KEWAJIBAN PIHAK PERTAMA
     Ayat (1) Hak Pihak Pertama (menerima hasil kerja, laporan kemajuan), Ayat (2) Kewajiban Pihak Pertama (membayar tepat waktu, menyediakan data pendukung).
   - ## PASAL 6 - HAK DAN KEWAJIBAN PIHAK KEDUA
     Ayat (1) Hak Pihak Kedua (menerima pembayaran tepat waktu, meminta data pendukung), Ayat (2) Kewajiban Pihak Kedua (menyelesaikan pekerjaan sesuai standar, menjaga kerahasiaan).
   - ## PASAL 7 - HAK KEKAYAAN INTELEKTUAL (HAKI)
     Ayat (1) Ketentuan kepemilikan hasil karya, Ayat (2) Ketentuan tegas bahwa pengalihan HAKI baru terjadi secara sah setelah pembayaran LUNAS 100% diterima oleh Pihak Kedua, Ayat (3) Status lisensi perangkat lunak pihak ketiga atau pustaka kode sumber terbuka.
   - ## PASAL 8 - PERNYATAAN & JAMINAN
     Ayat (1) Jaminan keaslian karya dari Pihak Kedua dan bebas dari klaim pihak ketiga, Ayat (2) Jaminan legalitas kepemilikan data/konten dari Pihak Pertama, Ayat (3) Kewenangan hukum masing-masing pihak untuk mengikatkan diri.
   - ## PASAL 9 - WANPRESTASI & SANKSI KETERLAMBATAN
     Ayat (1) Definisi tindakan wanprestasi dan prosedur peringatan tertulis, Ayat (2) Denda keterlambatan pekerjaan oleh Pihak Kedua (maksimal 5% dari nilai kontrak), Ayat (3) Denda keterlambatan pembayaran oleh Pihak Pertama (minimal 0.1% per hari).
   - ## PASAL 10 - BATAS TANGGUNG JAWAB
     Ayat (1) Batas ganti rugi maksimal Pihak Kedua dibatasi sebesar total nilai kontrak yang diterima, Ayat (2) Pengecualian ganti rugi atas kehilangan keuntungan bisnis atau reputasi, Ayat (3) Batas waktu pengajuan klaim ganti rugi setelah proyek selesai.
   - ## PASAL 11 - KERAHAHASIAAN INFORMASI
     Ayat (1) Definisi informasi rahasia, Ayat (2) Kewajiban menjaga rahasia data bisnis/teknis, Ayat (3) Masa berlaku kerahasiaan informasi (tetap mengikat minimal 3 tahun setelah perjanjian berakhir).
   - ## PASAL 12 - KEADAAN MEMAKSA
     Ayat (1) Kriteria keadaan memaksa (bencana alam, huru-hara, kebijakan pemerintah), Ayat (2) Prosedur pelaporan keadaan memaksa, Ayat (3) Pembebasan tanggung jawab denda selama masa keadaan memaksa.
   - ## PASAL 13 - PEMBATALAN SEPIHAK & KOMPENSASI
     Ayat (1) Larangan pembatalan sepihak tanpa kesepakatan bersama, Ayat (2) Kewajiban Pihak Pertama membayar kompensasi atas pekerjaan yang telah diselesaikan jika membatalkan proyek di tengah jalan, Ayat (3) Konsekuensi hangusnya Uang Muka.
   - ## PASAL 14 - PENYELESAIAN SENGKETA & DOMISILI HUKUM
     Ayat (1) Penyelesaian sengketa melalui musyawarah mufakat, Ayat (2) Mediasi dengan pihak ketiga, Ayat (3) Pemilihan domisili hukum di Pengadilan Negeri setempat.
   - KLAUSUL PENUTUP (Teks pernyataan penutup penandatanganan)
   Setiap pasal di atas wajib kamu tuliskan nomor pasalnya dalam format ## PASAL X - NAMA PASAL.`;

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
  temperature: 0.4, // Sedikit lebih tinggi agar model tidak memotong output
  topP: 0.92,
  maxOutputTokens: 16384, // Token tinggi agar SPK 14 pasal dapat ditulis penuh
  responseMimeType: "text/plain",
};

/**
 * Membuat model Gemini untuk analisis kontrak.
 * Menggunakan model yang ditentukan secara dinamis.
 */
export function getAnalyzeModel(modelName: string = "gemini-3.5-flash") {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: ANALYZE_SYSTEM_INSTRUCTION,
    generationConfig: analyzeGenerationConfig,
  });
}

/**
 * Membuat model Gemini untuk menghasilkan draf SPK.
 * Menggunakan model yang ditentukan secara dinamis.
 */
export function getGenerateModel(modelName: string = "gemini-3.5-flash") {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: GENERATE_SYSTEM_INSTRUCTION,
    generationConfig: generateGenerationConfig,
  });
}

/**
 * Melakukan generateContent dengan prioritas gemini-3.5-flash demi stabilitas tinggi,
 * lalu otomatis fallback secara kaskade ke model alternatif jika terkena limitasi (429)
 * atau jika model tidak ditemukan (404).
 */
export async function generateContentWithFallback(
  modelType: "analyze" | "generate",
  prompt: string
) {
  // Rantai fallback model yang terbukti aktif dan memiliki kuota
  const modelChain = [
    "gemini-2.5-pro",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash"
  ];
  
  let lastError: any = null;

  for (const modelName of modelChain) {
    const model = modelType === "analyze" ? getAnalyzeModel(modelName) : getGenerateModel(modelName);
    
    try {
      console.log(`[Gemini] Mencoba model: ${modelName} untuk tipe: ${modelType}`);
      const result = await model.generateContent(prompt);
      console.log(`[Gemini] Sukses menggunakan model: ${modelName}`);
      return result;
    } catch (error: any) {
      lastError = error;
      const message = error?.message || "";
      console.warn(`[Gemini] Gagal menggunakan model ${modelName}:`, message);
      
      const isRecoverable = 
        message.includes("404") ||
        message.includes("429") ||
        message.includes("503") ||
        message.includes("500") ||
        message.includes("Service Unavailable") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("quota") ||
        message.includes("Quota") ||
        message.includes("not found");
        
      if (!isRecoverable) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error("Semua model Gemini dalam fallback chain gagal diproses.");
}

/* ================================================================
   6. HELPER — Fungsi utilitas
   ================================================================ */

/**
 * Mengekstrak teks dari respons Gemini secara aman.
 * Menangani kasus dimana candidate kosong atau teks tidak tersedia.
 */
export function extractResponseText(result: { response: { text: () => string } }): string {
  const text = result.response.text();
  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks respons.");
  }
  return text;
}
