"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
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
  scores?: Array<{
    category: string;
    score: number;
    feedback?: string;
  }>;
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
  }, [sessionId]);

  if (loading) {
    return (
      <>
        <header className="header">
          <Header title="Interview Report" />
        </header>
        <div className="page report-page">
          <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
            <div className="skeleton" style={{ width: 110, height: 110, borderRadius: "50%", margin: "0 auto var(--space-6)" }}></div>
            <div className="skeleton" style={{ height: 24, width: 200, margin: "0 auto var(--space-3)" }}></div>
            <div className="skeleton" style={{ height: 14, width: 260, margin: "0 auto" }}></div>
          </div>
          <div className="report-category-scores" style={{ marginBottom: "var(--space-8)" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="report-category">
                <div className="skeleton" style={{ height: 12, width: "60%", margin: "0 auto var(--space-2)" }}></div>
                <div className="skeleton" style={{ height: 24, width: "40%", margin: "0 auto" }}></div>
              </div>
            ))}
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

  const getScoreValue = (category: string, fallback: number): number => {
    const found = report?.scores?.find((s) => s.category === category);
    return found ? Math.round(found.score) : fallback;
  };

  const categoryScores = [
    { label: "Technical Knowledge", value: getScoreValue("technical_knowledge", Math.min(100, Math.round(score * 0.9 + 5))), color: scoreColor },
    { label: "Communication", value: getScoreValue("communication", Math.min(100, Math.round(score * 0.95 + 3))), color: "var(--color-success)" },
    { label: "Problem Solving", value: getScoreValue("problem_solving", Math.min(100, Math.round(score * 0.85 + 8))), color: "var(--color-info)" },
    { label: "Confidence", value: getScoreValue("confidence", Math.min(100, Math.round(score * 0.92 + 4))), color: "var(--color-warning)" },
  ];

  return (
    <>
      <header className="header">
        <Header title="Interview Report" />
      </header>
      <div className="page report-page">
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: "center", marginBottom: "var(--space-8)" }}
        >
          <div className="report-score-circle" style={{ border: `2px solid ${scoreColor}`, color: scoreColor, boxShadow: `0 0 0 1px ${scoreColor}10, 0 2px 8px rgba(0,0,0,0.15)` }}>
            {Math.round(score)}%
          </div>
          <h2 style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-2xl)" }}>Interview Complete</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--text-sm)" }}>
            {session.config?.job_title || "Interview"} &middot; {session.config?.interview_type || "Mixed"} Interview
          </p>
        </motion.div>

        <motion.div
          className="report-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <div className="report-category-scores">
            {categoryScores.map((cat) => (
              <div key={cat.label} className="report-category">
                <div className="report-category-label">{cat.label}</div>
                <div className="report-category-value" style={{ color: cat.color }}>{cat.value}%</div>
                <div className="report-category-bar">
                  <div className="report-category-bar-fill" style={{ width: `${cat.value}%`, background: cat.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="report-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <h3 style={{ color: "var(--color-success)" }}>
            <ShieldCheck size={18} />
            Strengths
          </h3>
          <ul className="report-list">
            {parseList(report?.strengths, generateFallbackStrengths()).map((s, i) => (
              <li key={i}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="report-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          <h3 style={{ color: "var(--color-warning)" }}>
            <AlertTriangle size={18} />
            Areas for Improvement
          </h3>
          <ul className="report-list">
            {parseList(report?.weaknesses, generateFallbackWeaknesses()).map((s, i) => (
              <li key={i} style={{ borderLeftColor: "var(--color-warning)" }}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="report-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
        >
          <h3 style={{ color: "var(--color-info)" }}>
            <Lightbulb size={18} />
            Recommendations
          </h3>
          <ul className="report-list">
            {parseList(report?.improvements, generateFallbackImprovements()).map((s, i) => (
              <li key={i} style={{ borderLeftColor: "var(--color-info)" }}>{s.replace(/^[-•]\s*/, "")}</li>
            ))}
          </ul>
        </motion.div>

        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", marginTop: "var(--space-8)" }}>
          <Link href="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          <Link href="/new-interview" className="btn btn-primary">Start New Interview</Link>
        </div>
      </div>
    </>
  );
}
