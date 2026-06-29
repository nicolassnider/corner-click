import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import type { User } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth, database } from "../lib/firebase";
import { fetchWithAuth, API_URL } from "../utils/apiClient";
import ScorePad from "./ScorePad";
import {
  APP_MOTTO,
  AUTHOR_NAME,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
} from "@corner-click/types";
import "../styles/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@corner-click/api-client";

interface AssignedData {
  tournamentId: string;
  areaId: string;
  cornerId: string;
  matchId?: string;
}

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      async headers() {
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : "";
        return {
          authorization: token ? `Bearer ${token}` : "",
        };
      },
    }),
  ],
});

export default function JudgeAppApp() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <JudgeApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

function JudgeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [assignment, setAssignment] = useState<AssignedData | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [judgeName, setJudgeName] = useState<string>("");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [judgeId, setJudgeId] = useState<string | null>(null);

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

  // Authenticate user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        const tId = tokenResult.claims.tournamentId as string;
        const jId = tokenResult.claims.judgeId as string;
        const jName = tokenResult.claims.judgeName as string;

        if (!tId || !jId) {
          await auth.signOut();
          setUser(null);
          setTournamentId(null);
          setJudgeId(null);
          setLoading(false);
          return;
        }

        setJudgeName(jName);
        setTournamentId(tId);
        setJudgeId(jId);
        setLoading(false);
      } else {
        setTournamentId(null);
        setJudgeId(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Poll for judge assignment using tRPC
  const { data: judgeData, error: queryError } = trpc.judges.getById.useQuery(
    { tournamentId: tournamentId!, judgeId: judgeId! },
    {
      enabled: !!tournamentId && !!judgeId && tournamentId !== "offline-tournament",
      refetchInterval: 3000,
    }
  );

  useEffect(() => {
    if (queryError) {
      console.error("tRPC query error:", queryError);
      setError("Error de base de datos (tRPC): " + queryError.message);
    }
    if (judgeData) {
      setError("");
      if (judgeData.status === "OFFLINE") {
        auth.signOut();
        setAssignment(null);
        setPin("");
        setUser(null);
        setTournamentId(null);
        setJudgeId(null);
      } else {
        setAssignment(judgeData.currentAssignment || null);
      }
    }
  }, [judgeData, queryError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin === "9999") {
      // Local Offline Mock mode activation
      setJudgeName("Juez Offline (PIN 9999)");
      setTournamentId("offline-tournament");
      setJudgeId("offline-judge-id");
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
      setTournamentId(null);
      setJudgeId(null);
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
    setTournamentId(null);
    setJudgeId(null);
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-950 relative overflow-hidden font-sans">
        {/* Dynamic Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-6 w-80 max-w-sm bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-800/80 shadow-2xl z-10"
        >
          <h1 className="text-3xl font-black text-slate-100 text-center tracking-tight uppercase">
            CORNER<span className="text-blue-500">CLICK</span>
          </h1>
          <p className="text-slate-400 text-center font-semibold text-sm">
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
            className="p-4 text-3xl text-center rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold tracking-[0.5em]"
          />

          {error && (
            <div className="text-rose-400 text-center font-bold bg-rose-950/30 border border-rose-900/50 py-2 px-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-widest border border-blue-500/30 cursor-pointer"
          >
            Ingresar
          </button>
        </form>

        <div className="absolute bottom-6 left-0 right-0 text-center opacity-50 hover:opacity-100 transition-opacity flex flex-col items-center gap-1.5 z-0">
          <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">
            "{APP_MOTTO}"
          </p>
          <div className="flex gap-4 text-[10px] text-slate-600 font-bold uppercase tracking-wider">
            <span>By {AUTHOR_NAME}</span>
            <a
              href={AUTHOR_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <a
              href={AUTHOR_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
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
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-950 px-6 text-center font-sans relative overflow-hidden">
        {/* Dynamic Background Glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="z-10 bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-800/80 shadow-2xl max-w-lg w-full flex flex-col items-center">
          <h1 className="text-3xl font-black text-slate-100 mb-2 tracking-tight uppercase">
            Hola, <span className="text-blue-500">{judgeName}</span>
          </h1>
          <p className="text-slate-400 font-medium mb-8">
            Has iniciado sesión correctamente.
          </p>
          
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 w-full animate-pulse-slow relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 blur-[40px]" />
            <p className="text-lg font-bold text-slate-200 leading-relaxed relative z-10">
              {assignment
                ? `Esperando que inicie un combate en el Área ${assignment.areaId}...`
                : "Esperando asignación desde la Mesa Central..."}
            </p>
            <div className="mt-6 flex justify-center space-x-2 relative z-10">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 text-rose-400 text-sm font-bold bg-rose-950/30 border border-rose-900/50 rounded-xl w-full">
              {error}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="mt-8 text-slate-500 hover:text-slate-300 font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer border border-transparent hover:border-slate-700 bg-slate-950 hover:bg-slate-900 px-4 py-2 rounded-lg"
          >
            Cerrar Sesión
          </button>
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
