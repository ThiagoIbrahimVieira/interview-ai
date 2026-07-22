"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    page: "dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "New Interview",
    href: "/new-interview",
    page: "new-interview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    label: "History",
    href: "/history",
    page: "history",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    page: "profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="var(--color-accent-primary)" />
          </svg>
          InterviewAI
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.page}
            href={item.href}
            className={`nav-item ${currentPage === item.page ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout}>
          <div className="avatar">{initial.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(user?.full_name as string) || (user?.email as string) || "User"}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(user?.email as string) || ""}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
