"use client";

import React from "react";
import { glossaryData } from "@/lib/glossaryData";
import { Tooltip } from "./ui/Tooltip";
import { parseMarkdownBlocks, shouldIndentParagraph } from "@/lib/markdownParser";

interface GlossaryWrapperProps {
  text: string;
}

export const GlossaryWrapper: React.FC<GlossaryWrapperProps> = ({ text }) => {
  if (!text) return null;

  // 1. Setup glossary lookup
  const sortedGlossary = [...glossaryData].sort(
    (a, b) => b.term.length - a.term.length
  );
  
  const termPatterns = sortedGlossary.map((item) =>
    item.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
  );
  const regex = new RegExp(`\\b(${termPatterns.join("|")})\\b`, "gi");

  // Helper to render inline text, applying both bold replacement and glossary tooltips
  const renderTextWithGlossaryAndBold = (txt: string) => {
    // First, split by bold markers "**"
    const boldParts = txt.split(/\*\*/g);
    
    return boldParts.map((subPart, i) => {
      const isBold = i % 2 === 1;
      
      // Split subPart by glossary terms
      const glossaryParts = subPart.split(regex);
      
      const content = glossaryParts.map((part, idx) => {
        const matchingTerm = sortedGlossary.find(
          (item) => item.term.toLowerCase() === part.toLowerCase()
        );
        
        if (matchingTerm) {
          return (
            <Tooltip
              key={idx}
              term={matchingTerm.term}
              definition={matchingTerm.definition}
              analogy={matchingTerm.analogy}
            >
              <span className="glossary-term">{part}</span>
            </Tooltip>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      });

      if (isBold) {
        return (
          <strong key={i} className="font-semibold text-midnight-ink">
            {content}
          </strong>
        );
      }
      return <React.Fragment key={i}>{content}</React.Fragment>;
    });
  };

  // 2. Parse Markdown block-by-block menggunakan parser state-machine modular
  const blocks = parseMarkdownBlocks(text);
  const elements: React.ReactNode[] = [];
  
  blocks.forEach((block, b) => {
    switch (block.type) {
      case "h1":
        elements.push(
          <h1 
            key={`h1-${b}`}
            className="text-center font-bold text-midnight-ink text-xl sm:text-2xl mt-6 mb-4 uppercase tracking-normal"
          >
            {renderTextWithGlossaryAndBold(block.content || "")}
          </h1>
        );
        break;
      case "h2":
        if (block.isPasal) {
          elements.push(
            <h2 
              key={`h2-${b}`}
              className="text-center font-bold text-midnight-ink text-lg mt-8 mb-3 uppercase tracking-wide"
            >
              {renderTextWithGlossaryAndBold(block.pasalNum || "")}
              <br />
              <span className="text-base font-semibold">
                {renderTextWithGlossaryAndBold(block.pasalTitle || "")}
              </span>
            </h2>
          );
        } else {
          elements.push(
            <h2 
              key={`h2-${b}`}
              className="text-center font-bold text-midnight-ink text-lg mt-8 mb-3 uppercase tracking-wide"
            >
              {renderTextWithGlossaryAndBold(block.content || "")}
            </h2>
          );
        }
        break;
      case "h3":
        elements.push(
          <h3 
            key={`h3-${b}`}
            className="font-bold text-midnight-ink text-base mt-4 mb-2"
          >
            {renderTextWithGlossaryAndBold(block.content || "")}
          </h3>
        );
        break;
      case "center-bold":
        elements.push(
          <p 
            key={`no-${b}`}
            className="text-center font-bold text-midnight-ink mb-6 -mt-2 text-sm sm:text-base"
          >
            {renderTextWithGlossaryAndBold(block.content || "")}
          </p>
        );
        break;
      case "paragraph": {
        const content = block.content || "";
        const trimmed = content.trim();
        const match = trimmed.match(/^([\w\s]{2,30})\s*:\s*(.*)$/);
        const isHeader = /^\*\*PIHAK\s+[A-Z\s]+\*\*$/i.test(trimmed) || /^\*\*PARA\s+PIHAK\*\*$/i.test(trimmed);
        
        if (isHeader) {
          elements.push(
            <p key={`p-hdr-${b}`} className="font-bold text-midnight-ink mt-5 mb-1 text-justify leading-normal" style={{ lineHeight: "1.5" }}>
              {renderTextWithGlossaryAndBold(content)}
            </p>
          );
        } else if (match) {
          const key = match[1].trim();
          const val = match[2].trim();
          elements.push(
            <div key={`p-id-${b}`} className="grid grid-cols-[140px_20px_1fr] sm:grid-cols-[180px_20px_1fr] gap-0 mb-1 text-sm sm:text-base leading-normal text-slate-grille" style={{ lineHeight: "1.5" }}>
              <span className="font-medium text-midnight-ink">{renderTextWithGlossaryAndBold(key)}</span>
              <span className="text-center select-none">:</span>
              <span className="text-justify">{renderTextWithGlossaryAndBold(val)}</span>
            </div>
          );
        } else {
          const needsIndent = shouldIndentParagraph(content);
          elements.push(
            <p 
              key={`p-std-${b}`} 
              className={`text-justify text-slate-grille leading-normal mb-3 ${needsIndent ? "indent-6" : "indent-0"}`}
              style={{ lineHeight: "1.5" }}
            >
              {renderTextWithGlossaryAndBold(content)}
            </p>
          );
        }
        break;
      }
      case "list":
        if (block.items) {
          const listItemsHtml = block.items.map((item, idx) => {
            const depth = item.depth || 0;
            const paddingClass = depth === 1 ? "pl-12" : depth === 2 ? "pl-[4.5rem]" : "pl-6";
            
            if (item.type === "bullet") {
              return (
                <div key={`li-b-${idx}`} className={`flex items-start gap-2 mb-2 text-justify ${paddingClass}`}>
                  <span className="text-midnight-ink select-none shrink-0 w-4 text-center">•</span>
                  <span className="flex-1 text-slate-grille leading-normal" style={{ lineHeight: "1.5" }}>
                    {renderTextWithGlossaryAndBold(item.content)}
                  </span>
                </div>
              );
            } else {
              return (
                <div key={`li-n-${idx}`} className={`flex items-start gap-2 mb-3 text-justify ${paddingClass}`}>
                  <span className="font-semibold text-midnight-ink select-none shrink-0 min-w-[1.5rem] text-left">
                    {item.prefix}
                  </span>
                  <span className="flex-1 text-slate-grille leading-normal" style={{ lineHeight: "1.5" }}>
                    {renderTextWithGlossaryAndBold(item.content)}
                  </span>
                </div>
              );
            }
          });
          elements.push(
            <div key={`list-block-${b}`} className="mb-4">
              {listItemsHtml}
            </div>
          );
        }
        break;
    }
  });
  
  return <div className="space-y-1 font-sans text-sm sm:text-base leading-normal" style={{ lineHeight: "1.5" }}>{elements}</div>;
};

export default GlossaryWrapper;
