"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Globe, MapPin, Layers, Building2, Gauge, Timer, FileText, Play, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";

export default function NewInterviewPage() {
  const router = useRouter();
  const { setCurrentSession } = useStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const config = {
      job_title: (form.elements.namedItem("job_title") as HTMLInputElement).value.trim(),
      language: (form.elements.namedItem("language") as HTMLSelectElement).value,
      country: (form.elements.namedItem("country") as HTMLInputElement).value.trim() || null,
      experience_level: (form.elements.namedItem("experience_level") as HTMLSelectElement).value,
      interview_type: (form.elements.namedItem("interview_type") as HTMLSelectElement).value,
      company_style: (form.elements.namedItem("company_style") as HTMLSelectElement).value,
      difficulty: (form.elements.namedItem("difficulty") as HTMLSelectElement).value,
      duration_minutes: parseInt((form.elements.namedItem("duration_minutes") as HTMLInputElement).value),
      custom_instructions: (form.elements.namedItem("custom_instructions") as HTMLTextAreaElement).value.trim() || null,
    };

    try {
      const session = (await api.startInterview(config)) as Record<string, unknown>;
      setCurrentSession(session);
      router.push(`/interview/${session.id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to start interview");
      setLoading(false);
    }
  };

  const fields = [
    { name: "job_title", label: "Job Title", icon: Briefcase, type: "text", placeholder: "e.g. Software Developer", required: true },
    { name: "language", label: "Language", icon: Globe, type: "select", options: ["English", "Spanish", "Portuguese", "French", "German", "Japanese", "Chinese"] },
    { name: "country", label: "Country", icon: MapPin, type: "text", placeholder: "e.g. United States" },
    { name: "experience_level", label: "Experience Level", icon: Layers, type: "select", options: ["Junior", "Mid-Level", "Senior", "Specialist"], defaultValue: "Mid-Level" },
    { name: "interview_type", label: "Interview Type", icon: Building2, type: "select", options: ["Technical", "Behavioral", "HR", "Mixed"], defaultValue: "Mixed" },
    { name: "company_style", label: "Company Style", icon: Building2, type: "select", options: ["Startup", "Big Tech", "Bank", "Healthcare", "Government", "Retail", "Custom"], defaultValue: "Big Tech" },
    { name: "difficulty", label: "Difficulty", icon: Gauge, type: "select", options: ["Easy", "Medium", "Hard", "Expert"], defaultValue: "Medium" },
    { name: "duration_minutes", label: "Duration (minutes)", icon: Timer, type: "number", defaultValue: "30", min: "5", max: "120" },
  ];

  return (
    <>
      <header className="header">
        <Header title="New Interview" />
      </header>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">New Interview</h1>
          <p className="page-subtitle">Configure your interview session</p>
        </div>
        <div className="config-form card">
          <form onSubmit={handleSubmit}>
            <div className="config-grid">
              {fields.map((field, i) => (
                <motion.div
                  key={field.name}
                  className="input-group"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <label htmlFor={field.name} style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5, 0.375rem)" }}>
                    <field.icon size={14} style={{ color: "var(--color-text-tertiary)" }} />
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select id={field.name} className="input" defaultValue={field.defaultValue}>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      className="input"
                      placeholder={field.placeholder}
                      required={field.required}
                      defaultValue={field.defaultValue}
                      min={field.min}
                      max={field.max}
                    />
                  )}
                </motion.div>
              ))}
              <motion.div
                className="input-group full-width"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: fields.length * 0.04, duration: 0.25 }}
              >
                <label htmlFor="custom_instructions" style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5, 0.375rem)" }}>
                  <FileText size={14} style={{ color: "var(--color-text-tertiary)" }} />
                  Custom Instructions (optional)
                </label>
                <textarea id="custom_instructions" className="input" rows={3} placeholder="Any specific instructions for the AI interviewer..."></textarea>
              </motion.div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")}>
                <X size={16} />
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><Loader2 size={16} className="spin" /> Starting...</>
                ) : (
                  <Play size={16} />
                )}
                Start Interview
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
