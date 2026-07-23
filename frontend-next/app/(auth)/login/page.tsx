"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await api.login(email, password);
      const user = (await api.getMe()) as Record<string, unknown>;
      setUser(user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error.message || "Login failed";
      if (msg.includes("Network error") || msg.includes("Failed to fetch")) {
        toast.error("Cannot connect to server. Please try again later.");
      } else {
        toast.error(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-page grid-bg auth-glow">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="auth-logo">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <Play size={24} fill="var(--color-accent-primary)" color="var(--color-accent-primary)" />
          </div>
          <h1>InterviewAI</h1>
          <p>AI-powered interview training platform</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div className="input-with-icon">
              <input type="email" id="email" className="input input-icon-field" placeholder="you@example.com" required autoComplete="email" />
              <Mail size={16} className="input-icon" />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <input type="password" id="password" className="input input-icon-field" placeholder="Enter your password" required autoComplete="current-password" />
              <Lock size={16} className="input-icon" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "var(--space-2)" }} disabled={loading}>
            {loading ? <><Loader2 size={16} className="spin" /> Signing in...</> : "Sign In"}
          </button>
        </form>
        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </div>
      </motion.div>
    </div>
  );
}
