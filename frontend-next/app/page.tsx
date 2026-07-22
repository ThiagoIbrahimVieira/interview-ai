"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="spinner spinner-lg"></div>
    </div>
  );
}
