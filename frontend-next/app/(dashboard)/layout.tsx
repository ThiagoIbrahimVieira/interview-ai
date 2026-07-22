"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .getMe()
      .then((user) => setUser(user as Record<string, unknown>))
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.replace("/login");
      });
  }, [router, setUser]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}
