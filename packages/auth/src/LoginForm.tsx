import React, { useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { useAuth } from "./index";
import { trpc } from "@corner-click/api-client";

interface LoginFormProps {
  title?: string;
  subtitle?: string;
  onLoginSuccess?: () => void;
}

export default function LoginForm({
  title = "CORNERCLICK",
  subtitle = "Admin Console",
  onLoginSuccess,
}: LoginFormProps) {
  const { auth, fetchWithAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const adminLoginMutation = trpc.auth.adminLogin.useMutation();
  const guestLoginMutation = trpc.auth.guestLogin.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminLoginMutation.mutateAsync({ email, password });

      await signInWithCustomToken(auth, data.token);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      if (err.message?.includes("Acceso denegado")) {
        setError("Acceso denegado: no eres administrador.");
      } else if (err.message?.includes("Invalid credentials") || err.data?.code === "UNAUTHORIZED") {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
      } else {
        setError(err.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await guestLoginMutation.mutateAsync();

      await signInWithCustomToken(auth, data.token);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión. Verifica que el servidor esté activo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40 mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {title === "CORNERCLICK" ? (
              <>
                CORNER<span className="text-blue-500">CLICK</span>
              </>
            ) : (
              title
            )}
          </h1>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#121A2F] rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@cornerclick.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0A0F1C] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#121A2F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-white/5 text-gray-300 font-semibold rounded-lg hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#121A2F] disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/10"
            >
              Ver Demo como Invitado
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Solo para administradores autorizados
        </p>
      </div>
    </div>
  );
}
