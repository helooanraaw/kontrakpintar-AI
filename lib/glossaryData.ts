/**
 * lib/glossaryData.ts
 * ─────────────────────────────────────────────────────────────
 * Database lokal kamus istilah hukum (jargon) Indonesia.
 * Menyediakan penjelasan sederhana dan analogi sehari-hari
 * agar pelaku UMKM dapat memahami draf kontrak tanpa kebingungan.
 * ─────────────────────────────────────────────────────────────
 */

export interface GlossaryItem {
  term: string;
  definition: string;
  analogy: string;
}

export const glossaryData: GlossaryItem[] = [
  {
    term: "Wanprestasi",
    definition: "Tindakan ingkar janji atau kelalaian salah satu pihak dalam memenuhi kewajiban yang telah disepakati dalam kontrak.",
    analogy: "Sama seperti memesan kue untuk hari Senin, tetapi pembuat kue baru mengirimkannya hari Kamis tanpa alasan logis."
  },
  {
    term: "Force Majeure",
    definition: "Keadaan kahar atau situasi luar biasa di luar kendali manusia (bencana alam, perang, pandemi, huru-hara) yang membebaskan pihak terkait dari kewajiban kontrak sementara waktu.",
    analogy: "Ketika jembatan satu-satunya menuju lokasi pengiriman hancur diterjang banjir bandang, sehingga barang tidak bisa diantar hari itu."
  },
  {
    term: "Pihak Pertama",
    definition: "Pihak yang memprakarsai perjanjian, biasanya berperan sebagai pemberi tugas, pemberi kerja, pemilik proyek, atau pembeli jasa.",
    analogy: "Klien atau pelanggan yang menyewa jasa Anda dan membayar biaya proyek."
  },
  {
    term: "Pihak Kedua",
    definition: "Pihak yang menerima kesepakatan, biasanya berperan sebagai pelaksana proyek, penyedia jasa, vendor, atau pekerja.",
    analogy: "Anda sendiri sebagai pelaku UMKM yang mengerjakan proyek atau menyediakan produk."
  },
  {
    term: "Arbitrase",
    definition: "Metode penyelesaian sengketa di luar pengadilan umum, menggunakan perantara pihak ketiga independen yang disebut arbiter, yang putusannya bersifat final dan mengikat.",
    analogy: "Menunjuk ketua RT/RW setempat yang dihormati untuk memutuskan sengketa batas tanah secara adil tanpa harus melapor ke kantor polisi."
  },
  {
    term: "Eksklusivitas",
    definition: "Klausul pembatasan yang melarang Anda untuk memberikan jasa serupa kepada kompetitor klien selama jangka waktu kontrak tertentu.",
    analogy: "Anda tidak boleh membuatkan situs web untuk toko roti A dan toko roti B yang bertetangga di saat yang bersamaan."
  },
  {
    term: "Ganti Rugi",
    definition: "Klausul ganti rugi (Indemnification) yang menuntut salah satu pihak untuk menanggung kerugian finansial atau tuntutan hukum pihak lain akibat kesalahan sendiri.",
    analogy: "Jika Anda salah memasang instalasi listrik lalu terjadi korsleting yang merusak server klien, Anda wajib membiayai perbaikan server tersebut."
  },
  {
    term: "Kerahasiaan",
    definition: "Klausul NDA (Non-Disclosure Agreement) yang melarang penyebaran data rahasia proyek, ide bisnis, resep, kode, atau informasi internal ke publik.",
    analogy: "Anda dilarang membagikan resep bumbu rahasia dari restoran waralaba milik klien Anda di media sosial pribadi."
  },
  {
    term: "Somasi",
    definition: "Teguran atau peringatan resmi tertulis kepada pihak yang lalai melakukan kewajibannya sebelum diajukan gugatan hukum.",
    analogy: "Surat peringatan terakhir (SP) dari pemilik kontrakan karena uang sewa belum dibayar selama 3 bulan."
  },
  {
    term: "Addendum",
    definition: "Lembar lampiran tambahan atau dokumen perubahan kontrak asli yang disepakati dan ditandatangani oleh kedua belah pihak.",
    analogy: "Kertas catatan tambahan yang ditempel pada resep masakan lama karena ada perubahan porsi bumbu."
  },
  {
    term: "Klausul",
    definition: "Ketentuan atau pasal khusus yang tertulis di dalam perjanjian/kontrak.",
    analogy: "Satu aturan spesifik di lembar tata tertib kos-kosan (misal: 'Dilarang membawa hewan peliharaan')."
  },
  {
    term: "Perdata",
    definition: "Ketentuan hukum yang mengatur hubungan hukum antar-individu atau badan usaha (tidak berkaitan dengan kejahatan kriminal seperti pencurian/pembunuhan).",
    analogy: "Masalah sengketa bagi hasil usaha atau sewa-menyewa ruko yang diselesaikan secara kekeluargaan atau ganti rugi uang."
  },
  {
    term: "Yurisdiksi Hukum",
    definition: "Ketentuan mengenai pengadilan daerah mana yang memiliki wewenang untuk memeriksa dan menyelesaikan perselisihan jika terjadi sengketa antara kedua belah pihak.",
    analogy: "Kesepakatan bahwa jika ada masalah di kemudian hari, sidang akan diadakan di Pengadilan Negeri Bandung karena kantor UMKM berada di Bandung."
  },
  {
    term: "Severability",
    definition: "Klausul keterpisahan yang menyatakan bahwa jika salah satu pasal dalam kontrak dinyatakan tidak sah atau tidak berlaku oleh hakim, pasal-pasal lainnya tetap sah dan mengikat.",
    analogy: "Jika ada satu telur di keranjang yang busuk, Anda hanya membuang telur busuk itu saja, sementara telur-telur sehat lainnya tetap bisa dimasak."
  },
  {
    term: "Pembatasan Tanggung Jawab",
    definition: "Batas maksimal jumlah ganti rugi finansial (Limitation of Liability) yang dapat dituntut oleh satu pihak kepada pihak lainnya jika terjadi wanprestasi.",
    analogy: "Aturan toko laundry yang menyatakan maksimal ganti rugi baju hilang adalah 5x ongkos cuci, bukan seharga baju aslinya."
  },
  {
    term: "Termin Pembayaran",
    definition: "Jadwal dan tahapan pembayaran nilai kontrak (Milestone Payments) yang dikaitkan dengan persentase kemajuan penyelesaian pekerjaan.",
    analogy: "Membayar tukang bangunan 30% saat pondasi selesai, 40% setelah dinding berdiri, dan 30% sisanya setelah atap terpasang."
  },
  {
    term: "Pengalihan Hak",
    definition: "Tindakan memindahkan hak atau melimpahkan kewajiban dalam kontrak kepada pihak ketiga lain tanpa persetujuan tertulis dari mitra kontrak asli.",
    analogy: "Anda memesan jasa katering dari Chef A, tetapi di hari H ia melimpahkan seluruh tugas memasak kepada katering warteg sebelah tanpa kabar."
  },
  {
    term: "Cakap Hukum",
    definition: "Syarat sahnya pembuat perjanjian, di mana seseorang dianggap mampu dan memenuhi kriteria kedewasaan (usia di atas 21/18 tahun) serta berakal sehat untuk mengikatkan diri dalam kontrak.",
    analogy: "Anak usia SD tidak bisa secara sah melakukan transaksi jual beli motor di atas kertas perjanjian tanpa diwakili orang tuanya."
  },
  {
    term: "Hak Kekayaan Intelektual",
    definition: "Hak eksklusif (HAKI / Intellectual Property) atas hasil karya cipta, merek, source code, desain, atau paten teknologi yang dihasilkan selama proyek berlangsung.",
    analogy: "Hak cipta lagu atau kode aplikasi yang Anda buat tetap milik Anda sebelum pembeli melunasi pembayaran sesuai kontrak."
  },
  {
    term: "Garansi Jasa",
    definition: "Jaminan kualitas (Warranty) dari penyedia jasa untuk memperbaiki kerusakan atau kesalahan hasil pekerjaan secara gratis dalam jangka waktu tertentu pasca penyerahan.",
    analogy: "Garansi servis AC gratis selama 3 bulan dari tukang AC jika AC kembali bocor setelah diperbaiki."
  },
  {
    term: "Kontrak Utuh",
    definition: "Klausul (Entire Agreement) yang menyatakan bahwa dokumen kontrak tertulis ini merupakan kesepakatan final yang menghapus semua kesepakatan lisan sebelumnya.",
    analogy: "Janji-janji manis sales mobil saat mengobrol via WhatsApp tidak berlaku lagi jika tidak dituliskan ke dalam kertas kontrak resmi pembelian."
  },
  {
    term: "Pengakhiran Kontrak",
    definition: "Ketentuan tertulis (Termination Clause) mengenai alasan, cara, dan waktu yang diperbolehkan untuk membatalkan atau mengakhiri perjanjian sebelum masa berlaku habis.",
    analogy: "Aturan bahwa penghuni boleh keluar dari kos sebelum masa sewa setahun habis, asalkan memberi tahu pemilik kos 30 hari sebelumnya."
  }
];
