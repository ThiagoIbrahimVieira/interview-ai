"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LayoutDashboard, PlusCircle, Clock, User, LogOut, Play } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { label: "Dashboard", href: "/dashboard", page: "dashboard", icon: LayoutDashboard },
  { label: "New Interview", href: "/new-interview", page: "new-interview", icon: PlusCircle },
  { label: "History", href: "/history", page: "history", icon: Clock },
  { label: "Profile", href: "/profile", page: "profile", icon: User },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useStore();
  const initial = (user?.full_name as string)?.[0] || (user?.email as string)?.[0] || "U";

  const currentPage = navItems.find((item) => pathname === item.href)?.page || "";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Play size={18} fill="var(--color-accent-primary)" color="var(--color-accent-primary)" />
            InterviewAI
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={handleNavClick}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "var(--radius-lg)",
                      background: "var(--color-accent-muted)",
                      zIndex: -1,
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} role="button" tabIndex={0} aria-label="Sign out" onKeyDown={(e) => e.key === "Enter" && handleLogout()}>
            <div className="avatar">{initial.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>
                {(user?.full_name as string) || (user?.email as string) || "User"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(user?.email as string) || ""}
              </div>
            </div>
            <LogOut size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          </div>
        </div>
      </aside>
    </>
  );
}
