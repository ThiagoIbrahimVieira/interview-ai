"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    const token = localStorage.getItem("access_token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="grid-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-text-primary)", fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", letterSpacing: "-0.02em" }}>
        <Play size={20} fill="var(--color-accent-primary)" color="var(--color-accent-primary)" />
        InterviewAI
      </div>
      <div className="spinner"></div>
    </div>
  );
}
