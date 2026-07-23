"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
              <div className="stat-card"><div className="skeleton" style={{ height: 20, width: "60%" }}></div><div className="skeleton" style={{ height: 36, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 20, width: "60%" }}></div><div className="skeleton" style={{ height: 36, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 20, width: "60%" }}></div><div className="skeleton" style={{ height: 36, width: "40%", marginTop: 8 }}></div></div>
              <div className="stat-card"><div className="skeleton" style={{ height: 20, width: "60%" }}></div><div className="skeleton" style={{ height: 36, width: "40%", marginTop: 8 }}></div></div>
            </>
          ) : (
            <>
              <div className="stat-card fade-in-up">
                <div className="stat-card-label">Total Interviews</div>
                <div className="stat-card-value">{stats?.total_interviews || 0}</div>
              </div>
              <div className="stat-card fade-in-up" style={{ animationDelay: "0.05s" }}>
                <div className="stat-card-label">Average Score</div>
                <div className="stat-card-value">{Math.round(stats?.average_score || 0)}%</div>
              </div>
              <div className="stat-card fade-in-up" style={{ animationDelay: "0.1s" }}>
                <div className="stat-card-label">Current Streak</div>
                <div className="stat-card-value">{stats?.streak || 0} days</div>
              </div>
              <div className="stat-card fade-in-up" style={{ animationDelay: "0.15s" }}>
                <div className="stat-card-label">Improvement</div>
                <div className="stat-card-value" style={{ color: improvementColor }}>{improvementPrefix}{Math.round(improvementVal)}%</div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>Recent Interviews</h2>
          <Link href="/new-interview" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Interview
          </Link>
        </div>
        {!loading && interviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
            </div>
            <h3 className="empty-state-title">No interviews yet</h3>
            <p className="empty-state-text">Start your first interview to begin tracking your progress.</p>
            <Link href="/new-interview" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
              Start First Interview
            </Link>
          </div>
        ) : (
          <div className="interview-grid">
            {interviews.map((s, i) => (
              <Link
                key={s.id}
                href={`/interview/${s.id}`}
                className="interview-card fade-in-up"
                style={{ animationDelay: `${i * 0.05}s`, textDecoration: "none", color: "inherit" }}
              >
                <div className="interview-card-header">
                  <div className="interview-card-title">{escapeHtml(s.config?.job_title || "Interview")}</div>
                  <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-warning"}`}>{s.status}</span>
                </div>
                <div className="interview-card-meta">
                  <span className="badge badge-info">{s.config?.interview_type || "Mixed"}</span>
                  <span className="badge badge-info">{s.config?.difficulty || "Medium"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)" }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>{formatDate(s.created_at)}</span>
                  <span className="interview-card-score" style={{ color: (s.final_score || 0) >= 70 ? "var(--color-success)" : (s.final_score || 0) >= 50 ? "var(--color-warning)" : "var(--color-error)" }}>
                    {formatScore(s.final_score)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
