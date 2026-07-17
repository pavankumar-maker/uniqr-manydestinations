import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Plus, Trash2, Copy, ExternalLink, Power, PowerOff, BarChart3, LogOut, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listMyQrs, createQr, updateQr, deleteQr, getQrStats } from "@/lib/qr.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NxtQR" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Qr = Awaited<ReturnType<typeof listMyQrs>>[number];

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Qr | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const { data: qrs = [], isLoading } = useQuery({
    queryKey: ["qrs"],
    queryFn: () => listMyQrs(),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteQr({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["qrs"] });
      setSelected(null);
    },
  });

  const toggle = useMutation({
    mutationFn: (q: Qr) => updateQr({ data: { id: q.id, is_active: !q.is_active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qrs"] }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-glow grid place-items-center shadow-brand">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">NxtQR</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">{email}</span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-accent transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your QR codes</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage dynamic QR codes. Edit destinations anytime — the printed code never changes.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> New dynamic QR
          </button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : qrs.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {qrs.map((q) => {
              const shortUrl = `${origin}/r/${q.short_id}`;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{q.name}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{q.target_url}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
                        q.is_active
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {q.is_active ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="rounded-lg bg-white p-2">
                      <QRCodeSVG value={shortUrl} size={96} fgColor={q.fg_color} bgColor={q.bg_color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-2xl font-display font-semibold">{q.scan_count}</div>
                      <div className="text-xs text-muted-foreground">total scans</div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shortUrl);
                          toast.success("Short link copied");
                        }}
                        className="mt-2 text-xs text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <Copy className="w-3 h-3" /> {q.short_id}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setSelected(q)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-accent"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Analytics
                    </button>
                    <button
                      onClick={() => toggle.mutate(q)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-accent"
                      title={q.is_active ? "Pause" : "Activate"}
                    >
                      {q.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-accent"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => confirm(`Delete "${q.name}"?`) && del.mutate(q.id)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {selected && <StatsModal qr={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-glow/20 grid place-items-center">
        <QrCode className="w-7 h-7 text-primary" />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">Create your first dynamic QR</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
        Dynamic QR codes let you change the destination and track every scan without reprinting.
      </p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand"
      >
        <Plus className="w-4 h-4" /> New dynamic QR
      </button>
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [fg, setFg] = useState("#0B0B12");
  const [bg, setBg] = useState("#FFFFFF");

  const create = useMutation({
    mutationFn: () =>
      createQr({ data: { name, target_url: url, fg_color: fg, bg_color: bg } }),
    onSuccess: () => {
      toast.success("QR created");
      qc.invalidateQueries({ queryKey: ["qrs"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">New dynamic QR</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-muted-foreground">Name
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Campaign — Fall menu"
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          </label>
          <label className="block text-xs text-muted-foreground">Destination URL
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/menu"
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted-foreground">Foreground
              <input type="color" value={fg} onChange={(e) => setFg(e.target.value.toUpperCase())}
                className="mt-1 w-full h-10 rounded-lg bg-background border border-border" />
            </label>
            <label className="block text-xs text-muted-foreground">Background
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value.toUpperCase())}
                className="mt-1 w-full h-10 rounded-lg bg-background border border-border" />
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">Cancel</button>
          <button
            disabled={create.isPending || !name || !url.startsWith("http")}
            onClick={() => create.mutate()}
            className="h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create QR"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsModal({ qr, onClose }: { qr: Qr; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", qr.id],
    queryFn: () => getQrStats({ data: { id: qr.id } }),
  });

  const byDevice = (data?.events ?? []).reduce<Record<string, number>>((acc, e) => {
    const k = e.device ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const byDay = (data?.events ?? []).reduce<Record<string, number>>((acc, e) => {
    const d = new Date(e.scanned_at).toISOString().slice(0, 10);
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const max = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display text-xl font-semibold truncate">{qr.name}</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">{qr.target_url}</p>

        {isLoading ? (
          <div className="mt-6 text-sm text-muted-foreground">Loading analytics…</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Total scans" value={data?.qr.scan_count ?? 0} />
              <Stat label="Devices tracked" value={Object.keys(byDevice).length} />
              <Stat label="Last 500 events" value={(data?.events ?? []).length} />
            </div>

            <h3 className="mt-6 text-sm font-medium">Scans (last 14 days)</h3>
            <div className="mt-3 flex items-end gap-1 h-32">
              {days.length === 0 && <div className="text-xs text-muted-foreground">No scans yet.</div>}
              {days.map(([d, v]) => (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-glow" style={{ height: `${(v / max) * 100}%` }} />
                  <div className="text-[9px] text-muted-foreground">{d.slice(5)}</div>
                </div>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-medium">By device</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(byDevice).map(([k, v]) => (
                <span key={k} className="text-xs px-2.5 py-1 rounded-full bg-muted">{k}: {v}</span>
              ))}
              {Object.keys(byDevice).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
            </div>

            <h3 className="mt-6 text-sm font-medium">Recent scans</h3>
            <div className="mt-2 divide-y divide-border rounded-lg border border-border max-h-56 overflow-auto">
              {(data?.events ?? []).slice(0, 25).map((e, i) => (
                <div key={i} className="px-3 py-2 text-xs flex justify-between gap-3">
                  <span className="text-muted-foreground">{new Date(e.scanned_at).toLocaleString()}</span>
                  <span className="truncate">{e.device ?? "—"}</span>
                </div>
              ))}
              {(data?.events ?? []).length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground">No scans recorded yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-2xl font-display font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
