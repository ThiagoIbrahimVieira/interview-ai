"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { formatDate, escapeHtml } from "@/lib/utils";

interface Interview {
  id: number;
  status: string;
  final_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  config?: {
    job_title?: string;
    interview_type?: string;
    difficulty?: string;
    experience_level?: string;
  };
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getInterviews(1, 50)
      .then((data) => {
        setInterviews((data as { sessions: Interview[] }).sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="header">
        <Header title="History" />
      </header>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Interview History</h1>
          <p className="page-subtitle">Review your past interview sessions</p>
        </div>
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 120, marginBottom: "var(--space-4)" }}></div>
            <div className="skeleton" style={{ height: 120, marginBottom: "var(--space-4)" }}></div>
            <div className="skeleton" style={{ height: 120 }}></div>
          </>
        ) : interviews.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="empty-state-title">No interviews yet</h3>
            <p className="empty-state-text">Complete your first interview to see it here.</p>
            <Link href="/new-interview" className="btn btn-primary" style={{ marginTop: "var(--space-4)" }}>
              Start Interview
            </Link>
          </div>
        ) : (
          <div className="interview-grid">
            {interviews.map((s, i) => {
              const href = s.status === "completed" ? `/report/${s.id}` : `/interview/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className="interview-card fade-in-up"
                  style={{ animationDelay: `${i * 0.03}s`, textDecoration: "none", color: "inherit" }}
                >
                  <div className="interview-card-header">
                    <div className="interview-card-title">{escapeHtml(s.config?.job_title || "Interview")}</div>
                    <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-warning"}`}>{s.status}</span>
                  </div>
                  <div className="interview-card-meta">
                    <span className="badge badge-info">{s.config?.interview_type || "Mixed"}</span>
                    <span className="badge badge-info">{s.config?.difficulty || "Medium"}</span>
                    <span className="badge badge-info">{s.config?.experience_level || "Mid-Level"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)" }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
                      {formatDate(s.created_at)} &middot; {Math.floor((s.duration_seconds || 0) / 60)}m
                    </span>
                    <span className="interview-card-score" style={{ color: (s.final_score || 0) >= 70 ? "var(--color-success)" : (s.final_score || 0) >= 50 ? "var(--color-warning)" : "var(--color-error)" }}>
                      {s.final_score != null ? Math.round(s.final_score) + "%" : "--"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
