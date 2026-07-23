"use client";

import { useEffect, useState, useCallback } from "react";
import { Menu, Sun, Moon } from "lucide-react";

export default function Header({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    window.dispatchEvent(new Event("toggle-sidebar"));
  }, []);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={toggleSidebar}
          title="Toggle menu"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>
        <div className="header-title">{title}</div>
      </div>
      <div className="header-actions">
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        {actions}
      </div>
    </>
  );
}
