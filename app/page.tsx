"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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

// Animated counter hook
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

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const countDocs = useCountUp(15000, 1800, statsVisible);
  const countAccuracy = useCountUp(994, 1800, statsVisible);
  const countTime = useCountUp(5, 1200, statsVisible);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-canvas font-sans antialiased text-midnight-ink overflow-x-hidden">

      {/* ─────────────────── HERO ─────────────────── */}
      <section id="hero" className="relative overflow-hidden pt-24 pb-28">
        {/* Multi-layer background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
        
        {/* Animated glow orbs */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none animate-glow-pulse"
          style={{ background: "radial-gradient(ellipse at center, rgba(0, 106, 242, 0.09) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-40 -right-20 w-[500px] h-[400px] pointer-events-none animate-glow-pulse animation-delay-700"
          style={{ background: "radial-gradient(ellipse at center, rgba(171, 255, 174, 0.12) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(0, 38, 43, 0.04) 0%, transparent 70%)" }}
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
                className="btn-primary px-7 py-3.5 text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Shield className="w-4 h-4" />
                Scan Kontrak Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={isLoggedIn ? "/dashboard?tab=wizard" : "/login?redirect=/dashboard?tab=wizard"}
                className="btn-outline px-7 py-3.5 text-sm font-semibold flex items-center gap-2"
              >
                Buat Draf SPK
                <FileText className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-up animation-delay-300 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-grille">
              {[
                { icon: Lock, label: "Enkripsi SSL" },
                { icon: CheckCircle2, label: "Gratis Tanpa Kartu Kredit" },
                { icon: Zap, label: "Hasil dalam 30 Detik" },
              ].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5 font-medium">
                  <t.icon className="w-3.5 h-3.5 text-electric-blue" />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* App Preview Mockup */}
          <div className="mt-16 max-w-4xl mx-auto animate-fade-up animation-delay-300">
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-border-light bg-white"
              style={{ boxShadow: "0 32px 80px rgba(0, 38, 43, 0.14), 0 4px 16px rgba(0, 38, 43, 0.08)" }}
            >
              {/* Window Chrome */}
              <div className="flex items-center justify-between bg-[#f7f8f9] border-b border-border-light px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <span className="ml-4 text-xs font-mono text-slate-grille">kontrakpintar.ai — Analisis Kontrak</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[9px] font-bold text-[#1d6b2a] bg-[#eafde8] px-2.5 py-1 rounded-full border border-spring-leaf/30">
                    <span className="w-1 h-1 rounded-full bg-green-500 inline-block" />
                    AI Engine Aktif
                  </span>
                </div>
              </div>

              {/* Split Preview */}
              <div className="grid grid-cols-2 text-sm bg-white min-h-[200px]">
                {/* Left: Contract Input */}
                <div className="p-6 border-r border-border-light space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Naskah Kontrak (Input)</p>
                  <div className="bg-[#f9fafb] rounded-lg p-4 font-mono text-[11px] text-slate-grille space-y-1.5 border border-border-light leading-relaxed">
                    <p className="font-bold text-midnight-ink">Pasal 4: Sanksi Keterlambatan</p>
                    <p className="text-slate-grille/80">
                      "Setiap hari keterlambatan penyelesaian proyek oleh Pihak Kedua akan dikenakan denda sebesar{" "}
                      <span className="bg-[#fff3ef] text-amber-pop px-0.5 rounded font-semibold">2% dari total nilai kontrak per hari</span>{" "}
                      keterlambatan tanpa ada batas denda maksimal."
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-grille">
                    <div className="w-1.5 h-1.5 rounded-full bg-electric-blue animate-pulse-dot" />
                    Menganalisis 1 dokumen...
                  </div>
                </div>

                {/* Right: AI Output */}
                <div className="p-6 bg-[#fbfcfe] space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-grille">Hasil Analisis AI</p>
                    <span className="text-[9px] font-bold text-amber-pop bg-[#fff9f7] px-2 py-0.5 rounded-full border border-amber-pop/15">
                      3 Red Flags
                    </span>
                  </div>

                  {/* Aman-O-Meter mini */}
                  <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-border-light">
                    <div className="relative w-12 h-12 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e4e8eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#8b3911" strokeWidth="3"
                          strokeDasharray="39 49" strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-amber-pop">45%</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-midnight-ink">Skor Keamanan: Rendah</p>
                      <p className="text-[9px] text-slate-grille mt-0.5">Ditemukan 3 pasal bermasalah kritis</p>
                    </div>
                  </div>

                  {/* Red flag card */}
                  <div className="bg-white rounded-lg p-3 border border-border-light" style={{ borderLeftWidth: "3px", borderLeftColor: "#8b3911" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-midnight-ink">Klausul Denda 2%/Hari</span>
                      <span className="text-[8px] font-bold uppercase text-amber-pop bg-[#fff9f7] px-1.5 py-0.5 rounded">Kritis</span>
                    </div>
                    <p className="text-[10px] text-slate-grille leading-relaxed">Denda tanpa batas membahayakan UMKM.</p>
                    <p className="text-[10px] font-semibold text-[#1d6b2a] mt-1">✓ Revisi: Batasi maks. 5% dari nilai kontrak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="relative mt-0">
              <div className="absolute -top-4 -left-6 animate-float animation-delay-200">
                <div className="bg-white border border-border-light rounded-xl shadow-md px-4 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#eafde8] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#1d6b2a]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-midnight-ink">SPK Dibuat</p>
                    <p className="text-[9px] text-slate-grille">2 menit 34 detik</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-6 animate-float animation-delay-500">
                <div className="bg-midnight-ink border border-white/10 rounded-xl shadow-md px-4 py-2.5 flex items-center gap-2">
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
      <section id="features" className="py-28 bg-white border-t border-border-light">
        <div className="section-container space-y-16">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-2xl border border-border-light p-7 flex flex-col gap-5 hover:-translate-y-1 transition-all duration-300"
                style={{ boxShadow: "0 1px 4px rgba(0,38,43,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,38,43,0.10)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,38,43,0.05)")}
              >
                {/* Top badge */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300"
                    style={{ backgroundColor: f.accentBg, border: `1px solid ${f.accentBorder}` }}>
                    <f.icon className="w-5.5 h-5.5" style={{ color: f.accentColor }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: f.accentBg, color: f.accentColor, border: `1px solid ${f.accentBorder}` }}>
                    {f.badge}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5">
                  <h4 className="text-base font-bold text-midnight-ink leading-snug">{f.title}</h4>
                  <p className="text-sm text-slate-grille leading-relaxed">{f.description}</p>
                </div>

                <Link
                  href={isLoggedIn ? f.href : `/login?redirect=${f.href}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold transition-all group/link"
                  style={{ color: f.accentColor }}
                >
                  {f.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform duration-200" />
                </Link>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${f.accentColor}, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section id="steps" className="py-28 bg-canvas border-t border-border-light">
        <div className="section-container space-y-16">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <div key={i} className="relative group">
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-8px)] w-full h-px z-0"
                    style={{ borderTop: "1.5px dashed #cdd3d8" }} />
                )}

                <div className="relative z-10 bg-white rounded-2xl border border-border-light p-6 space-y-4 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
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
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── DATA & CHARTS ─────────────────── */}
      <section id="datacenter" className="py-28 bg-white border-t border-border-light">
        <div className="section-container space-y-16">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Chart 1: Akurasi */}
            <div className="bg-white rounded-2xl border border-border-light p-7 space-y-5 hover:shadow-md transition-shadow duration-300">
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

            {/* Chart 2: Volume UMKM */}
            <div className="bg-white rounded-2xl border border-border-light p-7 space-y-5 hover:shadow-md transition-shadow duration-300">
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
          </div>
        </div>
      </section>

      {/* ─────────────────── TESTIMONIALS ─────────────────── */}
      <section className="py-28 bg-canvas border-t border-border-light">
        <div className="section-container space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
              Testimoni Nyata
            </div>
            <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
              Dipercaya Pelaku UMKM Indonesia
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border-light p-6 space-y-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
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
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <section id="faq" className="py-28 bg-white border-t border-border-light">
        <div className="section-container">
          <div className="max-w-2xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-fog-gray rounded-full border border-border-light text-xs font-bold text-slate-grille uppercase tracking-widest">
                FAQ
              </div>
              <h2 className="text-4xl font-extrabold tracking-tighter text-midnight-ink">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-3">
              {FAQ_DATA.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`rounded-xl border transition-all duration-200 overflow-hidden ${isOpen ? "border-electric-blue/30 bg-[#fbfdff]" : "border-border-light bg-white hover:border-border-medium"}`}>
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-midnight-ink leading-snug">{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-grille shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-electric-blue" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-slate-grille leading-relaxed animate-fade-up border-t border-electric-blue/10 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
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
              className="btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg"
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
    </div>
  );
}
