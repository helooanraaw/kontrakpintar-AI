"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  FileText,
  BookOpen,
  ArrowRight,
  ChevronDown,
  FileUp,
  Download,
  Search,
  Scale,
  Zap,
  Lock,
  CheckCircle2,
  Star,
  TrendingUp,
  Users,
  Clock,
  Shield,
  Sparkles,
  Copy,
  Check,
  Info,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { checkCanGenerate, incrementUsageCount, checkIsLoggedIn } from "@/lib/limits";
import { GlossaryWrapper } from "@/components/GlossaryWrapper";
import { parseMarkdownBlocks, convertMarkdownFormatting } from "@/lib/markdownParser";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Apakah draf SPK yang dibuat oleh AI sah secara hukum?",
    answer:
      "Ya, draf SPK yang dihasilkan memenuhi syarat sah perjanjian menurut Pasal 1320 KUHPerdata Indonesia — adanya kesepakatan, kecakapan, suatu hal tertentu, dan sebab yang halal. Gemini meramu pasal-pasal standar yang membagi hak dan kewajiban secara seimbang. Namun, kami tetap menyarankan Anda membaca ulang sebelum ditandatangani guna penyesuaian khusus bisnis Anda.",
  },
  {
    question: "Bagaimana cara kerja penganalisis Red Flags?",
    answer:
      "Sistem mengirimkan teks kontrak Anda ke Gemini menggunakan System Instruction hukum yang ketat. AI akan memindai seluruh pasal, mengidentifikasi klausul yang tidak adil — seperti denda sepihak tanpa batas, pelepasan hak cipta sepihak, atau kewajiban ganti rugi tak berbatas — lalu memunculkan rekomendasi revisi yang ramah bagi kelangsungan bisnis UMKM.",
  },
  {
    question: "Apakah aman mengunggah draf kontrak sensitif saya di sini?",
    answer:
      "Keamanan berkas Anda adalah prioritas utama. File PDF/Word yang diunggah diproses secara real-time via koneksi terenkripsi (SSL) dan teksnya langsung dibaca on-the-fly untuk dianalisis AI. Kami tidak menyimpan salinan permanen dokumen Anda di server kami, juga tidak membagikannya ke pihak ketiga.",
  },
  {
    question: "Mengapa draf hasil SPK bisa diunduh ke format Microsoft Word?",
    answer:
      "Kami menyediakan opsi unduh format Word (.doc) agar pelaku UMKM dapat dengan mudah melakukan suntingan kecil, menyisipkan logo usaha pribadi, mengisi nomor kontak resmi, dan melampirkan tanda tangan basah maupun digital sebelum perjanjian kerja disahkan bersama klien.",
  },
];

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "Deteksi Red Flags Hukum",
    description:
      "AI memindai pasal-pasal jebakan seperti denda sepihak, penghapusan hak cipta, dan ganti rugi tak berbatas dari file PDF atau Word yang Anda unggah.",
    href: "/dashboard?tab=analyzer",
    cta: "Coba Scanner",
    accentColor: "#8b3911",
    accentBg: "rgba(139, 57, 17, 0.08)",
    accentBorder: "rgba(139, 57, 17, 0.15)",
    badge: "Paling Populer",
  },
  {
    icon: FileText,
    title: "Wizard Pembuat SPK Kilat",
    description:
      "Isi formulir sederhana dan biarkan AI merancang draf SPK formal yang seimbang dengan pasal proteksi UMKM, siap diunduh dalam format Word.",
    href: "/dashboard?tab=wizard",
    cta: "Coba Generator",
    accentColor: "#006af2",
    accentBg: "rgba(0, 106, 242, 0.07)",
    accentBorder: "rgba(0, 106, 242, 0.15)",
    badge: "Hemat Waktu",
  },
  {
    icon: BookOpen,
    title: "Glosarium Hukum Interaktif",
    description:
      "Arahkan kursor ke jargon kaku seperti Wanprestasi atau Force Majeure di dalam dokumen untuk mendapatkan penjelasan analogi sehari-hari secara instan.",
    href: "/dashboard?tab=glossary",
    cta: "Lihat Kamus",
    accentColor: "#1d6b2a",
    accentBg: "rgba(29, 107, 42, 0.07)",
    accentBorder: "rgba(29, 107, 42, 0.15)",
    badge: "22 Istilah",
  },
];

const STEPS = [
  {
    num: "01",
    icon: FileUp,
    title: "Unggah Berkas",
    desc: "Seret-lepas kontrak berformat PDF, Word, gambar, atau teks ke area editor.",
    color: "#006af2",
  },
  {
    num: "02",
    icon: Search,
    title: "AI Memindai",
    desc: "Gemini membedah setiap pasal untuk mendeteksi klausul jebakan secara mendalam.",
    color: "#8b3911",
  },
  {
    num: "03",
    icon: BookOpen,
    title: "Pelajari Temuan",
    desc: "Telusuri Red Flags dan pelajari jargon hukum melalui tooltip interaktif.",
    color: "#1d6b2a",
  },
  {
    num: "04",
    icon: Download,
    title: "Unduh Dokumen",
    desc: "Salin usulan revisi AI atau unduh draf SPK baru dalam format Word dan PDF.",
    color: "#006af2",
  },
];

const TESTIMONIALS = [
  {
    name: "Sari Dewi",
    role: "Pemilik Studio Desain Grafis",
    city: "Bandung",
    quote: "Sebelum pakai KontrakPintar, saya pernah rugi besar karena pasal HAKI yang saya tidak pahami. Sekarang saya scan dulu setiap kontrak dari klien besar.",
    rating: 5,
  },
  {
    name: "Budi Santoso",
    role: "Freelancer Web Developer",
    city: "Yogyakarta",
    quote: "Buat SPK-nya cuma 3 menit! Serius. Dulu saya butuh 2 hari buat cari template dan edit sendiri. Hasilnya juga jauh lebih rapi dan legal.",
    rating: 5,
  },
  {
    name: "Rina Putri",
    role: "Konsultan Bisnis UMKM",
    city: "Surabaya",
    quote: "Saya rekomendasikan ke semua klien UMKM saya. Fitur deteksi red flags-nya akurat banget, sudah menyelamatkan beberapa klien dari kontrak tidak adil.",
    rating: 5,
  },
];

const SAMPLE_CONTRACT_TEXT = `SURAT PERJANJIAN KERJASAMA
Antara PT Indo Digital Mandiri (Pihak Pertama) dan Studio Freelance Mandiri (Pihak Kedua).

Pasal 4: SANKSI KETERLAMBATAN
Setiap hari keterlambatan penyelesaian proyek oleh Pihak Kedua akan dikenakan denda sebesar 2% dari total nilai kontrak per hari keterlambatan tanpa ada batas denda maksimal.

Pasal 5: HAK KEKAYAAN INTELEKTUAL
Hak Kekayaan Intelektual atas hasil kerja dialihkan sepenuhnya secara otomatis kepada Pihak Pertama setelah draf awal diserahkan, terlepas dari status pelunasan pembayaran.`;

// ── Component scroll reveal ──
function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Animated counter hook ──
function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

const parseMarkdownToHtml = (md: string): string => {
  const blocks = parseMarkdownBlocks(md);
  const htmlBlocks: string[] = [];
  
  blocks.forEach((block) => {
    switch (block.type) {
      case "h1":
        htmlBlocks.push(
          `<h1 style="text-align:center;font-size:14pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:0;margin-bottom:18pt;text-transform:uppercase;line-height:1.5;">${convertMarkdownFormatting(block.content || "")}</h1>`
        );
        break;
      case "h2":
        if (block.isPasal) {
          htmlBlocks.push(
            `<h2 style="text-align:center;font-size:12pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:24pt;margin-bottom:12pt;text-transform:uppercase;line-height:1.5;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.pasalNum || "")}<br/>${convertMarkdownFormatting(block.pasalTitle || "")}</h2>`
          );
        } else {
          htmlBlocks.push(
            `<h2 style="text-align:center;font-size:12pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:24pt;margin-bottom:12pt;text-transform:uppercase;line-height:1.5;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.content || "")}</h2>`
          );
        }
        break;
      case "h3":
        htmlBlocks.push(
          `<h3 style="font-size:11pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:12pt;margin-bottom:6pt;line-height:1.5;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.content || "")}</h3>`
        );
        break;
      case "center-bold":
        htmlBlocks.push(
          `<p style="text-align:center;font-size:11pt;font-family:'Times New Roman',serif;font-weight:bold;line-height:1.5;margin-top:-6pt;margin-bottom:18pt;color:#000;">${convertMarkdownFormatting(block.content || "")}</p>`
        );
        break;
      case "paragraph":
        htmlBlocks.push(
          `<p style="font-size:11pt;font-family:'Times New Roman',serif;text-align:justify;line-height:1.5;margin:0 0 8pt 0;text-indent:1.25cm;color:#000;">${convertMarkdownFormatting(block.content || "")}</p>`
        );
        break;
      case "list":
        if (block.items) {
          const listHtml = block.items.map((item) => {
            if (item.type === "bullet") {
              return `
                <table class="list-table" style="width:100%;border-collapse:collapse;border:none;margin:0 0 6pt;padding:0;page-break-inside:avoid;break-inside:avoid;">
                  <tr style="border:none;">
                    <td style="width:1.25cm;padding:0;border:none;"></td>
                    <td style="width:0.5cm;vertical-align:top;text-align:left;padding:0;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#000;border:none;">•</td>
                    <td style="vertical-align:top;text-align:justify;padding:0;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#000;border:none;">${convertMarkdownFormatting(item.content)}</td>
                  </tr>
                </table>
              `;
            } else {
              return `
                <table class="list-table" style="width:100%;border-collapse:collapse;border:none;margin:0 0 8pt;padding:0;page-break-inside:avoid;break-inside:avoid;">
                  <tr style="border:none;">
                    <td style="width:1.25cm;padding:0;border:none;"></td>
                    <td style="width:0.75cm;vertical-align:top;text-align:left;padding:0;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;font-weight:bold;color:#000;border:none;">${item.prefix}</td>
                    <td style="vertical-align:top;text-align:justify;padding:0;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#000;border:none;">${convertMarkdownFormatting(item.content)}</td>
                  </tr>
                </table>
              `;
            }
          }).join("");
          htmlBlocks.push(listHtml);
        }
        break;
    }
  });
  
  return htmlBlocks.join("");
};

export default function Home() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Playground state
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<"scan" | "generate">("scan");
  const [scanInput, setScanInput] = useState(SAMPLE_CONTRACT_TEXT);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [genPihakPertama, setGenPihakPertama] = useState("PT Indo Karya");
  const [genPihakKedua, setGenPihakKedua] = useState("Andi Freelancer");
  const [genJasa, setGenJasa] = useState("Pembuatan Desain Brand Identity");
  const [genNilai, setGenNilai] = useState("Rp 10.000.000");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Modals state
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const [limitInfo, setLimitInfo] = useState({ allowed: true, remaining: 1, isLoggedIn: false });

  const statsRef = useRef<HTMLDivElement>(null);

  const countDocs = useCountUp(15000, 1800, statsVisible);
  const countAccuracy = useCountUp(994, 1800, statsVisible);
  const countTime = useCountUp(5, 1200, statsVisible);

  const updateLimitInfo = () => {
    const check = checkCanGenerate();
    const logged = checkIsLoggedIn();
    setLimitInfo({
      allowed: check.allowed,
      remaining: check.remaining,
      isLoggedIn: logged,
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      updateLimitInfo();
      const handleLimitChange = () => updateLimitInfo();
      window.addEventListener("kontrakpintar_limit_changed", handleLimitChange);
      return () => window.removeEventListener("kontrakpintar_limit_changed", handleLimitChange);
    }
  }, []);

  useEffect(() => {
    // 1. Cek sesi mock offline
    const authSession = localStorage.getItem("kontrakpintar_auth");
    if (authSession) {
      try {
        const parsed = JSON.parse(authSession);
        if (parsed && (parsed.uid || parsed.email)) {
          router.push("/dashboard?tab=overview");
          return;
        }
      } catch {}
    }

    // 2. Cek sesi Firebase Auth
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        localStorage.removeItem("kontrakpintar_auth");
      } else {
        router.push("/dashboard?tab=overview");
      }
      setIsLoggedIn(!!user);
      updateLimitInfo();
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePlaygroundScan = async () => {
    if (!scanInput.trim() || scanInput.trim().length < 50) {
      setScanError("Teks kontrak terlalu pendek. Minimal 50 karakter.");
      return;
    }

    const limitCheck = checkCanGenerate();
    if (!limitCheck.allowed) {
      if (limitCheck.reason === "guest_limit") {
        setShowTrialModal(true);
      } else {
        setShowDailyLimitModal(true);
      }
      return;
    }

    setScanLoading(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText: scanInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menganalisis.");
      }

      setScanResult(data);
      
      // Simpan draf analisis tamu ke localStorage agar dibawa ke dashboard saat login
      localStorage.setItem(
        "kontrakpintar_pending_save",
        JSON.stringify({
          type: "analysis",
          title: "Pemindaian Uji Coba Tamu",
          contractText: scanInput,
          score: data.skorKeamanan !== undefined ? data.skorKeamanan : (data.score !== undefined ? data.score : 100),
          redFlagsCount: data.jumlahBahaya !== undefined ? data.jumlahBahaya : (data.redFlags ? data.redFlags.length : 0),
          analysisResult: data
        })
      );

      incrementUsageCount();
      updateLimitInfo();
    } catch (err: any) {
      setScanError(err.message || "Koneksi bermasalah.");
    } finally {
      setScanLoading(false);
    }
  };

  const handlePlaygroundGenerate = async () => {
    if (!genPihakPertama.trim() || !genPihakKedua.trim() || !genJasa.trim()) {
      setGenError("Harap lengkapi semua kolom input.");
      return;
    }

    const limitCheck = checkCanGenerate();
    if (!limitCheck.allowed) {
      if (limitCheck.reason === "guest_limit") {
        setShowTrialModal(true);
      } else {
        setShowDailyLimitModal(true);
      }
      return;
    }

    setGenLoading(true);
    setGenError(null);
    setGenResult(null);

    try {
      const payload = {
        pihakPertama: { nama: genPihakPertama, domisili: "Jakarta" },
        pihakKedua: { nama: genPihakKedua, domisili: "Bandung" },
        detailJasa: { lingkupKerja: genJasa, tenggatWaktu: "30 Hari Kerja" },
        pembayaran: { nilaiKontrak: genNilai, persentaseDP: "30", sanksiKeterlambatan: "0.1% per hari keterlambatan, maksimal 5% dari total nilai." },
        instruksiKhusus: "Buat perjanjian yang ringkas, seimbang, dan ramah perlindungan UMKM."
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat draf SPK.");
      }

      setGenResult(data.draft);

      // Simpan draf SPK tamu ke localStorage agar dibawa ke dashboard saat login
      localStorage.setItem(
        "kontrakpintar_pending_save",
        JSON.stringify({
          type: "draft",
          title: `SPK ${genPihakKedua} & ${genPihakPertama}`,
          pihakPertama: { nama: genPihakPertama, domisili: "Jakarta" },
          pihakKedua: { nama: genPihakKedua, domisili: "Bandung" },
          detailJasa: { lingkupKerja: genJasa, tenggatWaktu: "30 Hari Kerja" },
          pembayaran: { nilaiKontrak: genNilai, persentaseDP: "30", sanksiKeterlambatan: "0.1% per hari keterlambatan, maksimal 5% dari total nilai." },
          draftText: data.draft,
          instruksiKhusus: "Buat draf SPK formal dari playground halaman utama."
        })
      );

      incrementUsageCount();
      updateLimitInfo();
    } catch (err: any) {
      setGenError(err.message || "Koneksi bermasalah.");
    } finally {
      setGenLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (!genResult) return;
    navigator.clipboard.writeText(genResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWordPlayground = () => {
    if (!checkIsLoggedIn()) {
      setShowTrialModal(true);
      return;
    }
    if (!genResult) return;
    const html = parseMarkdownToHtml(genResult);
    
    const signatureHtml = `
      <table class="signature-table" style="width:100%;font-family:'Times New Roman',serif;font-size:11pt;margin-top:50pt;border-collapse:collapse;border:none;page-break-inside:avoid;break-inside:avoid;">
        <tr style="border:none;">
          <td style="width:50%;text-align:center;border:none;vertical-align:top;padding-bottom:60pt;line-height:1.5;">
            <strong>PIHAK PERTAMA</strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:top;padding-bottom:60pt;line-height:1.5;">
            <strong>PIHAK KEDUA</strong>
          </td>
        </tr>
        <tr style="border:none;">
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${genPihakPertama || "....................."}</u></strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${genPihakKedua || "....................."}</u></strong>
          </td>
        </tr>
      </table>
    `;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<title>Surat Perjanjian Kerja</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
@page Section1 {
  size: 21.0cm 29.7cm; /* A4 */
  margin: 4.0cm 3.0cm 3.0cm 4.0cm; /* Top, Right, Bottom, Left */
  mso-page-orientation: portrait;
}
div.Section1 {
  page: Section1;
}
body {
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.5;
}
p {
  margin: 0in 0in 8pt;
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.5;
  text-align: justify;
}
h1 {
  font-family: 'Times New Roman', serif;
  font-size: 14pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin-top: 12pt;
  margin-bottom: 12pt;
  line-height: 1.5;
}
h2 {
  font-family: 'Times New Roman', serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin-top: 24pt;
  margin-bottom: 12pt;
  line-height: 1.5;
  page-break-after: avoid;
}
h3 {
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  font-weight: bold;
  margin-top: 12pt;
  margin-bottom: 6pt;
  line-height: 1.5;
  page-break-after: avoid;
}
</style>
</head>
<body>
<div class="Section1">`;

    const footer = "</div></body></html>";
    const blob = new Blob(["\ufeff" + header + html + signatureHtml + footer], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPK_${genPihakKedua.replace(/\s+/g, "_")}_dan_${genPihakPertama.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDFPlayground = () => {
    if (!checkIsLoggedIn()) {
      setShowTrialModal(true);
      return;
    }
    if (!genResult) return;
    const html = parseMarkdownToHtml(genResult);
    
    const signatureHtml = `
      <table class="signature-table" style="width:100%;font-family:'Times New Roman',serif;font-size:11pt;margin-top:50pt;border-collapse:collapse;border:none;page-break-inside:avoid;break-inside:avoid;">
        <tr style="border:none;">
          <td style="width:50%;text-align:center;border:none;vertical-align:top;padding-bottom:60pt;line-height:1.5;">
            <strong>PIHAK PERTAMA</strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:top;padding-bottom:60pt;line-height:1.5;">
            <strong>PIHAK KEDUA</strong>
          </td>
        </tr>
        <tr style="border:none;">
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${genPihakPertama || "....................."}</u></strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${genPihakKedua || "....................."}</u></strong>
          </td>
        </tr>
      </table>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Surat Perjanjian Kerja</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 4cm 3cm 3cm 4cm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
          }
          p {
            text-align: justify;
            line-height: 1.5;
            margin: 0 0 8pt;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
          }
          h1, h2, h3 {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.5;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 14pt;
            text-transform: uppercase;
            margin-top: 0;
            margin-bottom: 18pt;
            font-weight: bold;
          }
          h2 {
            text-align: center;
            font-size: 12pt;
            margin-top: 24pt;
            margin-bottom: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            page-break-after: avoid;
            break-after: avoid;
          }
          h3 {
            font-size: 11pt;
            margin-top: 12pt;
            margin-bottom: 6pt;
            font-weight: bold;
            page-break-after: avoid;
            break-after: avoid;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-top: 50pt;
          }
          td {
            border: none;
            text-align: center;
          }
          .signature-table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
        </head><body>
          ${html}
          ${signatureHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 250);
            };
          </script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans antialiased text-midnight-ink overflow-x-hidden">

      {/* ─────────────────── HERO ─────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-24 pb-28">
        {/* Multi-layer background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
        
        {/* Animated glow orbs with parallax scroll */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none animate-glow-pulse transition-transform duration-100"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0, 106, 242, 0.09) 0%, transparent 65%)",
            transform: `translate(-50%, ${scrollY * 0.12}px)`
          }}
        />
        <div
          className="absolute top-40 -right-20 w-[500px] h-[400px] pointer-events-none animate-glow-pulse animation-delay-700 transition-transform duration-100"
          style={{
            background: "radial-gradient(ellipse at center, rgba(171, 255, 174, 0.12) 0%, transparent 65%)",
            transform: `translateY(${scrollY * -0.08}px)`
          }}
        />

        <div className="section-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">

            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-full border border-border-light shadow-sm text-xs font-semibold text-midnight-ink">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-electric-blue" />
                Didukung Google Gemini AI
              </span>
              <span className="w-px h-3.5 bg-border-light" />
              <span className="flex items-center gap-1 text-[#1d6b2a]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot inline-block" />
                Aktif & Siap Digunakan
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up animation-delay-100 space-y-3">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] text-midnight-ink">
                Lindungi Bisnis{" "}
                <br className="hidden sm:block" />
                <span
                  style={{
                    background: "linear-gradient(135deg, #006af2 0%, #0b363b 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  dari Jerat Kontrak
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-grille max-w-2xl mx-auto leading-relaxed">
                KontrakPintar AI mendeteksi klausul berbahaya dalam draf kontrak kerja sama dan membantu UMKM membuat Surat Perjanjian Kerja yang adil — dalam hitungan menit.
              </p>
            </div>

            {/* CTAs */}
            <div className="animate-fade-up animation-delay-200 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard?tab=analyzer" : "/login?redirect=/dashboard?tab=analyzer"}
                className="btn-primary px-7 py-3.5 text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                <Shield className="w-4 h-4 text-spring-leaf" />
                Scan Kontrak Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={isLoggedIn ? "/dashboard?tab=wizard" : "/login?redirect=/dashboard?tab=wizard"}
                className="btn-outline px-7 py-3.5 text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              >
                Buat Draf SPK Baru
                <FileText className="w-4 h-4 text-electric-blue" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-up animation-delay-300 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-grille">
              {[
                { icon: Lock, label: "Enkripsi SSL" },
                { icon: CheckCircle2, label: "Uji Coba Gratis" },
                { icon: Zap, label: "Hasil dalam 30 Detik" },
              ].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5 font-medium">
                  <t.icon className="w-3.5 h-3.5 text-electric-blue" />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* ─────────────────── INTERACTIVE PLAYGROUND ─────────────────── */}
          <div className="mt-16 max-w-4xl mx-auto animate-fade-up animation-delay-300">
            <div
              className="rounded-2xl overflow-hidden shadow-lg border border-border-light bg-white"
            >
              {/* Window Chrome Header */}
              <div className="flex items-center justify-between bg-[#f7f8f9] border-b border-border-light px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <div className="ml-4 flex gap-1.5">
                    <button
                      onClick={() => setActivePlaygroundTab("scan")}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition cursor-pointer ${
                        activePlaygroundTab === "scan"
                          ? "bg-midnight-ink text-white"
                          : "text-slate-grille hover:bg-slate-200/50"
                      }`}
                    >
                      Tab 1: Scan Kontrak AI
                    </button>
                    <button
                      onClick={() => setActivePlaygroundTab("generate")}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition cursor-pointer ${
                        activePlaygroundTab === "generate"
                          ? "bg-midnight-ink text-white"
                          : "text-slate-grille hover:bg-slate-200/50"
                      }`}
                    >
                      Tab 2: Buat SPK AI
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-grille bg-fog-gray px-2.5 py-1 rounded-full border">
                    Sisa Kuota: {limitInfo.remaining}x {limitInfo.isLoggedIn ? "Hari Ini" : "Uji Coba"}
                  </span>
                </div>
              </div>

              {/* Playground Tab Contents */}
              {activePlaygroundTab === "scan" ? (
                /* TAB 1: SCAN KONTRAK AI */
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm bg-white min-h-[380px]">
                  {/* Left: Input Textarea */}
                  <div className="p-6 border-r border-border-light flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Draf Teks Kontrak</p>
                      <button
                        onClick={() => setScanInput(SAMPLE_CONTRACT_TEXT)}
                        className="text-[10px] font-bold text-electric-blue hover:underline cursor-pointer bg-transparent border-0"
                      >
                        Reset Teks Demo
                      </button>
                    </div>
                    <textarea
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="Tempel draf kontrak Anda di sini (min. 50 karakter)..."
                      className="w-full flex-1 p-3 border border-border-light rounded-xl font-mono text-[11px] text-slate-grille bg-canvas focus:outline-none focus:border-electric-blue resize-none min-h-[220px]"
                    />
                    {scanError && (
                      <div className="p-2.5 bg-red-50 text-red-800 rounded-lg text-xs flex gap-1.5 items-start">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{scanError}</span>
                      </div>
                    )}
                    <button
                      onClick={handlePlaygroundScan}
                      disabled={scanLoading}
                      className="btn-primary w-full h-11 flex items-center justify-center font-bold text-xs bg-midnight-ink text-white rounded-xl shadow-xs transition hover:shadow-md cursor-pointer"
                    >
                      {scanLoading ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin text-white mr-1.5" />
                          Sedang Memindai...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-1.5 text-spring-leaf" />
                          Mulai Analisis Kontrak
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right: AI Output */}
                  <div className="p-6 bg-[#fbfcfe] flex flex-col gap-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Hasil Pindaian AI</p>

                    {scanLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                        <Clock className="w-8 h-8 text-electric-blue animate-spin" />
                        <p className="text-xs font-semibold text-midnight-ink">AI sedang membedah struktur pasal...</p>
                        <p className="text-[10px] text-slate-grille">Memverifikasi 6 parameter jebakan hukum perdata.</p>
                      </div>
                    ) : scanResult ? (
                      /* REAL GEMINI API RESULT */
                      <div className="space-y-4">
                        {/* Score Indicator */}
                        <div className="flex items-center gap-4 bg-white rounded-xl p-3 border border-border-light shadow-xs">
                          <div className="relative w-14 h-14 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#e4e8eb" strokeWidth="3" />
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="none"
                                stroke={scanResult.skorKeamanan > 70 ? "#006af2" : scanResult.skorKeamanan > 50 ? "#1d6b2a" : "#8b3911"}
                                strokeWidth="3"
                                strokeDasharray={`${scanResult.skorKeamanan} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-midnight-ink">
                              {scanResult.skorKeamanan}%
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-midnight-ink">Skor Keamanan Kontrak</p>
                            <p className="text-[10px] text-slate-grille">
                              Terdeteksi {scanResult.jumlahBahaya} pasal bermasalah dari {scanResult.totalPasal} klausul.
                            </p>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-white rounded-xl p-3 border border-border-light shadow-xs space-y-1">
                          <p className="text-[9px] font-bold text-slate-grille uppercase tracking-wider">Ringkasan Kontrak</p>
                          <p className="text-[11px] text-slate-grille leading-relaxed">{scanResult.ringkasan}</p>
                        </div>

                        {/* Red Flags List */}
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-grille uppercase tracking-wider">Pasal Bermasalah (Red Flags)</p>
                          {scanResult.redFlags && scanResult.redFlags.length > 0 ? (
                            scanResult.redFlags.map((flag: any, fi: number) => (
                              <div
                                key={fi}
                                className="bg-white rounded-xl p-3 border-l-3 border-border-light shadow-xs space-y-2"
                                style={{ borderLeftColor: flag.tingkatKeparahan === "kritis" ? "#8b3911" : "#006af2" }}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-extrabold text-midnight-ink">{flag.pasalRef}</span>
                                  <span
                                    className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: flag.tingkatKeparahan === "kritis" ? "#feefe8" : "#f0f6ff",
                                      color: flag.tingkatKeparahan === "kritis" ? "#8b3911" : "#006af2",
                                    }}
                                  >
                                    {flag.tingkatKeparahan}
                                  </span>
                                </div>
                                <p className="text-[10.5px] italic text-slate-grille bg-canvas p-2 rounded">
                                  "{flag.kutipanAsli}"
                                </p>
                                <p className="text-[10.5px] text-slate-grille">
                                  <b className="text-midnight-ink">Bahaya:</b> {flag.alasanBahaya}
                                </p>
                                <p className="text-[10.5px] text-[#1d6b2a] font-medium bg-emerald-50/50 p-2 rounded border border-emerald-100/50">
                                  <b className="text-[#1d6b2a]">Saran Revisi:</b> {flag.usulanRevisi}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-grille">Tidak ada pasal kritis terdeteksi.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* STATIC PREVIEW (INITIAL STATE) */
                      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-white border border-border-light flex items-center justify-center shadow-xs text-slate-grille">
                          <ShieldAlert className="w-6 h-6 text-electric-blue animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-midnight-ink">Uji Coba Analisis Kontrak Nyata</p>
                          <p className="text-[10px] text-slate-grille max-w-xs mx-auto leading-relaxed">
                            Tempel teks kontrak di sebelah kiri dan klik tombol analisis untuk mencoba analisis AI Gemini secara langsung.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 2: BUAT SPK KILAT AI */
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm bg-white min-h-[380px]">
                  {/* Left: Simplified Wizard Form */}
                  <div className="p-6 border-r border-border-light flex flex-col gap-3 justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Parameter SPK Jasa</p>
                    
                    <div className="space-y-2.5">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">Pihak Pertama (Klien)</label>
                        <input
                          type="text"
                          value={genPihakPertama}
                          onChange={(e) => setGenPihakPertama(e.target.value)}
                          className="input-field text-xs h-9"
                          placeholder="Nama Perusahaan Klien"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">Pihak Kedua (Penyedia Jasa)</label>
                        <input
                          type="text"
                          value={genPihakKedua}
                          onChange={(e) => setGenPihakKedua(e.target.value)}
                          className="input-field text-xs h-9"
                          placeholder="Nama UMKM / Freelancer Anda"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">Lingkup Pekerjaan</label>
                        <input
                          type="text"
                          value={genJasa}
                          onChange={(e) => setGenJasa(e.target.value)}
                          className="input-field text-xs h-9"
                          placeholder="Contoh: Pembuatan Website E-Commerce"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">Nilai Kontrak</label>
                        <input
                          type="text"
                          value={genNilai}
                          onChange={(e) => setGenNilai(e.target.value)}
                          className="input-field text-xs h-9"
                          placeholder="Contoh: Rp 10.000.000"
                        />
                      </div>
                    </div>

                    {genError && (
                      <div className="p-2.5 bg-red-50 text-red-800 rounded-lg text-xs flex gap-1.5 items-start">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{genError}</span>
                      </div>
                    )}

                    <button
                      onClick={handlePlaygroundGenerate}
                      disabled={genLoading}
                      className="btn-primary w-full h-11 flex items-center justify-center font-bold text-xs bg-midnight-ink text-white rounded-xl shadow-xs transition hover:shadow-md cursor-pointer"
                    >
                      {genLoading ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin text-white mr-1.5" />
                          Sedang Merancang Draf...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5 text-spring-leaf" />
                          Buat SPK Hukum Sekarang
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right: AI Output Document */}
                  <div className="p-6 bg-[#fbfcfe] flex flex-col gap-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Draf Dokumen Hasil AI</p>
                      {genResult && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleCopyDraft}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-grille hover:text-midnight-ink hover:underline cursor-pointer bg-transparent border-0 font-sans"
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3 text-green-600" />
                                Disalin
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Salin
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={handleExportWordPlayground}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-electric-blue hover:underline cursor-pointer bg-transparent border-0 font-sans"
                          >
                            <Download className="w-3 h-3" />
                            Unduh Word
                          </button>
                          
                          <button
                            onClick={handlePrintPDFPlayground}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1d6b2a] hover:underline cursor-pointer bg-transparent border-0 font-sans"
                          >
                            <FileText className="w-3 h-3" />
                            Cetak PDF
                          </button>
                        </div>
                      )}
                    </div>

                    {genLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                        <Clock className="w-8 h-8 text-electric-blue animate-spin" />
                        <p className="text-xs font-semibold text-midnight-ink">AI sedang menyusun pasal hukum...</p>
                        <p className="text-[10px] text-slate-grille">Meramu perlindungan hak cipta dan sanksi keterlambatan seimbang.</p>
                      </div>
                    ) : genResult ? (
                      /* REAL GENERATED DRAFT TEXT */
                      <div className="bg-white rounded-xl p-6 border border-border-light shadow-xs font-sans text-xs text-slate-grille leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
                        <GlossaryWrapper text={genResult} />
                      </div>
                    ) : (
                      /* STATIC PREVIEW (INITIAL STATE) */
                      <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-white border border-border-light flex items-center justify-center shadow-xs text-slate-grille">
                          <FileText className="w-6 h-6 text-electric-blue animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-midnight-ink">Uji Coba Pembuatan SPK Instan</p>
                          <p className="text-[10px] text-slate-grille max-w-xs mx-auto leading-relaxed">
                            Lengkapi data di sebelah kiri dan klik tombol di bawah untuk melihat draf formal yang dirancang khusus oleh AI untuk melindungi UMKM.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Floating badges */}
            <div className="relative mt-0">
              <div className="absolute -top-4 -left-6">
                <div className="bg-white border border-border-light rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#eafde8] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#1d6b2a]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-midnight-ink">SPK Dibuat</p>
                    <p className="text-[9px] text-slate-grille">2 menit 34 detik</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-6">
                <div className="bg-midnight-ink border border-white/10 rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-spring-leaf" />
                  <div>
                    <p className="text-[10px] font-bold text-white">99.4% Akurasi</p>
                    <p className="text-[9px] text-white/50">Red Flag Detection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── STATS COUNTER ─────────────────── */}
      <section ref={statsRef} className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #00262b 0%, #0b363b 100%)" }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] pointer-events-none" />
        <div className="section-container relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            {[
              { value: countDocs > 0 ? `${countDocs.toLocaleString()}+` : "15.000+", label: "Pelaku UMKM Terlindungi", icon: Users, color: "#abffae" },
              { value: `${(countAccuracy / 10).toFixed(1)}%`, label: "Akurasi Scanning Hukum AI", icon: Shield, color: "#abffae", border: true },
              { value: `< ${countTime || 5} Mnt`, label: "Kecepatan Pembuatan SPK", icon: Clock, color: "#abffae" },
            ].map((s, i) => (
              <div key={i} className={`text-center py-8 sm:py-6 px-6 ${s.border ? "sm:border-x border-white/10 border-y sm:border-y-0 py-8" : ""}`}>
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(171,255,174,0.1)", border: "1px solid rgba(171,255,174,0.15)" }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-spring-leaf tracking-tighter mb-1.5">{s.value}</div>
                <div className="text-xs font-semibold text-white/50 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FEATURES ─────────────────── */}
      <section id="features" className="py-28 bg-white border-t border-border-light relative">
        {/* Parallax Background Orb */}
        <div
          className="absolute top-1/4 left-10 w-96 h-96 rounded-full pointer-events-none filter blur-[80px] opacity-[0.06] transition-transform duration-100"
          style={{
            background: "radial-gradient(circle, #006af2 0%, transparent 70%)",
            transform: `translateY(${scrollY * 0.08}px)`
          }}
        />
        
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0f6ff] rounded-full border border-blue-100 text-xs font-bold text-electric-blue uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Tiga Pilar Perlindungan
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Fitur Utama KontrakPintar AI
              </h2>
              <p className="text-sm text-slate-grille leading-relaxed">
                Solusi lengkap untuk melindungi posisi hukum pelaku UMKM Indonesia di setiap langkah transaksi bisnis.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <RevealOnScroll key={i} delay={i * 150}>
                <div
                  className="group relative bg-white rounded-2xl border border-border-light p-7 flex flex-col gap-5 transition-shadow duration-300 shadow-sm hover:shadow-lg"
                >
                  {/* Top badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{ backgroundColor: f.accentBg, borderColor: f.accentBorder }}>
                      <f.icon className="w-5.5 h-5.5" style={{ color: f.accentColor }} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                      style={{ background: f.accentBg, color: f.accentColor, borderColor: f.accentBorder }}>
                      {f.badge}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <h4 className="text-base font-bold text-midnight-ink leading-snug">{f.title}</h4>
                    <p className="text-sm text-slate-grille leading-relaxed">{f.description}</p>
                  </div>

                  <Link
                    href={isLoggedIn ? f.href : `/login?redirect=${f.href}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors group/link"
                    style={{ color: f.accentColor }}
                  >
                    {f.cta}
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform duration-200" />
                  </Link>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.accentColor}, transparent)` }} />
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── ADDED SECTION: WHY CHOOSE US ─────────────────── */}
      <section className="py-24 bg-canvas border-t border-border-light relative overflow-hidden">
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eafde8] rounded-full border border-spring-leaf/30 text-xs font-bold text-[#1d6b2a] uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                Mengapa Memilih Kami
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Mengapa UMKM Memilih KontrakPintar AI?
              </h2>
              <p className="text-sm text-slate-grille leading-relaxed">
                Dirancang khusus untuk melancarkan kesepakatan bisnis UMKM tanpa hambatan birokrasi dan biaya mahal.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Scale,
                title: "Perlindungan Hukum 24/7",
                desc: "Menganalisis dokumen secara instan kapan saja, memberikan kenyamanan berbisnis tanpa perlu mengantre ke firma hukum.",
              },
              {
                icon: Lock,
                title: "Sesuai Hukum Indonesia",
                desc: "Pendeteksian pasal jebakan dikonfigurasikan sesuai asas keseimbangan dalam Kitab Undang-Undang Hukum Perdata (KUHPerdata) Indonesia.",
              },
              {
                icon: CheckCircle2,
                title: "Keamanan Data Mutlak",
                desc: "Dokumen Anda diproses secara real-time di RAM server dan langsung dihapus setelah pemindaian selesai. Kerahasiaan 100% terjamin.",
              },
              {
                icon: Download,
                title: "Ekspor Word Instan",
                desc: "Unduh draf SPK hukum baru Anda langsung dalam format Microsoft Word (.doc) yang kompatibel dan siap diedit untuk disisipkan tanda tangan.",
              },
            ].map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 100}>
                <div className="bg-white rounded-2xl border border-border-light p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-10 h-10 rounded-xl bg-fog-gray flex items-center justify-center text-midnight-ink border">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h5 className="text-sm font-bold text-midnight-ink">{item.title}</h5>
                    <p className="text-xs text-slate-grille leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section id="steps" className="py-28 bg-white border-t border-border-light relative">
        {/* Parallax Background Orb */}
        <div
          className="absolute bottom-1/4 right-10 w-[450px] h-[450px] rounded-full pointer-events-none filter blur-[100px] opacity-[0.05] transition-transform duration-100"
          style={{
            background: "radial-gradient(circle, #abffae 0%, transparent 70%)",
            transform: `translateY(${scrollY * -0.06}px)`
          }}
        />
        
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                Alur Kerja
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                4 Langkah Melindungi Bisnis
              </h2>
              <p className="text-sm text-slate-grille leading-relaxed">
                Dari unggah berkas hingga unduh draf kontrak yang adil — selesai dalam hitungan menit.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <RevealOnScroll key={i} delay={i * 100}>
                <div className="relative group">
                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-[calc(100%-8px)] w-full h-px z-0"
                      style={{ borderTop: "1.5px dashed #cdd3d8" }} />
                  )}

                  <div className="relative z-10 bg-white rounded-2xl border border-border-light p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                    {/* Number + icon */}
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: step.color, boxShadow: `0 4px 12px ${step.color}30` }}>
                        <step.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-4xl font-extrabold text-midnight-ink/6 tracking-tighter select-none">{step.num}</span>
                    </div>
                    <div className="space-y-1.5">
                      <h5 className="text-sm font-bold text-midnight-ink">{step.title}</h5>
                      <p className="text-xs text-slate-grille leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── DATA & CHARTS ─────────────────── */}
      <section id="datacenter" className="py-28 bg-[#fbfcfe] border-t border-border-light">
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0f6ff] rounded-full border border-blue-100 text-xs font-bold text-electric-blue uppercase tracking-widest">
                <TrendingUp className="w-3 h-3" />
                Data & Metrik Nyata
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Keandalan Tinggi, Dampak Nyata
              </h2>
              <p className="text-sm text-slate-grille leading-relaxed">
                Kami mempublikasikan metrik akurasi dan volume perlindungan sebagai bentuk komitmen transparansi.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Chart 1: Akurasi */}
            <RevealOnScroll>
              <div className="bg-white rounded-2xl border border-border-light p-7 space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-midnight-ink uppercase tracking-wide">Tren Akurasi Pemindaian</h4>
                    <p className="text-xs text-slate-grille mt-0.5">Mendeteksi klausul denda, HAKI, dan wanprestasi.</p>
                  </div>
                  <span className="text-xs font-bold text-electric-blue bg-[#f0f6ff] px-2.5 py-1 rounded-full border border-blue-100 shrink-0">99.4% Teruji</span>
                </div>
                <div className="relative h-44 bg-fog-gray/30 rounded-xl border border-border-light/50 overflow-hidden pt-3 px-2">
                  <svg className="w-full h-[100px]" viewBox="0 0 300 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="acc-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#006af2" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#006af2" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="18" x2="300" y2="18" stroke="#e4e8eb" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="45" x2="300" y2="45" stroke="#e4e8eb" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1="0" y1="72" x2="300" y2="72" stroke="#e4e8eb" strokeWidth="0.5" strokeDasharray="3 3" />
                    <polygon points="10,75 70,68 135,50 200,32 265,15 290,5 290,85 10,85" fill="url(#acc-grad)" />
                    <polyline points="10,75 70,68 135,50 200,32 265,15 290,5" fill="none" stroke="#006af2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {[[10,75],[70,68],[135,50],[200,32],[265,15],[290,5]].map(([cx, cy], idx) => (
                      <circle key={idx} cx={cx} cy={cy} r="4" fill="white" stroke="#006af2" strokeWidth="2" />
                    ))}
                  </svg>
                  <div className="absolute bottom-2 left-0 right-0 px-4 flex justify-between text-[8px] font-bold text-slate-grille font-mono">
                    {[["Jan","91%"],["Feb","92%"],["Mar","95%"],["Apr","97%"],["Mei","99.4%"]].map(([m,v], i) => (
                      <span key={i} className="flex flex-col items-center gap-0.5">
                        <span>{m}</span>
                        <span className={i === 4 ? "text-electric-blue font-extrabold" : "text-slate-grille/70"}>{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Chart 2: Volume UMKM */}
            <RevealOnScroll delay={150}>
              <div className="bg-white rounded-2xl border border-border-light p-7 space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-midnight-ink uppercase tracking-wide">Kontrak UMKM Terlindungi</h4>
                    <p className="text-xs text-slate-grille mt-0.5">Pertumbuhan akumulatif dokumen yang diamankan.</p>
                  </div>
                  <span className="text-xs font-bold text-[#1d6b2a] bg-[#eafde8] px-2.5 py-1 rounded-full border border-spring-leaf/30 shrink-0">15K+ Aktif</span>
                </div>
                <div className="flex items-end justify-around h-44 pb-5 pt-8 bg-fog-gray/30 rounded-xl border border-border-light/50 px-4 gap-2">
                  {[["Jan","2.5K",20],["Feb","5.8K",45],["Mar","9.4K",72],["Apr","12.1K",94],["Mei","15K+",120]].map(([m,v,h], i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
                      <span className={`text-[9px] font-bold transition-all ${i === 4 ? "text-electric-blue" : "text-slate-grille opacity-0 group-hover:opacity-100"}`}>{v}</span>
                      <div
                        className="w-full rounded-t-md transition-all duration-300"
                        style={{
                          height: `${h}px`,
                          background: i === 4 ? "linear-gradient(180deg, #006af2 0%, #0044bb 100%)" : "rgba(0,38,43,0.12)",
                          boxShadow: i === 4 ? "0 4px 16px rgba(0,106,242,0.35)" : "none",
                        }}
                      />
                      <span className={`text-[9px] font-bold ${i === 4 ? "text-midnight-ink" : "text-slate-grille"}`}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ─────────────────── TESTIMONIALS ─────────────────── */}
      <section className="py-28 bg-canvas border-t border-border-light">
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                Testimoni Nyata
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Dipercaya Pelaku UMKM Indonesia
              </h2>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <RevealOnScroll key={i} delay={i * 100}>
                <div className="bg-white rounded-2xl border border-border-light p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-grille leading-relaxed italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-border-light">
                    <div className="w-9 h-9 rounded-full bg-midnight-ink/8 flex items-center justify-center text-xs font-bold text-midnight-ink">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-midnight-ink">{t.name}</p>
                      <p className="text-[10px] text-slate-grille">{t.role} · {t.city}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── ADDED SECTION: EDUCATIONAL INFO ─────────────────── */}
      <section className="py-24 bg-white border-t border-border-light">
        <div className="section-container space-y-16">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                <BookOpen className="w-3 h-3" />
                Edu Tips Hukum
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Panduan Edukasi Hukum Kilat
              </h2>
              <p className="text-sm text-slate-grille leading-relaxed">
                Pelajari cara membaca kontrak kerja dan menyusun kesepakatan bisnis yang sehat untuk menghindari konflik hukum.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Batasi Nilai Sanksi Keterlambatan",
                desc: "Jangan menyetujui sanksi denda keterlambatan penyelesaian proyek > 0.1% per hari dari nilai kontrak, dan pastikan menyertakan batas maksimal denda sebesar 5%.",
              },
              {
                title: "Tahan Pengalihan Hak Cipta (HAKI)",
                desc: "Hak Kekayaan Intelektual atas hasil karya Anda hanya boleh diserahkan kepada klien secara otomatis jika dan hanya jika pembayaran kontrak telah dilunasi 100%.",
              },
              {
                title: "Terapkan Asas Keseimbangan Sanksi",
                desc: "Jika Anda bersedia dikenakan sanksi denda karena terlambat bekerja, pastikan klien juga dikenakan sanksi denda bunga jika terlambat melakukan pembayaran tagihan.",
              },
            ].map((tip, idx) => (
              <RevealOnScroll key={idx} delay={idx * 100}>
                <div className="bg-canvas rounded-2xl border border-border-light p-6 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h4 className="text-sm font-bold text-midnight-ink flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-midnight-ink text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                      {idx + 1}
                    </span>
                    {tip.title}
                  </h4>
                  <p className="text-xs text-slate-grille leading-relaxed">{tip.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <section id="faq" className="py-28 bg-[#fbfcfe] border-t border-border-light">
        <div className="section-container">
          <div className="max-w-2xl mx-auto space-y-12">
            <RevealOnScroll>
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                  FAQ
                </div>
                <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                  Pertanyaan yang Sering Diajukan
                </h2>
              </div>
            </RevealOnScroll>

            <div className="space-y-3">
              {FAQ_DATA.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <RevealOnScroll key={i} delay={i * 50}>
                    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${isOpen ? "border-electric-blue/30 bg-[#fbfdff]" : "border-border-light bg-white hover:border-border-medium"}`}>
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left cursor-pointer border-0 bg-transparent"
                      >
                        <span className="text-sm font-semibold text-midnight-ink leading-snug">{faq.question}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-grille shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-electric-blue" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-sm text-slate-grille leading-relaxed border-t border-electric-blue/10 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA BANNER ─────────────────── */}
      <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #00262b 0%, #011f24 60%, #0b363b 100%)" }}>
        <div className="absolute inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(171,255,174,0.08) 0%, transparent 70%)" }} />

        <div className="section-container relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ background: "rgba(171,255,174,0.08)", borderColor: "rgba(171,255,174,0.2)", color: "#abffae" }}>
            <Sparkles className="w-3 h-3" />
            Gratis · Tidak Perlu Kartu Kredit
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white max-w-2xl mx-auto leading-tight">
            Siap Melindungi Bisnis Anda dari Kontrak Tidak Adil?
          </h2>
          <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
            Bergabung dengan 15.000+ pelaku UMKM Indonesia yang sudah mengamankan kontrak mereka menggunakan KontrakPintar AI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? "/dashboard?tab=analyzer" : "/login?redirect=/dashboard?tab=analyzer"}
              className="btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md"
              style={{ background: "#abffae", color: "#00262b" }}
            >
              <Shield className="w-4 h-4" />
              Scan Kontrak Sekarang
            </Link>
            <Link
              href={isLoggedIn ? "/dashboard?tab=wizard" : "/login?redirect=/dashboard?tab=wizard"}
              className="btn-outline px-8 py-3.5 text-sm font-semibold border-white/20 text-white hover:bg-white/10 hover:border-white/30 bg-transparent"
            >
              Buat Draf SPK Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="border-t border-white/10 py-10" style={{ background: "#011d21" }}>
        <div className="section-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#00262b] border border-spring-leaf/20 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-spring-leaf" />
            </div>
            <span className="text-sm font-bold text-white">
              KontrakPintar<span className="text-spring-leaf">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium text-white/40">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Tentang</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Kebijakan Privasi</span>
            <span className="hover:text-white/70 cursor-pointer transition-colors">Kontak</span>
          </div>

          <p className="text-xs text-white/30">© 2026 JuaraVibe Coding Project</p>
        </div>
      </footer>

      {/* ─────────────────── TRIAL EXHAUSTED MODAL ─────────────────── */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-5 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-midnight-ink">Batas Percobaan Habis</h3>
              <p className="text-xs text-slate-grille leading-relaxed">
                Anda telah menggunakan batas 1 kali uji coba gratis. Silakan masuk atau daftarkan akun bisnis Anda secara gratis untuk mendapatkan akses penuh tanpa batas.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/login?redirect=/"
                className="btn-primary w-full h-10 flex items-center justify-center text-xs font-bold"
              >
                Daftar Akun Baru
              </Link>
              <Link
                href="/login?redirect=/"
                className="btn-outline w-full h-10 flex items-center justify-center text-xs font-bold"
              >
                Masuk ke Akun
              </Link>
              <button
                onClick={() => setShowTrialModal(false)}
                className="text-xs font-medium text-slate-grille hover:text-midnight-ink pt-1 cursor-pointer bg-transparent border-0"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── DAILY LIMIT EXHAUSTED MODAL ─────────────────── */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-5 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-midnight-ink">Batas Harian Tercapai</h3>
              <p className="text-xs text-slate-grille leading-relaxed">
                Anda telah menggunakan batas harian maksimal 8 kali pembuatan atau pemindaian dokumen hari ini. Silakan coba lagi besok untuk melindungi stabilitas server kami.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setShowDailyLimitModal(false)}
                className="btn-primary w-full h-10 flex items-center justify-center text-xs font-bold"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
