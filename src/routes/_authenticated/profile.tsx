import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, ArrowLeft, User, Save, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile, getMyStats } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NxtQR" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setCreatedAt(data.user?.created_at ?? null);
    });
  }, []);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getMyProfile(),
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => getMyStats(),
  });

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: { display_name: name.trim() } }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function updatePassword() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setPw(""); setPw2("");
    toast.success("Password updated");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-glow grid place-items-center shadow-brand">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">NxtQR</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your account details and security.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-glow/20 grid place-items-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{profile?.display_name || email || "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{email}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we address you?"
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
            <label className="block text-xs text-muted-foreground">Email
              <input
                value={email}
                disabled
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm opacity-60"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <button
              disabled={isLoading || save.isPending || !name.trim() || name.trim() === (profile?.display_name ?? "")}
              onClick={() => save.mutate()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-medium">Security</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Change your password. If you signed in with Google, setting a password enables email login too.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">New password
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
            <label className="block text-xs text-muted-foreground">Confirm password
              <input
                type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              disabled={savingPw || !pw || !pw2}
              onClick={updatePassword}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-sm hover:bg-accent disabled:opacity-60"
            >
              {savingPw ? "Updating…" : "Update password"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total QR codes" value={stats?.totalQrs ?? 0} />
          <StatCard label="Active" value={stats?.activeQrs ?? 0} />
          <StatCard label="Total scans" value={stats?.totalScans ?? 0} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Account</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Member since {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
            </div>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-destructive/10 hover:text-destructive transition"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-3xl font-display font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
