"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  AlertTriangle,
  BadgeCheck,
  Gavel,
  FileWarning,
  BrainCircuit,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { checkCanGenerate, incrementUsageCount, checkIsLoggedIn } from "@/lib/limits";
import { GlossaryWrapper } from "@/components/GlossaryWrapper";
import { parseMarkdownBlocks, convertMarkdownFormatting, shouldIndentParagraph } from "@/lib/markdownParser";

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
    accentColor: "#ff9f1c",
    accentBg: "rgba(255, 159, 28, 0.07)",
    accentBorder: "rgba(255, 159, 28, 0.15)",
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
    color: "#ff9f1c",
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

// ── Component scroll reveal with direction support ──
type RevealDirection = "up" | "left" | "right" | "scale" | "blur";
function RevealOnScroll({
  children,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: RevealDirection;
}) {
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
      { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const hiddenStyles: Record<RevealDirection, string> = {
    up:    "opacity-0 translate-y-10",
    left:  "opacity-0 -translate-x-12",
    right: "opacity-0 translate-x-12",
    scale: "opacity-0 scale-90",
    blur:  "opacity-0 blur-sm translate-y-4",
  };
  const visibleStyle = "opacity-100 translate-y-0 translate-x-0 scale-100 blur-0";

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible ? visibleStyle : hiddenStyles[direction]
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Hook: chart SVG line animation on scroll ──
function useChartVisible() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Animated counter hook ──
function useCountUp(target: number, duration = 1800, start = false, keepLive = false) {
  const [count, setCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * target);
      setCount(current);
      setLiveCount(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);

  useEffect(() => {
    if (!start || !keepLive || count < target) return;
    const interval = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 2) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [start, keepLive, count, target]);

  return keepLive ? liveCount : count;
}

const parseMarkdownToHtml = (md: string): string => {
  const blocks = parseMarkdownBlocks(md);
  const htmlBlocks: string[] = [];
  
  blocks.forEach((block) => {
    switch (block.type) {
      case "h1":
        htmlBlocks.push(
          `<h1 style="text-align:center;font-size:14pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:0;margin-bottom:18pt;text-transform:uppercase;line-height:150%;mso-line-height-rule:exactly;">${convertMarkdownFormatting(block.content || "")}</h1>`
        );
        break;
      case "h2":
        if (block.isPasal) {
          htmlBlocks.push(
            `<h2 style="text-align:center;font-size:12pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:24pt;margin-bottom:12pt;text-transform:uppercase;line-height:150%;mso-line-height-rule:exactly;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.pasalNum || "")}<br/>${convertMarkdownFormatting(block.pasalTitle || "")}</h2>`
          );
        } else {
          htmlBlocks.push(
            `<h2 style="text-align:center;font-size:12pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:24pt;margin-bottom:12pt;text-transform:uppercase;line-height:150%;mso-line-height-rule:exactly;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.content || "")}</h2>`
          );
        }
        break;
      case "h3":
        htmlBlocks.push(
          `<h3 style="font-size:11pt;font-family:'Times New Roman',serif;font-weight:bold;margin-top:12pt;margin-bottom:6pt;line-height:150%;mso-line-height-rule:exactly;page-break-after:avoid;break-after:avoid;">${convertMarkdownFormatting(block.content || "")}</h3>`
        );
        break;
      case "center-bold":
        htmlBlocks.push(
          `<p style="text-align:center;font-size:11pt;font-family:'Times New Roman',serif;font-weight:bold;line-height:150%;mso-line-height-rule:exactly;margin-top:-6pt;margin-bottom:18pt;color:#000;">${convertMarkdownFormatting(block.content || "")}</p>`
        );
        break;
      case "paragraph": {
        const content = block.content || "";
        const trimmed = content.trim();
        const match = trimmed.match(/^([\w\s]{2,30})\s*:\s*(.*)$/);
        const isHeader = /^\*\*PIHAK\s+[A-Z\s]+\*\*$/i.test(trimmed) || /^\*\*PARA\s+PIHAK\*\*$/i.test(trimmed);
        
        if (isHeader) {
          const style = "font-size:11pt;font-family:'Times New Roman',serif;line-height:150%;mso-line-height-rule:exactly;color:#000;margin:12pt 0 4pt 0;text-indent:0;font-weight:bold;";
          htmlBlocks.push(`<p style="${style}">${convertMarkdownFormatting(content)}</p>`);
        } else if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          htmlBlocks.push(`
            <table style="width:100%;border:none;margin:0 0 3pt 0;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr style="border:none;">
                <td style="width:120pt;font-family:'Times New Roman',serif;font-size:11pt;line-height:150%;mso-line-height-rule:exactly;color:#000;vertical-align:top;border:none;padding:0;">${convertMarkdownFormatting(key)}</td>
                <td style="width:15pt;font-family:'Times New Roman',serif;font-size:11pt;line-height:150%;mso-line-height-rule:exactly;color:#000;vertical-align:top;border:none;padding:0;text-align:center;">:</td>
                <td style="font-family:'Times New Roman',serif;font-size:11pt;line-height:150%;mso-line-height-rule:exactly;color:#000;vertical-align:top;border:none;padding:0;text-align:justify;">${convertMarkdownFormatting(val)}</td>
              </tr>
            </table>
          `);
        } else {
          const needsIndent = shouldIndentParagraph(content);
          const style = `font-size:11pt;font-family:'Times New Roman',serif;text-align:justify;line-height:150%;mso-line-height-rule:exactly;color:#000;margin:0 0 8pt 0;${needsIndent ? "text-indent:1.25cm;" : "text-indent:0;"}`;
          htmlBlocks.push(`<p style="${style}">${convertMarkdownFormatting(content)}</p>`);
        }
        break;
      }
      case "list":
        if (block.items) {
          const listHtml = block.items.map((item) => {
            const depth = item.depth || 0;
            const marginLeft = depth === 1 ? "2.75cm" : depth === 2 ? "3.5cm" : "2.0cm";
            
            if (item.type === "bullet") {
              return `
                <p style="font-size:11pt;font-family:'Times New Roman',serif;text-align:justify;line-height:150%;mso-line-height-rule:exactly;margin:0 0 6pt ${marginLeft};text-indent:-0.75cm;color:#000;page-break-inside:avoid;break-inside:avoid;">
                  •&nbsp;&nbsp;&nbsp;${convertMarkdownFormatting(item.content)}
                </p>
              `;
            } else {
              return `
                <p style="font-size:11pt;font-family:'Times New Roman',serif;text-align:justify;line-height:150%;mso-line-height-rule:exactly;margin:0 0 8pt ${marginLeft};text-indent:-0.75cm;color:#000;page-break-inside:avoid;break-inside:avoid;">
                  <strong>${item.prefix}</strong>&nbsp;&nbsp;&nbsp;${convertMarkdownFormatting(item.content)}
                </p>
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

// ── Animated Line Chart Component ──
function AnimatedLineChart() {
  const { ref, visible } = useChartVisible();
  return (
    <RevealOnScroll>
      <div ref={ref} className="bg-white rounded-2xl border border-border-light p-7 space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-midnight-ink uppercase tracking-wide">Tren Akurasi Pemindaian</h4>
            <p className="text-xs text-slate-grille mt-0.5">Mendeteksi klausul denda, HAKI, dan wanprestasi.</p>
          </div>
          <span className="text-xs font-bold text-electric-blue bg-[#f0f6ff] px-2.5 py-1 rounded-full border border-blue-100 shrink-0">99.4% Teruji</span>
        </div>
        <div className="relative h-48 bg-fog-gray/30 rounded-xl border border-border-light/50 overflow-hidden pt-4 px-3">
          <svg className="w-full h-[110px]" viewBox="0 0 300 90" preserveAspectRatio="none">
            <defs>
              <linearGradient id="acc-grad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#006af2" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#006af2" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#006af2" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#006af2" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[18, 45, 72].map(y => (
              <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#e4e8eb" strokeWidth="0.5" strokeDasharray="4 4" />
            ))}
            {/* Area fill */}
            <polygon
              points="10,75 70,68 135,50 200,32 265,15 290,5 290,85 10,85"
              fill="url(#acc-grad2)"
              style={{ opacity: visible ? 1 : 0, transition: "opacity 0.8s 0.3s" }}
            />
            {/* Animated line */}
            <polyline
              points="10,75 70,68 135,50 200,32 265,15 290,5"
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="400"
              strokeDashoffset={visible ? "0" : "400"}
              style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s" }}
            />
            {/* Dots */}
            {([[10,75],[70,68],[135,50],[200,32],[265,15],[290,5]] as [number,number][]).map(([cx, cy], idx) => (
              <circle
                key={idx}
                cx={cx} cy={cy} r="4"
                fill="white" stroke="#006af2" strokeWidth="2"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.3s ${0.4 + idx * 0.12}s`,
                }}
              />
            ))}
          </svg>
          <div className="absolute bottom-2.5 left-0 right-0 px-4 flex justify-between text-[8px] font-bold text-slate-grille font-mono">
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
  );
}

// ── Animated Bar Chart Component ──
function AnimatedBarChart() {
  const { ref, visible } = useChartVisible();
  const bars = [
    { m: "Jan", v: "2.5K", h: 24 },
    { m: "Feb", v: "5.8K", h: 46 },
    { m: "Mar", v: "9.4K", h: 73 },
    { m: "Apr", v: "12.1K", h: 95 },
    { m: "Mei", v: "15K+", h: 120 },
  ];
  return (
    <RevealOnScroll delay={150}>
      <div ref={ref} className="bg-white rounded-2xl border border-border-light p-7 space-y-5 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-midnight-ink uppercase tracking-wide">Kontrak UMKM Terlindungi</h4>
            <p className="text-xs text-slate-grille mt-0.5">Pertumbuhan akumulatif dokumen yang diamankan.</p>
          </div>
          <span className="text-xs font-bold text-spring-leaf bg-pale-mint px-2.5 py-1 rounded-full border border-spring-leaf/30 shrink-0">15K+ Aktif</span>
        </div>
        <div className="flex items-end justify-around h-48 pb-6 pt-8 bg-fog-gray/30 rounded-xl border border-border-light/50 px-4 gap-3">
          {bars.map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group">
              <span
                className={`text-[9px] font-bold transition-all duration-300 ${i === 4 ? "text-electric-blue" : "text-slate-grille opacity-0 group-hover:opacity-100"}`}
                style={{ opacity: visible && i === 4 ? 1 : undefined }}
              >
                {bar.v}
              </span>
              <div
                className="w-full rounded-t-lg overflow-hidden"
                style={{ height: `${bar.h}px` }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    background: i === 4
                      ? "linear-gradient(180deg, #006af2 0%, #0044bb 100%)"
                      : "rgba(0,38,43,0.10)",
                    boxShadow: i === 4 ? "0 4px 16px rgba(0,106,242,0.30)" : "none",
                    transform: visible ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "bottom",
                    transition: `transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s`,
                  }}
                />
              </div>
              <span className={`text-[9px] font-bold ${i === 4 ? "text-midnight-ink" : "text-slate-grille"}`}>{bar.m}</span>
            </div>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}

export default function Home() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heroRef.current.style.setProperty("--mouse-x", `${x}px`);
    heroRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

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

  const countDocs = useCountUp(15000, 1800, statsVisible, true);
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
  line-height: 150%;
  mso-line-height-rule: exactly;
}
p {
  margin: 0in 0in 8pt;
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 150%;
  mso-line-height-rule: exactly;
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
  line-height: 150%;
  mso-line-height-rule: exactly;
}
h2 {
  font-family: 'Times New Roman', serif;
  font-size: 12pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin-top: 24pt;
  margin-bottom: 12pt;
  line-height: 150%;
  mso-line-height-rule: exactly;
  page-break-after: avoid;
}
h3 {
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  font-weight: bold;
  margin-top: 12pt;
  margin-bottom: 6pt;
  line-height: 150%;
  mso-line-height-rule: exactly;
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
      <section id="hero" ref={heroRef} onMouseMove={handleMouseMove} className="relative overflow-hidden pt-12 pb-32">
        {/* Mouse Move Radial Glows */}
        <div
          className="absolute pointer-events-none opacity-40 mix-blend-screen transition-all duration-300 ease-out"
          style={{
            width: "550px",
            height: "550px",
            left: "calc(var(--mouse-x, 50%) - 275px)",
            top: "calc(var(--mouse-y, 50%) - 275px)",
            background: "radial-gradient(circle, rgba(255, 159, 28, 0.12) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute pointer-events-none opacity-30 mix-blend-screen transition-all duration-500 ease-out"
          style={{
            width: "450px",
            height: "450px",
            left: "calc(var(--mouse-x, 50%) - 225px)",
            top: "calc(var(--mouse-y, 50%) - 225px)",
            background: "radial-gradient(circle, rgba(0, 106, 242, 0.08) 0%, transparent 75%)",
            filter: "blur(70px)",
            transform: "translate(20px, 20px)",
          }}
        />

        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

        {/* Aurora orbs – animate drift */}
        <div
          className="absolute -top-40 left-1/3 w-[700px] h-[600px] pointer-events-none animate-aurora"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,106,242,0.11) 0%, transparent 60%)",
            transform: `translate(-30%, ${scrollY * 0.1}px)`,
          }}
        />
        <div
          className="absolute top-20 -right-32 w-[500px] h-[500px] pointer-events-none animate-aurora animation-delay-2000"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255, 159, 28, 0.14) 0%, transparent 60%)",
            transform: `translateY(${scrollY * -0.07}px)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none animate-aurora animation-delay-1000"
          style={{
            background: "radial-gradient(ellipse at center, rgba(139,57,17,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Futuristic Tech Mesh Grid / Jaring-Jaring (Balanced density pattern) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[1]">
          <svg className="w-full h-full text-oceanic-deep/20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Fade out gradients toward edges */}
              <radialGradient id="mesh-fade" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="60%" stopColor="white" stopOpacity="0.8" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <mask id="mesh-mask">
                <rect width="100%" height="100%" fill="url(#mesh-fade)" />
              </mask>
              {/* Balanced mesh pattern definition (60px x 60px cells) */}
              <pattern id="fine-mesh-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                {/* Horizontal & vertical lines */}
                <line x1="0" y1="0" x2="60" y2="0" stroke="currentColor" strokeWidth="0.5" />
                <line x1="0" y1="0" x2="0" y2="60" stroke="currentColor" strokeWidth="0.5" />
                {/* Diagonal lines to make it a triangular mesh */}
                <line x1="0" y1="0" x2="60" y2="60" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 3" opacity="0.6" />
                {/* Subtle intersection dots */}
                <circle cx="0" cy="0" r="1.25" fill="currentColor" opacity="0.8" />
                <circle cx="30" cy="30" r="0.75" fill="var(--color-electric-blue)" opacity="0.4" />
              </pattern>
            </defs>
            {/* Render pattern inside mask */}
            <rect width="100%" height="100%" fill="url(#fine-mesh-pattern)" mask="url(#mesh-mask)" />
          </svg>
        </div>

        <div className="section-container relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">

            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 bg-white rounded-full border border-border-light shadow-sm text-xs font-semibold text-midnight-ink">
              <span className="flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-electric-blue" />
                Didukung Google Gemini AI
              </span>
              <span className="w-px h-3.5 bg-border-light" />
              <span className="flex items-center gap-1 text-spring-leaf">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f1c] animate-pulse-dot inline-block" />
                Aktif & Siap Digunakan
              </span>
            </div>

            {/* Headline */}
            <div className="animate-fade-up animation-delay-100 space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-tighter leading-[1.03] text-midnight-ink">
                Lindungi Bisnis Anda{" "}
                <br className="hidden sm:block" />
                <span
                  style={{
                    background: "linear-gradient(135deg, #006af2 0%, #004db3 50%, #0b363b 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  dari Jerat Kontrak
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-grille max-w-xl mx-auto leading-relaxed">
                KontrakPintar AI mendeteksi pasal berbahaya dalam kontrak dan membantu UMKM membuat Surat Perjanjian Kerja yang adil — dalam hitungan menit, tanpa biaya pengacara.
              </p>
            </div>

            {/* CTAs */}
            <div className="animate-fade-up animation-delay-200 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard?tab=analyzer" : "/login?redirect=/dashboard?tab=analyzer"}
                className="btn-primary px-7 py-3.5 text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:opacity-90"
              >
                <Shield className="w-4 h-4 text-spring-leaf" />
                Scan Kontrak Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={isLoggedIn ? "/dashboard?tab=wizard" : "/login?redirect=/dashboard?tab=wizard"}
                className="btn-outline px-7 py-3.5 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                Buat Draf SPK Gratis
                <FileText className="w-4 h-4 text-electric-blue" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-up animation-delay-300 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-grille">
              {[
                { icon: Lock, label: "Enkripsi SSL" },
                { icon: CheckCircle2, label: "Uji Coba Gratis" },
                { icon: Zap, label: "Hasil dalam 30 Detik" },
                { icon: BadgeCheck, label: "Sesuai KUHPerdata" },
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
                                stroke={scanResult.skorKeamanan > 70 ? "#006af2" : scanResult.skorKeamanan > 50 ? "#ff9f1c" : "#8b3911"}
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
                                <p className="text-[10.5px] text-amber-700 font-medium bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                  <b className="text-amber-700">Saran Revisi:</b> {flag.usulanRevisi}
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
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-spring-leaf hover:underline cursor-pointer bg-transparent border-0 font-sans"
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

            {/* Floating badges — static positioning without float animation */}
            <div className="relative mt-0 hidden md:block">
              {/* Left badge */}
              <div className="absolute -top-6 -left-8">
                <div className="floating-card px-4 py-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pale-mint flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[#8b3911]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-midnight-ink">SPK Berhasil Dibuat</p>
                    <p className="text-[9px] text-slate-grille">dalam 2 menit 34 detik ✨</p>
                  </div>
                </div>
              </div>
              {/* Right badge */}
              <div className="absolute -top-6 -right-8">
                <div className="floating-card px-4 py-2.5 flex items-center gap-2.5" style={{ background: "rgba(0,38,43,0.95)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,159,28,0.15)" }}>
                    <TrendingUp className="w-4 h-4 text-spring-leaf" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white">99.4% Akurasi</p>
                    <p className="text-[9px] text-white/50">Deteksi Red Flag</p>
                  </div>
                </div>
              </div>
              {/* Bottom badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                <div className="floating-card px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-dot" />
                  <p className="text-[10px] font-bold text-midnight-ink">2 Red Flags Terdeteksi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── MISSION STATEMENT ─────────────────── */}
      <section className="py-24 bg-white border-t border-border-light overflow-hidden relative bg-diagonal-stripes">
        {/* Decorative ghost shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #006af2 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #ff9f1c 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.025] border border-midnight-ink" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.015] border border-midnight-ink" />
        </div>
        <div className="section-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: Text */}
            <RevealOnScroll direction="left">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ background: "rgba(139,57,17,0.08)", color: "#8b3911", border: "1px solid rgba(139,57,17,0.15)" }}>
                  <FileWarning className="w-3 h-3" />
                  Masalah Nyata UMKM Indonesia
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-midnight-ink leading-tight">
                  Ribuan UMKM Terjebak
                  <br />
                  <span className="text-gradient-blue">Kontrak Tidak Adil</span>
                </h2>
                <p className="text-sm text-slate-grille leading-relaxed">
                  Banyak pelaku UMKM dan freelancer Indonesia menandatangani kontrak tanpa benar-benar memahami isinya. Akibatnya, mereka terjebak dalam pasal denda sepihak, kehilangan hak cipta karya, atau tidak mendapat ganti rugi saat proyek dibatalkan mendadak.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: FileWarning, text: "Pasal denda keterlambatan sepihak tanpa batas maksimal", color: "#8b3911", bg: "rgba(139,57,17,0.08)" },
                    { icon: Gavel, text: "Pengalihan hak cipta sebelum pembayaran lunas", color: "#8b3911", bg: "rgba(139,57,17,0.08)" },
                    { icon: Shield, text: "Pembatalan proyek sepihak tanpa kompensasi", color: "#8b3911", bg: "rgba(139,57,17,0.08)" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: item.bg }}>
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <p className="text-sm text-slate-grille leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <p className="text-xs font-bold text-midnight-ink mb-1">KontrakPintar AI hadir sebagai solusi:</p>
                  <p className="text-sm text-slate-grille leading-relaxed">
                    Kami menggunakan kecerdasan buatan Google Gemini untuk memindai, menjelaskan, dan membantu memperbaiki setiap klausul berbahaya dalam kontrak Anda — secara instan, akurat, dan gratis untuk dicoba.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Right: Visual */}
            <RevealOnScroll direction="right" delay={150}>
              <div className="relative">
                {/* Main card */}
                <div className="bg-white rounded-2xl border border-border-light shadow-lg p-6 space-y-4 relative z-10">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border-light">
                    <div className="w-9 h-9 rounded-xl bg-midnight-ink flex items-center justify-center">
                      <BrainCircuit className="w-4.5 h-4.5 text-spring-leaf" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-midnight-ink">KontrakPintar AI</p>
                      <p className="text-[10px] text-slate-grille">Hasil Analisis Instan</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-dot" />
                      <span className="text-[10px] font-semibold text-amber-600">Online</span>
                    </div>
                  </div>

                  {/* Safety gauge */}
                  <div className="flex items-center gap-4 bg-canvas rounded-xl p-3">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e4e8eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#8b3911" strokeWidth="3"
                          strokeDasharray="43 100" strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-midnight-ink">43%</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-midnight-ink">Skor Keamanan Kontrak</p>
                      <p className="text-[11px] text-amber-700 font-semibold">⚠ Berisiko Tinggi — Perlu Revisi</p>
                      <p className="text-[10px] text-slate-grille mt-0.5">Ditemukan 3 pasal kritis dari 7 klausul</p>
                    </div>
                  </div>

                  {/* Red flags preview */}
                  <div className="space-y-2">
                    {[
                      { label: "Pasal 4 · Sanksi Keterlambatan", level: "Kritis", color: "#8b3911", bg: "#feefe8" },
                      { label: "Pasal 6 · Pengalihan HAKI", level: "Kritis", color: "#8b3911", bg: "#feefe8" },
                      { label: "Pasal 9 · Pembatalan Sepihak", level: "Sedang", color: "#006af2", bg: "#f0f6ff" },
                    ].map((rf, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border-light bg-white">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 rounded-full" style={{ background: rf.color }} />
                          <p className="text-[11px] font-semibold text-midnight-ink">{rf.label}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: rf.color, background: rf.bg }}>
                          {rf.level}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Suggestion */}
                  <div className="p-3 rounded-xl border border-spring-leaf/30 bg-pale-mint text-[11px] text-[#8b3911] leading-relaxed">
                    <span className="font-bold text-[#8b3911]">✓ Usulan Revisi AI:</span> Tambahkan batasan maksimal denda 5% dari nilai kontrak dan kewajiban DP 30% sebelum pekerjaan dimulai.
                  </div>
                </div>

                {/* Decorative floating element */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-2xl opacity-20 pointer-events-none animate-float-slow"
                  style={{ background: "linear-gradient(135deg, #006af2, #ff9f1c)", transform: "rotate(12deg)" }} />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-xl opacity-15 pointer-events-none animate-float animation-delay-700"
                  style={{ background: "linear-gradient(135deg, #8b3911, #ff8c5a)", transform: "rotate(-8deg)" }} />
              </div>
            </RevealOnScroll>

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
              { value: countDocs > 0 ? `${countDocs.toLocaleString()}+` : "15.000+", label: "Pelaku UMKM Terlindungi", icon: Users, color: "#ff9f1c" },
              { value: `${(countAccuracy / 10).toFixed(1)}%`, label: "Akurasi Scanning Hukum AI", icon: Shield, color: "#ff9f1c", border: true },
              { value: `< ${countTime || 5} Mnt`, label: "Kecepatan Pembuatan SPK", icon: Clock, color: "#ff9f1c" },
            ].map((s, i) => (
              <div key={i} className={`text-center py-8 sm:py-6 px-6 ${s.border ? "sm:border-x border-white/10 border-y sm:border-y-0 py-8" : ""}`}>
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,159,28,0.1)", border: "1px solid rgba(255,159,28,0.15)" }}>
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
                  className="group relative bg-white rounded-2xl border border-border-light p-7 flex flex-col gap-5 transition-all duration-300 shadow-sm hover:shadow-md hover:border-spring-leaf hover:opacity-95 cursor-pointer"
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
      <section className="py-24 bg-canvas border-t border-border-light relative overflow-hidden bg-topo">
        {/* Animated accent glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/4 w-80 h-80 animate-particle-a animation-delay-1000" style={{ background: "radial-gradient(circle, rgba(0,106,242,0.05) 0%, transparent 65%)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 animate-particle-c animation-delay-2000" style={{ background: "radial-gradient(circle, rgba(255,159,28,0.06) 0%, transparent 65%)" }} />
          <div className="absolute top-1/2 -right-16 w-48 h-48 animate-particle-b animation-delay-500" style={{ background: "radial-gradient(circle, rgba(0,106,242,0.04) 0%, transparent 65%)" }} />
        </div>
        <div className="section-container space-y-16 relative z-10">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-pale-mint rounded-full border border-spring-leaf/30 text-xs font-bold text-[#8b3911] uppercase tracking-widest">
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
            background: "radial-gradient(circle, #ff9f1c 0%, transparent 70%)",
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

      {/* ─────────────────── DATA & CHARTS (ANIMATED SVG) ─────────────────── */}
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
            {/* Chart 1: Akurasi — animated line chart */}
            <AnimatedLineChart />

            {/* Chart 2: Volume UMKM — animated bar chart */}
            <AnimatedBarChart />
          </div>

          {/* Bonus: Donut stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Akurasi AI", value: "99.4%", sub: "Uji coba 1.200 dokumen", color: "#006af2" },
              { label: "UMKM Terlindungi", value: "15K+", sub: "Per Mei 2026", color: "#ff9f1c" },
              { label: "Jenis Red Flag", value: "6+", sub: "Pasal jebakan terdeteksi", color: "#8b3911" },
              { label: "Waktu Analisis", value: "<30s", sub: "Per dokumen rata-rata", color: "#006af2" },
            ].map((stat, i) => (
              <RevealOnScroll key={i} delay={i * 80} direction="scale">
                <div className="bg-white rounded-xl border border-border-light p-4 text-center space-y-1 shadow-xs hover:shadow-md transition-all hover:opacity-90">
                  <p className="text-2xl font-extrabold tracking-tighter" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[11px] font-bold text-midnight-ink">{stat.label}</p>
                  <p className="text-[9px] text-slate-grille">{stat.sub}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── TESTIMONIALS — INFINITE MARQUEE ─────────────────── */}
      <section className="py-24 bg-canvas border-t border-border-light overflow-hidden relative bg-mesh-green">
        {/* Subtle animated glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-64 animate-particle-a animation-delay-1500" style={{ background: "radial-gradient(ellipse at top, rgba(255, 159, 28, 0.04) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 animate-particle-d animation-delay-2500" style={{ background: "radial-gradient(circle, rgba(0,106,242,0.04) 0%, transparent 65%)" }} />
        </div>
        <div className="space-y-12 relative z-10">
          <RevealOnScroll>
            <div className="text-center space-y-4 max-w-xl mx-auto px-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                Testimoni Nyata
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Dipercaya Pelaku UMKM Indonesia
              </h2>
              <p className="text-sm text-slate-grille">
                Bergabung dengan lebih dari 15.000 pelaku usaha yang sudah menggunakan KontrakPintar AI.
              </p>
            </div>
          </RevealOnScroll>

          {/* Marquee strip */}
          <div className="relative">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #f5f7f8, transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #f5f7f8, transparent)" }} />

            <div className="overflow-hidden">
              <div className="marquee-track gap-4 py-1">
                {/* Duplicate the testimonials list for seamless loop */}
                {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-80 bg-white rounded-2xl border border-border-light p-5 space-y-3 shadow-sm"
                  >
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, si) => (
                        <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-grille leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-2.5 pt-2 border-t border-border-light">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric-blue/20 to-spring-leaf/20 flex items-center justify-center text-xs font-extrabold text-midnight-ink shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-midnight-ink">{t.name}</p>
                        <p className="text-[10px] text-slate-grille">{t.role} · {t.city}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── ADDED SECTION: EDUCATIONAL INFO ─────────────────── */}
      <section className="py-24 bg-white border-t border-border-light relative overflow-hidden bg-diagonal-stripes">
        {/* Corner glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 animate-particle-b animation-delay-1000" style={{ background: "radial-gradient(circle at top right, rgba(255, 159, 28, 0.05) 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 w-56 h-56 animate-particle-c animation-delay-3000" style={{ background: "radial-gradient(circle at bottom left, rgba(0,106,242,0.04) 0%, transparent 60%)" }} />
        </div>
        <div className="section-container space-y-16 relative z-10">
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
          style={{ background: "radial-gradient(ellipse at top, rgba(255,159,28,0.08) 0%, transparent 70%)" }} />
        {/* Elegant top & bottom radial glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-80 h-80 opacity-[0.05]" style={{ background: "radial-gradient(circle, #ff9f1c 0%, transparent 70%)" }} />
          <div className="absolute bottom-[10%] right-[5%] w-96 h-96 opacity-[0.05]" style={{ background: "radial-gradient(circle, #006af2 0%, transparent 70%)" }} />
        </div>

        <div className="section-container relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold" style={{ background: "rgba(255,159,28,0.08)", borderColor: "rgba(255,159,28,0.2)", color: "#ff9f1c" }}>
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
              style={{ background: "#ff9f1c", color: "#00262b" }}
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
          <div className="flex items-center">
            <span className="text-sm font-bold text-white tracking-tight">
              Kontrak<span className="text-spring-leaf">Pintar</span>
              <span className="text-[10px] font-bold text-white/50 ml-1 align-top mt-0.5 inline-block">AI</span>
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
