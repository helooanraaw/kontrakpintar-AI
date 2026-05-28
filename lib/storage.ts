import { db, isFirebaseConfigured, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { glossaryData } from "./glossaryData";

export interface HistoryItem {
  id: string;
  type: "analysis" | "draft";
  title: string;
  timestamp: number;
  deviceId: string;
  userId?: string; // Menyimpan ID pengguna jika sudah login
  
  // Data Analisis Kontrak
  contractText?: string;
  score?: number;
  redFlagsCount?: number;
  analysisResult?: any;
  
  // Data Draft SPK
  pihakPertama?: { nama: string; domisili: string };
  pihakKedua?: { nama: string; domisili: string };
  detailJasa?: { lingkupKerja: string; tenggatWaktu: string };
  pembayaran?: { nilaiKontrak: string; persentaseDP: string; sanksiKeterlambatan: string };
  draftText?: string;
  instruksiKhusus?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  analogy: string;
}

// Helper untuk mendapatkan / membuat Device ID unik agar data tamu terpisah
const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server";
  let deviceId = localStorage.getItem("kontrakpintar_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("kontrakpintar_device_id", deviceId);
  }
  return deviceId;
};

// Helper untuk mendeteksi identitas aktif (User ID jika login, Device ID jika guest)
const getUserIdentifier = (): { type: "uid" | "device"; id: string } => {
  if (auth?.currentUser) {
    return { type: "uid", id: auth.currentUser.uid };
  }
  if (typeof window !== "undefined") {
    const authSession = localStorage.getItem("kontrakpintar_auth");
    if (authSession) {
      try {
        const parsed = JSON.parse(authSession);
        const uid = parsed.uid || (parsed.email ? "mock_" + parsed.email.replace(/\W/g, "_") : null);
        if (uid) {
          return { type: "uid", id: uid };
        }
      } catch {}
    }
  }
  return { type: "device", id: getOrCreateDeviceId() };
};

// Data Dummy bawaan agar dashboard tidak kosong saat pertama kali dibuka
const DUMMY_HISTORY: HistoryItem[] = [
  {
    id: "dummy-1",
    type: "analysis",
    title: "Analisis SPK Jasa Desain Grafis (Demo)",
    timestamp: Date.now() - 3600000 * 2, // 2 jam lalu
    deviceId: "system",
    userId: "system",
    contractText: `Pasal 2: NILAI KONTRAK & PEMBAYARAN\nTotal nilai kontrak adalah Rp 15.000.000. Pembayaran dilakukan secara penuh 100% setelah seluruh proyek selesai diserahkan. Tidak ada DP.`,
    score: 65,
    redFlagsCount: 3,
    analysisResult: {
      skorKeamanan: 65,
      ringkasan: "Kontrak ini menuntut UMKM bekerja penuh tanpa uang muka dan mengandung klausul keterlambatan sepihak.",
      temuanPasal: [
        {
          pasal: "Pasal 2: Nilai Kontrak",
          kategori: "Kritis",
          penjelasan: "Pekerjaan diserahkan 100% baru dibayar tanpa DP memicu risiko gagal bayar.",
          usulanRevisi: "Ajukan pembayaran bertahap (termin): 30% DP, 40% setelah progress 50%, dan 30% setelah pelunasan."
        }
      ]
    }
  },
  {
    id: "dummy-2",
    type: "draft",
    title: "Draft SPK Pembuatan Website - Kopi Bahagia (Demo)",
    timestamp: Date.now() - 3600000 * 5, // 5 jam lalu
    deviceId: "system",
    userId: "system",
    pihakPertama: { nama: "Kopi Bahagia Utama", domisili: "Jakarta Selatan" },
    pihakKedua: { nama: "Studio Digital Kreatif", domisili: "Bandung" },
    detailJasa: { lingkupKerja: "Pembuatan website e-commerce dan integrasi payment gateway", tenggatWaktu: "45 Hari Kerja" },
    pembayaran: { nilaiKontrak: "Rp 25.000.000", persentaseDP: "40", sanksiKeterlambatan: "0.1% per hari keterlambatan, maksimal 5% dari total nilai kontrak." },
    draftText: `# SURAT PERJANJIAN KERJA (SPK)\n\nAntara **Kopi Bahagia Utama** (Pihak Pertama) dan **Studio Digital Kreatif** (Pihak Kedua).\n\n## Pasal 1: Lingkup Jasa\nPihak Kedua akan membangun sistem e-commerce dalam waktu 45 Hari Kerja.\n\n## Pasal 2: Nilai Jasa & DP\nNilai total pengerjaan adalah Rp 25.000.000 dengan Uang Muka (DP) sebesar 40% (Rp 10.000.000).`
  }
];

// 1. Simpan Profil Pengguna ke Firestore/LocalStorage
export const saveUserProfile = async (user: {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  provider: string;
}): Promise<boolean> => {
  const userData = {
    uid: user.uid,
    name: user.name || user.email?.split("@")[0] || "User",
    email: user.email,
    photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || "User"}&backgroundColor=00262b,0b363b,006af2`,
    createdAt: Date.now(),
    provider: user.provider
  };

  if (isFirebaseConfigured && db) {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, userData, { merge: true });
      return true;
    } catch (e) {
      console.warn("Gagal menyimpan profil user ke Firestore:", e);
    }
  }

  // Offline Mock
  if (typeof window !== "undefined") {
    try {
      const localUsersStr = localStorage.getItem("kontrakpintar_db_users") || "[]";
      const localUsers = JSON.parse(localUsersStr);
      const existingIdx = localUsers.findIndex((u: any) => u.uid === user.uid);
      if (existingIdx >= 0) {
        localUsers[existingIdx] = userData;
      } else {
        localUsers.push(userData);
      }
      localStorage.setItem("kontrakpintar_db_users", JSON.stringify(localUsers));
      return true;
    } catch (e) {
      console.warn("Gagal menyimpan profil mock ke localStorage:", e);
    }
  }
  return false;
};

// 2. Simpan Analisis Kontrak
export const saveAnalysisToHistory = async (
  title: string,
  contractText: string,
  score: number,
  redFlagsCount: number,
  analysisResult: any
): Promise<HistoryItem> => {
  const userIdent = getUserIdentifier();
  const deviceId = getOrCreateDeviceId();
  
  const newItem: Omit<HistoryItem, "id"> = {
    type: "analysis",
    title,
    timestamp: Date.now(),
    deviceId: userIdent.type === "device" ? userIdent.id : deviceId,
    userId: userIdent.type === "uid" ? userIdent.id : undefined,
    contractText,
    score,
    redFlagsCount,
    analysisResult,
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "history"), newItem);
      return { id: docRef.id, ...newItem };
    } catch (e) {
      console.warn("Gagal menyimpan ke Firebase Firestore, beralih ke LocalStorage:", e);
    }
  }

  // LocalStorage fallback
  const localHistory = getLocalAllHistory();
  const itemWithId: HistoryItem = { id: "local_" + Math.random().toString(36).substring(2, 9), ...newItem };
  localHistory.unshift(itemWithId);
  saveLocalAllHistory(localHistory);
  return itemWithId;
};

// 3. Simpan Draft SPK Baru
export const saveSPKToHistory = async (
  title: string,
  pihakPertama: { nama: string; domisili: string },
  pihakKedua: { nama: string; domisili: string },
  detailJasa: { lingkupKerja: string; tenggatWaktu: string },
  pembayaran: { nilaiKontrak: string; persentaseDP: string; sanksiKeterlambatan: string },
  draftText: string,
  instruksiKhusus?: string
): Promise<HistoryItem> => {
  const userIdent = getUserIdentifier();
  const deviceId = getOrCreateDeviceId();

  const newItem: Omit<HistoryItem, "id"> = {
    type: "draft",
    title,
    timestamp: Date.now(),
    deviceId: userIdent.type === "device" ? userIdent.id : deviceId,
    userId: userIdent.type === "uid" ? userIdent.id : undefined,
    pihakPertama,
    pihakKedua,
    detailJasa,
    pembayaran,
    draftText,
    instruksiKhusus,
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "history"), newItem);
      return { id: docRef.id, ...newItem };
    } catch (e) {
      console.warn("Gagal menyimpan ke Firebase Firestore, beralih ke LocalStorage:", e);
    }
  }

  // LocalStorage fallback
  const localHistory = getLocalAllHistory();
  const itemWithId: HistoryItem = { id: "local_" + Math.random().toString(36).substring(2, 9), ...newItem };
  localHistory.unshift(itemWithId);
  saveLocalAllHistory(localHistory);
  return itemWithId;
};

// 4. Ambil Daftar Riwayat (Gabungan Firebase & LocalStorage & Dummy)
export const getHistoryList = async (): Promise<HistoryItem[]> => {
  const userIdent = getUserIdentifier();
  let firebaseItems: HistoryItem[] = [];

  if (isFirebaseConfigured && db) {
    try {
      let q;
      if (userIdent.type === "uid") {
        q = query(collection(db, "history"), where("userId", "==", userIdent.id));
      } else {
        q = query(collection(db, "history"), where("deviceId", "==", userIdent.id));
      }
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        firebaseItems.push({ id: doc.id, ...doc.data() } as HistoryItem);
      });
      firebaseItems.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn("Gagal mengambil data dari Firebase Firestore:", e);
    }
  }

  const localItems = getLocalFilteredHistory();
  
  // Gabungkan semua data, sertakan dummy history
  const combined = [...firebaseItems, ...localItems, ...DUMMY_HISTORY];
  
  // Hilangkan duplikat dan urutkan
  const uniqueItems: HistoryItem[] = [];
  const ids = new Set<string>();
  
  for (const item of combined) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems.sort((a, b) => b.timestamp - a.timestamp);
};

// 5. Hapus Item Riwayat
export const deleteHistoryItem = async (id: string): Promise<boolean> => {
  if (id.startsWith("dummy-")) {
    return true;
  }

  if (isFirebaseConfigured && db && !id.startsWith("local_")) {
    try {
      await deleteDoc(doc(db, "history", id));
      return true;
    } catch (e) {
      console.warn("Gagal menghapus dari Firebase Firestore:", e);
    }
  }

  // Hapus dari LocalStorage
  const localHistory = getLocalAllHistory();
  const filtered = localHistory.filter((item) => item.id !== id);
  saveLocalAllHistory(filtered);
  return true;
};

// 6. Ambil Glosarium Hukum Dinamis dari Firestore / Fallback Lokal
export const getGlossaryList = async (): Promise<GlossaryTerm[]> => {
  if (isFirebaseConfigured && db) {
    try {
      const querySnapshot = await getDocs(collection(db, "glossary"));
      const terms: GlossaryTerm[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.term && data.definition && data.analogy) {
          terms.push(data as GlossaryTerm);
        }
      });
      if (terms.length > 0) {
        return terms;
      }
    } catch (e) {
      console.warn("Gagal memuat glosarium dari Firestore, beralih ke data lokal:", e);
    }
  }
  return glossaryData;
};

// Helper LocalStorage Internal
const getLocalAllHistory = (): HistoryItem[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("kontrakpintar_history");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const getLocalFilteredHistory = (): HistoryItem[] => {
  const all = getLocalAllHistory();
  const userIdent = getUserIdentifier();
  
  return all.filter((item) => {
    if (userIdent.type === "uid") {
      return item.userId === userIdent.id;
    } else {
      return item.deviceId === userIdent.id;
    }
  });
};

const saveLocalAllHistory = (history: HistoryItem[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("kontrakpintar_history", JSON.stringify(history));
  }
};
