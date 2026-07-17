import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import {
  QrCode, Plus, Trash2, Copy, ExternalLink, Power, PowerOff, BarChart3, LogOut,
  ArrowLeft, Route as RouteIcon, Pencil, Check, X, Search, Download, Upload, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  listMyQrs, createQr, updateQr, deleteQr, getQrStats,
  listDestinations, addDestination, updateDestination, deleteDestination,
} from "@/lib/qr.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NxtQR" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Qr = Awaited<ReturnType<typeof listMyQrs>>[number];
type Destination = Awaited<ReturnType<typeof listDestinations>>[number];

const ROUTING_MODES: { value: Qr["routing_mode"]; label: string; hint: string }[] = [
  { value: "single", label: "Single destination", hint: "Redirect all scans to the default URL." },
  { value: "hub", label: "Multi-link hub", hint: "Show a landing page with all destinations as buttons (Website, WhatsApp, Facebook, etc.)." },
  { value: "rotation", label: "Round-robin", hint: "Cycle through destinations in order." },
  { value: "weighted", label: "Weighted A/B", hint: "Random split by weight." },
  { value: "device", label: "By device", hint: "Route by mobile / tablet / desktop." },
  { value: "priority", label: "By priority", hint: "Highest-priority active destination wins." },
];

const LINK_TYPE_OPTIONS = [
  "link", "website", "whatsapp", "facebook", "instagram", "twitter", "youtube",
  "linkedin", "tiktok", "telegram", "email", "phone", "maps", "upi", "file",
] as const;

function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statsFor, setStatsFor] = useState<Qr | null>(null);
  const [destsFor, setDestsFor] = useState<Qr | null>(null);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "link" | "file">("all");

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
    },
  });

  const toggle = useMutation({
    mutationFn: (q: Qr) => updateQr({ data: { id: q.id, is_active: !q.is_active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qrs"] }),
  });

  const setMode = useMutation({
    mutationFn: (v: { id: string; routing_mode: Qr["routing_mode"] }) =>
      updateQr({ data: v }),
    onSuccess: () => {
      toast.success("Routing updated");
      qc.invalidateQueries({ queryKey: ["qrs"] });
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-glow grid place-items-center shadow-brand" aria-hidden>
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold truncate">NxtQR</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline truncate">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[16ch]">{email}</span>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
            >
              Profile
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
            >
              <LogOut className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>



      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your QR codes</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              One QR, many destinations. Route by weight, device, priority, or round-robin — edit anytime.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setUploading(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition"
            >
              <Upload className="w-4 h-4" /> Upload file QR
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> New dynamic QR
            </button>
          </div>
        </div>

        {/* Search & filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, URL, or short id…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 px-3 rounded-lg bg-card border border-border text-sm"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="h-10 px-3 rounded-lg bg-card border border-border text-sm"
          >
            <option value="all">All types</option>
            <option value="link">Links</option>
            <option value="file">Files</option>
          </select>
        </div>

        {(() => {
          const term = search.trim().toLowerCase();
          const filtered = qrs.filter((q) => {
            if (statusFilter === "active" && !q.is_active) return false;
            if (statusFilter === "paused" && q.is_active) return false;
            const isFile = !!q.file_path;
            if (typeFilter === "file" && !isFile) return false;
            if (typeFilter === "link" && isFile) return false;
            if (!term) return true;
            return (
              q.name.toLowerCase().includes(term) ||
              (q.target_url ?? "").toLowerCase().includes(term) ||
              q.short_id.toLowerCase().includes(term)
            );
          });
          if (isLoading) return <div className="text-muted-foreground text-sm">Loading…</div>;
          if (qrs.length === 0) return <EmptyState onCreate={() => setCreating(true)} />;
          if (filtered.length === 0)
            return (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No QR codes match your filters.
              </div>
            );
          return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((q) => {
              const shortUrl = `${origin}/r/${q.short_id}`;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate flex items-center gap-1.5">
                        {q.file_path && <FileText className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {q.name}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {q.file_path ? (q.file_name ?? "Uploaded file") : q.target_url}
                      </p>
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

                  <label className="mt-4 block text-[10px] uppercase tracking-wide text-muted-foreground">
                    Routing mode
                  </label>
                  <select
                    value={q.routing_mode ?? "single"}
                    onChange={(e) =>
                      setMode.mutate({ id: q.id, routing_mode: e.target.value as Qr["routing_mode"] })
                    }
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-background border border-border text-xs"
                  >
                    {ROUTING_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setDestsFor(q)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-accent"
                    >
                      <RouteIcon className="w-3.5 h-3.5" /> Routes
                    </button>
                    <button
                      onClick={() => setStatsFor(q)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-accent"
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> Stats
                    </button>
                    <DownloadMenu qr={q} shortUrl={shortUrl} />
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => toggle.mutate(q)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-accent"
                    >
                      {q.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      {q.is_active ? "Pause" : "Activate"}
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
          );
        })()}
      </main>

      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {uploading && <UploadFileModal onClose={() => setUploading(false)} />}
      {statsFor && <StatsModal qr={statsFor} onClose={() => setStatsFor(null)} />}
      {destsFor && <DestinationsModal qr={destsFor} onClose={() => setDestsFor(null)} />}
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
        One QR that can redirect to many destinations — by weight, device, priority, or rotation.
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
        <p className="text-xs text-muted-foreground mt-1">
          You can add more destinations and pick a routing mode after creating it.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-muted-foreground">Name
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Campaign — Fall menu"
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          </label>
          <label className="block text-xs text-muted-foreground">Default destination URL
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

function DestinationsModal({ qr, onClose }: { qr: Qr; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: dests = [], isLoading } = useQuery({
    queryKey: ["dests", qr.id],
    queryFn: () => listDestinations({ data: { qr_id: qr.id } }),
  });

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("https://");
  const [weight, setWeight] = useState(1);
  const [device, setDevice] = useState<Destination["device_filter"]>("any");
  const [priority, setPriority] = useState(0);
  const [linkType, setLinkType] = useState<(typeof LINK_TYPE_OPTIONS)[number]>("website");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dests", qr.id] });

  const add = useMutation({
    mutationFn: () =>
      addDestination({
        data: { qr_id: qr.id, label, target_url: url, weight, device_filter: device, priority, link_type: linkType },
      }),
    onSuccess: () => {
      toast.success("Destination added");
      invalidate();
      setLabel(""); setUrl("https://"); setWeight(1); setDevice("any"); setPriority(0); setLinkType("website");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDestination({ data: { id } }),
    onSuccess: () => invalidate(),
  });

  const toggleActive = useMutation({
    mutationFn: (d: Destination) => updateDestination({ data: { id: d.id, is_active: !d.is_active } }),
    onSuccess: () => invalidate(),
  });

  const mode = qr.routing_mode ?? "single";
  const hint = ROUTING_MODES.find((m) => m.value === mode)?.hint ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display text-xl font-semibold truncate">{qr.name} — destinations</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Mode: <span className="text-foreground font-medium">{mode}</span> — {hint}
        </p>

        <div className="mt-5 rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium">Add destination</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">Link type (hub icon)
              <select value={linkType} onChange={(e) => setLinkType(e.target.value as typeof linkType)}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm capitalize">
                {LINK_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">Label (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="Follow us on Instagram"
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
            </label>
            <label className="block text-xs text-muted-foreground sm:col-span-2">URL
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/a"
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
            </label>
            <label className="block text-xs text-muted-foreground">Weight (weighted mode)
              <input type="number" min={1} max={100} value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || 1)}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
            </label>
            <label className="block text-xs text-muted-foreground">Priority (priority mode)
              <input type="number" min={0} max={1000} value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 0)}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
            </label>
            <label className="block text-xs text-muted-foreground sm:col-span-2">Device (device mode)
              <select value={device}
                onChange={(e) => setDevice(e.target.value as Destination["device_filter"])}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm">
                <option value="any">Any</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              disabled={add.isPending || !url.startsWith("http")}
              onClick={() => add.mutate()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-medium">
          Destinations {dests.length > 0 && <span className="text-muted-foreground">({dests.length})</span>}
        </h3>
        {isLoading ? (
          <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
        ) : dests.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No extra destinations yet. Scans fall back to the QR's default URL.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {dests.map((d) => (
              <DestRow
                key={d.id}
                d={d}
                onToggle={() => toggleActive.mutate(d)}
                onDelete={() => remove.mutate(d.id)}
                onSaved={invalidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DestRow({
  d, onToggle, onDelete, onSaved,
}: {
  d: Destination;
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(d.label);
  const [url, setUrl] = useState(d.target_url);
  const [weight, setWeight] = useState(d.weight);
  const [priority, setPriority] = useState(d.priority);
  const [device, setDevice] = useState<Destination["device_filter"]>(d.device_filter);

  const save = useMutation({
    mutationFn: () =>
      updateDestination({
        data: { id: d.id, label, target_url: url, weight, priority, device_filter: device },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(false);
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (editing) {
    return (
      <div className="p-3 grid gap-2 sm:grid-cols-6 items-center">
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          className="sm:col-span-2 h-8 px-2 rounded-md bg-background border border-border text-xs" />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          className="sm:col-span-4 h-8 px-2 rounded-md bg-background border border-border text-xs" />
        <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value) || 1)}
          className="h-8 px-2 rounded-md bg-background border border-border text-xs" title="Weight" />
        <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)}
          className="h-8 px-2 rounded-md bg-background border border-border text-xs" title="Priority" />
        <select value={device}
          onChange={(e) => setDevice(e.target.value as Destination["device_filter"])}
          className="sm:col-span-2 h-8 px-2 rounded-md bg-background border border-border text-xs">
          <option value="any">Any</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md border border-border text-xs">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button disabled={save.isPending} onClick={() => save.mutate()}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md bg-glow text-primary-foreground text-xs">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">
          {d.label || <span className="text-muted-foreground">Untitled</span>}
          <span className="ml-2 text-[10px] uppercase text-muted-foreground">
            w:{d.weight} · p:{d.priority} · {d.device_filter}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{d.target_url}</div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
        d.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
      }`}>{d.is_active ? "on" : "off"}</span>
      <button onClick={onToggle} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent" title="Toggle">
        {d.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => setEditing(true)} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent" title="Edit">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-destructive/10 hover:text-destructive" title="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
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
              <Stat label="Destinations" value={(data?.destinations ?? []).length} />
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

function Stat({ label, value }: { label: string | number; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-2xl font-display font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DownloadMenu({ qr, shortUrl }: { qr: Qr; shortUrl: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function png() {
    const dataUrl = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: "H", margin: 2, width: 1024,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    trigger(dataUrl, `${qr.name || "qr"}.png`);
    setOpen(false);
  }
  async function svg() {
    const s = await QRCode.toString(shortUrl, {
      type: "svg", errorCorrectionLevel: "H", margin: 2,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    trigger(url, `${qr.name || "qr"}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  }
  async function pdf() {
    const dataUrl = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: "H", margin: 2, width: 1024,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const size = 320;
    doc.setFontSize(18);
    doc.text(qr.name || "NxtQR", pageW / 2, 60, { align: "center" });
    doc.addImage(dataUrl, "PNG", (pageW - size) / 2, 100, size, size);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(shortUrl, pageW / 2, 100 + size + 30, { align: "center" });
    doc.save(`${qr.name || "qr"}.pdf`);
    setOpen(false);
  }
  function trigger(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-accent"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <button onClick={png} className="w-full text-left px-3 py-2 text-xs hover:bg-accent">PNG</button>
          <button onClick={svg} className="w-full text-left px-3 py-2 text-xs hover:bg-accent">SVG</button>
          <button onClick={pdf} className="w-full text-left px-3 py-2 text-xs hover:bg-accent">PDF</button>
        </div>
      )}
    </div>
  );
}

function UploadFileModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file || !name.trim()) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25 MB limit");
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const clean = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const path = `${uid}/${crypto.randomUUID()}-${clean}`;
      const { error: upErr } = await supabase.storage.from("qr-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);
      await createQr({
        data: {
          name: name.trim(),
          file_path: path,
          file_mime: file.type || "application/octet-stream",
          file_name: file.name,
        },
      });
      toast.success("File QR created");
      qc.invalidateQueries({ queryKey: ["qrs"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Upload file QR</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Upload a PDF, image, or video (up to 25 MB). Scanning the QR opens the file via a secure link.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-muted-foreground">Name
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Menu — Fall 2026"
              className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm" />
          </label>
          <label className="block text-xs text-muted-foreground">File
            <input
              type="file"
              accept="application/pdf,image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-xs file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </label>
          {file && (
            <div className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-2 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">Cancel</button>
          <button
            disabled={busy || !file || !name.trim()}
            onClick={submit}
            className="h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Create QR"}
          </button>
        </div>
      </div>
    </div>
  );
}
