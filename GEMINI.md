RENCANA PROYEK & ALUR KERJA: KONTRAKPINTAR AI (NEXT.JS)

Arsitektur Token Desain Customer.io, Detail Fitur, dan Alur Logika Sistem

1. Sistem Token Desain (Customer.io Premium Vibe)

Sesuai dengan berkas desain, kita akan menggunakan warna kontras tinggi, latar belakang yang super bersih, dan teks utama bertema gelap-dingin (Midnight Ink) untuk menjamin keterbacaan tingkat tinggi.

Palet Warna Global (@theme)

Kanvas Latar Belakang Utama: #ebebeb (--color-canvas)

Permukaan Kartu/Panel Utama: #ffffff (--color-surface-white)

Teks Utama & Heading Menonjol: #00262b (--color-midnight-ink)

Teks Sekunder & Border Aktif: #0b363b (--color-oceanic-deep)

Teks Muted & Ikon: #354d51 (--color-slate-grille)

Aksen Bahaya (Pasal Jebakan): #8b3911 (--color-amber-pop)

Aksen Sukses & Positif: #eafde8 (--color-pale-mint)

Aksen Interaktif & Highlight Aktif: #abffae (--color-spring-leaf)

Angka & Visualisasi Persentase: #006af2 (--color-electric-blue)

Tipografi & Rasio Huruf (Substitusi: Inter)

Untuk menghasilkan visual modern yang rapat dan tegas seperti Linear atau Customer.io, atur letter-spacing (jarak huruf) agar sedikit lebih ketat:

Body Text ($16\text{px}$): Tracking $0.013\text{px}$ (letter-spacing: -0.013em)

Heading ($24\text{px}$ - $36\text{px}$): Tracking $0.008\text{px}$ - $0.006\text{px}$ (letter-spacing: -0.02em, tebal font-weight: 600 atau 700)

2. Struktur Arsitektur Fitur Detail

Untuk memberikan efek "Wow" kepada juri, kita akan membuat 3 fitur utama yang saling terintegrasi dalam satu dasbor Next.js:

Fitur A: Split-Screen Analyzer & Deteksi Red Flags

Deskripsi: Antarmuka layar terbagi ($50:50$) untuk membandingkan dokumen secara langsung.

Sisi Kiri (Input Area): Pengguna menempelkan teks draf kontrak kerja sama atau mengunggah PDF. Desain menggunakan kartu bersih Surface White tanpa bayangan tebal.

Sisi Kanan (Interactive AI Panel):

Aman-O-Meter: Grafik persentase melingkar minimalis berwarna Electric Blue (#006af2) untuk mengukur tingkat keamanan draf kontrak. Rumus logika yang digunakan:


$$S_{\text{aman}} = \left( 1 - \frac{N_{\text{bahaya}}}{N_{\text{total\_pasal}}} \right) \times 100\%$$

Red Flags Bento Grid: Daftar kartu temuan pasal bermasalah. Pasal kritis dikelilingi border tipis berwarna Amber Pop (#8b3911). Di dalam kartu terdapat tombol "Usulan Revisi" yang menggunakan garis luar hijau Spring Leaf (#abffae).

Fitur B: Wizard Pembuat SPK Kilat (Multi-Step Form)

Deskripsi: Formulir bertahap (Stepper) untuk membantu UMKM menyusun Surat Perjanjian Kerja (SPK) formal secara instan.

Langkah Formulir:

Tahap 1: Profil Pihak Pertama & Kedua (Nama, Domisili).

Tahap 2: Detail Jasa (Lingkup kerja, tenggat waktu penyelesaian).

Tahap 3: Nilai Kontrak & Pembayaran (DP, pelunasan, sanksi keterlambatan).

Sentuhan AI: Tombol utama bertema Midnight Ink (#00262b) dengan tulisan "Sihir Dokumen Saya" ✨ akan memicu Gemini untuk meramu draf hukum SPK utuh berbasis Markdown.

Fitur C: Pojok Tanya Jawab & Hover Glossary (Glosarium Hukum)

Deskripsi: AI akan menampilkan dokumen hasil analisis. Setiap kali mendeteksi jargon hukum kaku (misalnya Wanprestasi, Force Majeure, Pihak Kedua), teks tersebut akan otomatis memiliki garis bawah putus-putus (dashed underline) berwarna Deep Teal (#437278).

Interaksi Hover: Saat pengguna mengarahkan kursor (hover) ke kata tersebut, akan muncul balon tooltip yang menjelaskan artinya menggunakan analogi sederhana sehari-hari secara instan.

3. Alur Kerja Logika Sistem (End-to-End Data Flow)

Berikut adalah bagaimana data berpindah dari layar laptop pengguna hingga diproses oleh kecerdasan buatan Gemini API:

[Pengguna Input Teks Kontrak] 
             │
             ▼
[Kirim Payload JSON via POST ke Route Handler Backend] 
 └─ Endpoint: /api/analyze 
 └─ Payload: { contractText: "..." }
             │
             ▼
[Route Handler Next.js Backend]
 ├─ Amankan API Key dari .env (tidak bocor ke browser)
 ├─ Inisialisasi Google Gen AI SDK
 └─ Kirim request ke Gemini 1.5 Flash dengan System Instruction JSON
             │
             ▼
[Kecerdasan Buatan Gemini 1.5 Flash]
 ├─ Membaca naskah kontrak secara kritis
 ├─ Menyaring pasal-pasal jebakan (Red Flags)
 └─ Mengembalikan output JSON murni (MIME: application/json)
             │
             ▼
[Frontend Render di Layar Pengguna]
 ├─ Sisi Kiri: Tetap menampilkan teks asli pengguna
 ├─ Sisi Kanan: Mengubah JSON menjadi visual Aman-O-Meter & Bento Grid
 └─ Parser Regex: Mengaktifkan hover glossary pada kata kunci yang cocok


4. Struktur Folder Proyek Next.js (App Router)

Gunakan kerangka file modular ini agar proses koding Anda terorganisir dengan rapi:

kontrakpintar-ai/
├── app/
│   ├── layout.tsx             # Pengaturan global font Inter dan meta tags
│   ├── page.tsx               # Landing page & dasbor utama (Split-Screen)
│   ├── globals.css            # Token warna Tailwind CSS v4
│   └── api/
│       ├── analyze/
│       │   └── route.ts       # Endpoint backend analisis dokumen hukum
│       └── generate/
│           └── route.ts       # Endpoint backend pembuatan draf SPK
├── components/
│   ├── ui/
│   │   ├── Button.tsx         # Tombol pill-shaped khas Customer.io
│   │   ├── Card.tsx           # Kartu putih tanpa border/shadow tebal
│   │   └── Tooltip.tsx        # Balon bantuan glosarium
│   ├── SplitScreenAnalyzer.tsx# UI Fitur A
│   ├── DraftGenerator.tsx     # UI Fitur B
│   └── GlossaryWrapper.tsx    # Parser teks otomatis untuk deteksi jargon
├── lib/
│   ├── gemini.ts              # Integrasi SDK Google Generative AI
│   └── glossaryData.ts        # Database lokal kamus kata hukum sederhana
├── package.json
└── tsconfig.json
