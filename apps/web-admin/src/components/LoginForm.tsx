import React from "react";
import { auth } from "../lib/firebase";
import { fetchWithAuth } from "../utils/apiClient";
import { AuthProvider, LoginForm as SharedLoginForm } from "@corner-click/auth";

export default function LoginForm() {
  return (
    <AuthProvider auth={auth} fetchWithAuth={fetchWithAuth}>
      <SharedLoginForm title="CORNERCLICK" subtitle="Admin Console" />
    </AuthProvider>
  );
}
