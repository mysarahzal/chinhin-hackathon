"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Sidebar from "./sidebar";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen px-10 py-8 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
