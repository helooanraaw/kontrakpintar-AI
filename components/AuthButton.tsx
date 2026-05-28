"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { LogIn, LogOut, User as UserIcon, Loader2 } from "lucide-react";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [mockUser, setMockUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Memantau status login
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setUser(fbUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Fallback: pantau localStorage
      const checkMockAuth = () => {
        const authSession = localStorage.getItem("kontrakpintar_auth");
        if (authSession) {
          try {
            setMockUser(JSON.parse(authSession));
          } catch {
            setMockUser(null);
          }
        } else {
          setMockUser(null);
        }
        setLoading(false);
      };

      checkMockAuth();
      // Listen to storage changes to keep it in sync
      window.addEventListener("storage", checkMockAuth);
      return () => window.removeEventListener("storage", checkMockAuth);
    }
  }, []);

  // Sync state manual untuk reload internal satu tab (karena storage event tidak menembak di tab yang sama)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      const interval = setInterval(() => {
        const authSession = localStorage.getItem("kontrakpintar_auth");
        if (authSession) {
          try {
            const parsed = JSON.parse(authSession);
            if (JSON.stringify(parsed) !== JSON.stringify(mockUser)) {
              setMockUser(parsed);
            }
          } catch {
            setMockUser(null);
          }
        } else if (mockUser) {
          setMockUser(null);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mockUser]);

  const handleLoginClick = () => {
    router.push(`/login?redirect=${pathname}`);
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
        router.push("/");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    } else {
      localStorage.removeItem("kontrakpintar_auth");
      setMockUser(null);
      router.push("/");
    }
  };

  if (loading) {
    return <div className="w-8 h-8 animate-pulse bg-slate-200 rounded-full" />;
  }

  const activeUser = isFirebaseConfigured ? user : mockUser;

  if (activeUser) {
    const displayName = isFirebaseConfigured 
      ? user?.displayName 
      : mockUser?.name;
    const photoURL = isFirebaseConfigured 
      ? user?.photoURL 
      : mockUser?.avatarUrl;

    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
          {photoURL ? (
            <img src={photoURL} alt={displayName || ""} className="w-6 h-6 rounded-full border border-slate-100" />
          ) : (
            <UserIcon size={14} className="text-[#354d51]" />
          )}
          <span className="text-xs font-bold text-[#00262b] hidden sm:inline truncate max-w-[100px]">
            {displayName?.split(" ")[0]}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-[#354d51] hover:text-[#8b3911] hover:bg-[#fff1f1] rounded-full transition-colors border-0 bg-transparent cursor-pointer"
          title="Keluar"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLoginClick}
      className="flex items-center gap-2 bg-[#00262b] text-white hover:bg-[#0b363b] px-5 py-2 rounded-full text-xs font-bold shadow-xs transition-all active:scale-95 border-0 cursor-pointer"
    >
      <LogIn size={14} />
      <span>Masuk Workspace</span>
    </button>
  );
}
