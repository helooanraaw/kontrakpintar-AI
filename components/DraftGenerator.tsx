"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import {
  User,
  Briefcase,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Calendar,
  Building,
  AlertCircle,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "./ui/Button";
import { GlossaryWrapper } from "./GlossaryWrapper";
import { checkCanGenerate, incrementUsageCount } from "@/lib/limits";
import { parseMarkdownBlocks, convertMarkdownFormatting } from "@/lib/markdownParser";

const LOADING_STATUSES = [
  "Menganalisis kebutuhan para pihak...",
  "Merancang pasal perlindungan UMKM...",
  "Menyeimbangkan hak dan kewajiban...",
  "Mengkristalkan bahasa hukum yang adil...",
  "Menambahkan klausul Force Majeure & Wanprestasi...",
];

const SPK_TEMPLATES = [
  {
    name: "Jasa Pembuatan Website",
    pihakPertama: { nama: "PT Jaya Makmur Digital", domisili: "Jakarta Selatan" },
    pihakKedua: { nama: "Studio Web Kreatif", domisili: "Bandung" },
    detailJasa: {
      lingkupKerja: "Pembuatan website e-commerce lengkap dengan sistem katalog produk, keranjang belanja, integrasi payment gateway Midtrans, halaman admin kelola stok, dan penyerahan dokumentasi teknis serta hosting selama 1 tahun.",
      tenggatWaktu: "45 Hari Kerja sejak diterimanya uang muka."
    },
    pembayaran: {
      nilaiKontrak: "18500000",
      persentaseDP: "30",
      sanksiKeterlambatan: "0.1% dari sisa nilai kontrak per hari keterlambatan, maksimal denda 5% dari total nilai kontrak."
    }
  },
  {
    name: "Jasa Desain Grafis",
    pihakPertama: { nama: "Butik Cantik Indonesia", domisili: "Surabaya" },
    pihakKedua: { nama: "Fokus Visual Agency", domisili: "Yogyakarta" },
    detailJasa: {
      lingkupKerja: "Perancangan identitas visual merek (Branding) yang terdiri dari: 1 desain logo utama dengan 3 opsi alternatif, buku panduan brand (brand guidelines), 3 desain kemasan produk kopi, serta desain kartu nama bisnis.",
      tenggatWaktu: "21 Hari Kerja"
    },
    pembayaran: {
      nilaiKontrak: "7500000",
      persentaseDP: "40",
      sanksiKeterlambatan: "Denda Rp 50.000 per hari keterlambatan penyerahan draf final."
    }
  },
  {
    name: "Penulisan Konten",
    pihakPertama: { nama: "PT Media Info Kreatif", domisili: "Jakarta Pusat" },
    pihakKedua: { nama: "Aris Munandar (Freelancer)", domisili: "Semarang" },
    detailJasa: {
      lingkupKerja: "Penulisan 12 artikel blog bertema finansial dan teknologi masing-masing minimal 1.200 kata dengan optimasi SEO on-page sesuai daftar kata kunci yang diberikan oleh Pihak Pertama.",
      tenggatWaktu: "30 Hari Kalender"
    },
    pembayaran: {
      nilaiKontrak: "4800000",
      persentaseDP: "0",
      sanksiKeterlambatan: "Pengurangan biaya jasa sebesar Rp 30.000 per hari keterlambatan pengiriman artikel."
    }
  },
  {
    name: "Jasa Fotografi",
    pihakPertama: { nama: "PT Kuliner Nusantara", domisili: "Medan" },
    pihakKedua: { nama: "Aura Studio Foto", domisili: "Solo" },
    detailJasa: {
      lingkupKerja: "Pengambilan foto katalog untuk 35 menu makanan utama dan minuman, termasuk penataan cahaya, food styling sederhana, penyuntingan warna foto, dan penyerahan 70 foto resolusi tinggi via Google Drive.",
      tenggatWaktu: "14 Hari Kalender"
    },
    pembayaran: {
      nilaiKontrak: "6500000",
      persentaseDP: "50",
      sanksiKeterlambatan: "Potongan biaya jasa sebesar 1% dari sisa pelunasan per hari keterlambatan."
    }
  },
  {
    name: "Jasa Konsultasi",
    pihakPertama: { nama: "PT Mitra Usaha Mandiri", domisili: "Balikpapan" },
    pihakKedua: { nama: "Drs. Hermawan, M.M.", domisili: "Jakarta Barat" },
    detailJasa: {
      lingkupKerja: "Penyusunan dokumen studi kelayakan bisnis (feasibility study) untuk pembukaan cabang ritel baru, termasuk analisis pasar kompetitor, analisis risiko operasional, dan proyeksi keuangan 5 tahun ke depan.",
      tenggatWaktu: "60 Hari Kalender"
    },
    pembayaran: {
      nilaiKontrak: "28000000",
      persentaseDP: "30",
      sanksiKeterlambatan: "0.1% per hari keterlambatan, maksimal denda 5% dari total nilai kontrak."
    }
  }
];

interface DraftGeneratorProps {
  initialDraft?: string;
  initialFormData?: any;
  onDraftComplete?: (
    title: string,
    pihakPertama: { nama: string; domisili: string },
    pihakKedua: { nama: string; domisili: string },
    detailJasa: { lingkupKerja: string; tenggatWaktu: string },
    pembayaran: { nilaiKontrak: string; persentaseDP: string; sanksiKeterlambatan: string },
    draftText: string,
    instruksiKhusus?: string
  ) => void;
}

export const DraftGenerator: React.FC<DraftGeneratorProps> = ({
  initialDraft = null,
  initialFormData = null,
  onDraftComplete,
}) => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState(
    initialFormData || {
      pihakPertama: { nama: "", domisili: "" },
      pihakKedua: { nama: "", domisili: "" },
      detailJasa: { lingkupKerja: "", tenggatWaktu: "" },
      pembayaran: { nilaiKontrak: "", persentaseDP: "0", sanksiKeterlambatan: "" },
      instruksiKhusus: "",
    }
  );

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(LOADING_STATUSES[0]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(initialDraft || null);
  const [copied, setCopied] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);

  useEffect(() => {
    if (initialFormData) {
      setFormData({
        ...initialFormData,
        instruksiKhusus: initialFormData.instruksiKhusus || "",
      });
    } else {
      setFormData({
        pihakPertama: { nama: "", domisili: "" },
        pihakKedua: { nama: "", domisili: "" },
        detailJasa: { lingkupKerja: "", tenggatWaktu: "" },
        pembayaran: { nilaiKontrak: "", persentaseDP: "0", sanksiKeterlambatan: "" },
        instruksiKhusus: "",
      });
    }
    setDraft(initialDraft);
    if (initialDraft) {
      setStep(3);
    } else {
      setStep(1);
    }
  }, [initialDraft, initialFormData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % LOADING_STATUSES.length;
        setLoadingStatus(LOADING_STATUSES[idx]);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep((p) => Math.min(p + 1, 3));
  };

  const handlePrev = () => setStep((p) => Math.max(p - 1, 1));

  const handleReset = () => {
    setFormData({
      pihakPertama: { nama: "", domisili: "" },
      pihakKedua: { nama: "", domisili: "" },
      detailJasa: { lingkupKerja: "", tenggatWaktu: "" },
      pembayaran: { nilaiKontrak: "", persentaseDP: "0", sanksiKeterlambatan: "" },
      instruksiKhusus: "",
    });
    setDraft(null);
    setStep(1);
    setError(null);
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyTemplate = (templateIdx: number) => {
    if (templateIdx < 0 || templateIdx >= SPK_TEMPLATES.length) return;
    const t = SPK_TEMPLATES[templateIdx];
    setFormData({
      pihakPertama: { ...t.pihakPertama },
      pihakKedua: { ...t.pihakKedua },
      detailJasa: { ...t.detailJasa },
      pembayaran: { ...t.pembayaran },
    });
  };

  /* ── Parser Markdown ke HTML untuk Word/PDF ── */
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

  /* ── Ekspor ke Word ── */
  const handleExportWord = () => {
    if (!draft) return;
    const html = parseMarkdownToHtml(draft);
    
    // Blok tanda tangan formal dalam tabel Word tanpa garis tepi
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
            <strong><u>${formData.pihakPertama.nama || "....................."}</u></strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${formData.pihakKedua.nama || "....................."}</u></strong>
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
    a.download = `SPK_${formData.pihakKedua.nama.replace(/\s+/g, "_")}_dan_${formData.pihakPertama.nama.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Cetak / Simpan PDF ── */
  const handlePrintPDF = () => {
    if (!draft) return;
    const html = parseMarkdownToHtml(draft);
    
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
            <strong><u>${formData.pihakPertama.nama || "....................."}</u></strong>
          </td>
          <td style="width:50%;text-align:center;border:none;vertical-align:bottom;line-height:1.5;">
            <strong><u>${formData.pihakKedua.nama || "....................."}</u></strong>
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const limitCheck = checkCanGenerate();
    if (!limitCheck.allowed) {
      if (limitCheck.reason === "guest_limit") {
        setShowTrialModal(true);
      } else {
        setShowDailyLimitModal(true);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal meramu draf SPK.");
      }

      setDraft(data.draft);
      incrementUsageCount();

      if (onDraftComplete) {
        const title = `SPK: ${formData.pihakKedua.nama} - ${formData.pihakPertama.nama}`;
        onDraftComplete(
          title,
          formData.pihakPertama,
          formData.pihakKedua,
          formData.detailJasa,
          formData.pembayaran,
          data.draft,
          formData.instruksiKhusus
        );
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kendala saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = formData.pihakPertama.nama.trim() !== "" && formData.pihakKedua.nama.trim() !== "";
  const isStep2Valid = formData.detailJasa.lingkupKerja.trim() !== "" && formData.detailJasa.tenggatWaktu.trim() !== "";
  const isStep3Valid = formData.pembayaran.nilaiKontrak.trim() !== "";

  const STEP_LABELS = ["Profil Pihak", "Detail Jasa", "Pembayaran"];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      {!draft && !loading ? (
        /* ──────── STEPPER FORM ──────── */
        <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden">
          {/* Stepper Header */}
          <div className="px-6 py-5 border-b border-border-light bg-fog-gray/50">
            <div className="flex items-center gap-2">
              {STEP_LABELS.map((label, i) => {
                const num = i + 1;
                const isDone = step > num;
                const isActive = step === num;
                return (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? "bg-spring-leaf text-midnight-ink"
                            : isActive
                            ? "bg-midnight-ink text-white"
                            : "bg-border-light text-slate-grille"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : num}
                      </div>
                      <span
                        className={`text-xs font-semibold hidden sm:block ${
                          isActive
                            ? "text-midnight-ink"
                            : isDone
                            ? "text-[#1d6b2a]"
                            : "text-slate-grille"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        className={`flex-1 h-px mx-1 transition-colors ${
                          step > num ? "bg-spring-leaf" : "bg-border-light"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Form Body */}
          <form
            onSubmit={step === 3 ? handleSubmit : handleNext}
            className="p-6 space-y-6"
          >
            {/* STEP 1: Profil Para Pihak */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-up">
                {/* Template Selector dropdown */}
                <div className="bg-fog-gray/50 border border-border-light rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#00262b] uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
                    Pilih Template Cepat UMKM
                  </div>
                  <p className="text-[11px] text-slate-grille leading-normal">
                    Pilih jenis pekerjaan untuk mengisi formulir secara otomatis dengan data dan pasal hukum standar yang sesuai.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SPK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyTemplate(idx)}
                        className="px-3 py-1.5 rounded-lg border border-border-light bg-white hover:border-electric-blue text-[11px] font-bold text-slate-grille hover:text-[#006af2] transition-all cursor-pointer active:scale-95"
                      >
                        {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <User className="w-4 h-4 text-electric-blue" />
                  <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                    Identitas Para Pihak
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pihak Pertama */}
                  <div className="space-y-3 p-4 bg-fog-gray/60 rounded-lg border border-border-light">
                    <p className="label-cap text-[9px]">Pihak Pertama (Klien)</p>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-grille" />
                      <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Nama Lengkap Klien / Perusahaan"
                        value={formData.pihakPertama.nama}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pihakPertama: { ...formData.pihakPertama, nama: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-grille" />
                      <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Kota Domisili"
                        value={formData.pihakPertama.domisili}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pihakPertama: { ...formData.pihakPertama, domisili: e.target.value },
                          })
                        }
                      />
                    </div>
                    <p className="text-[10px] text-slate-grille italic">
                      Pemberi kerja atau pihak yang memesan jasa.
                    </p>
                  </div>

                  {/* Pihak Kedua */}
                  <div className="space-y-3 p-4 bg-fog-gray/60 rounded-lg border border-border-light">
                    <p className="label-cap text-[9px]">Pihak Kedua (Anda / UMKM)</p>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-grille" />
                      <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Nama Bisnis / Nama Lengkap Anda"
                        value={formData.pihakKedua.nama}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pihakKedua: { ...formData.pihakKedua, nama: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-grille" />
                      <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Kota Domisili"
                        value={formData.pihakKedua.domisili}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pihakKedua: { ...formData.pihakKedua, domisili: e.target.value },
                          })
                        }
                      />
                    </div>
                    <p className="text-[10px] text-slate-grille italic">
                      Penerima kerja, yaitu pihak penyedia jasa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Detail Jasa */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-up">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-electric-blue" />
                  <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                    Ruang Lingkup Jasa
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label-cap text-[9px] block mb-1.5">
                      Deskripsi Lingkup Pekerjaan *
                    </label>
                    <textarea
                      className="input-field min-h-[140px] leading-relaxed"
                      placeholder="Jelaskan detail pekerjaan Anda, misal: Desain identitas visual termasuk 1 logo utama, 3 opsi warna, dan panduan brand book dalam format PDF."
                      value={formData.detailJasa.lingkupKerja}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          detailJasa: { ...formData.detailJasa, lingkupKerja: e.target.value },
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="label-cap text-[9px] block mb-1.5">
                      Tenggat Waktu Penyelesaian *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-grille" />
                      <input
                        type="text"
                        className="input-field pl-9"
                        placeholder="Misal: 30 Hari Kerja atau Sebelum 15 Desember 2026"
                        value={formData.detailJasa.tenggatWaktu}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            detailJasa: { ...formData.detailJasa, tenggatWaktu: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Nilai & Pembayaran */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-up">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-electric-blue" />
                  <span className="text-xs font-bold text-midnight-ink uppercase tracking-wide">
                    Nilai Transaksi & Pembayaran
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Total Nilai Kontrak */}
                    <div>
                      <label className="label-cap text-[9px] block mb-1.5">
                        Total Nilai Kontrak *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-grille">
                          Rp
                        </span>
                        <input
                          type="text"
                          className="input-field pl-9"
                          placeholder="Misal: 10000000"
                          value={formData.pembayaran.nilaiKontrak}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pembayaran: { ...formData.pembayaran, nilaiKontrak: e.target.value },
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* DP */}
                    <div>
                      <label className="label-cap text-[9px] block mb-1.5">
                        Uang Muka (DP)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input-field pr-8"
                          value={formData.pembayaran.persentaseDP}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pembayaran: {
                                ...formData.pembayaran,
                                persentaseDP: e.target.value,
                              },
                            })
                          }
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-grille pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sanksi */}
                  <div>
                    <label className="label-cap text-[9px] block mb-1.5">
                      Sanksi Keterlambatan
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Misal: 0.1% per hari, maksimal 5% dari total nilai kontrak"
                      value={formData.pembayaran.sanksiKeterlambatan}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pembayaran: {
                            ...formData.pembayaran,
                            sanksiKeterlambatan: e.target.value,
                          },
                        })
                      }
                    />
                    <p className="flex items-center gap-1.5 text-[10px] text-slate-grille mt-1.5">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      Sanksi yang dibatasi mencegah kerugian tak terbatas akibat force majeure.
                    </p>
                  </div>

                  {/* Instruksi Khusus (Opsional) */}
                  <div className="pt-2">
                    <label className="label-cap text-[9px] block mb-1.5">
                      Instruksi Khusus / Permintaan Kustom AI (Opsional)
                    </label>
                    <textarea
                      className="input-field min-h-[90px] leading-relaxed"
                      placeholder="Contoh: Tambahkan pasal kerahasiaan data (NDA) selama 3 tahun, draf menggunakan bahasa Inggris (bilingual), atau tambahkan pasal serah terima hasil kerja bertahap (milestones)."
                      value={formData.instruksiKhusus || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          instruksiKhusus: e.target.value,
                        })
                      }
                    />
                    <p className="text-[10px] text-slate-grille mt-1.5">
                      Tuliskan instruksi tambahan di sini jika Anda ingin menambahkan pasal khusus lainnya dalam draf SPK.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border-light">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn-outline flex items-center gap-1.5 text-sm py-2 px-4 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  type="submit"
                  disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
                  className="flex items-center gap-1.5 text-sm py-2 px-5"
                >
                  Lanjut
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!isStep3Valid}
                  className="flex items-center gap-2 text-sm py-2.5 px-6"
                >
                  <Sparkles className="w-4 h-4" />
                  Sihir Dokumen Saya
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : loading ? (
        /* ──────── LOADING STATE ──────── */
        <div className="bg-white rounded-xl border border-border-light shadow-sm p-12 flex flex-col items-center justify-center gap-5 min-h-[360px] text-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-[3px] border-border-light" />
            <div className="absolute inset-0 rounded-full border-[3px] border-t-midnight-ink animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-electric-blue" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-midnight-ink mb-1">
              Sedang Meramu Dokumen SPK...
            </h4>
            <p className="text-xs text-slate-grille transition-all duration-500">
              {loadingStatus}
            </p>
          </div>
        </div>
      ) : (
        /* ──────── HASIL DRAFT ──────── */
        <div className="space-y-4 animate-fade-up">
          {error && (
            <div className="p-3.5 bg-warm-mist border border-amber-pop/20 rounded-lg text-xs text-amber-pop">
              <span className="font-semibold">Kesalahan: </span>
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-border-light shadow-sm px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-electric-blue" />
                <h3 className="text-sm font-bold text-midnight-ink">
                  Draf SPK Siap Digunakan
                </h3>
              </div>
              <p className="text-[10px] text-slate-grille mt-0.5 ml-6">
                Arahkan kursor ke istilah bergaris putus-putus untuk penjelasan jargon hukum.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin
                  </>
                )}
              </button>
              <button
                onClick={handleExportWord}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50 active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Word (.doc)
              </button>
              <button
                onClick={handlePrintPDF}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 active:scale-95 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak PDF
              </button>
              <button
                onClick={handleReset}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-pop border-amber-pop/25 hover:bg-warm-mist active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Buat Ulang
              </button>
            </div>
          </div>

          {/* Physical Paper */}
          <div className="relative bg-white rounded-xl shadow-md overflow-hidden border border-border-light">
            {/* Top Color Bar */}
            <div className="h-1.5 bg-midnight-ink" />

            {/* Watermark */}
            <div
              className="absolute top-16 right-8 w-32 h-32 rounded-full flex items-center justify-center select-none pointer-events-none"
              style={{
                border: "3px solid rgba(0, 38, 43, 0.04)",
                transform: "rotate(12deg)",
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-midnight-ink/8 text-center leading-snug">
                Draf Legal
                <br />
                KontrakPintar
              </p>
            </div>

            {/* Document Content */}
            <div className="px-8 sm:px-14 py-10 min-h-[560px]">
              <div
                className="text-xs text-midnight-ink font-sans space-y-3 leading-relaxed"
                style={{ lineHeight: "var(--leading-relaxed)" }}
              >
                <GlossaryWrapper text={draft || ""} />
              </div>
            </div>

            {/* Signature Block */}
            <div className="px-8 sm:px-14 pb-10 border-t border-border-light mt-4 pt-8 bg-fog-gray/10">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-10">
                  <p className="text-xs font-semibold text-midnight-ink text-center">
                    Pihak Pertama
                  </p>
                  <div className="border-b border-midnight-ink/30 pb-1" />
                  <p className="text-[10px] text-slate-grille text-center">
                    {formData.pihakPertama.nama || "( ..................... )"}
                  </p>
                </div>
                <div className="space-y-10">
                  <p className="text-xs font-semibold text-midnight-ink text-center">
                    Pihak Kedua
                  </p>
                  <div className="border-b border-midnight-ink/30 pb-1" />
                  <p className="text-[10px] text-slate-grille text-center">
                    {formData.pihakKedua.nama || "( ..................... )"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                href="/login?redirect=/dashboard?tab=wizard"
                className="btn-primary w-full h-10 flex items-center justify-center text-xs font-bold"
              >
                Daftar Akun Baru
              </Link>
              <Link
                href="/login?redirect=/dashboard?tab=wizard"
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
                Anda telah menggunakan batas maksimal 8 kali pembuatan draf dokumen hari ini. Silakan coba lagi besok untuk melindungi stabilitas server kami.
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

export default DraftGenerator;
