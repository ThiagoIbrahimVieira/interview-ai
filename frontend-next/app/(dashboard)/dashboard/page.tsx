"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Target, Flame, TrendingUp, Plus, Video } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { formatDate, formatScore, escapeHtml } from "@/lib/utils";

interface Interview {
  id: number;
  status: string;
  final_score: number | null;
  created_at: string;
  config?: {
    job_title?: string;
    interview_type?: string;
    difficulty?: string;
  };
}

interface Stats {
  total_interviews: number;
  average_score: number;
  streak: number;
  improvement: number;
}

const statIcons = [BarChart3, Target, Flame, TrendingUp];

export default function DashboardPage() {
  const { user } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats().catch(() => ({ total_interviews: 0, average_score: 0, streak: 0, improvement: 0 })),
      api.getInterviews(1, 5).catch(() => ({ sessions: [], total: 0 })),
    ]).then(([statsData, interviewsData]) => {
      setStats(statsData as Stats);
      setInterviews((interviewsData as { sessions: Interview[] }).sessions || []);
      setLoading(false);
    });
  }, []);

  const improvementVal = stats?.improvement || 0;
  const improvementColor = improvementVal >= 0 ? "var(--color-success)" : "var(--color-error)";
  const improvementPrefix = improvementVal >= 0 ? "+" : "";

  const statValues = [
    { label: "Total Interviews", value: stats?.total_interviews || 0 },
    { label: "Average Score", value: `${Math.round(stats?.average_score || 0)}%` },
    { label: "Current Streak", value: `${stats?.streak || 0} days` },
    { label: "Improvement", value: `${improvementPrefix}${Math.round(improvementVal)}%`, color: improvementColor },
  ];

  return (
    <>
      <header className="header">
        <Header title="Dashboard" />
      </header>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {(user?.full_name as string) || "there"}!</p>
        </div>
        <div className="dashboard-stats">
          {loading ? (
            <>
              <div className="stat-card"><div className="skeleton" style={{ height: 16, width: "60%" }}></div><div className="skeleton" style={{ height: 28, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 16, width: "60%" }}></div><div className="skeleton" style={{ height: 28, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 16, width: "60%" }}></div><div className="skeleton" style={{ height: 28, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 16, width: "60%" }}></div><div className="skeleton" style={{ height: 28, width: "40%", marginTop: 8 }}></div></div>
            </>
          ) : (
            statValues.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="stat-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <div className="stat-card-icon">
                  {(() => { const Icon = statIcons[i]; return <Icon size={18} />; })()}
                </div>
                <div className="stat-card-label">{stat.label}</div>
                <div className="stat-card-value" style={stat.color ? { color: stat.color } : undefined}>{stat.value}</div>
              </motion.div>
            ))
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", letterSpacing: "-0.01em" }}>Recent Interviews</h2>
          <Link href="/new-interview" className="btn btn-primary btn-sm">
            <Plus size={16} />
            New Interview
          </Link>
        </div>
        {!loading && interviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Video size={24} />
            </div>
            <h3 className="empty-state-title">No interviews yet</h3>
            <p className="empty-state-text">Start your first interview to begin tracking your progress.</p>
            <Link href="/new-interview" className="btn btn-primary btn-sm">
              Start First Interview
            </Link>
          </div>
        ) : (
          <div className="interview-grid">
            {interviews.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}
              >
                <Link
                  href={`/interview/${s.id}`}
                  className="interview-card"
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div className="interview-card-header">
                    <div className="interview-card-title">{escapeHtml(s.config?.job_title || "Interview")}</div>
                    <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-warning"}`}>{s.status}</span>
                  </div>
                  <div className="interview-card-meta">
                    <span className="badge badge-info">{s.config?.interview_type || "Mixed"}</span>
                    <span className="badge badge-info">{s.config?.difficulty || "Medium"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>{formatDate(s.created_at)}</span>
                    <span className="interview-card-score" style={{ color: (s.final_score || 0) >= 70 ? "var(--color-success)" : (s.final_score || 0) >= 50 ? "var(--color-warning)" : "var(--color-error)" }}>
                      {formatScore(s.final_score)}%
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
