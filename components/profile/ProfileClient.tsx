"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

type Profile = {
  id: string;
  public_user_id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin" | "registrar";
  phone: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at?: string;
};

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile");
      const payload = (await res.json()) as { profile?: Profile; error?: string };
      if (!res.ok || !payload.profile) {
        throw new Error(payload.error ?? "Failed to load profile.");
      }
      setProfile(payload.profile);
      setName(payload.profile.name);
      setPhone(payload.profile.phone ?? "");
      setDepartmentId(payload.profile.department_id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          department_id: departmentId.trim() || null,
        }),
      });
      const payload = (await res.json()) as { profile?: Profile; error?: string };
      if (!res.ok || !payload.profile) {
        throw new Error(payload.error ?? "Failed to update profile.");
      }
      setProfile(payload.profile);
      setName(payload.profile.name);
      setPhone(payload.profile.phone ?? "");
      setDepartmentId(payload.profile.department_id ?? "");
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="My Profile"
        subtitle="Manage your basic identity details and reference user ID."
      />
      {loading ? <InlineAlert tone="info" message="Loading profile..." /> : null}
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      {profile ? (
        <form onSubmit={onSubmit} className="cp-card space-y-4 max-w-2xl">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="cp-label" htmlFor="profile-public-id">
                User ID
              </label>
              <input id="profile-public-id" value={profile.public_user_id} className="cp-input" readOnly />
            </div>
            <div>
              <label className="cp-label" htmlFor="profile-role">
                Role
              </label>
              <input id="profile-role" value={profile.role} className="cp-input capitalize" readOnly />
            </div>
          </div>

          <div>
            <label className="cp-label" htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="cp-input"
              required
            />
          </div>

          <div>
            <label className="cp-label" htmlFor="profile-email">
              Email
            </label>
            <input id="profile-email" value={profile.email} className="cp-input" readOnly />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="cp-label" htmlFor="profile-phone">
                Phone
              </label>
              <input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="cp-input"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="cp-label" htmlFor="profile-dept">
                Department code or ID
              </label>
              <input
                id="profile-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="cp-input"
                placeholder="CIS, EEE, 10, or MongoDB _id"
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="cp-btn-primary">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
