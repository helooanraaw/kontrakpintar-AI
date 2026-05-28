"use client";

import React from "react";
import { glossaryData } from "@/lib/glossaryData";
import { Tooltip } from "./ui/Tooltip";

interface GlossaryWrapperProps {
  text: string;
}

export const GlossaryWrapper: React.FC<GlossaryWrapperProps> = ({ text }) => {
  if (!text) return null;

  // Urutkan kata dari yang terpanjang ke terpendek agar kata majemuk (misal "Pihak Pertama")
  // tidak terpotong oleh kata tunggal yang lebih pendek jika ada di database.
  const sortedGlossary = [...glossaryData].sort(
    (a, b) => b.term.length - a.term.length
  );

  // Buat pattern regex: (istilah1|istilah2|...) dengan batas kata \b
  // Catatan: Karena istilah bisa mengandung spasi, kita buat regex gabungan.
  const termPatterns = sortedGlossary.map((item) =>
    item.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
  );
  
  // Menggunakan word boundaries (\b), tapi perlu hati-hati dengan karakter khusus Indonesia.
  // Regex: \b(term1|term2|...)\b (case-insensitive)
  const regex = new RegExp(`\\b(${termPatterns.join("|")})\\b`, "gi");

  const parts = text.split(regex);
  if (parts.length === 1) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        // Cari apakah part ini cocok dengan salah satu istilah hukum kita
        const matchingTerm = sortedGlossary.find(
          (item) => item.term.toLowerCase() === part.toLowerCase()
        );

        if (matchingTerm) {
          return (
            <Tooltip
              key={index}
              term={matchingTerm.term}
              definition={matchingTerm.definition}
              analogy={matchingTerm.analogy}
            >
              <span className="glossary-term">{part}</span>
            </Tooltip>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

export default GlossaryWrapper;
