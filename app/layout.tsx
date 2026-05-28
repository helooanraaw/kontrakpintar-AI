import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Suspense } from "react";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KontrakPintar AI — Asisten Perlindungan Hukum Digital UMKM",
  description:
    "Analisis kontrak kerja sama dan buat SPK instan untuk pelaku UMKM Indonesia. Ditenagai oleh Google Gemini 1.5 Flash.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full scroll-smooth antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#ebebeb]" suppressHydrationWarning>
        <Suspense fallback={<div className="h-[61px] bg-white/80 border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

