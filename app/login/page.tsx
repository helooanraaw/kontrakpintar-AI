"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, Mail, Lock, ArrowRight, Loader2, UserPlus, CheckCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { saveUserProfile } from "@/lib/storage";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

interface MockUser {
  uid: string;
  name: string;
  email: string;
  password?: string;
  verified: boolean;
  avatarUrl: string;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard?tab=overview";

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simulasi Email Verifikasi Offline
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Redirect jika user sudah terautentikasi dan terverifikasi
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
          const userSession = {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`,
            provider: "password",
          };
          localStorage.setItem("kontrakpintar_auth", JSON.stringify(userSession));
          router.push(redirectUrl);
        }
      });
      return () => unsubscribe();
    } else {
      const authSession = localStorage.getItem("kontrakpintar_auth");
      if (authSession) {
        router.push(redirectUrl);
      }
    }
  }, [router, redirectUrl]);

  // Handler Pendaftaran & Masuk
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password || (activeTab === "register" && !name)) {
      setError("Harap isi seluruh kolom input.");
      return;
    }

    if (!email.includes("@")) {
      setError("Harap masukkan format email yang valid.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi harus minimal 6 karakter.");
      return;
    }

    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        if (activeTab === "register") {
          // 1. Registrasi Firebase
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // 2. Update Nama Profil
          await updateProfile(userCredential.user, {
            displayName: name,
          });

          // 3. Kirim Email Verifikasi
          await sendEmailVerification(userCredential.user);

          // 4. Catat Profil Pengguna ke Firestore
          await saveUserProfile({
            uid: userCredential.user.uid,
            name: name,
            email: email,
            photoURL: null,
            provider: "password"
          });

          // 5. Otomatis sign out agar tidak bisa mengakses sebelum verifikasi
          await signOut(auth);

          setSuccess("Pendaftaran berhasil! Kami telah mengirimkan email verifikasi ke alamat Anda. Silakan verifikasi email Anda sebelum masuk.");
          setActiveTab("login");
          setPassword("");
        } else {
          // 1. Login Kredensial
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          // 2. Validasi Verifikasi Email
          if (!userCredential.user.emailVerified) {
            await signOut(auth);
            setError("Email Anda belum diverifikasi. Silakan cek kotak masuk email Anda.");
            setLoading(false);
            return;
          }

          // 3. Simpan ke Firestore & LocalSession
          await saveUserProfile({
            uid: userCredential.user.uid,
            name: userCredential.user.displayName,
            email: userCredential.user.email,
            photoURL: userCredential.user.photoURL,
            provider: "password"
          });

          const userSession = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName,
            avatarUrl: userCredential.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userCredential.user.displayName}`,
            provider: "password",
          };
          localStorage.setItem("kontrakpintar_auth", JSON.stringify(userSession));
          router.push(redirectUrl);
        }
      } catch (err: any) {
        console.error("Firebase Auth Error:", err);
        let msg = "Gagal melakukan autentikasi: " + (err.message || "");
        if (err.code === "auth/email-already-in-use") {
          msg = "Email ini sudah digunakan oleh akun lain.";
        } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
          msg = "Email atau kata sandi Anda salah.";
        } else if (err.code === "auth/operation-not-allowed") {
          msg = "Metode masuk Email/Password belum diaktifkan di Firebase Console. Harap aktifkan di Firebase Console > Authentication > Sign-in method.";
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // ────────────────── SIMULASI OFFLINE (LOCALSTORAGE) ──────────────────
      setTimeout(async () => {
        const localUsersStr = localStorage.getItem("kontrakpintar_mock_users") || "[]";
        let localUsers: MockUser[] = [];
        try {
          localUsers = JSON.parse(localUsersStr);
        } catch {}

        if (activeTab === "register") {
          // Cek apakah email sudah ada
          const exists = localUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
          if (exists) {
            setError("Email ini sudah digunakan oleh akun lain.");
            setLoading(false);
            return;
          }

          // Tambah mock user baru (unverified)
          const newMockUser: MockUser = {
            uid: "mock_" + Math.random().toString(36).substring(2, 9),
            name,
            email,
            password, // Hanya disimpan untuk kemudahan simulasi demo login
            verified: false,
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=00262b,0b363b,006af2&textColor=ffffff`,
          };

          localUsers.push(newMockUser);
          localStorage.setItem("kontrakpintar_mock_users", JSON.stringify(localUsers));
          
          // Tulis data profil ke local database users
          await saveUserProfile({
            uid: newMockUser.uid,
            name: newMockUser.name,
            email: newMockUser.email,
            photoURL: newMockUser.avatarUrl,
            provider: "password"
          });

          setPendingVerificationEmail(email);
          setSuccess("Pendaftaran simulasi berhasil! Silakan klik tombol simulasi verifikasi di atas untuk memverifikasi akun Anda sebelum masuk.");
          setActiveTab("login");
          setPassword("");
        } else {
          // Login simulasi
          const foundUser = localUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (!foundUser || foundUser.password !== password) {
            setError("Email atau kata sandi simulasi Anda salah.");
            setLoading(false);
            return;
          }

          if (!foundUser.verified) {
            setPendingVerificationEmail(email);
            setError("Email Anda belum terverifikasi. Silakan klik tombol simulasi verifikasi di atas terlebih dahulu.");
            setLoading(false);
            return;
          }

          // Login sukses
          const userSession = {
            uid: foundUser.uid,
            email: foundUser.email,
            name: foundUser.name,
            avatarUrl: foundUser.avatarUrl,
            provider: "password",
          };
          localStorage.setItem("kontrakpintar_auth", JSON.stringify(userSession));
          router.push(redirectUrl);
        }
        setLoading(false);
      }, 1000);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setError(null);
    setSuccess(null);
    setGoogleLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        
        // Simpan Profil ke Firestore
        await saveUserProfile({
          uid: result.user.uid,
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          provider: "google"
        });

        const userSession = {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          avatarUrl: result.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${result.user.displayName}`,
          provider: "google",
        };
        localStorage.setItem("kontrakpintar_auth", JSON.stringify(userSession));
        router.push(redirectUrl);
      } catch (err: any) {
        setError(err.message || "Gagal masuk menggunakan Google.");
      } finally {
        setGoogleLoading(false);
      }
    } else {
      // Google Login simulasi
      setTimeout(async () => {
        const mockGoogleUser = {
          uid: "mock_google_jv123",
          email: "lomba.juaravibe@gmail.com",
          name: "Juara Vibe User",
          avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=JV&backgroundColor=006af2&textColor=ffffff",
          provider: "google",
        };

        // Simpan profil ke db
        await saveUserProfile({
          uid: mockGoogleUser.uid,
          name: mockGoogleUser.name,
          email: mockGoogleUser.email,
          photoURL: mockGoogleUser.avatarUrl,
          provider: "google"
        });

        localStorage.setItem("kontrakpintar_auth", JSON.stringify(mockGoogleUser));
        setGoogleLoading(false);
        router.push(redirectUrl);
      }, 1200);
    }
  };

  // Jalankan Verifikasi Simulasi Manual
  const handleSimulateVerification = () => {
    if (!pendingVerificationEmail) return;

    const localUsersStr = localStorage.getItem("kontrakpintar_mock_users") || "[]";
    try {
      const localUsers = JSON.parse(localUsersStr);
      const idx = localUsers.findIndex((u: any) => u.email.toLowerCase() === pendingVerificationEmail.toLowerCase());
      if (idx >= 0) {
        localUsers[idx].verified = true;
        localStorage.setItem("kontrakpintar_mock_users", JSON.stringify(localUsers));
        setSuccess("Simulasi Verifikasi Berhasil! Email telah terverifikasi. Sekarang Anda bisa masuk.");
        setError(null);
        setPendingVerificationEmail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-61px)] w-full flex items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px] animate-fade-up">
        
        {/* Banner Simulasi Verifikasi (Penting untuk Demo Juri) */}
        {pendingVerificationEmail && !isFirebaseConfigured && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center shadow-xs space-y-2.5 animate-pulse-soft">
            <div className="flex items-center justify-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
              <span>Simulasi Verifikasi Email</span>
            </div>
            <p className="text-[10px] text-amber-900 leading-relaxed">
              Mendaftarkan akun <b>{pendingVerificationEmail}</b> secara offline. Silakan klik tombol di bawah untuk menyimulasikan verifikasi tautan email masuk.
            </p>
            <button
              onClick={handleSimulateVerification}
              className="w-full py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700 transition active:scale-98 border-0 cursor-pointer"
            >
              Simulasikan Verifikasi Link Email ✨
            </button>
          </div>
        )}

        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-8 text-center select-none">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00262b] flex items-center justify-center border border-white/10 shadow-sm">
              <Scale className="w-4.5 h-4.5 text-[#abffae]" />
            </div>
            <span className="text-base font-bold text-[#00262b] tracking-tight">
              Kontrak<span className="text-[#006af2]">Pintar</span>
            </span>
          </Link>
          <p className="text-[10.5px] text-slate-grille">
            Masuk ke Workspace Hukum UMKM Anda
          </p>
        </div>

        {/* Minimalist Login Card */}
        <Card className="p-6 border border-slate-200 bg-white shadow-xs rounded-xl">
          {/* Simple Tab Switcher */}
          <div className="flex border-b border-slate-100 mb-6 text-center text-xs">
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-2 font-bold transition-all border-b-2 bg-transparent cursor-pointer ${
                activeTab === "login"
                  ? "border-[#00262b] text-[#00262b]"
                  : "border-transparent text-slate-grille hover:text-[#00262b]"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 pb-2 font-bold transition-all border-b-2 bg-transparent cursor-pointer ${
                activeTab === "register"
                  ? "border-[#00262b] text-[#00262b]"
                  : "border-transparent text-slate-grille hover:text-[#00262b]"
              }`}
            >
              Daftar
            </button>
          </div>

          {/* Success / Error Alerts */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10.5px] leading-relaxed font-medium flex gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-[10.5px] leading-relaxed font-medium flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {activeTab === "register" && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  className="input-field text-xs px-3.5 h-10 border-slate-200 focus:border-[#00262b]"
                  placeholder="Nama Usaha / Nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || googleLoading}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">
                Alamat Email
              </label>
              <input
                type="email"
                className="input-field text-xs px-3.5 h-10 border-slate-200 focus:border-[#00262b]"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-slate-grille uppercase tracking-wider block">
                  Kata Sandi
                </label>
              </div>
              <input
                type="password"
                className="input-field text-xs px-3.5 h-10 border-slate-200 focus:border-[#00262b]"
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 h-10 flex items-center justify-center font-bold text-xs bg-[#00262b] text-white hover:bg-[#0b363b]"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{activeTab === "login" ? "Masuk ke Workspace" : "Buat Akun Baru"}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-wider">
              <span className="bg-white px-2.5 text-slate-grille">Atau masuk dengan</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full h-10 border border-slate-200 hover:border-slate-300 bg-white rounded-lg flex items-center justify-center gap-2 transition active:scale-98 text-xs font-bold text-midnight-ink disabled:opacity-60 cursor-pointer"
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-grille" />
            ) : (
              <>
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.62 14.99 1 12 1 7.24 1 3.2 3.74 1.25 7.75l3.86 3C6.01 7.8 8.78 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.73-4.94 3.73-8.6z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.11 14.75c-.24-.73-.38-1.5-.38-2.31s.14-1.58.38-2.31l-3.86-3C.47 8.92 0 10.4 0 12s.47 3.08 1.25 4.88l3.86-3.13z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.34 1.1-4.26 1.1-3.22 0-5.99-2.76-6.89-5.71l-3.86 3C3.2 20.26 7.24 23 12 23z"
                  />
                </svg>
                <span>Google</span>
              </>
            )}
          </button>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-[10.5px] font-semibold text-slate-grille hover:text-midnight-ink transition flex items-center justify-center gap-1.5">
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-[calc(100vh-61px)] w-full flex items-center justify-center bg-canvas">
      <Loader2 className="w-6 h-6 text-slate-grille animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
