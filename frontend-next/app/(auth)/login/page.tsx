"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

    setLoading(true);
    try {
      await api.login(email, password);
      const user = (await api.getMe()) as Record<string, unknown>;
      setUser(user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in-up">
        <div className="auth-logo">
          <h1>InterviewAI</h1>
          <p>AI-powered interview training platform</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" className="input" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" className="input" placeholder="Enter your password" required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
            {loading ? <><span className="spinner"></span> Signing in...</> : "Sign In"}
          </button>
        </form>
        <div className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
