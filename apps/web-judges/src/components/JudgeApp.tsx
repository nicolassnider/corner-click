import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  doc as firestoreDoc,
  onSnapshot as firestoreOnSnapshot,
} from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { auth, db, database } from "../lib/firebase";
import { fetchWithAuth } from "../utils/apiClient";
import ScorePad from "./ScorePad";
import {
  APP_MOTTO,
  AUTHOR_NAME,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
} from "@corner-click/types";
import "../styles/global.css";

interface AssignedData {
  tournamentId: string;
  areaId: string;
  cornerId: string;
  matchId?: string;
}

export default function JudgeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [assignment, setAssignment] = useState<AssignedData | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [judgeName, setJudgeName] = useState<string>("");

  // Listen to active match in the assigned area
  useEffect(() => {
    if (!assignment) {
      setActiveMatchId(null);
      return;
    }
    
    if (assignment.tournamentId === "offline-tournament") {
      setActiveMatchId("offline-match");
      return;
    }

    const areaRef = ref(database, `live_matches_by_area/${assignment.areaId}`);
    const unsub = onValue(areaRef, (snap) => {
      if (snap.exists() && snap.val().matchId) {
        setActiveMatchId(snap.val().matchId);
      } else {
        setActiveMatchId(null);
      }
    });

    return () => unsub();
  }, [assignment]);

  useEffect(() => {
    let unsubFirestore: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Clean up previous listener if it exists
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = undefined;
      }

      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        const tournamentId = tokenResult.claims.tournamentId as string;
        const judgeId = tokenResult.claims.judgeId as string;
        const jName = tokenResult.claims.judgeName as string;

        if (!tournamentId || !judgeId) {
          await auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        setJudgeName(jName);

        const judgeRef = firestoreDoc(
          db,
          "tournaments",
          tournamentId,
          "judges",
          judgeId,
        );
        unsubFirestore = firestoreOnSnapshot(
          judgeRef,
          (docSnap) => {
            setError(""); // Reset any past errors
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.status === "OFFLINE") {
                auth.signOut();
                setAssignment(null);
                setPin("");
                setUser(null);
              } else {
                setAssignment(data.currentAssignment || null);
              }
            } else {
              // Judge deleted
              auth.signOut();
              setAssignment(null);
              setPin("");
              setUser(null);
            }
          },
          (err) => {
            console.error("Firestore onSnapshot error:", err);
            setError("Error de base de datos (Firestore): " + err.message);
          },
        );

        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin === "9999") {
      // Local Offline Mock mode activation
      setJudgeName("Juez Offline (PIN 9999)");
      setAssignment({
        tournamentId: "offline-tournament",
        areaId: "1",
        cornerId: "corner_1",
      });
      setUser({
        uid: "offline-judge-uid",
        emailVerified: true,
        isAnonymous: true,
        providerId: "custom",
        getIdToken: () => Promise.resolve("offline-token"),
        getIdTokenResult: () =>
          Promise.resolve({
            authTime: "",
            claims: {
              tournamentId: "offline-tournament",
              judgeId: "offline-judge-id",
              judgeName: "Juez Offline (PIN 9999)",
            },
            expirationTime: "",
            issuedAtTime: "",
            signInProvider: "",
            signInSecondFactor: "",
            token: "",
          }),
        phoneNumber: null,
        photoURL: null,
        displayName: "Juez Offline",
        email: "offline@corner.click",
        metadata: {},
        providerData: [],
        refreshToken: "",
        tenantId: null,
        delete: () => Promise.resolve(),
        reload: () => Promise.resolve(),
        toJSON: () => ({}),
      } as any);
      setLoading(false);
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/auth/pin`, {
        method: "POST",
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      await signInWithCustomToken(auth, data.token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    if (pin === "9999") {
      setAssignment(null);
      setPin("");
      setUser(null);
      return;
    }

    if (user) {
      try {
        await fetchWithAuth(`/api/auth/logout`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Failed to logout via API", err);
      }
    }

    await auth.signOut();
    setAssignment(null);
    setPin("");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white font-bold text-2xl">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 relative">
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-6 w-80 max-w-sm bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl z-10"
        >
          <h1 className="text-3xl font-extrabold text-white text-center tracking-wide">
            Corner <span className="text-blue-500">Click</span>
          </h1>
          <p className="text-gray-400 text-center font-medium">
            Ingresa tu PIN Personal
          </p>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 6) {
                setPin(val);
              }
            }}
            placeholder="••••"
            required
            autoFocus
            className="p-4 text-3xl text-center rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all font-bold tracking-widest"
          />

          {error && (
            <div className="text-red-500 text-center font-bold bg-red-500/10 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-extrabold text-xl py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            INGRESAR
          </button>
        </form>

        <div className="absolute bottom-6 left-0 right-0 text-center opacity-40 hover:opacity-100 transition-opacity flex flex-col items-center gap-1 z-0">
          <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">
            "{APP_MOTTO}"
          </p>
          <div className="flex gap-4 text-[10px] text-gray-600 font-bold">
            <span>By {AUTHOR_NAME}</span>
            <a
              href={AUTHOR_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
            <a
              href={AUTHOR_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment || !activeMatchId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 px-6 text-center">
        <h1 className="text-4xl font-extrabold text-blue-500 mb-2">
          Hola, {judgeName}
        </h1>
        <p className="text-xl text-gray-400 font-medium">
          Has iniciado sesión correctamente.
        </p>
        <div className="mt-12 p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-w-lg w-full animate-pulse">
          <p className="text-2xl font-bold text-white leading-relaxed">
            {assignment 
              ? `Esperando que el Presidente de Mesa inicie un combate en el Área ${assignment.areaId}...`
              : "Esperando asignación desde la Mesa Central..."}
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 text-red-400 text-sm font-bold bg-red-950/30 border border-red-900/50 rounded-xl max-w-lg w-full">
            {error}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="mt-12 text-gray-500 hover:text-white underline font-semibold transition-colors z-10"
        >
          Cerrar Sesión
        </button>

        <div className="absolute bottom-6 left-0 right-0 text-center opacity-40 hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
          <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">
            "Every Point. Every Match. Every Corner."
          </p>
          <div className="flex gap-4 text-[10px] text-gray-600 font-bold">
            <span>By Nicolas Snider</span>
            <a
              href="https://github.com/nicolassnider"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/nicolas-snider-7a362b39/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScorePad
      key={`${activeMatchId}-${assignment.cornerId}`}
      matchId={activeMatchId}
      cornerId={assignment.cornerId}
      areaId={assignment.areaId}
      judgeId={user?.uid || "offline-judge-id"}
      judgeName={judgeName}
      onLogout={handleLogout}
      isOffline={assignment.tournamentId === "offline-tournament"}
    />
  );
}
