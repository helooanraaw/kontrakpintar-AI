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
  FolderOpen,
  Printer
} from "lucide-react";
import { Button } from "./ui/Button";
import { GlossaryWrapper } from "./GlossaryWrapper";
import type { AnalysisResult } from "@/lib/gemini";
import { checkCanGenerate, incrementUsageCount } from "@/lib/limits";

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
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
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
    const invalidFiles = fileList.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return !["pdf", "docx", "doc", "txt", "png", "jpg", "jpeg", "webp"].includes(ext || "");
    });

    if (invalidFiles.length > 0 || fileList.length === 0) {
      setError("Format file tidak didukung. Harap unggah .pdf, .docx, .doc, .txt, atau gambar (.png, .jpg, .jpeg, .webp).");
      return;
    }

    const validFiles = fileList;

    // Pisahkan berkas gambar dan berkas dokumen
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

    const limitCheck = checkCanGenerate();
    if (!limitCheck.allowed) {
      if (limitCheck.reason === "guest_limit") {
        setShowTrialModal(true);
      } else {
        setShowDailyLimitModal(true);
      }
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

      incrementUsageCount();

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
        ? `<ul class="positive-list">` + 
          res.catatanPositif.map((pos: string) => `<li>${pos}</li>`).join("") + 
          `</ul>`
        : "<p class='no-flags'>Tidak ada catatan khusus.</p>";

      printWindow.document.write(`
        <html>
        <head>
          <title>Laporan Red Flags - ${docName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 2.5cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              line-height: 1.5;
              color: #00262b;
              margin: 0;
              padding: 0;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #00262b;
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            .title-brand {
              font-size: 10pt;
              font-weight: bold;
              color: #006af2;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .title-report {
              font-size: 16pt;
              font-weight: bold;
              color: #00262b;
              margin-top: 5px;
              text-transform: uppercase;
            }
            .meta-text {
              font-size: 10pt;
              color: #354d51;
              text-align: right;
            }
            .score-section {
              background: #f4f6f6;
              border: 1px solid #dcdcdc;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
            }
            .score-table {
              width: 100%;
              border-collapse: collapse;
            }
            .score-cell {
              width: 100px;
              text-align: center;
              font-size: 24pt;
              font-weight: bold;
              color: #006af2;
              border-right: 1px solid #dcdcdc;
              padding-right: 15px;
              vertical-align: middle;
            }
            .score-desc-cell {
              padding-left: 20px;
              vertical-align: middle;
            }
            .score-status {
              font-size: 12pt;
              font-weight: bold;
              color: #00262b;
              margin-bottom: 5px;
            }
            .score-desc {
              font-size: 10pt;
              color: #354d51;
              margin: 0;
            }
            h2 {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              color: #00262b;
              border-bottom: 1px solid #00262b;
              padding-bottom: 4px;
              margin-top: 25px;
              margin-bottom: 15px;
              page-break-after: avoid;
            }
            .summary-box {
              font-size: 11pt;
              text-align: justify;
              margin-bottom: 20px;
            }
            .flag-card {
              border: 1px solid #dcdcdc;
              border-radius: 6px;
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .flag-card.kritis { border-left: 5px solid #8b3911; }
            .flag-card.sedang { border-left: 5px solid #d97706; }
            .flag-card.ringan { border-left: 5px solid #006af2; }
            
            .flag-header {
              background: #f8fafc;
              padding: 8px 12px;
              font-size: 10pt;
              font-weight: bold;
              border-bottom: 1px solid #e2e8f0;
            }
            .flag-num {
              color: #354d51;
              margin-right: 8px;
            }
            .flag-title {
              color: #00262b;
            }
            .badge {
              font-size: 8pt;
              font-weight: bold;
              padding: 2px 8px;
              border-radius: 4px;
              text-transform: uppercase;
              float: right;
            }
            .badge.kritis { background: #fee2e2; color: #8b3911; }
            .badge.sedang { background: #fef3c7; color: #b45309; }
            .badge.ringan { background: #dbeafe; color: #1d4ed8; }
            
            .flag-body {
              padding: 12px;
              font-size: 10pt;
              clear: both;
            }
            .flag-body p {
              margin: 0 0 8px;
              text-align: justify;
            }
            .proposal-box {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 4px;
              padding: 10px;
              margin-top: 8px;
            }
            .proposal-title {
              font-size: 9pt;
              color: #15803d;
              margin: 0 0 4px !important;
            }
            .proposal-text {
              font-family: 'Courier New', Courier, monospace;
              font-size: 9.5pt;
              color: #14532d;
              margin: 0 !important;
              white-space: pre-wrap;
              text-align: justify;
            }
            .positive-list {
              font-size: 10pt;
              padding-left: 20px;
              margin: 0 0 20px;
            }
            .positive-list li {
              margin-bottom: 6px;
              text-align: justify;
            }
            .no-flags {
              font-size: 10pt;
              color: #354d51;
              font-style: italic;
            }
            .footer-disclaimer {
              margin-top: 40px;
              font-size: 8pt;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="title-brand">KONTRAKPINTAR AI</div>
                <div class="title-report">Laporan Analisis Risiko Hukum</div>
              </td>
              <td class="meta-text" style="vertical-align: bottom;">
                <strong>Dokumen:</strong> ${docName}<br/>
                <strong>Tanggal:</strong> ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </td>
            </tr>
          </table>

          <div class="score-section">
            <table class="score-table">
              <tr>
                <td class="score-cell">${res.skorKeamanan}%</td>
                <td class="score-desc-cell">
                  <div class="score-status">
                    Status Dokumen: ${res.skorKeamanan >= 80 ? "Kontrak Aman & Adil" : res.skorKeamanan >= 50 ? "Butuh Negosiasi Ulang" : "Draf Risiko Tinggi / Bahaya"}
                  </div>
                  <p class="score-desc">
                    Hasil analisis mendeteksi sebanyak <strong>${res.jumlahBahaya} klausul bermasalah</strong> di dalam draf ini. Tinjau rincian red flags dan usulan revisi di bawah untuk menyeimbangkan posisi hukum Anda.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <h2>Ringkasan Eksekutif</h2>
          <div class="summary-box">${res.ringkasan}</div>

          <h2>Detail Temuan Red Flags (${res.jumlahBahaya})</h2>
          ${redFlagsHtml}

          <h2>Klausul Positif / Proteksi Terdeteksi</h2>
          ${positiveHtml}

          <h2>Rekomendasi Tindakan Hukum</h2>
          <div class="summary-box">${res.rekomendasiUmum}</div>

          <div class="footer-disclaimer">
            Laporan ini dibuat secara otomatis oleh KontrakPintar AI menggunakan analisis model bahasa kecerdasan buatan. Dokumen ini bertujuan untuk bantuan edukasi kepatuhan draf dan bukan merupakan nasihat hukum formal dari pengacara berlisensi.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 250);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const toggleDiff = (idx: number) => {
    setShowDiff((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const lines = activeDoc ? activeDoc.text.split("\n") : [];
  const lineCount = Math.max(16, lines.length);

  // Aman-O-Meter SVG Calculation
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const scoreRaw = activeDoc?.result ? (activeDoc.result.skorKeamanan ?? (activeDoc.result as any).score) : undefined;
  const scoreVal = typeof scoreRaw === "number" && !isNaN(scoreRaw)
    ? scoreRaw 
    : (activeDoc?.result 
        ? Math.max(0, Math.min(100, Math.round((1 - (activeDoc.result.jumlahBahaya || 0) / (activeDoc.result.totalPasal || 1)) * 100)))
        : 0);
  const score = isNaN(scoreVal) ? 0 : scoreVal;
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
    <div className="w-full flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto items-stretch h-full min-h-0">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. BILAH SISI DAFTAR DOKUMEN (WORKSPACE SIDEBAR) - Collapsible */}
      {showSidebar && (
        <div className="w-full lg:w-56 bg-white rounded-xl border border-border-light p-4 flex flex-col gap-3 shrink-0 lg:h-full shadow-xs animate-fade-in">
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
      <div className="flex-1 flex flex-col min-w-0 lg:h-full min-h-0 overflow-hidden">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col bg-white rounded-xl border overflow-hidden transition-colors min-h-0 ${
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
          <div className="flex-1 flex relative overflow-hidden min-h-0">
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
                  Format PDF, Word (.docx, .doc), Teks (.txt), atau Gambar (.png, .jpg, .jpeg, .webp) untuk dipindai OCR.
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

        {/* Action Button — always visible at the bottom, never scrolled away */}
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
            className="w-full py-3 text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Mulai Analisis AI
          </Button>
        </div>
      </div>

      {/* 3. AREA KANAN: PANEL HASIL AI (Hanya tampil ketika ada hasil analisis) */}
      {hasResult && activeDoc?.result && (
        <div className="w-full lg:w-[500px] xl:w-[540px] flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 animate-fade-in pb-6 pr-1.5 lg:h-full">

          {/* Panel Header */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-border-light px-4 py-3 shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse" />
              <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">Hasil Analisis AI</span>
            </div>
            <button
              onClick={handlePrintAnalysisReport}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-electric-blue border border-electric-blue/30 hover:bg-electric-blue/5 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              Cetak Laporan
            </button>
          </div>

          {/* 1. Aman-O-Meter — Hero Card */}
          <div
            className={`rounded-xl border border-border-light overflow-hidden shadow-xs p-4 shrink-0 ${
              score >= 80
                ? "bg-gradient-to-br from-[#f0fff4] to-[#dcfce7] border-green-200"
                : score >= 50
                ? "bg-gradient-to-br from-[#fffbeb] to-[#fef3c7] border-amber-200"
                : "bg-gradient-to-br from-[#fff8f5] to-[#ffece3] border-red-200"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {/* Big Percent Circle */}
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xs border border-border-light shrink-0">
                  <span className="text-xl font-black text-electric-blue tracking-tighter">
                    {score}%
                  </span>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-grille uppercase tracking-wider mb-1">Keamanan Kontrak</h4>
                  <div
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      score >= 80
                        ? "bg-[#1d6b2a]/10 text-[#1d6b2a]"
                        : score >= 50
                        ? "bg-amber-800/10 text-amber-800"
                        : "bg-red-800/10 text-red-700"
                    }`}
                  >
                    {score >= 80 ? (
                      <><CheckCircle className="w-3 h-3" /> Aman &amp; Adil</>
                    ) : score >= 50 ? (
                      <><Info className="w-3 h-3" /> Butuh Negosiasi</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3" /> Draf Rawan</>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[9px] text-slate-grille font-bold uppercase tracking-wider mb-0.5">Red Flags</p>
                <p className="text-xs font-black text-midnight-ink uppercase">{activeDoc.result.jumlahBahaya} Temuan</p>
              </div>
            </div>
          </div>

          {/* 2. Ringkasan Analisis */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-xs shrink-0">
            <p className="text-[10px] font-bold text-slate-grille uppercase tracking-widest mb-3">Ringkasan Analisis</p>
            <div className="text-[13px] text-slate-grille leading-relaxed">
              <GlossaryWrapper text={activeDoc.result.ringkasan} />
            </div>
          </div>

          {/* 3. Red Flags */}
          {activeDoc.result.redFlags && activeDoc.result.redFlags.length > 0 && (
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-pop" />
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
                    {/* Red Flag Header */}
                    <div className="px-5 py-3 border-b border-border-light flex items-center justify-between bg-fog-gray/30">
                      <span className="text-xs font-bold text-midnight-ink bg-white px-2.5 py-1 rounded-md border border-border-light">
                        {flag.pasalRef || `Klausul ${idx + 1}`}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getSeverityBadge(
                          flag.tingkatKeparahan
                        )}`}
                      >
                        {flag.tingkatKeparahan}
                      </span>
                    </div>

                    {/* Content Area */}
                    <div className="px-5 py-4 space-y-4">
                      {/* Why Dangerous */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-grille uppercase tracking-widest mb-2">Analisis Potensi Risiko</p>
                        <div className="text-[13px] text-slate-grille leading-relaxed">
                          <GlossaryWrapper text={flag.alasanBahaya} />
                        </div>
                      </div>

                      {/* Interactive Visual Diff Viewer */}
                      {isDiffOpen ? (
                        <div className="space-y-2.5 animate-fade-up">
                          <p className="text-[9px] font-bold text-slate-grille uppercase tracking-widest">Perbandingan Visual (Diff)</p>
                          <div className="rounded-xl overflow-hidden border border-border-light text-[11px] font-mono leading-relaxed divide-y divide-border-light">
                            <div className="bg-red-50 text-red-700 p-3.5 relative">
                              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-red-800 bg-red-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Pasal Asli
                              </span>
                              <span className="line-through block pr-16 leading-relaxed">{flag.kutipanAsli}</span>
                            </div>
                            <div className="bg-green-50 text-green-800 p-3.5 relative">
                              <span className="absolute top-2.5 right-2.5 text-[9px] font-bold text-green-800 bg-green-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Usulan Revisi
                              </span>
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
                            <p className="text-[9px] font-bold text-[#195e24] uppercase tracking-widest mb-2">Usulan Revisi AI</p>
                            <p className="text-[12px] text-green-900 font-semibold bg-pale-mint/40 border border-spring-leaf/25 rounded-xl px-4 py-3 leading-relaxed">
                              {flag.usulanRevisi}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Card Toolbar */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light">
                        <button
                          onClick={() => toggleDiff(idx)}
                          className={`btn-outline text-[11px] py-2 px-3.5 flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                            isDiffOpen ? "bg-[#00262b] text-white border-[#00262b] hover:bg-[#0b363b]" : ""
                          }`}
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          {isDiffOpen ? "Tutup Perbandingan" : "Bandingkan Teks"}
                        </button>
                        <button
                          onClick={() => handleCopyRevision(flag.usulanRevisi, idx)}
                          className="btn-outline text-[11px] py-2 px-3.5 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <><Check className="w-3 h-3 text-green-600" /> Tersalin</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Salin Usulan</>
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
            <div className="bg-pale-mint/25 border border-spring-leaf/30 rounded-xl p-5 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-3.5 h-3.5 text-[#1d6b2a]" />
                <p className="text-[10px] font-bold text-[#1d6b2a] uppercase tracking-widest">Pasal Adil &amp; Seimbang</p>
              </div>
              <ul className="space-y-2.5">
                {activeDoc.result.catatanPositif.map((pos, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-green-950 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-[#1d6b2a] shrink-0 mt-0.5" />
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 5. Rekomendasi Utama */}
          <div className="bg-white border border-border-light border-l-[4px] border-l-electric-blue rounded-xl p-5 shadow-xs shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
              <p className="text-[10px] font-bold text-electric-blue uppercase tracking-widest">Rekomendasi Utama AI</p>
            </div>
            <div className="text-[13px] text-slate-grille leading-relaxed">
              <GlossaryWrapper text={activeDoc.result.rekomendasiUmum} />
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
                Anda telah menggunakan batas maksimal 8 kali pemindaian dokumen hari ini. Silakan coba lagi besok untuk melindungi stabilitas server kami.
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
