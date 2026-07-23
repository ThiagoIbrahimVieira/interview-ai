"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, AlertTriangle, LogOut, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    job_title: "",
    country: "",
    experience_level: "",
    bio: "",
  });

  useEffect(() => {
    api
      .getProfile()
      .then((data) => {
        const p = data as Record<string, string>;
        setProfile({
          job_title: p.job_title || "",
          country: p.country || "",
          experience_level: p.experience_level || "",
          bio: p.bio || "",
        });
      })
      .catch(() => {});
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        full_name: (e.currentTarget.elements.namedItem("full_name") as HTMLInputElement).value.trim(),
        job_title: profile.job_title || null,
        country: profile.country || null,
        experience_level: profile.experience_level || null,
        bio: profile.bio || null,
      });
      const updatedUser = (await api.getMe()) as Record<string, unknown>;
      setUser(updatedUser);
      toast.success("Profile updated!");
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentPw = (e.currentTarget.elements.namedItem("current_password") as HTMLInputElement).value;
    const newPw = (e.currentTarget.elements.namedItem("new_password") as HTMLInputElement).value;

    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      await api.put("/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      toast.success("Password updated!");
      (e.currentTarget.elements.namedItem("current_password") as HTMLInputElement).value = "";
      (e.currentTarget.elements.namedItem("new_password") as HTMLInputElement).value = "";
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to change password");
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <>
      <header className="header">
        <Header title="Profile" />
      </header>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
        <div style={{ display: "grid", gap: "var(--space-6)", maxWidth: "min(560px, 100%)" }}>
          <div className="card">
            <h3 style={{ marginBottom: "var(--space-5)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-lg)" }}>
              <User size={18} style={{ color: "var(--color-accent-primary)" }} />
              Account Information
            </h3>
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: "grid", gap: "var(--space-4)" }}>
                <div className="input-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input id="full_name" type="text" className="input" name="full_name" defaultValue={(user?.full_name as string) || ""} placeholder="Your name" />
                </div>
                <div className="input-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" className="input" value={(user?.email as string) || ""} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
                </div>
                <div className="input-group">
                  <label htmlFor="job_title">Job Title</label>
                  <input id="job_title" type="text" className="input" value={profile.job_title} onChange={(e) => setProfile({ ...profile, job_title: e.target.value })} placeholder="e.g. Software Developer" />
                </div>
                <div className="input-group">
                  <label htmlFor="country">Country</label>
                  <input id="country" type="text" className="input" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="e.g. United States" />
                </div>
                <div className="input-group">
                  <label htmlFor="experience_level">Experience Level</label>
                  <select id="experience_level" className="input" value={profile.experience_level} onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}>
                    <option value="">Select level</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Specialist">Specialist</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea id="bio" className="input" rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about yourself..."></textarea>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-5)" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "var(--space-5)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-lg)" }}>
              <Lock size={18} style={{ color: "var(--color-accent-primary)" }} />
              Change Password
            </h3>
            <form onSubmit={handlePasswordSubmit}>
              <div style={{ display: "grid", gap: "var(--space-4)" }}>
                <div className="input-group">
                  <label htmlFor="current_password">Current Password</label>
                  <input id="current_password" type="password" className="input" name="current_password" placeholder="Enter current password" />
                </div>
                <div className="input-group">
                  <label htmlFor="new_password">New Password</label>
                  <input id="new_password" type="password" className="input" name="new_password" placeholder="Min 8 characters" minLength={8} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-5)" }}>
                <button type="submit" className="btn btn-secondary">Update Password</button>
              </div>
            </form>
          </div>

          <div className="card" style={{ borderColor: "var(--color-error-muted)" }}>
            <h3 style={{ marginBottom: "var(--space-2)", color: "var(--color-error)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-lg)" }}>
              <AlertTriangle size={18} />
              Danger Zone
            </h3>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
              These actions are irreversible.
            </p>
            <button className="btn btn-ghost" onClick={handleSignOut} style={{ color: "var(--color-error)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
