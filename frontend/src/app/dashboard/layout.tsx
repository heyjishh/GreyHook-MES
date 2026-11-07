"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalFilterBar } from "@/components/layout/GlobalFilterBar";
import { useAuthStore } from "@/store/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined"
      ? sessionStorage.getItem("auth_token")
      : null;

    if (!token && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (token && !isAuthenticated) {
      const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
      if (IS_MOCK) {
        login(token, {
          id: "mock",
          organization_id: "mock-org",
          email: "demo@mock.com",
          name: "Demo User",
          role: "admin",
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    }
  }, [isAuthenticated, login, router]);

  if (!isAuthenticated && typeof window !== "undefined" && !sessionStorage.getItem("auth_token")) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 relative">
        <div className="aurora-layer" aria-hidden="true" />
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        <GlobalFilterBar />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
