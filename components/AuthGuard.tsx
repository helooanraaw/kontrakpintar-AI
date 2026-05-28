"use client";

import { useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mockUser, setMockUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setUser(fbUser);
        setLoading(false);
        
        if (!fbUser || !fbUser.emailVerified) {
          const tab = searchParams.get("tab") || "overview";
          router.push(`/login?redirect=${pathname}?tab=${tab}`);
        }
      });
      return () => unsubscribe();
    } else {
      const authSession = localStorage.getItem("kontrakpintar_auth");
      if (authSession) {
        try {
          setMockUser(JSON.parse(authSession));
        } catch {
          setMockUser(null);
        }
      } else {
        const tab = searchParams.get("tab") || "overview";
        router.push(`/login?redirect=${pathname}?tab=${tab}`);
      }
      setLoading(false);
    }
  }, [router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-canvas gap-4">
        <Loader2 className="w-10 h-10 text-electric-blue animate-spin" />
        <p className="text-sm font-medium text-slate-grille">Memverifikasi akses keamanan...</p>
      </div>
    );
  }

  const isAuthenticated = isFirebaseConfigured ? !!user : !!mockUser;

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-canvas gap-4">
        <Loader2 className="w-10 h-10 text-electric-blue animate-spin" />
        <p className="text-sm font-medium text-slate-grille">Mengarahkan ke halaman login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
