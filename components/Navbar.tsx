"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import AuthButton from "./AuthButton";
import {
  Scale,
  Menu,
  X,
  ShieldCheck,
  FileText,
  BookOpen,
  HelpCircle,
  LayoutDashboard,
  ArrowRight,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeUsers, setActiveUsers] = useState(16);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        if (next < 14) return 14;
        if (next > 19) return 19;
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setIsLoggedIn(!!fbUser);
      });
      return () => unsubscribe();
    } else {
      const checkAuth = () => {
        const authSession = localStorage.getItem("kontrakpintar_auth");
        setIsLoggedIn(!!authSession);
      };
      checkAuth();
      window.addEventListener("storage", checkAuth);
      const interval = setInterval(checkAuth, 1000);
      return () => {
        window.removeEventListener("storage", checkAuth);
        clearInterval(interval);
      };
    }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const isDashboard = pathname.startsWith("/dashboard");

  const guestLinks = [
    { href: "/#features", label: "Fitur" },
    { href: "/#steps", label: "Cara Kerja" },
    { href: "/#datacenter", label: "Data & Metrik" },
    { href: "/#faq", label: "FAQ" },
  ];

  const dashboardLinks = [
    { tab: "overview", label: "Dashboard", icon: LayoutDashboard },
    { tab: "analyzer", label: "Scan Kontrak", icon: ShieldCheck },
    { tab: "wizard", label: "Buat SPK", icon: FileText },
    { tab: "glossary", label: "Kamus Hukum", icon: BookOpen },
    { tab: "faq", label: "FAQ & Bantuan", icon: HelpCircle },
  ];

  return (
    <header
      className="sticky z-50 left-0 right-0 mx-auto"
      style={{
        top: scrolled ? "12px" : "0px",
        width: scrolled ? "calc(100% - 2rem)" : "100%",
        maxWidth: scrolled ? "1150px" : "100%",
        borderRadius: scrolled ? "9999px" : "0px",
        background: scrolled
          ? "rgba(255, 255, 255, 0.55)"
          : "rgba(255, 255, 255, 0.80)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: scrolled
          ? "1px solid rgba(0, 38, 43, 0.09)"
          : "1px solid rgba(0, 38, 43, 0.05)",
        boxShadow: scrolled
          ? "0 10px 30px rgba(0, 38, 43, 0.08)"
          : "none",
        transition: "all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div 
        className="max-w-7xl mx-auto flex justify-between items-center transition-all duration-500"
        style={{
          paddingLeft: scrolled ? "24px" : "20px",
          paddingRight: scrolled ? "24px" : "20px",
          paddingTop: scrolled ? "10px" : "16px",
          paddingBottom: scrolled ? "10px" : "16px",
        }}
      >

        {/* Logo and Status */}
        <div className="flex items-center gap-3">
          <Link
            href={isLoggedIn ? "/dashboard?tab=overview" : "/"}
            className="flex items-center group select-none"
          >
            <span className="text-[16px] font-bold text-[#00262b] tracking-tight">
              Kontrak<span className="text-[#006af2]">Pintar</span>
              <span className="text-[11px] font-bold text-[#354d51] ml-1 align-top mt-0.5 inline-block">AI</span>
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {isLoggedIn ? (
            dashboardLinks.map((item) => {
              const isActive = isDashboard && activeTab === item.tab;
              return (
                <Link
                  key={item.tab}
                  href={`/dashboard?tab=${item.tab}`}
                  className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    background: isActive ? "#00262b" : "transparent",
                    color: isActive ? "white" : "#4a6468",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(0,38,43,0.06)";
                      e.currentTarget.style.color = "#00262b";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#4a6468";
                    }
                  }}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })
          ) : (
            <>
              {guestLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs font-semibold text-[#4a6468] hover:text-[#00262b] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,38,43,0.05)] transition-all duration-150"
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Desktop: CTA + Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            <AuthButton />
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#354d51] hover:text-[#00262b] hover:bg-[rgba(0,38,43,0.06)] rounded-lg transition-all cursor-pointer border-0 bg-transparent"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden animate-slide-down">
          <div
            className="border-t px-5 py-5 space-y-5 flex flex-col"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(16px)",
              borderColor: "rgba(0,38,43,0.08)",
            }}
          >
            <div className="flex flex-col gap-1.5">
              {isLoggedIn ? (
                dashboardLinks.map((item) => {
                  const isActive = isDashboard && activeTab === item.tab;
                  return (
                    <Link
                      key={item.tab}
                      href={`/dashboard?tab=${item.tab}`}
                      className="text-sm font-semibold flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all"
                      style={{
                        background: isActive ? "#00262b" : "transparent",
                        color: isActive ? "white" : "#354d51",
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })
              ) : (
                guestLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-semibold text-[#354d51] hover:text-[#00262b] py-2.5 px-4 hover:bg-[rgba(0,38,43,0.05)] rounded-xl transition-all"
                  >
                    {item.label}
                  </Link>
                ))
              )}
            </div>

            <div className="pt-4 border-t flex flex-col gap-3" style={{ borderColor: "rgba(0,38,43,0.08)" }}>
              <div className="flex justify-center w-full">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
