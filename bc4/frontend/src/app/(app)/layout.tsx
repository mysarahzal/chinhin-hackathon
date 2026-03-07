"use client";

import { AuthProvider } from "@/lib/auth";
import AuthGuard from "@/components/auth-guard";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
