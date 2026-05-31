"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SplitScreenAnalyzer } from "@/components/SplitScreenAnalyzer";
import { DraftGenerator } from "@/components/DraftGenerator";
import {
  Scale,
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Search,
  BookMarked,
  Info,
  LogOut,
  Loader2,
  Trash2,
  FolderOpen,
  Plus,
  Sparkles,
  RefreshCw,
  FileCheck,
  ClipboardCheck,
  MessageCircle,
  User,
  X,
  CheckCircle,
  Copy,
  Printer,
  Building,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  getHistoryList,
  saveAnalysisToHistory,
  saveSPKToHistory,
  deleteHistoryItem,
  HistoryItem,
  getGlossaryList,
  GlossaryTerm,
} from "@/lib/storage";

type ActiveTab = "overview" | "analyzer" | "wizard" | "glossary" | "faq";

interface FAQItem {
  question: string;
  answer: string;
  category: "hukum" | "teknis" | "keamanan";
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Apakah draf SPK yang dibuat oleh AI sah secara hukum?",
    answer:
      "Ya, draf SPK yang dihasilkan memenuhi syarat sah perjanjian menurut Pasal 1320 KUHPerdata Indonesia. Gemini meramu pasal-pasal standar yang membagi hak dan kewajiban secara seimbang. Namun, kami tetap menyarankan Anda membaca ulang sebelum ditandatangani.",
    category: "hukum",
  },
  {
    question: "Bagaimana cara kerja penganalisis Red Flags?",
    answer:
      "Sistem mengirimkan teks kontrak Anda ke Gemini 1.5 Flash menggunakan System Instruction hukum yang ketat. AI memindai seluruh pasal, mengidentifikasi klausul tidak adil, lalu memunculkan rekomendasi revisi yang ramah bagi UMKM.",
    category: "teknis",
  },
  {
    question: "Apakah aman mengunggah draf kontrak sensitif saya di sini?",
    answer:
      "Keamanan berkas Anda adalah prioritas utama. File PDF/Word diproses secara real-time via koneksi terenkripsi (SSL). Kami tidak menyimpan salinan permanen dokumen Anda di server kami.",
    category: "keamanan",
  },
  {
    question: "Mengapa draf hasil SPK bisa diunduh ke format Microsoft Word?",
    answer:
      "Opsi unduh Word (.doc) memudahkan pelaku UMKM menyisipkan logo, mengisi nomor kontak resmi, dan melampirkan tanda tangan sebelum perjanjian kerja disahkan bersama klien.",
    category: "teknis",
  },
  {
    question: "Apakah ada batasan jumlah dokumen yang dapat dianalisis?",
    answer:
      "Untuk versi gratis/lomba, tidak ada batasan ketat. Anda dapat menganalisis dokumen dan membuat draf SPK sebanyak kebutuhan bisnis Anda.",
    category: "teknis",
  },
  {
    question: "Bagaimana perlindungan hak kekayaan intelektual (HAKI) diatur dalam SPK AI?",
    answer:
      "Secara default, pembuat SPK kami menerapkan klausul bahwa HAKI karya jasa baru akan beralih sepenuhnya ke Pihak Pertama setelah Pihak Kedua menerima pelunasan pembayaran 100%. Ini melindungi UMKM dari penyalahgunaan karya sebelum dibayar.",
    category: "hukum",
  },
];

const GLOSSARY_CATEGORIES = ["Semua", "Kontrak Kerja", "Sanksi & Denda", "Ketentuan Umum", "Force Majeure"];

const EDUCATIONAL_TIPS = [
  {
    title: "Asas Kebebasan Berkontrak (Pasal 1338 KUHPerdata)",
    desc: "Hukum Indonesia menganut prinsip kebebasan berkontrak — namun kontrak tidak boleh melanggar UU atau berat sebelah secara ekstrem. Pastikan SPK Anda membagi risiko keterlambatan secara adil antara Anda dan klien agar keduanya terlindungi secara setara.",
  },
  {
    title: "Klausul Pengalihan HAKI & Hak Cipta Karya Jasa",
    desc: "Dalam kontrak jasa (desain, web, software), tambahkan pasal yang menyatakan HAKI baru beralih ke klien setelah pelunasan 100%. Ini mencegah karya Anda digunakan atau dipublikasikan secara bebas sebelum Anda dibayar lunas.",
  },
  {
    title: "Uang Muka (DP) Minimal 30% adalah Hak UMKM",
    desc: "Tetapkan DP minimal 30% sebelum mulai pengerjaan. Memberikan hasil kerja penuh dulu baru dibayar di akhir sangat berisiko. Gunakan sistem termin berbasis progres: misal 30% awal, 40% setelah revisi 1, dan 30% setelah serah terima final.",
  },
  {
    title: "Klausul Force Majeure yang Adil",
    desc: "Force Majeure melindungi Anda dari kewajiban saat terjadi bencana alam, wabah, atau kebijakan darurat pemerintah. Waspada pada kontrak yang memaksa penyelesaian proyek meski kondisi di luar kendali, atau yang tidak mencantumkan mekanisme penghentian yang wajar.",
  },
  {
    title: "Syarat Sah Perjanjian: Pasal 1320 KUHPerdata",
    desc: "Agar kontrak sah secara hukum, wajib memenuhi 4 syarat: (1) kesepakatan para pihak, (2) kecakapan hukum, (3) objek perjanjian yang jelas, dan (4) tujuan yang halal. Pastikan SPK Anda memenuhi keempat syarat ini agar tidak bisa dibatalkan di kemudian hari.",
  },
  {
    title: "Addendum: Cara Tepat Mengubah Isi Kontrak",
    desc: "Jika ada perubahan lingkup pekerjaan, biaya, atau tenggat waktu di tengah proyek, jangan ubah kontrak secara lisan. Buat Addendum resmi yang ditandatangani kedua belah pihak. Perubahan lisan sangat sulit dibuktikan di pengadilan dan sering berujung sengketa.",
  },
  {
    title: "Batasi Tanggung Jawab (Limit of Liability)",
    desc: "Masukkan pasal yang membatasi tanggung jawab maksimal Anda (misal: tidak melebihi total nilai kontrak). Tanpa batas ini, klien bisa menuntut ganti rugi tak terbatas atas kesalahan kecil. Ini bukan klausul tidak jujur — ini perlindungan hukum yang wajar bagi UMKM.",
  },
  {
    title: "Hak Pembatalan Sepihak yang Berkeadilan",
    desc: "Klien berhak membatalkan proyek, tapi UMKM berhak mendapat kompensasi pekerjaan yang sudah dikerjakan. Pastikan ada pasal yang mengatur: jika klien membatalkan, minimal biaya pekerjaan yang telah berjalan dan DP tidak dikembalikan, sehingga Anda tidak merugi.",
  },
  {
    title: "Penyelesaian Sengketa: Musyawarah Lebih Hemat",
    desc: "Cantumkan klausul penyelesaian sengketa bertahap: (1) musyawarah mufakat selama 30 hari, (2) mediasi jika gagal, (3) baru pengadilan atau arbitrase. Jalur musyawarah jauh lebih hemat waktu dan biaya dibandingkan langsung ke jalur hukum formal.",
  },
  {
    title: "Denda Keterlambatan yang Proporsional",
    desc: "Denda keterlambatan harus berlaku dua arah: untuk UMKM jika terlambat menyelesaikan pekerjaan, dan untuk klien jika terlambat membayar. Standar wajar adalah 0.1% per hari keterlambatan dengan batas maksimum 5–10% dari nilai kontrak agar tidak memberatkan salah satu pihak.",
  },
];

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ActiveTab | null;

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [selectedTip, setSelectedTip] = useState({ title: "", desc: "" });
  const [isGeneratingSPK, setIsGeneratingSPK] = useState(false);
  const [activeHistoryDetail, setActiveHistoryDetail] = useState<HistoryItem | null>(null);
  
  // State Autentikasi
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // State data riwayat
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // State data glosarium
  const [glossaryList, setGlossaryList] = useState<GlossaryTerm[]>([]);
  const [loadingGlossary, setLoadingGlossary] = useState(true);

  // State pencarian & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [glossaryFilter, setGlossaryFilter] = useState("Semua");
  const [faqSearchQuery, setFaqSearchQuery] = useState("");
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>("semua");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // State muat dokumen riwayat ke workspace
  const [selectedAnalysisText, setSelectedAnalysisText] = useState("");
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<any>(null);
  const [selectedDraftText, setSelectedDraftText] = useState("");
  const [selectedDraftFormData, setSelectedDraftFormData] = useState<any>(null);

  // State notifikasi salin glosarium
  const [copiedGlossaryIdx, setCopiedGlossaryIdx] = useState<number | null>(null);

  // State Chatbot Bantuan FAQ
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; content: string }>>([
    {
      role: "model",
      content: "Halo! Saya Asisten KontrakPintar AI. Saya siap membantu Anda memahami seluruh fitur (audit Red Flags, pembuat SPK kilat, ekspor dokumen hukum), arti kata dalam kamus hukum, serta keamanan privasi berkas Anda di website ini. Silakan tanyakan apa saja!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-[#00262b]">{part}</strong>;
      }
      const subParts = part.split("\n");
      return subParts.map((sub, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {sub}
          {j < subParts.length - 1 && <br />}
        </React.Fragment>
      ));
    });
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim() || chatLoading) return;

    const userMessage = { role: "user" as const, content: messageText };
    setChatMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/faq-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal mendapatkan respon asisten.");
      }

      setChatMessages((prev) => [...prev, { role: "model", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "model", content: `Maaf, terjadi kendala koneksi: ${err.message || err}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Load history list
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const list = await getHistoryList();
      setHistoryList(list);
    } catch (e) {
      console.error("Gagal memuat riwayat:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load glossary list
  const loadGlossary = async () => {
    setLoadingGlossary(true);
    try {
      const list = await getGlossaryList();
      setGlossaryList(list);
    } catch (e) {
      console.error("Gagal memuat glosarium:", e);
    } finally {
      setLoadingGlossary(false);
    }
  };

  useEffect(() => {
    const authSession = localStorage.getItem("kontrakpintar_auth");
    if (!authSession) {
      const currentTab = tabParam || "overview";
      router.push(`/login?redirect=/dashboard?tab=${currentTab}`);
    } else {
      try {
        setCurrentUser(JSON.parse(authSession));
      } catch (e) {
        console.error("Gagal membaca session:", e);
      }
      setAuthLoading(false);

      // Simpan draf tamu sebelum login jika ada
      const savePendingDraft = async () => {
        const pending = localStorage.getItem("kontrakpintar_pending_save");
        if (pending) {
          try {
            const item = JSON.parse(pending);
            if (item.type === "analysis") {
              await saveAnalysisToHistory(
                item.title,
                item.contractText,
                item.score,
                item.redFlagsCount,
                item.analysisResult
              );
            } else if (item.type === "draft") {
              await saveSPKToHistory(
                item.title,
                item.pihakPertama,
                item.pihakKedua,
                item.detailJasa,
                item.pembayaran,
                item.draftText,
                item.instruksiKhusus
              );
            }
          } catch (err) {
            console.error("Gagal menyimpan draf tertunda:", err);
          } finally {
            localStorage.removeItem("kontrakpintar_pending_save");
          }
        }
        // Muat riwayat setelah data tersimpan
        loadHistory();
      };

      savePendingDraft();
      loadGlossary();
      const rand = Math.floor(Math.random() * EDUCATIONAL_TIPS.length);
      setSelectedTip(EDUCATIONAL_TIPS[rand]);
    }
  }, [router]);

  useEffect(() => {
    const targetTab = tabParam || "overview";
    if (["overview", "analyzer", "wizard", "glossary", "faq"].includes(targetTab)) {
      if (activeTab === "wizard" && targetTab !== "wizard" && isGeneratingSPK) {
        const confirmLeave = window.confirm("Progres pembuatan draf SPK sedang berjalan. Jika Anda pindah halaman, draf yang sedang digenerate atau data input dapat hilang. Apakah Anda yakin ingin keluar?");
        if (!confirmLeave) {
          router.replace("/dashboard?tab=wizard");
          return;
        }
      }
      setActiveTab(targetTab as ActiveTab);
    }
  }, [tabParam, activeTab, isGeneratingSPK, router]);

  // Handler callback saat analisa kontrak selesai
  const handleAnalysisComplete = async (
    title: string,
    text: string,
    score: number,
    redFlagsCount: number,
    result: any
  ) => {
    try {
      const saved = await saveAnalysisToHistory(title, text, score, redFlagsCount, result);
      // Update state local
      setHistoryList((prev) => {
        const filtered = prev.filter((item) => item.id !== saved.id);
        return [saved, ...filtered];
      });
      // PRESERVE STATE
      setSelectedAnalysisText(text);
      setSelectedAnalysisResult(result);
    } catch (e) {
      console.error("Gagal mencatat analisis:", e);
    }
  };

  // Handler callback saat pembuatan SPK selesai
  const handleDraftComplete = async (
    title: string,
    pihakPertama: any,
    pihakKedua: any,
    detailJasa: any,
    pembayaran: any,
    draftText: string,
    instruksiKhusus?: string
  ) => {
    try {
      const saved = await saveSPKToHistory(
        title,
        pihakPertama,
        pihakKedua,
        detailJasa,
        pembayaran,
        draftText,
        instruksiKhusus
      );
      // Update state local
      setHistoryList((prev) => {
        const filtered = prev.filter((item) => item.id !== saved.id);
        return [saved, ...filtered];
      });
      // PRESERVE STATE
      setSelectedDraftText(draftText);
      setSelectedDraftFormData({
        pihakPertama,
        pihakKedua,
        detailJasa,
        pembayaran,
        instruksiKhusus,
      });
    } catch (e) {
      console.error("Gagal mencatat SPK:", e);
    }
  };

  // Hapus item dari riwayat
  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini dari riwayat?")) {
      try {
        await deleteHistoryItem(id);
        setHistoryList((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Gagal menghapus:", err);
      }
    }
  };

  // Helper to check wizard warning before leaving
  const checkWizardLeave = (target: ActiveTab) => {
    if (activeTab === "wizard" && target !== "wizard" && isGeneratingSPK) {
      return window.confirm("Progres pembuatan draf SPK sedang berjalan. Jika Anda pindah halaman, draf yang sedang digenerate atau data input dapat hilang. Apakah Anda yakin ingin keluar?");
    }
    return true;
  };

  // Buka/Muat dokumen riwayat ke tab workspace
  const handleLoadItem = (item: HistoryItem) => {
    const targetTab = item.type === "analysis" ? "analyzer" : "wizard";
    if (!checkWizardLeave(targetTab)) return;

    if (item.type === "analysis") {
      setSelectedAnalysisText(item.contractText || "");
      setSelectedAnalysisResult(item.analysisResult || null);
      setActiveTab("analyzer");
      router.push("/dashboard?tab=analyzer");
    } else {
      setSelectedDraftText(item.draftText || "");
      setSelectedDraftFormData({
        pihakPertama: item.pihakPertama || { nama: "", domisili: "" },
        pihakKedua: item.pihakKedua || { nama: "", domisili: "" },
        detailJasa: item.detailJasa || { lingkupKerja: "", tenggatWaktu: "" },
        pembayaran: item.pembayaran || { nilaiKontrak: "", persentaseDP: "0", sanksiKeterlambatan: "" },
        instruksiKhusus: item.instruksiKhusus || "",
      });
      setActiveTab("wizard");
      router.push("/dashboard?tab=wizard");
    }
  };

  // Reset pemicu buat dokumen baru
  const handleNewAnalysis = () => {
    if (!checkWizardLeave("analyzer")) return;
    setSelectedAnalysisText("");
    setSelectedAnalysisResult(null);
    setActiveTab("analyzer");
    router.push("/dashboard?tab=analyzer");
  };

  const handleNewSPK = () => {
    if (!checkWizardLeave("wizard")) return;
    setSelectedDraftText("");
    setSelectedDraftFormData(null);
    setActiveTab("wizard");
    router.push("/dashboard?tab=wizard");
  };

  // Filter Glosarium
  const filteredGlossary = glossaryList.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (glossaryFilter === "Semua") return matchesSearch;
    
    // Pemetaan kategori sederhana
    let matchesCategory = false;
    if (glossaryFilter === "Kontrak Kerja") {
      matchesCategory = ["Pihak Pertama", "Pihak Kedua", "Addendum", "Klausul", "Memorandum of Understanding (MoU)", "Non-Disclosure Agreement (NDA)"].includes(item.term);
    } else if (glossaryFilter === "Sanksi & Denda") {
      matchesCategory = ["Wanprestasi", "Ganti Rugi Liquidated Damages", "Ganti Rugi Konsekuensial"].includes(item.term);
    } else if (glossaryFilter === "Ketentuan Umum") {
      matchesCategory = ["Arbitrase", "Yurisdiksi Hukum", "Penyelesaian Sengketa"].includes(item.term);
    } else if (glossaryFilter === "Force Majeure") {
      matchesCategory = ["Force Majeure"].includes(item.term);
    }
    
    return matchesSearch && matchesCategory;
  });

  // Filter FAQ
  const filteredFAQ = FAQ_DATA.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearchQuery.toLowerCase());
    const matchesCategory = faqCategoryFilter === "semua" || faq.category === faqCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Hitung data statistik untuk Bento Grid
  const totalScan = historyList.filter((item) => item.type === "analysis").length;
  const totalSPK = historyList.filter((item) => item.type === "draft").length;
  const analysisItems = historyList.filter((item) => item.type === "analysis" && item.score !== undefined);
  const avgScore =
    analysisItems.length > 0
      ? Math.round(analysisItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / analysisItems.length)
      : 0;
  const totalRedFlags = historyList
    .filter((item) => item.type === "analysis" && item.redFlagsCount !== undefined)
    .reduce((acc, curr) => acc + (curr.redFlagsCount || 0), 0);

  const sidebarMenuItems = [
    {
      group: "Ringkasan",
      items: [
        {
          id: "overview" as ActiveTab,
          icon: LayoutDashboard,
          label: "Ikhtisar Workspace",
          desc: "Statistik & berkas teraktif",
        },
      ],
    },
    {
      group: "Peralatan AI",
      items: [
        {
          id: "analyzer" as ActiveTab,
          icon: ShieldCheck,
          label: "Analisis Kontrak AI",
          desc: "Deteksi red flags & pasal rawan",
        },
        {
          id: "wizard" as ActiveTab,
          icon: FileText,
          label: "Pembuat SPK Kilat",
          desc: "Wizard penyusun draf SPK",
        },
      ],
    },
    {
      group: "Referensi & Bantuan",
      items: [
        {
          id: "glossary" as ActiveTab,
          icon: BookOpen,
          label: "Kamus Istilah Hukum",
          desc: "Kamus bahasa kaku sehari-hari",
        },
        {
          id: "faq" as ActiveTab,
          icon: HelpCircle,
          label: "Bantuan & FAQ",
          desc: "Keabsahan hukum & panduan",
        },
      ],
    },
  ];

  const activeNav = sidebarMenuItems
    .flatMap((g) => g.items)
    .find((n) => n.id === activeTab)!;

  const handleLogout = () => {
    localStorage.removeItem("kontrakpintar_auth");
    router.push("/");
  };

  const handleCopyGlossary = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedGlossaryIdx(idx);
    setTimeout(() => setCopiedGlossaryIdx(null), 2000);
  };

  if (authLoading) {
    return <DashboardFallback />;
  }

  return (
    <div className="min-h-[calc(100vh-61px)] w-full bg-canvas font-sans antialiased text-midnight-ink">
      <div className={activeTab === "analyzer" || activeTab === "wizard" ? "max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-0" : "max-w-7xl mx-auto p-4 md:p-6 lg:p-8"}>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <div className="animate-fade-up space-y-6 max-w-5xl mx-auto">
                {/* Minimal Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-light pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-midnight-ink tracking-tight">
                      Workspace Hukum{currentUser?.name ? `, ${currentUser.name}` : ""} 👋
                    </h3>
                    <p className="text-xs text-slate-grille">
                      Kelola dan lindungi bisnis UMKM Anda dengan audit kontrak & draf SPK otomatis.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleNewAnalysis}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer font-bold shadow-xs hover:bg-[#0b363b]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Scan Kontrak Baru
                    </button>
                    <button 
                      onClick={handleNewSPK}
                      className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer bg-white font-bold border-border-light hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" /> Buat SPK Baru
                    </button>
                  </div>
                </div>

                {/* Bento Grid Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card variant="standard" className="p-5 flex flex-col justify-between min-h-[130px] hover:border-[#ff9f1c] hover:shadow-[0_0_15px_rgba(255,159,28,0.35)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-grille tracking-wider">Total Dokumen</p>
                      <div className="w-7 h-7 rounded-lg bg-fog-gray flex items-center justify-center group-hover:bg-[#ff9f1c]/20 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-slate-grille/70 group-hover:text-midnight-ink" />
                      </div>
                    </div>
                    <div>
                      <span className="text-4xl font-bold text-midnight-ink tracking-tight block group-hover:scale-105 transition-transform duration-300 origin-left">{totalScan + totalSPK}</span>
                      <div className="relative h-4 overflow-hidden mt-1">
                        <span className="text-[10px] text-slate-grille transition-all duration-300 group-hover:-translate-y-4 block">Dokumen diproses</span>
                        <span className="text-[9px] text-[#006af2] font-bold transition-all duration-300 translate-y-4 group-hover:translate-y-0 block absolute left-0 top-0">Detail: {totalScan} Scan | {totalSPK} SPK</span>
                      </div>
                    </div>
                  </Card>

                  <Card variant="standard" className="p-5 flex flex-col justify-between min-h-[130px] hover:border-[#ff9f1c] hover:shadow-[0_0_15px_rgba(255,159,28,0.35)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-grille tracking-wider">Rata-rata Skor Aman</p>
                      <div className="w-7 h-7 rounded-lg bg-[#f0f6ff] flex items-center justify-center group-hover:bg-[#ff9f1c]/20 transition-colors">
                        <ShieldCheck className="w-3.5 h-3.5 text-electric-blue group-hover:text-midnight-ink" />
                      </div>
                    </div>
                    <div>
                      <span className="text-4xl font-bold text-electric-blue tracking-tight block group-hover:scale-105 transition-transform duration-300 origin-left">
                        {avgScore > 0 ? `${avgScore}%` : "—"}
                      </span>
                      <div className="relative h-4 overflow-hidden mt-1">
                        <span className="text-[10px] font-semibold transition-all duration-300 group-hover:-translate-y-4 block" style={{ color: avgScore >= 80 ? '#15803d' : avgScore >= 60 ? '#b45309' : avgScore > 0 ? '#dc2626' : '#354d51' }}>
                          {avgScore >= 80 ? "Sangat Aman" : avgScore >= 60 ? "Cukup Aman" : avgScore > 0 ? "Rawan" : "Belum ada analisis"}
                        </span>
                        <span className="text-[9px] text-amber-600 font-bold transition-all duration-300 translate-y-4 group-hover:translate-y-0 block absolute left-0 top-0">
                          Sampel: {analysisItems.length} kontrak
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card variant="standard" className="p-5 flex flex-col justify-between min-h-[130px] hover:border-[#ff9f1c] hover:shadow-[0_0_15px_rgba(255,159,28,0.35)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-grille tracking-wider">Red Flags Dideteksi</p>
                      <div className="w-7 h-7 rounded-lg bg-[#fff9f7] flex items-center justify-center group-hover:bg-[#ff9f1c]/20 transition-colors">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-pop group-hover:text-midnight-ink" />
                      </div>
                    </div>
                    <div>
                      <span className="text-4xl font-bold text-amber-pop tracking-tight block group-hover:scale-105 transition-transform duration-300 origin-left">{totalRedFlags}</span>
                      <div className="relative h-4 overflow-hidden mt-1">
                        <span className="text-[10px] text-slate-grille transition-all duration-300 group-hover:-translate-y-4 block">Pasal bermasalah</span>
                        <span className="text-[9px] text-amber-600 font-bold transition-all duration-300 translate-y-4 group-hover:translate-y-0 block absolute left-0 top-0">Rata-rata: {totalScan > 0 ? (totalRedFlags / totalScan).toFixed(1) : 0} per berkas</span>
                      </div>
                    </div>
                  </Card>

                  <Card variant="standard" className="p-5 flex flex-col justify-between min-h-[130px] hover:border-[#ff9f1c] hover:shadow-[0_0_15px_rgba(255,159,28,0.35)] hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-grille tracking-wider">SPK Draf Terbuat</p>
                      <div className="w-7 h-7 rounded-lg bg-pale-mint flex items-center justify-center group-hover:bg-[#ff9f1c]/20 transition-colors border border-spring-leaf/25">
                        <ClipboardCheck className="w-3.5 h-3.5 text-spring-leaf group-hover:text-midnight-ink" />
                      </div>
                    </div>
                    <div>
                      <span className="text-4xl font-bold text-midnight-ink tracking-tight block group-hover:scale-105 transition-transform duration-300 origin-left">{totalSPK}</span>
                      <div className="relative h-4 overflow-hidden mt-1">
                        <span className="text-[10px] text-spring-leaf font-semibold transition-all duration-300 group-hover:-translate-y-4 block">Draf siap pakai</span>
                        <span className="text-[9px] text-spring-leaf font-bold transition-all duration-300 translate-y-4 group-hover:translate-y-0 block absolute left-0 top-0">100% Sesuai KUHPerdata</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* ── SEKSI GRAFIK INTERAKTIF SVG ── */}
                {(() => {
                  let kritisCount = 0;
                  let sedangCount = 0;
                  let ringanCount = 0;

                  historyList.forEach((item) => {
                    if (item.type === "analysis" && item.analysisResult?.redFlags) {
                      item.analysisResult.redFlags.forEach((flag: any) => {
                        const sev = flag.tingkatKeparahan?.toLowerCase();
                        if (sev === "kritis") kritisCount++;
                        else if (sev === "sedang") sedangCount++;
                        else if (sev === "ringan") ringanCount++;
                      });
                    }
                  });

                  // Fallback data visual jika riwayat kosong agar tampilan langsung terisi
                  const hasHistoryData = kritisCount > 0 || sedangCount > 0 || ringanCount > 0;
                  if (!hasHistoryData) {
                    kritisCount = 3;
                    sedangCount = 5;
                    ringanCount = 2;
                  }

                  const totalFlags = kritisCount + sedangCount + ringanCount;
                  const maxFlags = Math.max(kritisCount, sedangCount, ringanCount, 1);
                  const kritisHeight = Math.max(10, Math.round((kritisCount / maxFlags) * 100));
                  const sedangHeight = Math.max(10, Math.round((sedangCount / maxFlags) * 100));
                  const ringanHeight = Math.max(10, Math.round((ringanCount / maxFlags) * 100));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Grafik Batang SVG: Sebaran Red Flags */}
                      <Card variant="standard" className="p-5 space-y-4 hover:shadow-xs transition duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                              Distribusi Tingkat Bahaya Kontrak
                            </h4>
                            <p className="text-[10px] text-slate-grille mt-0.5">
                              {hasHistoryData 
                                ? "Berdasarkan riwayat analisis dokumen Anda." 
                                : "Data simulasi awal (Belum ada berkas teranalisis)."
                              }
                            </p>
                          </div>
                          <span className="text-[10px] text-amber-pop bg-warm-mist px-2.5 py-0.5 rounded-full border border-amber-pop/10 font-bold shrink-0">
                            {totalFlags} Red Flags
                          </span>
                        </div>
                        
                        <div className="flex items-end justify-around h-36 pt-6 pb-2 bg-fog-gray/30 rounded-lg border border-border-light/50 px-4">
                          {/* Kritis Bar */}
                          <div className="flex flex-col items-center gap-2 w-16 group relative">
                            <span className="text-[10px] font-bold text-amber-pop transition-all group-hover:scale-105">
                              {kritisCount}
                            </span>
                            <div 
                              className="w-10 rounded-t-md transition-all duration-500 ease-out hover:opacity-85 shadow-xs"
                              style={{ height: `${kritisHeight}px`, backgroundColor: "var(--color-amber-pop)" }}
                            />
                            <span className="text-[10px] font-bold text-slate-grille">Kritis</span>
                          </div>
                          
                          {/* Sedang Bar */}
                          <div className="flex flex-col items-center gap-2 w-16 group relative">
                            <span className="text-[10px] font-bold text-amber-600 transition-all group-hover:scale-105">
                              {sedangCount}
                            </span>
                            <div 
                              className="w-10 rounded-t-md transition-all duration-500 ease-out hover:opacity-85 shadow-xs"
                              style={{ height: `${sedangHeight}px`, backgroundColor: "#b45309" }}
                            />
                            <span className="text-[10px] font-bold text-slate-grille">Sedang</span>
                          </div>

                          {/* Ringan Bar */}
                          <div className="flex flex-col items-center gap-2 w-16 group relative">
                            <span className="text-[10px] font-bold text-electric-blue transition-all group-hover:scale-105">
                              {ringanCount}
                            </span>
                            <div 
                              className="w-10 rounded-t-md transition-all duration-500 ease-out hover:opacity-85 shadow-xs"
                              style={{ height: `${ringanHeight}px`, backgroundColor: "var(--color-electric-blue)" }}
                            />
                            <span className="text-[10px] font-bold text-slate-grille">Ringan</span>
                          </div>
                        </div>
                      </Card>

                      {/* Grafik Area SVG: Aktivitas Bulanan */}
                      <Card variant="standard" className="p-5 space-y-4 hover:shadow-xs transition duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                              Tren Aktivitas Audit Bulanan
                            </h4>
                            <p className="text-[10px] text-slate-grille mt-0.5">
                              Akumulasi scanning dan pembuatan draf SPK.
                            </p>
                          </div>
                          <span className="text-[10px] text-spring-leaf bg-pale-mint px-2.5 py-0.5 rounded-full font-bold border border-spring-leaf/30 shrink-0">
                            Aktif
                          </span>
                        </div>

                        <div className="relative h-40 bg-fog-gray/30 rounded-lg border border-border-light/50 overflow-hidden pt-4 px-2">
                          <svg className="w-full h-[120px]" viewBox="0 0 300 90" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-electric-blue)" stopOpacity="0.25"/>
                                <stop offset="100%" stopColor="var(--color-electric-blue)" stopOpacity="0.00"/>
                              </linearGradient>
                            </defs>
                            
                            {/* Grid lines */}
                            <line x1="0" y1="20" x2="300" y2="20" stroke="var(--color-border-light)" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1="0" y1="45" x2="300" y2="45" stroke="var(--color-border-light)" strokeWidth="0.5" strokeDasharray="3 3" />
                            <line x1="0" y1="70" x2="300" y2="70" stroke="var(--color-border-light)" strokeWidth="0.5" strokeDasharray="3 3" />
                            
                            {/* Area fill */}
                            <polygon points="10,80 70,55 135,65 200,35 265,20 290,10 290,80 10,80" fill="url(#area-gradient)" />
                            
                            {/* Line path */}
                            <polyline points="10,80 70,55 135,65 200,35 265,20 290,10" fill="none" stroke="var(--color-electric-blue)" strokeWidth="2.5" strokeLinecap="round" />
                            
                            {/* Data Points */}
                            <circle cx="10" cy="80" r="3.5" fill="var(--color-electric-blue)" className="transition-all duration-200 hover:r-5 cursor-pointer" />
                            <circle cx="70" cy="55" r="3.5" fill="var(--color-electric-blue)" />
                            <circle cx="135" cy="65" r="3.5" fill="var(--color-electric-blue)" />
                            <circle cx="200" cy="35" r="3.5" fill="var(--color-electric-blue)" />
                            <circle cx="265" cy="20" r="3.5" fill="var(--color-electric-blue)" />
                            <circle cx="290" cy="10" r="3.5" fill="var(--color-electric-blue)" />
                          </svg>
                          
                          {/* Month Labels */}
                          <div className="absolute bottom-1 left-0 right-0 px-3.5 flex justify-between text-[8px] font-bold text-slate-grille/80 font-mono">
                            <span>Jan (2)</span>
                            <span>Feb (7)</span>
                            <span>Mar (5)</span>
                            <span>Apr (10)</span>
                            <span>Mei ({(totalScan + totalSPK) > 0 ? (totalScan + totalSPK) : 4})</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })()}

                {/* Quick Actions (Shortcut) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={handleNewAnalysis}
                    className="group border border-border-light bg-white rounded-xl p-5 cursor-pointer hover:border-electric-blue hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-electric-blue/8 flex items-center justify-center text-electric-blue group-hover:bg-electric-blue group-hover:text-white transition-all shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-midnight-ink group-hover:text-electric-blue transition-colors flex items-center gap-1.5">
                        Analisis Kontrak AI Baru <Plus className="w-3.5 h-3.5" />
                      </h4>
                      <p className="text-xs text-slate-grille mt-1 leading-relaxed">
                        Unggah draf kontrak kerja sama dari klien (.pdf / .docx) dan deteksi pasal jebakan yang berat sebelah dengan sistem komparasi AI.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={handleNewSPK}
                    className="group border border-border-light bg-white rounded-xl p-5 cursor-pointer hover:border-spring-leaf hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-pale-mint flex items-center justify-center text-[#8b3911] group-hover:bg-[#ff9f1c] group-hover:text-midnight-ink transition-all shrink-0 border border-[#ff9f1c]/10">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-midnight-ink group-hover:text-[#8b3911] transition-colors flex items-center gap-1.5">
                        Buat SPK AI Baru <Plus className="w-3.5 h-3.5" />
                      </h4>
                      <p className="text-xs text-slate-grille mt-1 leading-relaxed">
                        Susun Surat Perjanjian Kerja yang seimbang secara hukum menggunakan panduan AI bertahap, lalu ekspor langsung ke Microsoft Word.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: History Log Table (Full Width) */}
                <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-midnight-ink">Riwayat Berkas & Aktivitas</h4>
                      <p className="text-xs text-slate-grille mt-0.5">Daftar dokumen hukum yang dianalisis atau dibuat oleh Anda.</p>
                    </div>
                    <button 
                      onClick={loadHistory} 
                      className="p-1.5 rounded hover:bg-fog-gray border border-border-light text-slate-grille hover:text-midnight-ink transition-colors"
                      title="Perbarui Riwayat"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {loadingHistory ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 flex-1">
                      <Loader2 className="w-6 h-6 text-slate-grille animate-spin" />
                      <p className="text-xs text-slate-grille">Menghubungkan database...</p>
                    </div>
                  ) : historyList.length === 0 ? (
                    <div className="py-16 text-center flex-1">
                      <p className="text-xs text-slate-grille">Belum ada riwayat dokumen hukum yang tersimpan.</p>
                      <button 
                        onClick={handleNewAnalysis}
                        className="mt-3 text-xs font-semibold text-white bg-midnight-ink hover:bg-oceanic-deep px-4 py-2 rounded-lg transition"
                      >
                        Mulai Dokumen Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-fog-gray/50 border-b border-border-light text-slate-grille font-semibold">
                            <th className="px-5 py-3">Nama Berkas / Dokumen</th>
                            <th className="px-5 py-3">Jenis Kegiatan</th>
                            <th className="px-5 py-3">Tanggal</th>
                            <th className="px-5 py-3 text-center">Skor / Status</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light">
                          {historyList.map((item) => (
                            <tr 
                              key={item.id} 
                              className="hover:bg-fog-gray/30 transition-colors group cursor-pointer"
                              onClick={() => setActiveHistoryDetail(item)}
                            >
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-grille shrink-0" />
                                  <span className="font-bold text-midnight-ink max-w-[280px] truncate block group-hover:text-electric-blue transition-colors">
                                    {item.title}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {item.type === "analysis" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f0f6ff] text-[#006af2] font-semibold text-[10px] border border-blue-100">
                                    Pindaian Kontrak
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pale-mint text-spring-leaf font-bold text-[10px] border border-[#ff9f1c]/20">
                                    Draf SPK Baru
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-grille font-medium">
                                {new Date(item.timestamp).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) + " WIB"}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {item.type === "analysis" ? (
                                  <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                    (item.score || 0) >= 80 
                                      ? "bg-blue-50 text-blue-700" 
                                      : (item.score || 0) >= 60 
                                        ? "bg-amber-50 text-amber-700" 
                                        : "bg-red-50 text-red-700"
                                  }`}>
                                    {item.score}% Aman
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center font-bold px-2 py-0.5 rounded-full text-[10px] bg-warm-mist text-[#8b3911] border border-amber-pop/10">
                                    Siap Cetak
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setActiveHistoryDetail(item)}
                                    className="p-1.5 rounded hover:bg-white hover:text-electric-blue text-slate-grille border border-transparent hover:border-border-light transition-all active:scale-95"
                                    title="Buka Dokumen"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteItem(item.id, e)}
                                    className="p-1.5 rounded hover:bg-white hover:text-amber-pop text-slate-grille border border-transparent hover:border-border-light transition-all active:scale-95"
                                    title="Hapus dari Riwayat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Educational Quote */}
                {selectedTip.title && (
                  <div className="bg-[#f0f6ff]/40 border border-blue-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <Info className="w-4.5 h-4.5 text-electric-blue shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-midnight-ink">Edu-Tips: {selectedTip.title}</h5>
                      <p className="text-xs text-slate-grille leading-relaxed mt-1">
                        {selectedTip.desc}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYZER TAB ── */}
            {activeTab === "analyzer" && (
              <div className="animate-fade-up" style={{ height: "calc(100vh - 140px)", minHeight: 560, display: "flex", flexDirection: "column" }}>
                <SplitScreenAnalyzer 
                  initialText={selectedAnalysisText} 
                  initialResult={selectedAnalysisResult} 
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </div>
            )}

            {/* ── WIZARD TAB ── */}
            {activeTab === "wizard" && (
              <div className="animate-fade-up h-full">
                <DraftGenerator 
                  initialDraft={selectedDraftText} 
                  initialFormData={selectedDraftFormData}
                  onDraftComplete={handleDraftComplete}
                  onGeneratingChange={setIsGeneratingSPK}
                />
              </div>
            )}

            {/* ── GLOSSARY TAB ── */}
            {activeTab === "glossary" && (
              <div className="animate-fade-up space-y-6 max-w-5xl mx-auto">
                {/* Page Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-midnight-ink tracking-tight">
                    Kamus Istilah Hukum UMKM
                  </h3>
                  <p className="text-xs text-slate-grille">
                    Terjemahan istilah hukum kaku (jargon formal) ke dalam analogi kehidupan sehari-hari secara instan.
                  </p>
                </div>

                {/* Search and Categories row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border-light shadow-xs">
                  {/* Search */}
                  <div className="relative w-full md:max-w-xs shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-grille" />
                    <input
                      type="text"
                      className="input-field pl-9 text-xs"
                      placeholder="Cari istilah (misal: Wanprestasi)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filter Categories */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                    {GLOSSARY_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGlossaryFilter(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                          glossaryFilter === cat
                            ? "bg-midnight-ink text-white"
                            : "bg-fog-gray text-slate-grille hover:bg-border-light"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glossary Grid */}
                {filteredGlossary.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-grille border border-dashed border-border-medium rounded-xl bg-fog-gray/50">
                    Tidak ditemukan istilah yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredGlossary.map((item, idx) => (
                      <div
                        key={idx}
                        className="card hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-electric-blue/8 flex items-center justify-center shrink-0">
                                <BookMarked className="w-3.5 h-3.5 text-electric-blue" />
                              </div>
                              <h4 className="text-sm font-bold text-midnight-ink pt-0.5">
                                {item.term}
                              </h4>
                            </div>
                            <button
                              onClick={() => handleCopyGlossary(`${item.term}: ${item.definition}`, idx)}
                              className="p-1 rounded text-slate-grille hover:text-electric-blue hover:bg-fog-gray border border-transparent hover:border-border-light transition-all text-[10px] font-semibold"
                            >
                              {copiedGlossaryIdx === idx ? "Tersalin!" : "Salin"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-grille leading-relaxed mb-4">
                            {item.definition}
                          </p>
                        </div>
                        <div className="bg-pale-mint/60 border-l-2 border-spring-leaf rounded-sm px-3 py-2.5 mt-auto">
                          <p className="text-[9px] font-bold text-spring-leaf uppercase tracking-wider mb-1">
                            Analogi Sehari-Hari
                          </p>
                          <p className="text-xs italic text-amber-900 leading-relaxed">
                            &ldquo;{item.analogy}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── FAQ TAB ── */}
            {activeTab === "faq" && (
              <div className="animate-fade-up max-w-6xl space-y-6 mx-auto">
                {/* Page Header */}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-midnight-ink tracking-tight">
                    Pusat Bantuan & FAQ
                  </h3>
                  <p className="text-xs text-slate-grille">
                    Informasi mengenai validitas hukum draf SPK AI, regulasi bisnis mikro, serta keamanan perlindungan privasi data.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Sisi Kiri: FAQ Accordion */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Search & Categories row */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-border-light shadow-xs justify-between">
                      {/* Search */}
                      <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-grille" />
                        <input
                          type="text"
                          className="input-field pl-9 text-xs"
                          placeholder="Cari pertanyaan umum..."
                          value={faqSearchQuery}
                          onChange={(e) => setFaqSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Kategori */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        {[
                          { id: "semua", label: "Semua Kategori" },
                          { id: "hukum", label: "Aspek Hukum" },
                          { id: "teknis", label: "Fitur Aplikasi" },
                          { id: "keamanan", label: "Proteksi Data" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setFaqCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                              faqCategoryFilter === cat.id
                                ? "bg-midnight-ink text-white"
                                : "bg-fog-gray text-slate-grille hover:bg-border-light"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 bg-electric-blue/5 border border-electric-blue/15 rounded-xl">
                      <ClipboardCheck className="w-5 h-5 text-electric-blue shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-midnight-ink mb-0.5">
                          Kepatuhan Hukum Kontrak Elektronik & SPK
                        </p>
                        <p className="text-xs text-slate-grille leading-relaxed">
                          Dasar pembuatan SPK KontrakPintar AI merujuk pada ketentuan <strong>Pasal 1338 ayat (1) KUHPerdata</strong> (Semua persetujuan yang dibuat secara sah berlaku sebagai undang-undang bagi mereka yang membuatnya) serta <strong>UU ITE No. 11/2008</strong> yang menegaskan legalitas kontrak elektronik secara sah selama disetujui kedua belah pihak secara sadar.
                        </p>
                      </div>
                    </div>

                    {/* FAQ List */}
                    {filteredFAQ.length === 0 ? (
                      <div className="py-16 text-center text-xs text-slate-grille border border-dashed border-border-medium rounded-xl bg-fog-gray/50">
                        Tidak ditemukan jawaban yang cocok untuk &ldquo;{faqSearchQuery}&rdquo;
                      </div>
                    ) : (
                      <div className="card divide-y divide-border-light px-0 py-0 overflow-hidden shadow-2xs">
                        {filteredFAQ.map((faq, i) => {
                          const isOpen = openFaq === i;
                          return (
                            <div key={i} className="transition-colors hover:bg-fog-gray/10">
                              <button
                                onClick={() => setOpenFaq(isOpen ? null : i)}
                                className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left transition-colors"
                              >
                                <span className="text-xs md:text-sm font-bold text-midnight-ink leading-snug">
                                  {faq.question}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-grille shrink-0 mt-0.5 transition-transform duration-200 ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              {isOpen && (
                                <div className="px-5 pb-4 text-xs text-slate-grille leading-relaxed animate-fade-up">
                                  {faq.answer}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Sisi Kanan: Chatbot Bantuan — desain humanis & hangat */}
                  <div className="lg:col-span-5 bg-white border border-border-light rounded-xl overflow-hidden shadow-xs flex flex-col self-start animate-fade-in">
                    {/* Header: Ganti tampilan robot gelap jadi kartu hangat/natural */}
                    <div className="px-5 py-4 border-b border-border-light bg-fog-gray/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-pale-mint border border-spring-leaf/30 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4 text-[#ff9f1c]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-midnight-ink leading-tight">Tanya KontrakPintar</h4>
                          <p className="text-[10px] text-slate-grille">Asisten panduan platform & hukum UMKM</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-spring-leaf bg-pale-mint px-2.5 py-1 rounded-full font-semibold border border-spring-leaf/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f1c] shrink-0" />
                        Aktif
                      </div>
                    </div>

                    {/* Chat Messages Log */}
                    <div ref={chatContainerRef} className="p-4 h-[320px] overflow-y-auto flex flex-col gap-3 bg-white custom-scrollbar">
                      {chatMessages.map((msg, idx) => {
                        const isUser = msg.role === "user";
                        return (
                          <div
                            key={idx}
                            className={`flex gap-2 ${
                              isUser ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            {/* Avatar */}
                            {!isUser && (
                              <div className="w-7 h-7 rounded-full bg-pale-mint border border-spring-leaf/20 flex items-center justify-center shrink-0 mt-0.5">
                                <MessageCircle className="w-3.5 h-3.5 text-[#ff9f1c]" />
                              </div>
                            )}
                            <div
                              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                isUser
                                  ? "bg-midnight-ink text-white rounded-tr-sm"
                                  : "bg-fog-gray/60 border border-border-light text-midnight-ink rounded-tl-sm"
                              }`}
                            >
                              {renderFormattedText(msg.content)}
                            </div>
                            {isUser && (
                              <div className="w-7 h-7 rounded-full bg-midnight-ink/8 border border-border-light flex items-center justify-center shrink-0 mt-0.5">
                                <User className="w-3.5 h-3.5 text-midnight-ink/60" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {chatLoading && (
                        <div className="flex flex-row gap-2">
                          <div className="w-7 h-7 rounded-full bg-pale-mint border border-spring-leaf/20 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="w-3.5 h-3.5 text-[#ff9f1c]" />
                          </div>
                          <div className="bg-fog-gray/60 border border-border-light rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-grille/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-grille/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-grille/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Questions */}
                    <div className="px-4 py-3 border-t border-border-light bg-fog-gray/10 flex flex-col gap-2">
                      <p className="text-[9px] font-semibold text-slate-grille uppercase tracking-wide">Pertanyaan Umum:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Apakah draf SPK di sini sah?",
                          "Bagaimana cara deteksi Red Flags?",
                          "Apakah data saya aman?",
                          "Bagaimana cara ekspor ke Word?",
                        ].map((qText, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={chatLoading}
                            onClick={() => handleSendChatMessage(qText)}
                            className="px-3 py-1 text-[10px] font-medium bg-white hover:bg-midnight-ink/5 border border-border-light hover:border-midnight-ink/20 text-slate-grille hover:text-midnight-ink rounded-full transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            {qText}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage();
                      }}
                      className="p-3 border-t border-border-light bg-white flex gap-2 items-center"
                    >
                      <input
                        type="text"
                        disabled={chatLoading}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Tulis pertanyaan Anda..."
                        className="input-field text-xs flex-1 py-2 focus:ring-0 focus:border-midnight-ink/40 rounded-xl"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || chatLoading}
                        className="w-9 h-9 flex items-center justify-center bg-midnight-ink hover:bg-oceanic-deep text-white rounded-xl transition active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
                        title="Kirim"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z"/>
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
            {/* ── DETAIL RIWAYAT MODAL ── */}
            {activeHistoryDetail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-border-light bg-[#00262b] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-[#ff9f1c]" />
                      <div className="text-left">
                        <h3 className="text-sm font-bold tracking-tight text-white">{activeHistoryDetail.title}</h3>
                        <p className="text-[10px] text-white/60 font-mono uppercase mt-0.5">
                          {activeHistoryDetail.type === "analysis" ? "Hasil Scan Kontrak" : "Draf SPK Baru"} &bull; {new Date(activeHistoryDetail.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveHistoryDetail(null)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border-0 cursor-pointer"
                      title="Tutup"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 bg-canvas/40 custom-scrollbar text-left">
                    {activeHistoryDetail.type === "analysis" ? (
                      /* --- SCAN KONTRAK REPORT VIEW --- */
                      <div className="space-y-6">
                        {/* Gauge & Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Score Gauge */}
                          <div className="bg-white rounded-xl border border-border-light p-4 flex flex-col items-center justify-center text-center shadow-xs">
                            <p className="text-[9px] uppercase font-bold text-slate-grille tracking-wider mb-2">Skor Keamanan</p>
                            <div className="relative w-20 h-20 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-electric-blue transition-all duration-1000 ease-out" strokeWidth="3" strokeDasharray={`${activeHistoryDetail.score}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-base font-extrabold text-[#00262b]">{activeHistoryDetail.score}%</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold mt-2" style={{ color: (activeHistoryDetail.score || 0) >= 80 ? '#10b981' : (activeHistoryDetail.score || 0) >= 60 ? '#f59e0b' : '#ef4444' }}>
                              {(activeHistoryDetail.score || 0) >= 80 ? "SANGAT AMAN" : (activeHistoryDetail.score || 0) >= 60 ? "CUKUP AMAN" : "RAWAN JEBAKAN"}
                            </p>
                          </div>

                          {/* Meta info card */}
                          <div className="bg-white rounded-xl border border-border-light p-4 flex flex-col justify-between shadow-xs md:col-span-2">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-midnight-ink uppercase tracking-wide">Ringkasan Analisis</p>
                              <p className="text-xs text-slate-grille leading-relaxed">
                                Kontrak ini telah diaudit secara komparatif oleh sistem kecerdasan buatan Gemini. AI mendeteksi sebanyak <strong>{activeHistoryDetail.redFlagsCount || 0} Klausul Red Flags</strong> potensial yang berisiko merugikan pihak pelaku usaha.
                              </p>
                            </div>
                            <div className="flex items-center gap-3 pt-2 border-t border-border-light text-[10px] font-bold text-slate-grille">
                              <span>Red Flags: {activeHistoryDetail.redFlagsCount || 0}</span>
                              <span>&bull;</span>
                              <span>Catatan Adil: {activeHistoryDetail.analysisResult?.catatanPositif?.length || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Red Flags List */}
                        {activeHistoryDetail.analysisResult?.redFlags && activeHistoryDetail.analysisResult.redFlags.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-[#8b3911] uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-500" /> Daftar Red Flags Terdeteksi ({activeHistoryDetail.analysisResult.redFlags.length})
                            </h4>
                            <div className="space-y-3.5">
                              {activeHistoryDetail.analysisResult.redFlags.map((flag: any, idx: number) => (
                                <div key={idx} className="bg-white rounded-xl border border-border-light overflow-hidden shadow-xs">
                                  <div className="px-4 py-2.5 bg-warm-mist flex items-center justify-between border-b border-border-light">
                                    <span className="text-xs font-bold text-midnight-ink">Temuan #{idx + 1}</span>
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                      {flag.tingkatKeparahan || "Kritis"}
                                    </span>
                                  </div>
                                  <div className="p-4 space-y-3 text-xs text-left">
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-grille uppercase tracking-wider mb-1">Potensi Risiko</p>
                                      <p className="text-slate-700 leading-relaxed">{flag.alasanBahaya}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-grille uppercase tracking-wider mb-1">Kutipan Asli Kontrak</p>
                                      <blockquote className="text-[11px] font-mono text-slate-600 bg-fog-gray border-l-2 border-border-medium px-3 py-2 italic rounded-sm leading-relaxed">
                                        &ldquo;{flag.kutipanAsli}&rdquo;
                                      </blockquote>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider mb-1">Usulan Revisi KontrakPintar</p>
                                      <p className="text-amber-900 font-medium bg-pale-mint border border-[#ff9f1c]/20 rounded-lg px-3 py-2 leading-relaxed">{flag.usulanRevisi}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Catatan Positif */}
                        {activeHistoryDetail.analysisResult?.catatanPositif && activeHistoryDetail.analysisResult.catatanPositif.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-midnight-ink uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-spring-leaf" /> Klausul Adil & Seimbang
                            </h4>
                            <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs">
                              <ul className="space-y-2 text-xs text-left">
                                {activeHistoryDetail.analysisResult.catatanPositif.map((pos: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-slate-700 leading-relaxed">
                                    <CheckCircle className="w-3.5 h-3.5 text-spring-leaf shrink-0 mt-0.5" />
                                    <span>{pos}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Rekomendasi Umum */}
                        {activeHistoryDetail.analysisResult?.rekomendasiUmum && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[#006af2] uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> Rekomendasi Umum
                            </h4>
                            <div className="bg-white rounded-xl border border-border-light p-4 shadow-xs text-xs text-slate-700 leading-relaxed text-left">
                              {activeHistoryDetail.analysisResult.rekomendasiUmum}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* --- SPK DRAFT VIEW --- */
                      <div className="space-y-5">
                        <div className="bg-white border border-border-light shadow-md rounded-sm p-8 sm:p-10 font-serif text-[11.5px] text-slate-800 leading-relaxed max-w-2xl mx-auto relative overflow-hidden select-text text-left">
                          {/* Watermark */}
                          <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center">
                            <Building className="w-72 h-72 text-midnight-ink" />
                          </div>

                          <div className="space-y-5 z-10 relative">
                            <div className="text-center font-bold text-[12.5px] uppercase border-b border-double border-slate-300 pb-2 mb-5">
                              SURAT PERJANJIAN KERJA SAMA
                              <br />
                              <span className="text-[10px] font-mono normal-case text-slate-grille font-normal">(SURAT PERINTAH KERJA - SPK)</span>
                            </div>

                            <p>
                              Perjanjian ini dibuat dan ditandatangani pada tanggal <strong>{new Date(activeHistoryDetail.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong> oleh dan di antara pihak-pihak di bawah ini:
                            </p>

                            <div className="pl-4 space-y-1.5">
                              <p><strong>1. Nama Klien:</strong> {activeHistoryDetail.pihakPertama?.nama || "...................."}</p>
                              <p><strong>Domisili:</strong> {activeHistoryDetail.pihakPertama?.domisili || "...................."}</p>
                              <p className="text-[10.5px] text-slate-grille italic">Selanjutnya disebut sebagai <strong>PIHAK PERTAMA (Klien)</strong>.</p>
                            </div>

                            <div className="pl-4 space-y-1.5">
                              <p><strong>2. Nama Penyedia Jasa:</strong> {activeHistoryDetail.pihakKedua?.nama || "...................."}</p>
                              <p><strong>Domisili:</strong> {activeHistoryDetail.pihakKedua?.domisili || "...................."}</p>
                              <p className="text-[10.5px] text-slate-grille italic">Selanjutnya disebut sebagai <strong>PIHAK KEDUA (Penyedia Jasa)</strong>.</p>
                            </div>

                            <p>Para Pihak sepakat untuk saling mengikatkan diri dalam Perjanjian Kerja Sama ini dengan ketentuan sebagai berikut:</p>

                            <div>
                              <h5 className="font-bold border-b border-slate-100 pb-0.5 mb-1 text-[12px] uppercase">PASAL 1: RUANG LINGKUP PEKERJAAN</h5>
                              <p className="text-slate-700">{activeHistoryDetail.detailJasa?.lingkupKerja || "...................."}</p>
                            </div>

                            <div>
                              <h5 className="font-bold border-b border-slate-100 pb-0.5 mb-1 text-[12px] uppercase">PASAL 2: TENGGAT WAKTU & JANGKA WAKTU</h5>
                              <p>Jangka waktu penyelesaian pekerjaan sebagaimana dimaksud dalam Pasal 1 wajib diselesaikan selambat-lambatnya pada: <strong>{activeHistoryDetail.detailJasa?.tenggatWaktu || "...................."}</strong></p>
                            </div>

                            <div>
                              <h5 className="font-bold border-b border-slate-100 pb-0.5 mb-1 text-[12px] uppercase">PASAL 3: BIAYA JASA & MEKANISME PEMBAYARAN</h5>
                              <p>1. Total biaya jasa atas pekerjaan disepakati sebesar: <strong>{activeHistoryDetail.pembayaran?.nilaiKontrak ? `Rp ${Number(activeHistoryDetail.pembayaran.nilaiKontrak).toLocaleString("id-ID")}` : "Rp 0"}</strong></p>
                              <p>2. Uang Muka (DP) disepakati sebesar <strong>{activeHistoryDetail.pembayaran?.persentaseDP || "0"}%</strong> dari total biaya jasa yang dibayarkan sebelum pekerjaan dimulai.</p>
                            </div>

                            <div>
                              <h5 className="font-bold border-b border-slate-100 pb-0.5 mb-1 text-[12px] uppercase">PASAL 4: SANKSI KETERLAMBATAN</h5>
                              <p>Apabila terjadi keterlambatan dalam penyelesaian pekerjaan oleh PIHAK KEDUA, maka dikenakan sanksi berupa: <strong>{activeHistoryDetail.pembayaran?.sanksiKeterlambatan || "...................."}</strong></p>
                            </div>

                            {activeHistoryDetail.instruksiKhusus && (
                              <div>
                                <h5 className="font-bold border-b border-slate-100 pb-0.5 mb-1 text-[12px] uppercase text-[#006af2]">KLAUSUL TAMBAHAN</h5>
                                <p className="italic text-slate-700">{activeHistoryDetail.instruksiKhusus}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-slate-200 text-center font-semibold text-[10px]">
                              <div>
                                <p>PIHAK PERTAMA</p>
                                <div className="h-10 flex items-center justify-center text-slate-400 italic text-[9px]">(Tanda Tangan Klien)</div>
                                <p className="border-t border-slate-200 pt-1 font-bold">{activeHistoryDetail.pihakPertama?.nama || "____________________"}</p>
                              </div>
                              <div>
                                <p>PIHAK KEDUA</p>
                                <div className="h-10 flex items-center justify-center text-slate-400 italic text-[9px]">(Tanda Tangan Penyedia Jasa)</div>
                                <p className="border-t border-slate-200 pt-1 font-bold">{activeHistoryDetail.pihakKedua?.nama || "____________________"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-border-light bg-fog-gray/30 flex items-center justify-between gap-3 shrink-0">
                    <button 
                      onClick={() => setActiveHistoryDetail(null)}
                      className="btn-outline text-xs py-2 px-4 cursor-pointer font-bold border-border-light hover:bg-slate-50"
                    >
                      Tutup
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {activeHistoryDetail.type === "draft" && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeHistoryDetail.draftText || "");
                            alert("Teks draf SPK berhasil disalin ke clipboard!");
                          }}
                          className="btn-outline text-xs py-2 px-4 cursor-pointer font-bold flex items-center gap-1.5 bg-white"
                        >
                          <Copy className="w-3.5 h-3.5" /> Salin Draf
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const itemToLoad = activeHistoryDetail;
                          setActiveHistoryDetail(null);
                          handleLoadItem(itemToLoad);
                        }}
                        className="btn-primary text-xs py-2 px-4 cursor-pointer font-bold flex items-center gap-1.5"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Buka di Workspace
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

function DashboardFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-slate-grille animate-spin" />
        <p className="text-sm text-slate-grille">Memuat workspace hukum...</p>
      </div>
    </div>
  );
}

import AuthGuard from "@/components/AuthGuard";

// ... rest of code inside DashboardPage component ...
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AuthGuard>
        <DashboardPageContent />
      </AuthGuard>
    </Suspense>
  );
}
