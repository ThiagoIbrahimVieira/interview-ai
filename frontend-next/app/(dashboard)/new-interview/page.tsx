"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
              <div className="input-group">
                <label htmlFor="job_title">Job Title</label>
                <input type="text" id="job_title" className="input" placeholder="e.g. Software Developer" required />
              </div>
              <div className="input-group">
                <label htmlFor="language">Language</label>
                <select id="language" className="input">
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese">Chinese</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="country">Country</label>
                <input type="text" id="country" className="input" placeholder="e.g. United States" />
              </div>
              <div className="input-group">
                <label htmlFor="experience_level">Experience Level</label>
                <select id="experience_level" className="input">
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level" selected>Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Specialist">Specialist</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="interview_type">Interview Type</label>
                <select id="interview_type" className="input">
                  <option value="Technical">Technical</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="HR">HR</option>
                  <option value="Mixed" selected>Mixed</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="company_style">Company Style</label>
                <select id="company_style" className="input">
                  <option value="Startup">Startup</option>
                  <option value="Big Tech" selected>Big Tech</option>
                  <option value="Bank">Bank</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Government">Government</option>
                  <option value="Retail">Retail</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="difficulty">Difficulty</label>
                <select id="difficulty" className="input">
                  <option value="Easy">Easy</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="duration_minutes">Duration (minutes)</label>
                <input type="number" id="duration_minutes" className="input" defaultValue={30} min={5} max={120} />
              </div>
              <div className="input-group full-width">
                <label htmlFor="custom_instructions">Custom Instructions (optional)</label>
                <textarea id="custom_instructions" className="input" rows={3} placeholder="Any specific instructions for the AI interviewer..."></textarea>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? (
                  <><span className="spinner"></span> Starting...</>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                  </svg>
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
