"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Info,
  ArrowRight,
  Upload,
  FileUp,
  Loader2,
  Eye,
  Plus,
  Trash2,
  GitCompare,
  FileText,
  FolderOpen
} from "lucide-react";
import { Button } from "./ui/Button";
import { GlossaryWrapper } from "./GlossaryWrapper";
import type { AnalysisResult } from "@/lib/gemini";

// Contoh draf kontrak untuk demo
const SAMPLE_CONTRACT = `SURAT PERJANJIAN KERJASAMA
Antara Pihak Pertama (Klien Jaya) dan Pihak Kedua (UMKM Kreatif)

Pasal 1: LINGKUP PEKERJAAN
Pihak Kedua berkewajiban membuatkan sistem aplikasi e-commerce dalam waktu 30 hari kerja sejak perjanjian ditandatangani.

Pasal 2: NILAI KONTRAK & PEMBAYARAN
Total nilai kontrak adalah Rp 15.000.000. Pembayaran dilakukan secara penuh 100% setelah seluruh proyek selesai diserahkan dan disetujui Pihak Pertama. Tidak ada pembayaran uang muka (DP).

Pasal 3: FORCE MAJEURE
Apabila terjadi bencana alam yang menghambat proyek, Pihak Kedua tetap wajib menyelesaikan proyek tepat waktu tanpa toleransi keterlambatan, atau dikenakan denda Wanprestasi penuh.

Pasal 4: SANKSI KETERLAMBATAN
Setiap hari keterlambatan penyelesaian proyek oleh Pihak Kedua akan dikenakan denda sebesar 2% dari total nilai kontrak per hari keterlambatan tanpa ada batas denda.

Pasal 5: HAK KEKAYAAN INTELEKTUAL
Seluruh hak cipta, source code, dan aset desain yang dibuat oleh Pihak Kedua dalam proyek ini sepenuhnya langsung menjadi milik Pihak Pertama sejak draf kode pertama dibuat, bahkan jika pembayaran belum lunas.

Pasal 6: GANTI RUGI & TUNTUTAN HUKUM
Pihak Kedua wajib menanggung seluruh ganti rugi tanpa batas (unlimited indemnification) atas segala gugatan pihak ketiga yang timbul akibat penggunaan aplikasi ini di masa depan, baik karena kesalahan teknis maupun kelalaian penggunaan dari Pihak Pertama sendiri.`;

const compressImage = (file: File): Promise<Blob | File> => {
  return new Promise((resolve) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    // Jangan kompres jika file sangat kecil (< 150KB) dan sudah format jpeg/jpg
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
        
        // Batasi dimensi maksimal ke 1400px (tajam untuk OCR dan ramah memori/lebar pita)
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
                // Berikan nama file baru dengan ekstensi .jpg
                const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
                resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.75 // Kualitas JPEG 75%
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
        console.warn(`[OCR Retry] Server error ${response.status}. Mencoba kembali... Sisa percobaan: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay);
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`[OCR Retry] Koneksi gagal. Mencoba kembali... Sisa percobaan: ${retries}`, error.message || error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
};

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

export const SplitScreenAnalyzer: React.FC<SplitScreenAnalyzerProps> = ({
  initialText = "",
  initialResult = null,
  onAnalysisComplete,
}) => {
  const [docs, setDocs] = useState<ContractDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false); // AI Analysis loading
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null); // Global error
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showDiff, setShowDiff] = useState<Record<number, boolean>>({});
  const [showSidebar, setShowSidebar] = useState(false); // Default hidden for cleaner UI

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with initial text (history loads) or a default empty file
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
      // Open sidebar/results if loaded from history
      if (initialResult) {
        setShowSidebar(false);
      }
    } else {
      // Default empty workspace doc
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

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleClear = () => {
    if (!activeDocId) return;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === activeDocId
          ? { ...d, text: "", result: null, error: null }
          : d
      )
    );
  };

  const loadSample = () => {
    const sampleDoc: ContractDoc = {
      id: "doc_sample_" + Math.random().toString(36).substring(2, 7),
      fileName: "simulasi_kontrak_jebakan.txt",
      text: SAMPLE_CONTRACT,
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
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadAndExtractFiles(Array.from(files));
    }
  };

  const uploadAndExtractFiles = async (fileList: File[]) => {
    setError(null);

    // Filter valid files
    const validFiles = fileList.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["pdf", "docx", "txt", "png", "jpg", "jpeg", "webp"].includes(ext || "");
    });

    if (validFiles.length === 0) {
      setError("Format file tidak didukung. Harap unggah .pdf, .docx, .txt, atau gambar (.png, .jpg, .jpeg, .webp).");
      return;
    }

    // Pisahkan berkas gambar dan berkas dokumen
    const imageFiles = validFiles.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["png", "jpg", "jpeg", "webp"].includes(ext || "");
    });

    const docFiles = validFiles.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ["pdf", "docx", "txt"].includes(ext || "");
    });

    const newDocsCount = (imageFiles.length > 0 ? 1 : 0) + docFiles.length;

    if (docs.length + newDocsCount > 50) {
      setError("Maksimal 50 dokumen yang dapat diunggah dalam satu sesi.");
      return;
    }

    const newDocPlaceholders: ContractDoc[] = [];
    let combinedImgId = "";

    // 1. Placeholder untuk Gambar Gabungan
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

    // 2. Placeholder untuk Dokumen Terpisah
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

    // Tambahkan semua ke list dokumen
    setDocs((prev) => {
      const filteredPrev = prev.filter((d) => d.id !== "doc_default" || d.text.trim() !== "");
      return [...filteredPrev, ...newDocPlaceholders];
    });

    // Set aktif ke dokumen baru pertama
    if (newDocPlaceholders.length > 0) {
      setActiveDocId(newDocPlaceholders[0].id);
    }

    // Auto-buka sidebar jika jumlah dokumen di workspace > 1
    if (docs.length + newDocPlaceholders.length > 1) {
      setShowSidebar(true);
    }

    // ── PROSES SEKUENSIAL GAMBAR ──
    if (imageFiles.length > 0) {
      (async () => {
        let combinedTextParts: string[] = [];
        let encounteredError = false;

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];

          // Perbarui status loading per halaman secara real-time
          setDocs((prev) =>
            prev.map((d) =>
              d.id === combinedImgId
                ? {
                    ...d,
                    statusMessage: `Memindai halaman ${i + 1} dari ${imageFiles.length} (${file.name})...`,
                  }
                : d
            )
          );

          let processedFile = file;
          try {
            const compressed = await compressImage(file);
            processedFile = compressed as File;
          } catch (compressErr) {
            console.warn("Gagal mengompres gambar:", compressErr);
          }

          const formData = new FormData();
          formData.append("file", processedFile);

          try {
            const response = await fetchWithRetry("/api/extract", {
              method: "POST",
              body: formData,
            });

            const data = await response.json();

            let textSnippet = data.text || "";
            let pageHeader = "";
            if (imageFiles.length > 1) {
              pageHeader = `\n\n--- HALAMAN ${i + 1}: ${file.name} ---\n`;
            }
            combinedTextParts.push(pageHeader + textSnippet);
          } catch (err: any) {
            encounteredError = true;
            setDocs((prev) =>
              prev.map((d) =>
                d.id === combinedImgId
                  ? {
                      ...d,
                      loading: false,
                      error: `Gagal memindai gambar ke-${i + 1} (${file.name}): ${err.message || err}`,
                      statusMessage: undefined,
                    }
                  : d
              )
            );
            break; // Stop memproses gambar selanjutnya jika ada satu yang gagal total
          }
        }

        if (!encounteredError) {
          const finalText = combinedTextParts.join("\n").trim();
          setDocs((prev) =>
            prev.map((d) =>
              d.id === combinedImgId
                ? {
                    ...d,
                    text: finalText,
                    loading: false,
                    statusMessage: undefined,
                  }
                : d
            )
          );
        }
      })();
    }

    // ── PROSES DOKUMEN LAIN (Parallel/Cepat lokal) ──
    docFiles.forEach(async (file, idx) => {
      const placeholder = docPlaceholders[idx];

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetchWithRetry("/api/extract", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        setDocs((prev) =>
          prev.map((d) =>
            d.id === placeholder.id
              ? { ...d, text: data.text, loading: false, statusMessage: undefined }
              : d
          )
        );
      } catch (err: any) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === placeholder.id
              ? { ...d, loading: false, error: err.message || "Gagal memproses file.", statusMessage: undefined }
              : d
          )
        );
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadAndExtractFiles(Array.from(files));
    }
  };

  const handleDeleteDoc = (id: string) => {
    setDocs((prev) => {
      const nextDocs = prev.filter((d) => d.id !== id);
      if (nextDocs.length === 0) {
        const defaultDoc: ContractDoc = {
          id: "doc_default",
          fileName: "draf_kontrak_baru.txt",
          text: "",
          loading: false,
          error: null,
          result: null,
        };
        setActiveDocId("doc_default");
        return [defaultDoc];
      }
      if (activeDocId === id) {
        setActiveDocId(nextDocs[0].id);
      }
      return nextDocs;
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!activeDocId) return;
    setDocs((prev) =>
      prev.map((d) => (d.id === activeDocId ? { ...d, text } : d))
    );
  };

  const handleAnalyze = async () => {
    if (!activeDoc || !activeDoc.text.trim() || activeDoc.text.trim().length < 50) {
      setError("Teks kontrak terlalu pendek. Minimal 50 karakter.");
      return;
    }

    const isUserLoggedIn = typeof window !== "undefined" ? !!localStorage.getItem("kontrakpintar_auth") : false;
    const isTrialUsed = typeof window !== "undefined" ? localStorage.getItem("kontrakpintar_trial_used") === "true" : false;

    if (!isUserLoggedIn && isTrialUsed) {
      setShowTrialModal(true);
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

      if (!response.ok) {
        throw new Error(data.error || "Gagal menganalisis dokumen.");
      }

      setDocs((prev) =>
        prev.map((d) => (d.id === activeDocId ? { ...d, result: data } : d))
      );

      if (!isUserLoggedIn) {
        localStorage.setItem("kontrakpintar_trial_used", "true");
      }

      if (onAnalysisComplete) {
        const title = activeDoc.fileName || `Analisis Kontrak #${Math.floor(Math.random() * 1000)}`;
        onAnalysisComplete(
          title,
          activeDoc.text,
          data.skorKeamanan || 0,
          data.redFlags ? data.redFlags.length : 0,
          data
        );
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

  const toggleDiff = (idx: number) => {
    setShowDiff((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const lines = activeDoc ? activeDoc.text.split("\n") : [];
  const lineCount = Math.max(16, lines.length);

  // Aman-O-Meter SVG Calculation
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const score = activeDoc?.result ? activeDoc.result.skorKeamanan : 0;
  const strokeDashoffset = circumference - (score / 100) * circumference;

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
    <div className="w-full flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto items-stretch">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. BILAH SISI DAFTAR DOKUMEN (WORKSPACE SIDEBAR) - Collapsible */}
      {showSidebar && (
        <div className="w-full lg:w-56 bg-white rounded-xl border border-border-light p-4 flex flex-col gap-3 shrink-0 self-start shadow-xs animate-fade-in">
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

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] lg:max-h-[460px] custom-scrollbar pr-1">
            {docs.map((doc) => {
              const isActive = doc.id === activeDocId;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (!doc.loading) setActiveDocId(doc.id);
                  }}
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
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-spring-leaf" : "text-[#1d6b2a]"}`} />
                    ) : (
                      <FileText className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate pr-1">
                      {doc.fileName}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
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

      {/* 2. AREA EDITOR (Lebar penuh jika tidak ada hasil analisis) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col bg-white rounded-xl border overflow-hidden transition-colors ${
            isDragging
              ? "border-electric-blue shadow-focus-blue"
              : "border-border-light shadow-sm"
          }`}
        >
          {/* Editor Top Bar */}
          <div className="flex items-center justify-between bg-fog-gray border-b border-border-light px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {/* Sidebar toggle button */}
              <button
                onClick={() => setShowSidebar(p => !p)}
                className={`p-1.5 rounded transition cursor-pointer border-0 bg-transparent ${
                  showSidebar 
                    ? "bg-[#00262b] text-white hover:bg-[#0b363b]" 
                    : "text-slate-grille hover:text-midnight-ink hover:bg-border-light"
                }`}
                title={showSidebar ? "Sembunyikan daftar berkas" : "Tampilkan daftar berkas"}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-grille truncate max-w-[160px] ml-1">
                {activeDoc?.fileName || "draf_kontrak.txt"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs font-medium text-slate-grille bg-white border border-border-light hover:bg-fog-gray px-2.5 py-1 rounded transition active:scale-95 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Unggah Berkas
              </button>
              <button
                onClick={loadSample}
                className="text-xs font-medium text-white bg-[#00262b] hover:bg-[#0b363b] px-2.5 py-1 rounded transition active:scale-95 cursor-pointer"
              >
                Demo Kontrak
              </button>
              {activeDoc && activeDoc.text && (
                <button
                  onClick={handleClear}
                  className="p-1 text-slate-grille hover:text-amber-pop hover:bg-fog-gray rounded transition cursor-pointer border-0 bg-transparent"
                  title="Kosongkan naskah"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 flex relative overflow-hidden min-h-[350px]">
            {activeDoc?.loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 p-6 gap-3 text-center">
                <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
                <p className="text-xs font-semibold text-midnight-ink max-w-sm leading-relaxed animate-pulse">
                  {activeDoc.statusMessage || "Mengekstrak teks dokumen (menggunakan OCR AI)..."}
                </p>
                {activeDoc.statusMessage && activeDoc.statusMessage.includes("Halaman") && (
                  <p className="text-[10px] text-slate-grille max-w-xs leading-normal">
                    Proses pemindaian gambar berjalan secara berurutan untuk menjaga keandalan ekstraksi teks. Mohon tunggu sebentar.
                  </p>
                )}
              </div>
            )}

            {!activeDoc?.text && !activeDoc?.loading && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:bg-fog-gray/40 transition z-10 animate-fade-in"
              >
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border-medium flex items-center justify-center text-slate-grille mb-4">
                  <FileUp className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-midnight-ink mb-1">
                  Seret & Lepas Berkas atau Gambar di Sini
                </p>
                <p className="text-xs text-slate-grille max-w-[280px] leading-relaxed">
                  Format PDF, Word (.docx), Teks (.txt), atau Gambar (.png, .jpg, .jpeg, .webp) untuk dipindai OCR.
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
                <div key={i} className="h-5">
                  {i + 1}
                </div>
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
            <span>
              {(activeDoc ? activeDoc.text.length : 0).toLocaleString()} / 50.000 karakter
            </span>
            <span className="flex items-center gap-1 text-electric-blue font-semibold">
              <Eye className="w-3 h-3" />
              Scanner Multimodal
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 flex flex-col gap-2">
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
            className="w-full py-3 text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Mulai Analisis AI
          </Button>
        </div>
      </div>

      {/* 3. AREA KANAN: PANEL HASIL AI (Hanya tampil ketika ada hasil analisis) */}
      {hasResult && activeDoc?.result && (
        <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col overflow-y-auto custom-scrollbar shrink-0 animate-fade-in pb-10">
          <div className="space-y-4">
            {/* 1. Aman-O-Meter */}
            <div className="card-elevated rounded-xl">
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
                    <defs>
                      <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#006af2" />
                        <stop offset="100%" stopColor="#00c6ff" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="55"
                      cy="55"
                      r={radius}
                      strokeWidth="7"
                      stroke="var(--color-border-light)"
                      fill="transparent"
                    />
                    <circle
                      cx="55"
                      cy="55"
                      r={radius}
                      strokeWidth="7"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="url(#score-grad)"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-electric-blue tracking-tighter leading-none">
                      {score}%
                    </span>
                    <span className="text-[9px] text-slate-grille font-semibold uppercase tracking-wider mt-0.5">
                      Aman
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h4 className="text-sm font-bold text-midnight-ink">
                    Skor Keamanan Kontrak
                  </h4>
                  <div
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      score >= 80
                        ? "bg-pale-mint text-[#1d6b2a] border-spring-leaf/40"
                        : score >= 50
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-warm-mist text-amber-pop border-amber-pop/25"
                    }`}
                  >
                    {score >= 80 ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Kontrak Aman & Adil
                      </>
                    ) : score >= 50 ? (
                      <>
                        <Info className="w-3 h-3" /> Butuh Negosiasi Ulang
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Draf Berbahaya
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-grille leading-relaxed">
                    Terdeteksi {activeDoc.result.jumlahBahaya} klausul bermasalah.
                    Pastikan negosiasi ulang sebelum tanda tangan.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Ringkasan */}
            <div className="card rounded-xl">
              <p className="label-cap mb-2.5">Ringkasan Analisis</p>
              <p className="text-xs text-slate-grille leading-relaxed">
                <GlossaryWrapper text={activeDoc.result.ringkasan} />
              </p>
            </div>

            {/* 3. Red Flags & Visual Diff */}
            {activeDoc.result.redFlags && activeDoc.result.redFlags.length > 0 && (
              <div className="space-y-2.5">
                <p className="label-cap text-amber-pop">
                  {activeDoc.result.jumlahBahaya} Red Flags Ditemukan
                </p>
                {activeDoc.result.redFlags.map((flag, idx) => {
                  const color = getSeverityColor(flag.tingkatKeparahan);
                  const isDiffOpen = !!showDiff[idx];

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-border-light overflow-hidden shadow-xs"
                      style={{ borderLeftWidth: "3px", borderLeftColor: color.border }}
                    >
                      {/* Red Flag Header */}
                      <div className="px-4 py-2.5 border-b border-border-light flex items-center justify-between bg-fog-gray/20">
                        <span className="text-xs font-bold text-midnight-ink bg-fog-gray px-2 py-0.5 rounded border border-border-light">
                          {flag.pasalRef || `Klausul ${idx + 1}`}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            flag.tingkatKeparahan
                          )}`}
                        >
                          {flag.tingkatKeparahan}
                        </span>
                      </div>

                      {/* Content Area */}
                      <div className="px-4 py-3 space-y-3">
                        {/* Why Dangerous */}
                        <div>
                          <p className="label-cap text-[9px] mb-1">Analisis Potensi Risiko</p>
                          <p className="text-xs text-slate-grille leading-relaxed">
                            <GlossaryWrapper text={flag.alasanBahaya} />
                          </p>
                        </div>

                        {/* Interactive Visual Diff Viewer */}
                        {isDiffOpen ? (
                          <div className="space-y-2 animate-fade-up">
                            <p className="label-cap text-[9px]">Perbandingan Visual (Diff)</p>
                            <div className="rounded-lg overflow-hidden border border-border-light text-[11px] font-mono leading-relaxed divide-y divide-border-light">
                              {/* Deleted / Original */}
                              <div className="bg-red-50 text-red-700 p-2.5 relative">
                                <span className="absolute top-2 right-2 text-[9px] font-bold text-red-800 bg-red-200 px-1 rounded uppercase tracking-wider">
                                  Pasal Asli
                                </span>
                                <span className="line-through block pr-12">
                                  {flag.kutipanAsli}
                                </span>
                              </div>
                              {/* Added / Revised */}
                              <div className="bg-green-50 text-green-800 p-2.5 relative">
                                <span className="absolute top-2 right-2 text-[9px] font-bold text-green-800 bg-green-200 px-1 rounded uppercase tracking-wider">
                                  Usulan Revisi
                                </span>
                                <span className="font-semibold block pr-16">
                                  {flag.usulanRevisi}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div>
                              <p className="label-cap text-[9px] mb-1">Kutipan Asli Kontrak</p>
                              <blockquote
                                className="text-xs font-mono text-slate-grille leading-relaxed p-2 rounded-lg border-l-2 border-border-medium"
                                style={{ background: color.bg }}
                              >
                                &ldquo;{flag.kutipanAsli}&rdquo;
                              </blockquote>
                            </div>
                            <div>
                              <p className="label-cap text-[9px] text-[#195e24] mb-1">Usulan Revisi</p>
                              <p className="text-xs text-green-900 font-semibold bg-pale-mint/45 border border-spring-leaf/25 rounded-lg p-2.5">
                                {flag.usulanRevisi}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Card Toolbar */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light">
                          <button
                            onClick={() => toggleDiff(idx)}
                            className={`btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                              isDiffOpen ? "bg-[#00262b] text-white border-[#00262b] hover:bg-[#0b363b]" : ""
                            }`}
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            {isDiffOpen ? "Tutup Perbandingan" : "Bandingkan Teks"}
                          </button>
                          <button
                            onClick={() => handleCopyRevision(flag.usulanRevisi, idx)}
                            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-green-600" /> Tersalin
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Salin Usulan
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Hal Positif */}
            {activeDoc.result.catatanPositif && activeDoc.result.catatanPositif.length > 0 && (
              <div className="card rounded-xl bg-pale-mint/30 border-spring-leaf/30">
                <p className="label-cap text-[#1d6b2a] mb-2.5">Pasal Adil & Seimbang</p>
                <ul className="space-y-1.5">
                  {activeDoc.result.catatanPositif.map((pos, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-green-950 leading-relaxed">
                      <CheckCircle className="w-3.5 h-3.5 text-[#1d6b2a] shrink-0 mt-0.5" />
                      <span>{pos}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. Rekomendasi Umum */}
            <div className="card rounded-xl border-l-[3px] border-l-electric-blue bg-electric-blue/3">
              <p className="label-cap text-electric-blue mb-2">Rekomendasi Utama</p>
              <p className="text-xs text-slate-grille leading-relaxed">
                <GlossaryWrapper text={activeDoc.result.rekomendasiUmum} />
              </p>
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
              <Link
                href="/login?redirect=/dashboard?tab=analyzer"
                className="btn-primary w-full h-10 flex items-center justify-center text-xs font-bold"
              >
                Daftar Akun Baru
              </Link>
              <Link
                href="/login?redirect=/dashboard?tab=analyzer"
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
    </div>
  );
};

export default SplitScreenAnalyzer;
