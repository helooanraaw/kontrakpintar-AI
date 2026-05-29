import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load key from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
const apiKey = match[1].trim().replace(/['"]/g, '');

const genAI = new GoogleGenerativeAI(apiKey);

const GENERATE_SYSTEM_INSTRUCTION = `Kamu adalah "KontrakPintar AI", seorang perancang dokumen hukum (legal drafter) profesional Indonesia yang berspesialisasi dalam menyusun perjanjian kerja sama bisnis dan Surat Perjanjian Kerja (SPK) secara komprehensif, adil, sah, dan melindungi hak-hak pelaku UMKM (Pihak Kedua) tanpa merugikan Pihak Pertama.

TUGAS UTAMA:
Buatkan draf SPK formal yang LENGKAP, PANJANG, DETAIL, dan berbobot hukum tinggi berdasarkan data dari pengguna. Draf harus siap digunakan secara profesional di Indonesia.

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

const generateGenerationConfig = {
  temperature: 0.3,
  topP: 0.9,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const body = {
  pihakPertama: { nama: "PT Jaya Makmur Digital", domisili: "Jakarta Selatan" },
  pihakKedua: { nama: "Studio Web Kreatif", domisili: "Bandung" },
  detailJasa: {
    lingkupKerja: "Pembuatan website e-commerce lengkap dengan katalog produk, keranjang belanja, integrasi payment gateway Midtrans, halaman admin kelola stok, dan penyerahan dokumentasi teknis serta hosting selama 1 tahun.",
    tenggatWaktu: "45 Hari Kerja sejak diterimanya uang muka."
  },
  pembayaran: {
    nilaiKontrak: "18500000",
    persentaseDP: "30",
    sanksiKeterlambatan: "0.1% dari sisa nilai kontrak per hari keterlambatan, maksimal denda 5% dari total nilai kontrak."
  },
  instruksiKhusus: ""
};

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

${body.instruksiKhusus ? `INSTRUKSI TAMBAHAN KHUSUS PENGGUNA (Prioritaskan ketentuan ini):
- ${body.instruksiKhusus}` : ""}

---ATURAN FORMAT DRAF---
1. JANGAN PERNAH menyisipkan tag HTML seperti <p>, <p align="center">, <center>, atau tag HTML lainnya ke dalam dokumen draf. Gunakan Markdown murni saja.
2. Gunakan # untuk judul dokumen, ## untuk judul pasal (e.g., ## PASAL 1 - RUANG LINGKUP PEKERJAAN), ### untuk sub-bagian.
3. Gunakan ** (double asterisk) untuk menebalkan teks penting di dalam paragraf (misalnya nama Pihak: **PIHAK PERTAMA**, **PIHAK KEDUA**, nomor pasal, atau judul poin).
4. Gunakan tanda - (minus/strip) untuk daftar poin, BUKAN tanda *.
5. JANGAN menggunakan bullet points (- atau *) untuk menuliskan detail identitas pihak (Nama, Domisili, Jabatan, dll.). Tulis identitas pihak sebagai paragraf biasa dengan titik dua (:) sejajar tanpa simbol poin atau angka di depannya.
6. JANGAN PERNAH membuat area tanda tangan, kolom tanda tangan, tabel tanda tangan, atau kolom nama penandatangan di bagian akhir dokumen SPK. Sistem kami secara otomatis menambahkan area tanda tangan di bagian paling bawah.

---ATURAN PERUMUSAN DRAF LENGKAP---
- DRAFT DOKUMEN HARUS DITULIS 100% DALAM BAHASA INDONESIA YANG BAKU, FORMAL, DAN PROFESIONAL. Dilarang keras mencampurkan istilah bahasa Inggris (seperti 'Agreement', 'First Party', 'Second Party', 'Confidentiality', 'Limitation of Liability', 'Intellectual Property Rights', 'default', 'force majeure', dll.) ke dalam draf. Semua istilah hukum wajib menggunakan padanan Bahasa Indonesia yang sah dan resmi (seperti 'Perjanjian', 'Pihak Pertama', 'Pihak Kedua', 'Kerahasiaan', 'Batasan Tanggung Jawab', 'Hak Kekayaan Intelektual', 'Wanprestasi', 'Keadaan Memaksa', dll.).
- Tulis seluruh draf secara LENGKAP dan DETAIL, DILARANG KERAS menggunakan singkatan, "... [dan seterusnya] ...", placeholder, atau melompati bagian pasal. Semua ketentuan harus dirinci secara tertulis.
- Draf harus mencakup minimal 14 pasal yang terstruktur rapi dengan bahasa hukum formal Indonesia.
- Susun pasal-pasal berikut secara berurutan:
  1. # SURAT PERJANJIAN KERJA (Judul Utama)
  2. Paragraf pembuka berisi hari, tanggal, bulan, tahun, dan tempat kesepakatan dibuat.
  3. Identitas Lengkap Para Pihak (PIHAK PERTAMA dan PIHAK KEDUA) tanpa simbol poin/bullet.
  4. Klausul Premis (Latar belakang kesepakatan).
  5. ## PASAL 1 - LINGKUP PEKERJAAN (Menjelaskan detail lingkup kerja jasa yang diberikan).
  6. ## PASAL 2 - JANGKA WAKTU PERJANJIAN (Masa berlaku kontrak dan batas penyelesaian pekerjaan).
  7. ## PASAL 3 - NILAI KONTRAK & BIAYA JASA (Menyebutkan total nilai nominal transaksi).
  8. ## PASAL 4 - SKEMA & TAHAPAN PEMBAYARAN (Menjabarkan pembayaran DP, termin lanjutan, pelunasan, jangka waktu pembayaran invoice setelah diterima).
  9. ## PASAL 5 - HAK DAN KEWAJIBAN PIHAK PERTAMA (Termasuk kewajiban membayar tepat waktu dan memberikan bahan pendukung).
  10. ## PASAL 6 - HAK DAN KEWAJIBAN PIHAK KEDUA (Termasuk kewajiban menyelesaikan pekerjaan secara profesional dan hak menerima bayaran).
  11. ## PASAL 7 - HAK KEKAYAAN INTELEKTUAL (HAKI) (Ketentuan tegas bahwa HAKI baru dialihkan ke PIHAK PERTAMA setelah pembayaran LUNAS 100% diterima oleh PIHAK KEDUA).
  12. ## PASAL 8 - PERNYATAAN & JAMINAN (Jaminan keaslian karya dari PIHAK KEDUA dan bebas dari klaim pihak ketiga).
  13. ## PASAL 9 - WANPRESTASI & SANKSI KETERLAMBATAN (Denda keterlambatan pekerjaan oleh PIHAK KEDUA dan denda keterlambatan pembayaran oleh PIHAK PERTAMA sebesar minimal 0.1% per hari keterlambatan).
  14. ## PASAL 10 - BATAS TANGGUNG JAWAB (Membatasi tanggung jawab ganti rugi PIHAK KEDUA maksimal sebesar total nilai kontrak yang diterima).
  15. ## PASAL 11 - KERAHAHASIAAN INFORMASI (Kewajiban menjaga rahasia data bisnis/teknis proyek selama dan setelah kerja sama selesai).
  16. ## PASAL 12 - KEADAAN MEMAKSA (Keadaan memaksa seperti bencana alam, huru-hara, kebijakan pemerintah).
  17. ## PASAL 13 - PEMBATALAN SEPIHAK & KOMPENSASI (Hak pembatalan sepihak dan kewajiban PIHAK PERTAMA untuk membayar kompensasi atas pekerjaan yang telah diselesaikan oleh PIHAK KEDUA).
  18. ## PASAL 14 - PENYELESAIAN SENGKETA & DOMISILI HUKUM (Penyelesaian lewat musyawarah mufakat, mediasi, atau Pengadilan Negeri terkait).
  19. Paragraf penutup formal tanpa menyertakan kolom tanda tangan.`;

async function run() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: GENERATE_SYSTEM_INSTRUCTION,
      generationConfig: generateGenerationConfig,
    });
    console.log("Calling Gemini API with gemini-3.1-flash-lite...");
    const result = await model.generateContent(prompt);
    const candidate = result.response.candidates?.[0];
    console.log("Finish Reason:", candidate?.finishReason);
    console.log("Usage Metadata:", result.response.usageMetadata);
    const text = result.response.text();
    fs.writeFileSync(path.resolve(process.cwd(), 'scratch/spkResult.md'), text, 'utf-8');
    console.log("SPK generated successfully. Saved to scratch/spkResult.md");
  } catch (err) {
    console.error("Error generating SPK:", err);
  }
}

run();
