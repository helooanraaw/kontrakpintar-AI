"use client";

import React, { useState } from "react";

interface TooltipProps {
  term: string;
  definition: string;
  analogy: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  term,
  definition,
  analogy,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 
            bg-[#051c1f] text-slate-200 text-xs rounded-sm shadow-xl border border-[#ff9f1c]/25
            animate-slide-up"
          style={{ pointerEvents: "none" }}
        >
          {/* Header */}
          <span className="block font-bold text-spring-leaf border-b border-[#0b363b] pb-1.5 mb-2 text-[10px] tracking-widest uppercase">
            💡 Kamus Hukum: {term}
          </span>
          {/* Definition */}
          <span className="block text-slate-200 text-xs mb-2 leading-relaxed">
            <span className="font-semibold text-slate-400">Definisi:</span> {definition}
          </span>
          {/* Analogy */}
          <span className="block p-2 bg-[#0b363b]/55 border-l-2 border-electric-blue text-xs italic text-blue-200 leading-normal rounded-sm">
            <span className="font-semibold text-blue-300 not-italic block mb-0.5">Analogi Sehari-hari:</span>
            "{analogy}"
          </span>
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#051c1f]" />
        </span>
      )}
    </span>
  );
};

export default Tooltip;
