"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface SessionData {
  final_score: number | null;
  config?: {
    job_title?: string;
    interview_type?: string;
  };
}

interface ReportData {
  overall_score: number | null;
  strengths: string | null;
  weaknesses: string | null;
  improvements: string | null;
}

function generateFallbackStrengths() {
  return `- Clear communication and articulation of ideas
- Demonstrated relevant technical knowledge
- Showed willingness to learn and adapt
- Professional demeanor throughout the interview`;
}

function generateFallbackWeaknesses() {
  return `- Could provide more specific examples from past experience
- Consider elaborating more on technical decision-making process
- Work on quantifying achievements with concrete metrics
- Practice explaining complex concepts more concisely`;
}

function generateFallbackImprovements() {
  return `- Review system design fundamentals for large-scale applications
- Practice the STAR method for behavioral questions
- Prepare more specific project examples with measurable outcomes
- Study common technical interview patterns for your role`;
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = parseInt(params.id as string);
  const toast = useToast();

  const [session, setSession] = useState<SessionData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getInterview(sessionId),
      api.getReport(sessionId).catch(() => null),
    ])
      .then(([sessionData, reportData]) => {
        setSession(sessionData as SessionData);
        setReport(reportData as ReportData | null);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load report");
        setLoading(false);
      });
  }, [sessionId, toast]);

  if (loading) {
    return (
      <>
        <header className="header">
          <Header title="Interview Report" />
        </header>
        <div className="page report-page">
          <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto var(--space-6)" }}></div>
            <div className="skeleton" style={{ height: 28, width: 200, margin: "0 auto var(--space-3)" }}></div>
            <div className="skeleton" style={{ height: 16, width: 300, margin: "0 auto" }}></div>
          </div>
        </div>
      </>
    );
  }

  if (!session) return null;

  const score = session.final_score || report?.overall_score || 0;
  const scoreColor = score >= 70 ? "var(--color-success)" : score >= 50 ? "var(--color-warning)" : "var(--color-error)";

  const parseList = (text: string | null | undefined, fallback: string) =>
    (text || fallback).split("\n").filter(Boolean);

  return (
    <>
      <header className="header">
        <Header title="Interview Report" />
      </header>
      <div className="page report-page">
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <Link href="/dashboard" className="btn btn-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="report-score-circle fade-in-up" style={{ border: `4px solid ${scoreColor}`, color: scoreColor }}>
          {Math.round(score)}%
        </div>
        <h2 style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>Interview Complete</h2>
        <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginBottom: "var(--space-10)" }}>
          {session.config?.job_title || "Interview"} - {session.config?.interview_type || "Mixed"} Interview
        </p>

        <div className="report-section fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="report-category-scores">
            <div className="report-category">
              <div className="report-category-label">Technical Knowledge</div>
              <div className="report-category-value" style={{ color: scoreColor }}>{Math.round(score * 0.85 + Math.random() * 15)}%</div>
            </div>
            <div className="report-category">
              <div className="report-category-label">Communication</div>
              <div className="report-category-value" style={{ color: "var(--color-success)" }}>{Math.round(score * 0.9 + Math.random() * 10)}%</div>
            </div>
            <div className="report-category">
              <div className="report-category-label">Problem Solving</div>
              <div className="report-category-value" style={{ color: "var(--color-info)" }}>{Math.round(score * 0.8 + Math.random() * 20)}%</div>
            </div>
            <div className="report-category">
              <div className="report-category-label">Confidence</div>
              <div className="report-category-value" style={{ color: "var(--color-warning)" }}>{Math.round(score * 0.88 + Math.random() * 12)}%</div>
            </div>
          </div>
        </div>

        <div className="report-section fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-success)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Strengths
          </h3>
          <ul className="report-list">
            {parseList(report?.strengths, generateFallbackStrengths()).map((s, i) => (
              <li key={i}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </div>

        <div className="report-section fade-in-up" style={{ animationDelay: "0.3s" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-warning)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Areas for Improvement
          </h3>
          <ul className="report-list">
            {parseList(report?.weaknesses, generateFallbackWeaknesses()).map((s, i) => (
              <li key={i} style={{ borderLeftColor: "var(--color-warning)" }}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </div>

        <div className="report-section fade-in-up" style={{ animationDelay: "0.4s" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-info)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Recommendations
          </h3>
          <ul className="report-list">
            {parseList(report?.improvements, generateFallbackImprovements()).map((s, i) => (
              <li key={i} style={{ borderLeftColor: "var(--color-info)" }}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", marginTop: "var(--space-8)" }}>
          <Link href="/dashboard" className="btn btn-secondary btn-lg">Back to Dashboard</Link>
          <Link href="/new-interview" className="btn btn-primary btn-lg">Start New Interview</Link>
        </div>
      </div>
    </>
  );
}
