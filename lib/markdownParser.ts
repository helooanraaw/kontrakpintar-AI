/**
 * lib/markdownParser.ts
 * ─────────────────────────────────────────────────────────────
 * Parser Markdown Modular & Tangguh untuk KontrakPintar AI
 * 
 * Memecah teks markdown dari Gemini line-by-line menggunakan
 * state-machine untuk mengelompokkan paragraf, list, headings,
 * dan teks terpusat tanpa merusak struktur dokumen hukum.
 * ─────────────────────────────────────────────────────────────
 */

export interface ListItem {
  type: "bullet" | "numbered";
  prefix?: string;
  content: string;
  depth: number;
}

export interface Block {
  type: "h1" | "h2" | "h3" | "center-bold" | "paragraph" | "list";
  content?: string;
  isPasal?: boolean;
  pasalNum?: string;
  pasalTitle?: string;
  items?: ListItem[];
}

/**
 * Mengubah format inline markdown (seperti **teks** menjadi <strong>teks</strong>)
 */
export const convertMarkdownFormatting = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
};

/**
 * Menentukan apakah sebuah paragraf membutuhkan indentasi awal (first-line indent)
 */
export const shouldIndentParagraph = (content: string): boolean => {
  const trimmed = content.trim();
  
  // Jangan indent jika:
  // 1. Merupakan header pihak (e.g. **PIHAK PERTAMA**, **PARA PIHAK**)
  if (trimmed.startsWith("**PIHAK") || trimmed.startsWith("**PARA PIHAK")) {
    return false;
  }
  
  // 2. Merupakan field identitas (e.g. Nama Perusahaan: ...)
  const isIdentityField = /^([\w\s]{2,30})\s*:\s*(.*)$/.test(trimmed);
  if (isIdentityField) {
    return false;
  }
  
  // 3. Merupakan baris pendek pembuka/penutup yang tidak membutuhkan indentasi
  if (trimmed.length < 40 && !trimmed.includes("Pasal") && !trimmed.includes("Ayat")) {
    return false;
  }

  // 4. Merupakan ayat atau penomoran list yang tidak teridentifikasi sebagai list oleh parser utama
  if (/^\(\d+\)/.test(trimmed) || /^\d+\./.test(trimmed)) {
    return false;
  }
  
  return true;
};

const getLineIndent = (line: string): number => {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const spaces = match[1];
  let indent = 0;
  for (let i = 0; i < spaces.length; i++) {
    if (spaces[i] === "\t") {
      indent += 4;
    } else {
      indent += 1;
    }
  }
  return indent;
};

/**
 * Mem-parsing teks Markdown mentah menjadi array Block terstruktur
 */
export const parseMarkdownBlocks = (md: string): Block[] => {
  if (!md) return [];

  // Bersihkan tag HTML lawas atau anomali prompt
  const cleanMd = md
    .replace(/\r/g, "")
    .replace(/<p\s+align="center">/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<center>/gi, "")
    .replace(/<\/center>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");

  const lines = cleanMd.split("\n");
  const blocks: Block[] = [];

  let activeParagraphLines: string[] = [];
  let activeListItems: ListItem[] = [];
  let activeListType: "bullet" | "numbered" | null = null;

  const flushParagraph = () => {
    if (activeParagraphLines.length > 0) {
      let currentGroup: string[] = [];
      
      for (const line of activeParagraphLines) {
        const trimmed = line.trim();
        
        // Cek apakah baris ini adalah field identitas (e.g., Nama: Budi) atau header Pihak
        const isIdentityField = /^([\w\s]{2,30})\s*:\s*(.*)$/.test(trimmed);
        const isPartyHeader = /^\*\*PIHAK\s+[A-Z\s]+\*\*$/i.test(trimmed) || /^\*\*PARA\s+PIHAK\*\*$/i.test(trimmed);
        
        if (isIdentityField || isPartyHeader) {
          // Jika ada kalimat terakumulasi sebelumnya, flush
          if (currentGroup.length > 0) {
            blocks.push({ type: "paragraph", content: currentGroup.join(" ").trim() });
            currentGroup = [];
          }
          // Tambahkan baris identitas/header ini sebagai paragraf tersendiri
          blocks.push({ type: "paragraph", content: trimmed });
        } else {
          currentGroup.push(trimmed);
        }
      }
      
      if (currentGroup.length > 0) {
        blocks.push({ type: "paragraph", content: currentGroup.join(" ").trim() });
      }
      
      activeParagraphLines = [];
    }
  };

  const flushList = () => {
    if (activeListItems.length > 0) {
      blocks.push({ type: "list", items: [...activeListItems] });
      activeListItems = [];
      activeListType = null;
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  // Regex untuk mencocokkan item daftar bernomor: e.g. 1., a., (a), I., dll.
  const listRegex = /^(\d+\.|\([0-9a-zA-Z]+\)|[a-zA-Z]\.|\b[IVXLCDM]+\.)\s+(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushAll();
      continue;
    }

    // 1. Heading 1 (Judul Dokumen)
    if (trimmed.startsWith("# ")) {
      flushAll();
      blocks.push({ type: "h1", content: trimmed.substring(2).trim() });
      continue;
    }

    // 2. Heading 2 (Judul Pasal)
    if (trimmed.startsWith("## ")) {
      flushAll();
      const content = trimmed.substring(3).trim();
      const pasalRegex = /^(PASAL\s+[0-9A-Z]+)\s*[-–—:]\s*(.*)$/i;
      if (pasalRegex.test(content)) {
        const match = content.match(pasalRegex);
        if (match) {
          blocks.push({
            type: "h2",
            content,
            isPasal: true,
            pasalNum: match[1].trim(),
            pasalTitle: match[2].trim(),
          });
          continue;
        }
      }
      blocks.push({ type: "h2", content, isPasal: false });
      continue;
    }

    // 3. Heading 3 (Sub-judul)
    if (trimmed.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "h3", content: trimmed.substring(4).trim() });
      continue;
    }

    // 4. Baris Nomor / Teks Berani Terpusat (Nomor Surat)
    if (
      trimmed.toLowerCase().startsWith("nomor:") ||
      trimmed.toLowerCase().startsWith("no:") ||
      (trimmed.startsWith("**") &&
        trimmed.endsWith("**") &&
        (trimmed.toLowerCase().includes("surat perjanjian") ||
          trimmed.toLowerCase().includes("spk") ||
          trimmed.toLowerCase().includes("memorandum") ||
          trimmed.toLowerCase().includes("kesepakatan")))
    ) {
      flushAll();
      blocks.push({ type: "center-bold", content: trimmed });
      continue;
    }

    // 5. Item Daftar Bullet (- atau *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      const content = trimmed.substring(2).trim();
      const indent = getLineIndent(line);
      const depth = indent < 2 ? 0 : indent < 6 ? 1 : 2;
      if (activeListType !== "bullet") {
        flushList();
        activeListType = "bullet";
      }
      activeListItems.push({ type: "bullet", content, depth });
      continue;
    }

    // 6. Item Daftar Bernomor / Huruf
    if (listRegex.test(trimmed)) {
      flushParagraph();
      const match = trimmed.match(listRegex);
      if (match) {
        const prefix = match[1].trim();
        const content = match[2].trim();
        const indent = getLineIndent(line);
        const depth = indent < 2 ? 0 : indent < 6 ? 1 : 2;
        if (activeListType !== "numbered") {
          flushList();
          activeListType = "numbered";
        }
        activeListItems.push({ type: "numbered", prefix, content, depth });
      }
      continue;
    }

    // 7. Penanganan Baris Lanjutan / Paragraf Standar
    if (activeListItems.length > 0) {
      const lastItem = activeListItems[activeListItems.length - 1];
      const endsWithSentenceEnder = /[.;]$/.test(lastItem.content);

      // Jika baris dimulai dengan spasi/tab atau item sebelumnya tidak diakhiri tanda baca penutup,
      // kita anggap sebagai kelanjutan isi list item terakhir.
      if (line.startsWith(" ") || line.startsWith("\t") || !endsWithSentenceEnder) {
        lastItem.content += " " + trimmed;
        continue;
      } else {
        flushList();
      }
    }

    // Akumulasi baris paragraf biasa
    activeParagraphLines.push(trimmed);
  }

  flushAll();
  return blocks;
};
