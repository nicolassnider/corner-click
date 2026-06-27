import React, { useEffect } from "react";
import { auth } from "../lib/firebase";
import { fetchWithAuth, wakeUpApi } from "../utils/apiClient";
import { AuthProvider, LoginForm as SharedLoginForm } from "@corner-click/auth";

export default function LoginForm() {
  useEffect(() => {
    wakeUpApi();
  }, []);

  return (
    <AuthProvider auth={auth} fetchWithAuth={fetchWithAuth}>
      <SharedLoginForm title="CORNERCLICK" subtitle="Admin Console" />
    </AuthProvider>
  );
}
