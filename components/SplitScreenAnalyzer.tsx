"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Flag,
  Scale,
  Upload,
  UploadCloud,
  Loader2,
  ScanLine,
  Plus,
  Trash2,
  ArrowLeftRight,
  FileText,
  PanelLeft,
  Printer,
  Bot,
  Send,
  BookOpen,
} from "lucide-react";
import { Button } from "./ui/Button";
import { GlossaryWrapper } from "./GlossaryWrapper";
import type { AnalysisResult } from "@/lib/gemini";
import { checkCanGenerate, incrementUsageCount } from "@/lib/limits";

// ─────────────────────────────────────────────
// A. FRICTION-REDUCER: Mock Contract Samples
// ─────────────────────────────────────────────
const SAMPLE_CONTRACTS: Record<string, { label: string; emoji: string; fileName: string; text: string }> = {
  spk_desain: {
    label: "SPK Jasa Desain Grafis",
    emoji: "",
    fileName: "spk_jasa_desain_grafis.txt",
    text: `SURAT PERJANJIAN KERJASAMA JASA DESAIN GRAFIS
Antara Pihak Pertama (CV Kreatif Nusantara) dan Pihak Kedua (Studio Karya Mandiri)

Pasal 1: LINGKUP PEKERJAAN
Pihak Kedua berkewajiban membuatkan desain logo, identitas visual (brand guideline), dan materi pemasaran (brosur, banner digital) dalam waktu 30 hari kerja sejak perjanjian ditandatangani.

Pasal 2: NILAI KONTRAK & PEMBAYARAN
Total nilai kontrak adalah Rp 15.000.000. Pembayaran dilakukan secara penuh 100% setelah seluruh proyek selesai diserahkan dan disetujui Pihak Pertama. Tidak ada pembayaran uang muka (DP) sama sekali.

Pasal 3: FORCE MAJEURE
Apabila terjadi bencana alam yang menghambat proyek, Pihak Kedua tetap wajib menyelesaikan proyek tepat waktu tanpa toleransi keterlambatan, atau dikenakan denda Wanprestasi penuh.

Pasal 4: SANKSI KETERLAMBATAN
Setiap hari keterlambatan penyelesaian proyek oleh Pihak Kedua akan dikenakan denda sebesar 2% dari total nilai kontrak per hari keterlambatan tanpa ada batas denda maksimum.

Pasal 5: HAK KEKAYAAN INTELEKTUAL
Seluruh hak cipta, file desain sumber, dan aset visual yang dibuat oleh Pihak Kedua dalam proyek ini sepenuhnya langsung menjadi milik Pihak Pertama sejak sketsa pertama dibuat, bahkan jika pembayaran belum lunas.

Pasal 6: REVISI & PERUBAHAN DESAIN
Pihak Pertama berhak meminta perubahan desain tanpa batas jumlah dan tanpa biaya tambahan, kapan pun selama proyek berlangsung hingga 1 tahun setelah serah terima.

Pasal 7: GANTI RUGI & TUNTUTAN HUKUM
Pihak Kedua wajib menanggung seluruh ganti rugi tanpa batas (unlimited indemnification) atas segala gugatan pihak ketiga yang timbul akibat penggunaan aset desain ini di masa depan, baik karena kelalaian Pihak Pertama maupun pihak lain.`,
  },
  mou_pemasok: {
    label: "MoU Pemasok Bahan Baku",
    emoji: "",
    fileName: "mou_pemasok_bahan_baku.txt",
    text: `MEMORANDUM OF UNDERSTANDING (MoU)
PERJANJIAN PEMASOK BAHAN BAKU KUE DAN ROTI
Antara: UD Sumber Manis (Pemasok) dan Toko Kue Bahagia (Pembeli)

Pasal 1: TUJUAN PERJANJIAN
Para pihak sepakat untuk menjalin hubungan kerja sama jangka panjang dalam pengadaan bahan baku kue dan roti (tepung terigu, mentega, gula pasir, telur) selama 12 bulan terhitung sejak tanggal penandatanganan.

Pasal 2: HARGA & PEMBAYARAN
Harga bahan baku mengikuti daftar harga yang ditetapkan secara sepihak oleh Pihak Pemasok dan dapat berubah kapan saja tanpa pemberitahuan minimal 30 hari terlebih dahulu kepada Pembeli.

Pasal 3: PENGIRIMAN & TOLERANSI MUTU
Pemasok menjamin pengiriman dalam 3 hari kerja. Namun apabila terjadi keterlambatan pengiriman, Pemasok tidak bertanggung jawab atas kerugian produksi yang dialami Pembeli akibat ketiadaan stok.

Pasal 4: KLAUSUL EKSKLUSIVITAS
Pihak Pembeli tidak diperbolehkan membeli bahan baku sejenis dari pemasok lain selama masa perjanjian berlaku, meskipun Pihak Pemasok tidak dapat memenuhi kebutuhan stok Pembeli.

Pasal 5: PENGEMBALIAN BARANG
Barang yang telah dikirim tidak dapat dikembalikan dengan alasan apapun, termasuk jika ditemukan kondisi barang yang tidak sesuai standar mutu yang disepakati.

Pasal 6: PEMUTUSAN PERJANJIAN
Pihak Pemasok berhak memutus perjanjian ini kapan saja tanpa kompensasi kepada Pembeli, sedangkan Pembeli hanya dapat memutus perjanjian dengan membayar penalti sebesar 30% dari estimasi total nilai pembelian 6 bulan ke depan.`,
  },
};

// ─────────────────────────────────────────────
// Legacy single sample (backward compat)
// ─────────────────────────────────────────────
const SAMPLE_CONTRACT = SAMPLE_CONTRACTS.spk_desain.text;

const compressImage = (file: File): Promise<Blob | File> => {
  return new Promise((resolve) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (file.size < 150 * 1024 && (ext === "jpg" || ext === "jpeg")) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1400;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
                resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.75
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 2,
  delay = 1500
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const isTransient =
        response.status === 503 ||
        response.status === 429 ||
        response.status === 504 ||
        response.status === 500;
      if (isTransient && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay);
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SplitScreenAnalyzerProps {
  initialText?: string;
  initialResult?: any;
  onAnalysisComplete?: (
    title: string,
    text: string,
    score: number,
    redFlagsCount: number,
    result: any
  ) => void;
}

interface ContractDoc {
  id: string;
  fileName: string;
  text: string;
  loading: boolean;
  error: string | null;
  result: AnalysisResult | null;
  statusMessage?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

// ─────────────────────────────────────────────
// B. Animated Radial SVG Aman-O-Meter
// ─────────────────────────────────────────────
const AmanOMeter: React.FC<{ score: number }> = ({ score }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setAnimatedScore(0);
    const timer = setTimeout(() => setAnimatedScore(score), 80);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 52;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const strokeColor =
    animatedScore >= 80 ? "#006af2" : animatedScore >= 50 ? "#ff9f1c" : "#dc2626";
  const glowColor =
    animatedScore >= 80 ? "#3b82f6" : animatedScore >= 50 ? "#ff9f1c" : "#ef4444";

  const gradientId = `gauge-grad-${Math.floor(animatedScore)}`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="1" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter="url(#gauge-glow)"
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </svg>

      {/* Centre label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: "rotate(0deg)" }}
      >
        <span
          className="text-2xl font-black leading-none tracking-tighter"
          style={{ color: strokeColor }}
        >
          {animatedScore}
        </span>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
          %
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// C. Negotiation Chat Bubble
// ─────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex items-end gap-1.5">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#006af2] to-[#0b363b] flex items-center justify-center shrink-0">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
    <div className="bg-white border border-border-light rounded-2xl rounded-bl-none px-4 py-3 shadow-xs">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-electric-blue"
            style={{
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export const SplitScreenAnalyzer: React.FC<SplitScreenAnalyzerProps> = ({
  initialText = "",
  initialResult = null,
  onAnalysisComplete,
}) => {
  const [docs, setDocs] = useState<ContractDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [showDiff, setShowDiff] = useState<Record<number, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(false);

  // C. Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat (local container only, doesn't scroll outer page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // Initialize
  useEffect(() => {
    if (initialText) {
      const initialDoc: ContractDoc = {
        id: "initial",
        fileName: "dokumen_riwayat.txt",
        text: initialText,
        loading: false,
        error: null,
        result: initialResult,
      };
      setDocs([initialDoc]);
      setActiveDocId("initial");
    } else {
      const defaultDoc: ContractDoc = {
        id: "doc_default",
        fileName: "draf_kontrak_baru.txt",
        text: "",
        loading: false,
        error: null,
        result: null,
      };
      setDocs([defaultDoc]);
      setActiveDocId("doc_default");
      setShowSidebar(false);
    }
  }, [initialText, initialResult]);

  const activeDoc = docs.find((d) => d.id === activeDocId) || null;

  // Seed welcome message when result first appears
  const prevResultRef = useRef<string | null>(null);
  useEffect(() => {
    const resultKey = activeDoc?.result ? activeDocId : null;
    if (resultKey && resultKey !== prevResultRef.current) {
      prevResultRef.current = resultKey;
      setChatMessages([
        {
          role: "ai",
          content:
            "Halo! 👋 Saya sudah menganalisis kontrak ini. Silakan tanyakan kepada saya jika Anda butuh **draf kalimat alternatif** atau **taktik negosiasi** untuk menolak pasal-pasal di atas secara sopan dan profesional!",
        },
      ]);
    }
  }, [activeDoc?.result, activeDocId]);

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

  // ── Handlers ──────────────────────────────────

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleClear = () => {
    if (!activeDocId) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDocId ? { ...d, text: "", result: null, error: null } : d
      )
    );
    setChatMessages([]);
  };

  // A. Load Sample Contract
  const loadSampleContract = (key: string) => {
    const sample = SAMPLE_CONTRACTS[key];
    if (!sample) return;

    const sampleDoc: ContractDoc = {
      id: "doc_sample_" + Math.random().toString(36).substring(2, 7),
      fileName: sample.fileName,
      text: sample.text,
      loading: false,
      error: null,
      result: null,
    };

    setDocs((prev) => {
      const filtered = prev.filter((d) => d.id !== "doc_default" || d.text.trim() !== "");
      return [...filtered, sampleDoc];
    });
    setActiveDocId(sampleDoc.id);
    setError(null);
    setChatMessages([]);
  };

  // Legacy
  const loadSample = () => loadSampleContract("spk_desain");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadAndExtractFiles(Array.from(files));
    }
  };

  const uploadAndExtractFiles = async (fileList: File[]) => {
    setError(null);

    const invalidFiles = fileList.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return !["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg", "webp"].includes(ext || "");
    });

    if (invalidFiles.length > 0 || fileList.length === 0) {
      setError("Format file tidak didukung. Harap unggah .pdf, .docx, .doc, .txt, atau gambar (.png, .jpg, .jpeg, .webp).");
      return;
    }

    const validFiles = fileList;
    const imageFiles = validFiles.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["png", "jpg", "jpeg", "webp"].includes(ext || "");
    });
    const docFiles = validFiles.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["pdf", "docx", "doc", "txt"].includes(ext || "");
    });

    const newDocsCount = (imageFiles.length > 0 ? 1 : 0) + docFiles.length;
    if (docs.length + newDocsCount > 50) {
      setError("Maksimal 50 dokumen yang dapat diunggah dalam satu sesi.");
      return;
    }

    const newDocPlaceholders: ContractDoc[] = [];
    let combinedImgId = "";

    if (imageFiles.length > 0) {
      combinedImgId = "doc_combined_img_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      let combinedName = "dokumen_scan_gabungan.txt";
      if (imageFiles.length === 1) {
        const firstBase = imageFiles[0].name.substring(0, imageFiles[0].name.lastIndexOf(".")) || imageFiles[0].name;
        combinedName = `${firstBase}_scan.txt`;
      } else {
        const firstBase = imageFiles[0].name.substring(0, imageFiles[0].name.lastIndexOf(".")) || imageFiles[0].name;
        combinedName = `${firstBase}_gabungan.txt`;
      }

      newDocPlaceholders.push({
        id: combinedImgId,
        fileName: combinedName,
        text: "",
        loading: true,
        error: null,
        result: null,
        statusMessage: `Mengantre pemindaian OCR (${imageFiles.length} gambar)...`,
      });
    }

    const docPlaceholders: ContractDoc[] = docFiles.map((file) => ({
      id: "doc_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      fileName: file.name,
      text: "",
      loading: true,
      error: null,
      result: null,
      statusMessage: "Mengekstrak teks berkas...",
    }));

    newDocPlaceholders.push(...docPlaceholders);

    setDocs((prev) => {
      const filteredPrev = prev.filter((d) => d.id !== "doc_default" || d.text.trim() !== "");
      return [...filteredPrev, ...newDocPlaceholders];
    });

    if (newDocPlaceholders.length > 0) {
      setActiveDocId(newDocPlaceholders[0].id);
    }

    if (docs.length + newDocPlaceholders.length > 1) {
      setShowSidebar(true);
    }

    if (imageFiles.length > 0) {
      (async () => {
        let combinedTextParts: string[] = [];
        let encounteredError = false;

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          setDocs((prev) =>
            prev.map((d) =>
              d.id === combinedImgId
                ? { ...d, statusMessage: `Memindai halaman ${i + 1} dari ${imageFiles.length} (${file.name})...` }
                : d
            )
          );

          let processedFile = file;
          try {
            const compressed = await compressImage(file);
            processedFile = compressed as File;
          } catch {}

          const formData = new FormData();
          formData.append("file", processedFile);

          try {
            const response = await fetchWithRetry("/api/extract", { method: "POST", body: formData });
            const data = await response.json();
            let pageHeader = imageFiles.length > 1 ? `\n\n--- HALAMAN ${i + 1}: ${file.name} ---\n` : "";
            combinedTextParts.push(pageHeader + (data.text || ""));
          } catch (err: any) {
            encounteredError = true;
            setDocs((prev) =>
              prev.map((d) =>
                d.id === combinedImgId
                  ? { ...d, loading: false, error: `Gagal memindai gambar ke-${i + 1}: ${err.message || err}`, statusMessage: undefined }
                  : d
              )
            );
            break;
          }
        }

        if (!encounteredError) {
          setDocs((prev) =>
            prev.map((d) =>
              d.id === combinedImgId
                ? { ...d, text: combinedTextParts.join("\n").trim(), loading: false, statusMessage: undefined }
                : d
            )
          );
        }
      })();
    }

    docFiles.forEach(async (file, idx) => {
      const placeholder = docPlaceholders[idx];
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetchWithRetry("/api/extract", { method: "POST", body: formData });
        const data = await response.json();
        setDocs((prev) =>
          prev.map((d) =>
            d.id === placeholder.id ? { ...d, text: data.text, loading: false, statusMessage: undefined } : d
          )
        );
      } catch (err: any) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === placeholder.id ? { ...d, loading: false, error: err.message || "Gagal memproses file.", statusMessage: undefined } : d
          )
        );
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) await uploadAndExtractFiles(Array.from(files));
  };

  const handleDeleteDoc = (id: string) => {
    setDocs((prev) => {
      const nextDocs = prev.filter((d) => d.id !== id);
      if (nextDocs.length === 0) {
        const defaultDoc: ContractDoc = { id: "doc_default", fileName: "draf_kontrak_baru.txt", text: "", loading: false, error: null, result: null };
        setActiveDocId("doc_default");
        return [defaultDoc];
      }
      if (activeDocId === id) setActiveDocId(nextDocs[0].id);
      return nextDocs;
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!activeDocId) return;
    setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, text } : d)));
  };

  const handleAnalyze = async () => {
    if (!activeDoc || !activeDoc.text.trim() || activeDoc.text.trim().length < 50) {
      setError("Teks kontrak terlalu pendek. Minimal 50 karakter.");
      return;
    }
    const limitCheck = checkCanGenerate();
    if (!limitCheck.allowed) {
      if (limitCheck.reason === "guest_limit") setShowTrialModal(true);
      else setShowDailyLimitModal(true);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText: activeDoc.text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menganalisis dokumen.");
      setDocs((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, result: data } : d)));
      incrementUsageCount();
      if (onAnalysisComplete) {
        const title = activeDoc.fileName || `Analisis Kontrak #${Math.floor(Math.random() * 1000)}`;
        onAnalysisComplete(title, activeDoc.text, data.skorKeamanan || 0, data.redFlags ? data.redFlags.length : 0, data);
      }
    } catch (err: any) {
      setError(err.message || "Koneksi ke server bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRevision = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // C. Chat submit
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const contextMessages = [
        {
          role: "user",
          content: `Konteks draf kontrak yang sedang dianalisis:\n\n${activeDoc?.text || ""}\n\nHasil analisis AI:\n${JSON.stringify(activeDoc?.result, null, 2)}`,
        },
        { role: "model", content: "Saya sudah memahami kontrak dan analisis risiko di atas. Silakan tanyakan apa yang ingin Anda negosiasikan." },
        ...chatMessages.map((m) => ({ role: m.role === "ai" ? "model" : "user", content: m.content })),
        { role: "user", content: text },
      ];

      const response = await fetch("/api/faq-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mendapatkan respon AI.");
      setChatMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", content: `Maaf, terjadi kendala: ${err.message || "coba lagi."}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePrintAnalysisReport = () => {
    if (!activeDoc || !activeDoc.result) return;
    const docName = activeDoc.fileName || "Teks Draf Kontrak";
    const res = activeDoc.result;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const redFlagsHtml = res.redFlags && res.redFlags.length > 0
        ? res.redFlags.map((flag: any, index: number) => `
            <div class="flag-card ${flag.tingkatKeparahan}">
              <div class="flag-header">
                <span class="flag-num">#${index + 1}</span>
                <span class="flag-title">Klausul: ${flag.pasal || "Pasal Kontrak"}</span>
                <span class="badge ${flag.tingkatKeparahan}">Resiko ${flag.tingkatKeparahan.toUpperCase()}</span>
              </div>
              <div class="flag-body">
                <p><strong>Analisis Masalah:</strong> ${flag.penjelasan}</p>
                <div class="proposal-box">
                  <p class="proposal-title"><strong>Usulan Klausul Revisi (Adil & Protektif):</strong></p>
                  <p class="proposal-text">${flag.usulanRevisi}</p>
                </div>
              </div>
            </div>
          `).join("")
        : "<p class='no-flags'>Tidak ada klausul red flags berbahaya yang terdeteksi.</p>";

      const positiveHtml = res.catatanPositif && res.catatanPositif.length > 0
        ? `<ul class="positive-list">` + res.catatanPositif.map((pos: string) => `<li>${pos}</li>`).join("") + `</ul>`
        : "<p class='no-flags'>Tidak ada catatan khusus.</p>";

      printWindow.document.write(`
        <html><head><title>Laporan Red Flags - ${docName}</title>
        <style>
          @page { size: A4 portrait; margin: 2.5cm; }
          body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #00262b; margin: 0; padding: 0; }
          .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #00262b; margin-bottom: 20px; padding-bottom: 10px; }
          .title-brand { font-size: 10pt; font-weight: bold; color: #006af2; text-transform: uppercase; letter-spacing: 1px; }
          .title-report { font-size: 16pt; font-weight: bold; color: #00262b; margin-top: 5px; text-transform: uppercase; }
          .meta-text { font-size: 10pt; color: #354d51; text-align: right; }
          .score-section { background: #f4f6f6; border: 1px solid #dcdcdc; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .score-table { width: 100%; border-collapse: collapse; }
          .score-cell { width: 100px; text-align: center; font-size: 24pt; font-weight: bold; color: #006af2; border-right: 1px solid #dcdcdc; padding-right: 15px; vertical-align: middle; }
          .score-desc-cell { padding-left: 20px; vertical-align: middle; }
          .score-status { font-size: 12pt; font-weight: bold; color: #00262b; margin-bottom: 5px; }
          .score-desc { font-size: 10pt; color: #354d51; margin: 0; }
          h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #00262b; border-bottom: 1px solid #00262b; padding-bottom: 4px; margin-top: 25px; margin-bottom: 15px; page-break-after: avoid; }
          .summary-box { font-size: 11pt; text-align: justify; margin-bottom: 20px; }
          .flag-card { border: 1px solid #dcdcdc; border-radius: 6px; margin-bottom: 15px; page-break-inside: avoid; }
          .flag-card.kritis { border-left: 5px solid #8b3911; }
          .flag-card.sedang { border-left: 5px solid #d97706; }
          .flag-card.ringan { border-left: 5px solid #006af2; }
          .flag-header { background: #f8fafc; padding: 8px 12px; font-size: 10pt; font-weight: bold; border-bottom: 1px solid #e2e8f0; }
          .flag-num { color: #354d51; margin-right: 8px; }
          .badge { font-size: 8pt; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; float: right; }
          .badge.kritis { background: #fee2e2; color: #8b3911; }
          .badge.sedang { background: #fef3c7; color: #b45309; }
          .badge.ringan { background: #dbeafe; color: #1d4ed8; }
          .flag-body { padding: 12px; font-size: 10pt; clear: both; }
          .flag-body p { margin: 0 0 8px; text-align: justify; }
          .proposal-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 10px; margin-top: 8px; }
          .proposal-title { font-size: 9pt; color: #15803d; margin: 0 0 4px !important; }
          .proposal-text { font-family: 'Courier New', monospace; font-size: 9.5pt; color: #14532d; margin: 0 !important; white-space: pre-wrap; text-align: justify; }
          .positive-list { font-size: 10pt; padding-left: 20px; margin: 0 0 20px; }
          .positive-list li { margin-bottom: 6px; text-align: justify; }
          .no-flags { font-size: 10pt; color: #354d51; font-style: italic; }
          .footer-disclaimer { margin-top: 40px; font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style></head><body>
        <table class="header-table"><tr>
          <td><div class="title-brand">KONTRAKPINTAR AI</div><div class="title-report">Laporan Analisis Risiko Hukum</div></td>
          <td class="meta-text" style="vertical-align:bottom;"><strong>Dokumen:</strong> ${docName}<br/><strong>Tanggal:</strong> ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</td>
        </tr></table>
        <div class="score-section"><table class="score-table"><tr>
          <td class="score-cell">${res.skorKeamanan}%</td>
          <td class="score-desc-cell">
            <div class="score-status">Status: ${res.skorKeamanan >= 80 ? "Kontrak Aman & Adil" : res.skorKeamanan >= 50 ? "Butuh Negosiasi Ulang" : "Draf Risiko Tinggi / Bahaya"}</div>
            <p class="score-desc">Hasil analisis mendeteksi sebanyak <strong>${res.jumlahBahaya} klausul bermasalah</strong>. Tinjau rincian di bawah.</p>
          </td>
        </tr></table></div>
        <h2>Ringkasan Eksekutif</h2><div class="summary-box">${res.ringkasan}</div>
        <h2>Detail Temuan Red Flags (${res.jumlahBahaya})</h2>${redFlagsHtml}
        <h2>Klausul Positif / Proteksi Terdeteksi</h2>${positiveHtml}
        <h2>Rekomendasi Tindakan Hukum</h2><div class="summary-box">${res.rekomendasiUmum}</div>
        <div class="footer-disclaimer">Laporan ini dibuat otomatis oleh KontrakPintar AI. Bukan merupakan nasihat hukum formal dari pengacara berlisensi.</div>
        <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},500);},250);};</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  const toggleDiff = (idx: number) => {
    setShowDiff((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const lines = activeDoc ? activeDoc.text.split("\n") : [];
  const lineCount = Math.max(16, lines.length);

  // B. Score for Aman-O-Meter
  const scoreRaw = activeDoc?.result ? (activeDoc.result.skorKeamanan ?? (activeDoc.result as any).score) : undefined;
  const scoreVal = typeof scoreRaw === "number" && !isNaN(scoreRaw)
    ? scoreRaw
    : activeDoc?.result
    ? Math.max(0, Math.min(100, Math.round((1 - (activeDoc.result.jumlahBahaya || 0) / (activeDoc.result.totalPasal || 1)) * 100)))
    : 0;
  const score = isNaN(scoreVal) ? 0 : scoreVal;

  const getSeverityColor = (s: string) => {
    if (s === "kritis") return { border: "var(--color-amber-pop)", bg: "#fff9f7" };
    if (s === "sedang") return { border: "#b45309", bg: "#fffbeb" };
    return { border: "var(--color-electric-blue)", bg: "#f0f6ff" };
  };

  const getSeverityBadge = (s: string) => {
    if (s === "kritis") return "bg-red-50 text-red-700 border-red-200";
    if (s === "sedang") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const hasResult = activeDoc && activeDoc.result;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto items-stretch h-full min-h-0">
      {/* Bounce animation for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── 1. SIDEBAR ── */}
      {showSidebar && (
        <div className="w-full lg:w-52 bg-white rounded-xl border border-border-light p-4 flex flex-col gap-3 shrink-0 lg:h-full shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-border-light pb-2.5">
            <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
              Berkas ({docs.length}/50)
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded text-electric-blue hover:bg-electric-blue/5 transition cursor-pointer"
              title="Unggah berkas baru"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] lg:flex-1 custom-scrollbar pr-1">
            {docs.map((doc) => {
              const isActive = doc.id === activeDocId;
              return (
                <div
                  key={doc.id}
                  onClick={() => { if (!doc.loading) setActiveDocId(doc.id); }}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                    isActive
                      ? "bg-[#00262b] border-[#00262b] text-white"
                      : "bg-fog-gray/50 hover:bg-fog-gray border-border-light text-slate-grille hover:text-midnight-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {doc.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-electric-blue shrink-0" />
                    ) : doc.result ? (
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-spring-leaf" : "text-amber-600"}`} />
                    ) : (
                      <FileText className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate pr-1">{doc.fileName}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 bg-transparent ${
                      isActive ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-grille hover:text-amber-pop hover:bg-fog-gray"
                    }`}
                    title="Hapus dokumen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-fog-gray hover:bg-border-light border border-dashed border-border-medium rounded-lg text-xs font-semibold text-slate-grille hover:text-midnight-ink transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Unggah Dokumen
          </button>
        </div>
      )}

      {/* ── 2. EDITOR PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-full min-h-0 overflow-hidden">
        {/* A. Friction-Reducer: Sample Contract Buttons */}
        <div className="flex items-center gap-2 mb-2 shrink-0 flex-wrap">
          <span className="text-[10px] font-bold text-slate-grille uppercase tracking-wider whitespace-nowrap">
            Coba Contoh:
          </span>
          {Object.entries(SAMPLE_CONTRACTS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => loadSampleContract(key)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00262b] bg-white border border-[#00262b]/20 hover:bg-[#ff9f1c]/30 hover:border-[#ff9f1c] px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <BookOpen className="w-3 h-3 text-electric-blue" />
              {s.label}
            </button>
          ))}
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col bg-white rounded-xl border overflow-hidden transition-colors min-h-0 ${
            isDragging
              ? "border-electric-blue shadow-[0_0_0_3px_rgba(0,106,242,0.15)]"
              : "border-border-light shadow-sm"
          }`}
        >
          {/* Editor Top Bar */}
          <div className="flex items-center justify-between bg-fog-gray border-b border-border-light px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar((p) => !p)}
                className={`p-1.5 rounded transition cursor-pointer border-0 bg-transparent ${
                  showSidebar
                    ? "bg-[#00262b] text-white hover:bg-[#0b363b]"
                    : "text-slate-grille hover:text-midnight-ink hover:bg-border-light"
                }`}
                title={showSidebar ? "Sembunyikan daftar berkas" : "Tampilkan daftar berkas"}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-grille truncate max-w-[160px] ml-1">
                {activeDoc?.fileName || "draf_kontrak.txt"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-medium text-slate-grille bg-white border border-border-light hover:bg-fog-gray px-2.5 py-1 rounded-full transition active:scale-95 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Unggah
              </button>
              {activeDoc && activeDoc.text && (
                <button
                  onClick={handleClear}
                  className="p-1 text-slate-grille hover:text-amber-pop hover:bg-fog-gray rounded-full transition cursor-pointer border-0 bg-transparent"
                  title="Kosongkan naskah"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 flex relative overflow-hidden min-h-0">
            {activeDoc?.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 p-6 gap-3 text-center">
                <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
                <p className="text-xs font-semibold text-midnight-ink max-w-sm leading-relaxed animate-pulse">
                  {activeDoc.statusMessage || "Mengekstrak teks dokumen (menggunakan OCR AI)..."}
                </p>
              </div>
            )}

            {!activeDoc?.text && !activeDoc?.loading && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:bg-fog-gray/40 transition z-10 animate-fade-in"
              >
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-border-medium flex items-center justify-center text-slate-grille mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-midnight-ink tracking-tight mb-1">
                  Seret &amp; Lepas Berkas atau Gambar
                </p>
                <p className="text-xs text-slate-grille max-w-[260px] leading-relaxed">
                  PDF, Word (.docx), Teks (.txt), atau Gambar (.png/.jpg) untuk dipindai OCR
                </p>
                <p className="text-[10px] text-slate-grille/60 mt-3">
                  — atau gunakan tombol <strong>Coba Contoh</strong> di atas —
                </p>
              </div>
            )}

            {/* Line Gutter */}
            <div
              ref={gutterRef}
              className="w-10 py-3 select-none text-right pr-3 font-mono text-[11px] leading-5 overflow-hidden shrink-0 bg-fog-gray border-r border-border-light"
              style={{ color: "var(--color-slate-grille)", opacity: 0.5 }}
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="h-5">{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              onScroll={handleScroll}
              className="flex-1 py-3 px-3 bg-transparent text-midnight-ink focus:outline-none font-mono text-xs leading-5 resize-none overflow-y-auto custom-scrollbar"
              placeholder="# Tempel teks draf kontrak kerja sama atau unggah berkas..."
              value={activeDoc ? activeDoc.text : ""}
              onChange={handleTextChange}
              maxLength={50000}
            />
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between bg-fog-gray border-t border-border-light px-4 py-2 text-[10px] font-mono text-slate-grille shrink-0">
            <span>{(activeDoc ? activeDoc.text.length : 0).toLocaleString()} / 50.000 karakter</span>
            <span className="flex items-center gap-1 text-electric-blue font-semibold">
              <ScanLine className="w-3 h-3" />
              Scanner Multimodal
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 mt-3 flex flex-col gap-2">
          {activeDoc?.error && (
            <div className="flex items-start gap-2 p-3 bg-warm-mist border border-amber-pop/20 rounded-lg text-xs text-amber-pop animate-fade-up">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{activeDoc.error}</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-warm-mist border border-amber-pop/20 rounded-lg text-xs text-amber-pop animate-fade-up">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <Button
            onClick={handleAnalyze}
            loading={loading}
            disabled={!activeDoc?.text.trim() || activeDoc.text.trim().length < 50 || activeDoc.loading}
            className="w-full py-3 text-sm font-bold rounded-full"
          >
            <Sparkles className="w-4 h-4" />
            Analisis Sekarang
          </Button>
        </div>
      </div>

      {/* ── 3. RESULTS PANEL ── */}
      {hasResult && activeDoc?.result && (
        <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col h-full min-h-0 shrink-0 animate-fade-in pb-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-border-light px-4 py-3 shadow-xs shrink-0 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
              <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">Hasil Analisis AI</span>
            </div>
            <button
              onClick={handlePrintAnalysisReport}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-electric-blue border border-electric-blue/30 hover:bg-electric-blue/5 px-3 py-1.5 rounded-full transition-all uppercase tracking-wider cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              Cetak
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1 min-h-0">
            {/* B. Radial SVG Aman-O-Meter — Hero Card */}
            <div
              className={`rounded-xl border overflow-hidden shadow-xs shrink-0 ${
                score >= 80
                  ? "bg-gradient-to-br from-[#f0f6ff] to-[#dbeafe] border-blue-200"
                  : score >= 50
                  ? "bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] border-amber-200"
                  : "bg-gradient-to-br from-[#fff8f5] to-[#ffece3] border-red-200"
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Animated Radial Gauge */}
                <AmanOMeter score={score} />

                {/* Score details */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-grille uppercase tracking-widest mb-1">Aman-O-Meter</p>
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full mb-2 ${
                      score >= 80
                        ? "bg-blue-700/10 text-blue-800"
                        : score >= 50
                        ? "bg-amber-700/10 text-amber-800"
                        : "bg-red-700/10 text-red-700"
                    }`}
                  >
                  {score >= 80 ? (
                    <><ShieldCheck className="w-3.5 h-3.5" /> Aman &amp; Adil</>
                  ) : score >= 50 ? (
                    <><Scale className="w-3.5 h-3.5" /> Butuh Negosiasi</>
                  ) : (
                    <><Flag className="w-3.5 h-3.5" /> Draf Rawan</>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div>
                    <p className="text-[9px] text-slate-grille font-bold uppercase tracking-wider">Red Flags</p>
                    <p className="text-lg font-black text-midnight-ink tracking-tight leading-none">{activeDoc.result.jumlahBahaya}</p>
                  </div>
                  <div className="w-px h-8 bg-border-light" />
                  <div>
                    <p className="text-[9px] text-slate-grille font-bold uppercase tracking-wider">Skor Keamanan</p>
                    <p className="text-lg font-black tracking-tight leading-none" style={{ color: score >= 80 ? "#006af2" : score >= 50 ? "#ff9f1c" : "#dc2626" }}>
                      {score}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-xs shrink-0">
            <p className="text-[10px] font-bold text-slate-grille uppercase tracking-widest mb-3">Ringkasan Analisis</p>
            <div className="text-[13px] text-slate-grille leading-relaxed">
              <GlossaryWrapper text={activeDoc.result.ringkasan} />
            </div>
          </div>

          {/* Red Flags */}
          {activeDoc.result.redFlags && activeDoc.result.redFlags.length > 0 && (
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-amber-pop" />
                <p className="text-[10px] font-bold text-amber-pop uppercase tracking-widest">
                  {activeDoc.result.jumlahBahaya} Red Flags Ditemukan
                </p>
              </div>
              {activeDoc.result.redFlags.map((flag, idx) => {
                const color = getSeverityColor(flag.tingkatKeparahan);
                const isDiffOpen = !!showDiff[idx];
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-border-light overflow-hidden shadow-xs"
                    style={{ borderLeftWidth: "4px", borderLeftColor: color.border }}
                  >
                    <div className="px-5 py-3 border-b border-border-light flex items-center justify-between bg-fog-gray/30">
                      <span className="text-xs font-bold text-midnight-ink bg-white px-2.5 py-1 rounded-md border border-border-light">
                        {flag.pasalRef || `Klausul ${idx + 1}`}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getSeverityBadge(flag.tingkatKeparahan)}`}>
                        {flag.tingkatKeparahan}
                      </span>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-grille uppercase tracking-widest mb-2">Analisis Potensi Risiko</p>
                        <div className="text-[13px] text-slate-grille leading-relaxed">
                          <GlossaryWrapper text={flag.alasanBahaya} />
                        </div>
                      </div>

                      {isDiffOpen ? (
                        <div className="space-y-2.5 animate-fade-up">
                          <p className="text-[9px] font-bold text-slate-grille uppercase tracking-widest">Perbandingan Visual (Diff)</p>
                          <div className="rounded-xl overflow-hidden border border-border-light text-[11px] font-mono leading-relaxed divide-y divide-border-light">
                            <div className="bg-red-50 text-red-700 p-3.5 relative">
                              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-red-800 bg-red-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Pasal Asli</span>
                              <span className="line-through block pr-16 leading-relaxed">{flag.kutipanAsli}</span>
                            </div>
                            <div className="bg-green-50 text-green-800 p-3.5 relative">
                              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-green-800 bg-green-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Usulan Revisi</span>
                              <span className="font-semibold block pr-20 leading-relaxed">{flag.usulanRevisi}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-bold text-slate-grille uppercase tracking-widest mb-2">Kutipan Asli Kontrak</p>
                            <blockquote
                              className="text-[11px] font-mono text-slate-grille leading-relaxed px-3.5 py-3 rounded-lg border-l-2 border-border-medium"
                              style={{ background: color.bg }}
                            >
                              &ldquo;{flag.kutipanAsli}&rdquo;
                            </blockquote>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-2">Usulan Revisi AI</p>
                            <p className="text-[12px] text-amber-900 font-semibold bg-pale-mint/40 border border-spring-leaf/25 rounded-xl px-4 py-3 leading-relaxed">
                              {flag.usulanRevisi}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
                        <button
                          onClick={() => toggleDiff(idx)}
                          className={`btn-outline text-[11px] py-2 px-3.5 flex items-center gap-1.5 transition active:scale-95 cursor-pointer rounded-full ${
                            isDiffOpen ? "bg-[#00262b] text-white border-[#00262b] hover:bg-[#0b363b]" : ""
                          }`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          {isDiffOpen ? "Tutup" : "Bandingkan"}
                        </button>
                        <button
                          onClick={() => handleCopyRevision(flag.usulanRevisi, idx)}
                          className="btn-outline text-[11px] py-2 px-3.5 flex items-center gap-1.5 active:scale-95 cursor-pointer rounded-full"
                        >
                          {copiedIndex === idx ? (
                            <><Check className="w-3 h-3 text-amber-600" /> Tersalin</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Salin</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hal Positif */}
          {activeDoc.result.catatanPositif && activeDoc.result.catatanPositif.length > 0 && (
            <div className="bg-pale-mint/25 border border-spring-leaf/30 rounded-xl p-5 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-3.5 h-3.5 text-spring-leaf" />
                <p className="text-[10px] font-bold text-midnight-ink uppercase tracking-widest">Pasal Adil &amp; Seimbang</p>
              </div>
              <ul className="space-y-2.5">
                {activeDoc.result.catatanPositif.map((pos, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-spring-leaf shrink-0 mt-0.5" />
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rekomendasi Utama */}
          <div className="bg-white border border-border-light border-l-[4px] border-l-electric-blue rounded-xl p-5 shadow-xs shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
              <p className="text-[10px] font-bold text-electric-blue uppercase tracking-widest">Rekomendasi Utama AI</p>
            </div>
            <div className="text-[13px] text-slate-grille leading-relaxed">
              <GlossaryWrapper text={activeDoc.result.rekomendasiUmum} />
            </div>
          </div>

          {/* ── C. NEGOTIATION CHAT ── */}
          <div className="bg-white rounded-xl border border-border-light overflow-hidden shadow-xs shrink-0">
            {/* Chat Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-light bg-gradient-to-r from-[#00262b] to-[#0b363b]">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-[#ff9f1c]" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">Negosiasi Playground</p>
                <p className="text-[9px] text-white/60 tracking-wide">Tanya AI tentang kontrak ini</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff9f1c] animate-pulse" />
                <span className="text-[9px] text-[#ff9f1c] font-bold">Online</span>
              </div>
            </div>

            {/* Chat messages */}
            <div ref={chatContainerRef} className="flex flex-col gap-3 p-4 max-h-64 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""} animate-fade-up`}
                >
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#006af2] to-[#0b363b] flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-[12px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#00262b] text-white rounded-2xl rounded-br-none"
                        : "bg-white text-midnight-ink rounded-2xl rounded-bl-none border border-border-light shadow-xs"
                    }`}
                  >
                    {renderFormattedText(msg.content)}
                  </div>
                </div>
              ))}

              {chatLoading && <TypingIndicator />}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleChatSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-border-light bg-white"
            >
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya soal negosiasi pasal ini..."
                className="flex-1 text-xs text-midnight-ink bg-fog-gray border border-border-light rounded-full px-4 py-2.5 focus:outline-none focus:border-electric-blue/50 focus:ring-2 focus:ring-electric-blue/10 transition placeholder-slate-grille/70"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="w-9 h-9 rounded-full bg-[#00262b] hover:bg-[#0b363b] text-white flex items-center justify-center shrink-0 transition active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
      )}

      {/* Trial modal */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-5 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-midnight-ink">Batas Percobaan Habis</h3>
              <p className="text-xs text-slate-grille leading-relaxed">
                Anda telah menggunakan batas 1 kali percobaan gratis. Silakan masuk atau daftarkan akun bisnis Anda secara gratis untuk mendapatkan akses penuh tanpa batas.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login?redirect=/dashboard?tab=analyzer" className="btn-primary w-full h-10 flex items-center justify-center text-xs font-bold">
                Daftar Akun Baru
              </Link>
              <Link href="/login?redirect=/dashboard?tab=analyzer" className="btn-outline w-full h-10 flex items-center justify-center text-xs font-bold">
                Masuk ke Akun
              </Link>
              <button onClick={() => setShowTrialModal(false)} className="text-xs font-medium text-slate-grille hover:text-midnight-ink pt-1 cursor-pointer bg-transparent border-0">
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily limit modal */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-5 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-midnight-ink">Batas Harian Tercapai</h3>
              <p className="text-xs text-slate-grille leading-relaxed">
                Anda telah menggunakan batas maksimal 8 kali pemindaian dokumen hari ini. Silakan coba lagi besok untuk menjaga stabilitas server kami.
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
};

export default SplitScreenAnalyzer;
