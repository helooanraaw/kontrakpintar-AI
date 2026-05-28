import { auth, isFirebaseConfigured } from "./firebase";

export interface UsageState {
  guestTrialUsed: boolean;
  guestCount?: number; // Melacak jumlah uji coba tamu
  dailyCount: number;
  lastUsedDate: string; // Format: string tanggal hari ini
}

const LIMITS_STORAGE_KEY = "kontrakpintar_usage_limits";

/**
 * Mengecek apakah pengguna saat ini sedang login (Firebase asli atau mock offline)
 */
export function checkIsLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  
  if (isFirebaseConfigured) {
    // Jika Firebase dikonfigurasi, sumber kebenaran HANYA dari Firebase Auth
    return !!auth?.currentUser;
  }
  
  // Cek sesi mock offline jika Firebase tidak aktif
  const authSession = localStorage.getItem("kontrakpintar_auth");
  if (authSession && authSession !== "null" && authSession !== "undefined") {
    try {
      const parsed = JSON.parse(authSession);
      return !!(parsed && (parsed.uid || parsed.email));
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Mengambil state penggunaan limit saat ini
 */
export function getUsageState(): UsageState {
  if (typeof window === "undefined") {
    return { guestTrialUsed: false, guestCount: 0, dailyCount: 0, lastUsedDate: "" };
  }
  
  const today = new Date().toDateString();
  const stored = localStorage.getItem(LIMITS_STORAGE_KEY);
  
  if (!stored) {
    return { guestTrialUsed: false, guestCount: 0, dailyCount: 0, lastUsedDate: today };
  }
  
  try {
    const parsed = JSON.parse(stored) as UsageState;
    // Migrasi data lama ke struktur jumlah hitungan
    if (parsed.guestCount === undefined) {
      parsed.guestCount = parsed.guestTrialUsed ? 1 : 0;
    }
    // Jika tanggal hari ini berbeda dengan kunjungan terakhir, reset hitungan harian
    if (parsed.lastUsedDate !== today) {
      parsed.dailyCount = 0;
      parsed.lastUsedDate = today;
      localStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return { guestTrialUsed: false, guestCount: 0, dailyCount: 0, lastUsedDate: today };
  }
}

/**
 * Menyimpan status penggunaan limit ke LocalStorage
 */
export function saveUsageState(state: UsageState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(state));
  }
}

/**
 * Memvalidasi apakah user diperbolehkan melakukan pemindaian / pembuatan dokumen
 */
export function checkCanGenerate(): { allowed: boolean; reason: "guest_limit" | "daily_limit" | null; remaining: number } {
  const loggedIn = checkIsLoggedIn();
  const state = getUsageState();
  
  if (!loggedIn) {
    // Limit tamu: Maksimal 1 kali uji coba gratis
    const currentGuestCount = state.guestCount !== undefined ? state.guestCount : (state.guestTrialUsed ? 1 : 0);
    const remaining = Math.max(0, 1 - currentGuestCount);
    if (currentGuestCount >= 1) {
      return { allowed: false, reason: "guest_limit", remaining: 0 };
    }
    return { allowed: true, reason: null, remaining };
  } else {
    // Limit user login: Maksimal 8 kali per hari
    const remaining = Math.max(0, 8 - state.dailyCount);
    if (state.dailyCount >= 8) {
      return { allowed: false, reason: "daily_limit", remaining: 0 };
    }
    return { allowed: true, reason: null, remaining };
  }
}

/**
 * Menambah jumlah pemakaian limit user (setelah pemindaian / pembuatan draf berhasil)
 */
export function incrementUsageCount() {
  const loggedIn = checkIsLoggedIn();
  const state = getUsageState();
  const today = new Date().toDateString();
  
  if (!loggedIn) {
    state.guestTrialUsed = true;
    state.guestCount = (state.guestCount !== undefined ? state.guestCount : 1) + 1;
  } else {
    state.dailyCount += 1;
  }
  state.lastUsedDate = today;
  saveUsageState(state);
  
  // Tembakkan event kustom agar UI navbar / dashboard tersinkronisasi jika ada pembatasan
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("kontrakpintar_limit_changed"));
  }
}

// Bantuan reset global untuk mempermudah testing di Browser Console
if (typeof window !== "undefined") {
  (window as any).resetLimits = () => {
    localStorage.removeItem(LIMITS_STORAGE_KEY);
    window.dispatchEvent(new Event("kontrakpintar_limit_changed"));
    console.log("KontrakPintar AI: Usage limits successfully reset!");
    return "Limits reset successfully! Please refresh the page.";
  };
}
