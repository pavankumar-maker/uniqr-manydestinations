import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import {
  QrCode, Plus, Trash2, Copy, ExternalLink, Power, PowerOff, BarChart3, LogOut,
  ArrowLeft, Route as RouteIcon, Pencil, Check, X, Search, Download, Upload, FileText, MapPin, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listMyQrs, createQr, updateQr, deleteQr, getQrStats,
  listDestinations, addDestination, updateDestination, deleteDestination,
} from "@/lib/qr.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UniQR" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

type Qr = Awaited<ReturnType<typeof listMyQrs>>[number];
type Destination = Awaited<ReturnType<typeof listDestinations>>[number];

const ROUTING_MODES: { value: Qr["routing_mode"]; label: string; hint: string }[] = [
  { value: "single", label: "Single destination", hint: "Redirect all scans to the default URL." },
  { value: "hub", label: "Multi-link hub", hint: "Show a branded page with all destinations." },
  { value: "rotation", label: "Round-robin", hint: "Cycle through destinations in order." },
  { value: "weighted", label: "Weighted A/B", hint: "Random split by weight." },
  { value: "device", label: "By device", hint: "Route by mobile / tablet / desktop." },
  { value: "priority", label: "By priority", hint: "Highest-priority active destination wins." },
];

const LINK_TYPE_OPTIONS = [
  "link", "website", "whatsapp", "facebook", "instagram", "twitter", "youtube",
  "linkedin", "tiktok", "telegram", "email", "phone", "maps", "upi",
  "image", "video", "pdf", "file",
] as const;

type LinkType = (typeof LINK_TYPE_OPTIONS)[number];

const INPUT_META: Record<LinkType, { label: string; placeholder: string; help?: string; inputMode?: "text" | "tel" | "email" | "url" | "numeric"; upload?: "image" | "video" | "pdf" | "any" }> = {
  link:      { label: "URL",             placeholder: "https://example.com",         inputMode: "url" },
  website:   { label: "Website URL",     placeholder: "https://example.com",         inputMode: "url" },
  whatsapp:  { label: "WhatsApp number", placeholder: "+91 98765 43210",             help: "Include country code. We'll open a WhatsApp chat.", inputMode: "tel" },
  facebook:  { label: "Facebook URL / username", placeholder: "yourpage or https://facebook.com/yourpage" },
  instagram: { label: "Instagram username / URL", placeholder: "@yourhandle" },
  twitter:   { label: "X / Twitter username or URL", placeholder: "@yourhandle" },
  youtube:   { label: "YouTube URL",     placeholder: "https://youtube.com/@channel", inputMode: "url" },
  linkedin:  { label: "LinkedIn URL",    placeholder: "https://linkedin.com/in/you", inputMode: "url" },
  tiktok:    { label: "TikTok username / URL", placeholder: "@yourhandle" },
  telegram:  { label: "Telegram username / URL", placeholder: "@yourhandle" },
  email:     { label: "Email address",   placeholder: "you@example.com",             inputMode: "email" },
  phone:     { label: "Phone number",    placeholder: "+91 98765 43210",             inputMode: "tel" },
  maps:      { label: "Address or Google Maps URL", placeholder: "221B Baker Street, London" },
  upi:       { label: "UPI ID",          placeholder: "yourname@upi",                help: "Opens the user's UPI app to pay you." },
  image:     { label: "Image URL",       placeholder: "https://…/photo.jpg",         help: "Paste a URL or upload below.", inputMode: "url", upload: "image" },
  video:     { label: "Video URL",       placeholder: "https://…/clip.mp4",          help: "Paste a URL or upload below.", inputMode: "url", upload: "video" },
  pdf:       { label: "PDF URL",         placeholder: "https://…/document.pdf",      help: "Paste a URL or upload below.", inputMode: "url", upload: "pdf" },
  file:      { label: "File URL",        placeholder: "https://…/file",              help: "Any file. Paste a URL or upload below.", inputMode: "url", upload: "any" },
};

function digits(v: string) { return v.replace(/[^\d]/g, ""); }
function ensureHttps(v: string) {
  const t = v.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
function isValidUrl(v: string) { try { new URL(v); return true; } catch { return false; } }
function stripAt(v: string) { return v.trim().replace(/^@+/, ""); }

type Extras = { message?: string; subject?: string; body?: string; amount?: string; note?: string };

function buildUrl(type: LinkType, raw: string, extras: Extras = {}): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (type) {
    case "whatsapp": {
      const d = digits(v);
      if (d.length < 6) return null;
      const msg = extras.message?.trim();
      return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
    }
    case "phone": {
      const d = digits(v);
      return d.length >= 4 ? `tel:${v.startsWith("+") ? "+" : ""}${d}` : null;
    }
    case "email": {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
      const params = new URLSearchParams();
      if (extras.subject?.trim()) params.set("subject", extras.subject.trim());
      if (extras.body?.trim()) params.set("body", extras.body.trim());
      const q = params.toString();
      return `mailto:${v}${q ? `?${q}` : ""}`;
    }
    case "upi": {
      if (!/^[\w.\-]+@[\w.\-]+$/.test(v)) return null;
      const params = new URLSearchParams({ pa: v });
      if (extras.note?.trim()) params.set("tn", extras.note.trim());
      if (extras.amount?.trim() && !isNaN(Number(extras.amount))) params.set("am", extras.amount.trim());
      params.set("cu", "INR");
      return `upi://pay?${params.toString()}`;
    }
    case "instagram": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://instagram.com/${stripAt(v)}`;
    }
    case "twitter": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://x.com/${stripAt(v)}`;
    }
    case "tiktok": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://tiktok.com/@${stripAt(v)}`;
    }
    case "telegram": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://t.me/${stripAt(v)}`;
    }
    case "facebook": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://facebook.com/${stripAt(v)}`;
    }
    case "maps": {
      if (/^https?:\/\//i.test(v)) return isValidUrl(v) ? v : null;
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
    }
    default: {
      const u = ensureHttps(v);
      return isValidUrl(u) ? u : null;
    }
  }
}

const PUBLISHED_QR_ORIGIN = "https://doc-to-pro-hub.lovable.app";

function getPublicQrOrigin() {
  if (typeof window === "undefined") return PUBLISHED_QR_ORIGIN;
  const { origin, hostname } = window.location;
  if (hostname === "localhost" || hostname.endsWith(".lovableproject.com") || hostname.includes("preview--")) {
    return PUBLISHED_QR_ORIGIN;
  }
  return origin;
}

function getQrScanValue(q: Qr, shortUrl: string) {
  const mode = q.routing_mode ?? "single";
  if (mode === "single" && q.target_url && !q.file_path) return q.target_url;
  return shortUrl;
}



function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [staticOpen, setStaticOpen] = useState(false);
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


  const origin = getPublicQrOrigin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-glow grid place-items-center shadow-brand" aria-hidden>
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold truncate">UniQR</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline truncate">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
            >
              Profile
            </Link>
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setUploading(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition"
            >
              <Plus className="w-4 h-4" /> Upload file QR
            </button>
            <button
              onClick={() => setStaticOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition"
            >
              <QrCode className="w-4 h-4" /> Static QR
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
              const scanValue = getQrScanValue(q, shortUrl);
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
                      <QRCodeSVG value={scanValue} size={96} fgColor={q.fg_color} bgColor={q.bg_color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-2xl font-display font-semibold">{q.scan_count}</div>
                      <div className="text-xs text-muted-foreground">total scans</div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(scanValue);
                          toast.success("QR link copied");
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
                    <DownloadMenu qr={q} shortUrl={shortUrl} scanValue={scanValue} />
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
                      href={scanValue}
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
      {staticOpen && <StaticQrModal onClose={() => setStaticOpen(false)} />}
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
  const [url, setUrl] = useState("");
  const [weight, setWeight] = useState(1);
  const [device, setDevice] = useState<Destination["device_filter"]>("any");
  const [priority, setPriority] = useState(0);
  const [linkType, setLinkType] = useState<LinkType>("website");
  const [extras, setExtras] = useState<Extras>({});

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dests", qr.id] });

  const meta = INPUT_META[linkType];
  const builtUrl = buildUrl(linkType, url, extras);
  const canAdd = !!builtUrl;

  const mode = qr.routing_mode ?? "single";
  const hint = ROUTING_MODES.find((m) => m.value === mode)?.hint ?? "";
  const showWeight = mode === "weighted";
  const showPriority = mode === "priority";
  const showDevice = mode === "device";

  const resetForm = () => {
    setLabel(""); setUrl(""); setWeight(1); setDevice("any"); setPriority(0);
    setLinkType("website"); setExtras({});
  };

  const add = useMutation({
    mutationFn: () =>
      addDestination({
        data: { qr_id: qr.id, label, target_url: builtUrl!, weight, device_filter: device, priority, link_type: linkType },
      }),
    onSuccess: () => { toast.success("Destination added"); invalidate(); resetForm(); },
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

          {/* Type picker as chips */}
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1.5">Link type</div>
            <div className="flex flex-wrap gap-1.5">
              {LINK_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setLinkType(t); setUrl(""); setExtras({}); }}
                  className={`h-7 px-3 rounded-full border text-xs capitalize transition ${
                    linkType === t
                      ? "bg-glow text-primary-foreground border-transparent"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground sm:col-span-2">{meta.label}
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                inputMode={meta.inputMode}
                placeholder={meta.placeholder}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
              {linkType === "maps" && (
                <LocateButton onLocate={(v) => setUrl(v)} />
              )}
              {meta.upload && (
                <FileUploader accept={meta.upload} onUploaded={(u) => setUrl(u)} />
              )}
              {meta.help && <span className="mt-1 block text-[11px] text-muted-foreground">{meta.help}</span>}
              {url && !canAdd && (
                <span className="mt-1 block text-[11px] text-destructive">Enter a valid {meta.label.toLowerCase()}.</span>
              )}
            </label>



            {/* Type-specific extras */}
            {linkType === "whatsapp" && (
              <label className="block text-xs text-muted-foreground sm:col-span-2">Pre-filled message (optional)
                <input maxLength={500} value={extras.message ?? ""} onChange={(e) => setExtras({ ...extras, message: e.target.value })}
                  placeholder="Hi! I saw your QR and…"
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
              </label>
            )}
            {linkType === "email" && (
              <>
                <label className="block text-xs text-muted-foreground">Subject (optional)
                  <input maxLength={150} value={extras.subject ?? ""} onChange={(e) => setExtras({ ...extras, subject: e.target.value })}
                    placeholder="Enquiry from QR"
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
                </label>
                <label className="block text-xs text-muted-foreground">Body (optional)
                  <input maxLength={500} value={extras.body ?? ""} onChange={(e) => setExtras({ ...extras, body: e.target.value })}
                    placeholder="Hi, I'd like to know more about…"
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
                </label>
              </>
            )}
            {linkType === "upi" && (
              <>
                <label className="block text-xs text-muted-foreground">Amount ₹ (optional)
                  <input inputMode="decimal" value={extras.amount ?? ""} onChange={(e) => setExtras({ ...extras, amount: e.target.value.replace(/[^\d.]/g, "") })}
                    placeholder="199"
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
                </label>
                <label className="block text-xs text-muted-foreground">Note (optional)
                  <input maxLength={80} value={extras.note ?? ""} onChange={(e) => setExtras({ ...extras, note: e.target.value })}
                    placeholder="Order #1234"
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
                </label>
              </>
            )}

            <label className="block text-xs text-muted-foreground sm:col-span-2">Button label (optional)
              <input value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder={`e.g. ${linkType === "whatsapp" ? "Chat on WhatsApp" : linkType === "upi" ? "Pay via UPI" : "Open"}`}
                className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
            </label>

            {/* Routing-mode-specific fields */}
            {showWeight && (
              <label className="block text-xs text-muted-foreground">Weight
                <input type="number" min={1} max={100} value={weight}
                  onChange={(e) => setWeight(Number(e.target.value) || 1)}
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
              </label>
            )}
            {showPriority && (
              <label className="block text-xs text-muted-foreground">Priority
                <input type="number" min={0} max={1000} value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm" />
              </label>
            )}
            {showDevice && (
              <label className="block text-xs text-muted-foreground sm:col-span-2">Device
                <select value={device}
                  onChange={(e) => setDevice(e.target.value as Destination["device_filter"])}
                  className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border text-sm">
                  <option value="any">Any</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                  <option value="desktop">Desktop</option>
                </select>
              </label>
            )}
          </div>

          {builtUrl && (
            <div className="mt-3 text-[11px] text-muted-foreground truncate">
              Preview: <span className="text-foreground">{builtUrl}</span>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              disabled={add.isPending || !canAdd}
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

function DownloadMenu({ qr, shortUrl, scanValue }: { qr: Qr; shortUrl: string; scanValue: string }) {
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
    const dataUrl = await QRCode.toDataURL(scanValue, {
      errorCorrectionLevel: "H", margin: 2, width: 1024,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    trigger(dataUrl, `${qr.name || "qr"}.png`);
    setOpen(false);
  }
  async function svg() {
    const s = await QRCode.toString(scanValue, {
      type: "svg", errorCorrectionLevel: "H", margin: 2,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    trigger(url, `${qr.name || "qr"}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  }
  async function pdf() {
    const dataUrl = await QRCode.toDataURL(scanValue, {
      errorCorrectionLevel: "H", margin: 2, width: 1024,
      color: { dark: qr.fg_color, light: qr.bg_color },
    });
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const size = 320;
    doc.setFontSize(18);
    doc.text(qr.name || "UniQR", pageW / 2, 60, { align: "center" });
    doc.addImage(dataUrl, "PNG", (pageW - size) / 2, 100, size, size);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(scanValue, pageW / 2, 100 + size + 30, { align: "center" });
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

function LocateButton({ onLocate }: { onLocate: (v: string) => void }) {
  const [loading, setLoading] = useState(false);
  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const j = (await res.json()) as { display_name?: string };
            onLocate(j.display_name?.trim() || coords);
            toast.success("Current location filled");
            setLoading(false);
            return;
          }

        } catch { /* fall through */ }
        onLocate(coords);
        toast.success("Location coordinates filled");
        setLoading(false);
      },

      (err) => {
        toast.error(err.code === err.PERMISSION_DENIED ? "Location permission denied" : "Couldn't get location");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
    // ensure spinner clears after callback resolves
    setTimeout(() => setLoading(false), 12000);
  };
  return (
    <button
      type="button"
      onClick={locate}
      disabled={loading}
      className="mt-1.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
      Use my current location
    </button>
  );
}

const ACCEPT_MAP: Record<"image" | "video" | "pdf" | "any", string> = {
  image: "image/*",
  video: "video/*",
  pdf: "application/pdf",
  any: "*/*",
};
const MAX_MB: Record<"image" | "video" | "pdf" | "any", number> = {
  image: 15,
  video: 100,
  pdf: 25,
  any: 50,
};

function FileUploader({ accept, onUploaded }: { accept: "image" | "video" | "pdf" | "any"; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const maxMb = MAX_MB[accept];
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Max ${maxMb} MB`);
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("qr-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const publicUrl = `${PUBLISHED_QR_ORIGIN}/api/public/file/${path}`;
      onUploaded(publicUrl);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1.5">
      <input ref={inputRef} type="file" accept={ACCEPT_MAP[accept]} className="hidden" onChange={onPick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? "Uploading…" : `Upload ${accept === "any" ? "file" : accept} (max ${MAX_MB[accept]} MB)`}
      </button>
    </div>
  );
}

type StaticKind = "url" | "text" | "wifi" | "vcard" | "email" | "phone" | "sms" | "upi" | "whatsapp" | "maps" | "image" | "video" | "pdf" | "links";
type LinkItem = { label: string; url: string; type: string };

function b64urlEncode(s: string) {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function StaticQrModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<StaticKind>("url");
  const [fg, setFg] = useState("#0B0B12");
  const [bg, setBg] = useState("#FFFFFF");
  const [size, setSize] = useState(512);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // per-kind state
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", enc: "WPA" as "WPA" | "WEP" | "nopass", hidden: false });
  const [vcard, setVcard] = useState({ name: "", org: "", title: "", phone: "", email: "", url: "" });
  const [emailF, setEmailF] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("");
  const [sms, setSms] = useState({ to: "", body: "" });
  const [upi, setUpi] = useState({ vpa: "", name: "", amount: "", note: "" });
  const [whatsapp, setWhatsapp] = useState({ number: "", message: "" });
  const [maps, setMaps] = useState({ query: "", lat: "", lng: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [links, setLinks] = useState({
    title: "",
    subtitle: "",
    items: [{ label: "Website", url: "", type: "website" }] as LinkItem[],
  });

  const value = useMemo(() => {
    const esc = (s: string) => s.replace(/([\\;,":])/g, "\\$1");
    const origin = (typeof window !== "undefined" ? PUBLISHED_QR_ORIGIN : PUBLISHED_QR_ORIGIN);
    switch (kind) {
      case "url": return url.trim();
      case "text": return text;
      case "wifi": return `WIFI:T:${wifi.enc};S:${esc(wifi.ssid)};${wifi.enc !== "nopass" ? `P:${esc(wifi.password)};` : ""}${wifi.hidden ? "H:true;" : ""};`;
      case "vcard": return [
        "BEGIN:VCARD","VERSION:3.0",
        `FN:${vcard.name}`,
        vcard.org && `ORG:${vcard.org}`,
        vcard.title && `TITLE:${vcard.title}`,
        vcard.phone && `TEL:${vcard.phone}`,
        vcard.email && `EMAIL:${vcard.email}`,
        vcard.url && `URL:${vcard.url}`,
        "END:VCARD",
      ].filter(Boolean).join("\n");
      case "email": {
        const p = new URLSearchParams();
        if (emailF.subject) p.set("subject", emailF.subject);
        if (emailF.body) p.set("body", emailF.body);
        const q = p.toString();
        return `mailto:${emailF.to}${q ? `?${q}` : ""}`;
      }
      case "phone": return phone ? `tel:${phone}` : "";
      case "sms": return sms.to ? `sms:${sms.to}${sms.body ? `?body=${encodeURIComponent(sms.body)}` : ""}` : "";
      case "upi": {
        if (!upi.vpa) return "";
        const p = new URLSearchParams({ pa: upi.vpa });
        if (upi.name) p.set("pn", upi.name);
        if (upi.amount) p.set("am", upi.amount);
        if (upi.note) p.set("tn", upi.note);
        p.set("cu", "INR");
        return `upi://pay?${p.toString()}`;
      }
      case "whatsapp": {
        const num = whatsapp.number.replace(/[^\d]/g, "");
        if (!num) return "";
        return `https://wa.me/${num}${whatsapp.message ? `?text=${encodeURIComponent(whatsapp.message)}` : ""}`;
      }
      case "maps": {
        if (maps.lat && maps.lng) return `https://www.google.com/maps?q=${encodeURIComponent(maps.lat)},${encodeURIComponent(maps.lng)}`;
        if (maps.query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(maps.query)}`;
        return "";
      }
      case "image":
      case "video":
      case "pdf": return fileUrl.trim();
      case "links": {
        const cleaned = links.items
          .map((it) => {
            const t = (it.type || "website") as LinkType;
            const normalized = buildUrl(t, it.url) ?? "";
            return { ...it, url: normalized };
          })
          .filter((it) => it.url && it.url !== "https://");
        if (cleaned.length === 0) return "";
        const payload = { title: links.title || undefined, subtitle: links.subtitle || undefined, items: cleaned };
        return `${origin}/s?d=${b64urlEncode(JSON.stringify(payload))}`;
      }
    }
  }, [kind, url, text, wifi, vcard, emailF, phone, sms, upi, whatsapp, maps, fileUrl, links]);

  const canRender = !!value && value.length > 0;

  async function downloadPng() {
    if (!canRender) return;
    const dataUrl = await QRCode.toDataURL(value, { width: size, margin: 2, color: { dark: fg, light: bg } });
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `uniqr-static-${kind}.png`; a.click();
  }
  function downloadSvg() {
    if (!svgRef.current) return;
    const svg = svgRef.current.outerHTML;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `uniqr-static-${kind}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function downloadPdf() {
    if (!canRender) return;
    const dataUrl = await QRCode.toDataURL(value, { width: 1024, margin: 2, color: { dark: fg, light: bg } });
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const w = 320; const x = (pdf.internal.pageSize.getWidth() - w) / 2;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
    pdf.text("UniQR — Static QR", pdf.internal.pageSize.getWidth() / 2, 60, { align: "center" });
    pdf.addImage(dataUrl, "PNG", x, 100, w, w);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    pdf.text(`Type: ${kind}`, pdf.internal.pageSize.getWidth() / 2, 460, { align: "center" });
    pdf.save(`uniqr-static-${kind}.pdf`);
  }

  const inputCls = "mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm";
  const labelCls = "block text-xs text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 my-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">New static QR</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Encodes content directly into the QR. No tracking, no redirects — the content cannot be edited after printing.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg border border-border hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(["url","text","wifi","vcard","email","phone","sms","upi","whatsapp","maps","image","video","pdf","links"] as StaticKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={`h-9 px-3 rounded-lg border text-xs capitalize ${kind === k ? "border-glow bg-glow/10 text-primary" : "border-border hover:bg-accent"}`}>
              {k === "url" ? "URL" : k === "upi" ? "UPI" : k === "sms" ? "SMS" : k === "vcard" ? "vCard" : k === "pdf" ? "PDF" : k === "links" ? "Multi-link" : k}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Static QR: content is fixed at creation time. You cannot edit it later — reprint if you need changes.
        </p>

        <div className="mt-5 grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {kind === "url" && (
              <label className={labelCls}>URL
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className={inputCls} />
              </label>
            )}
            {kind === "text" && (
              <label className={labelCls}>Text
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Any plain text…" className={`${inputCls} h-auto py-2`} />
              </label>
            )}
            {kind === "wifi" && (
              <>
                <label className={labelCls}>Network name (SSID)
                  <input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Encryption
                  <select value={wifi.enc} onChange={(e) => setWifi({ ...wifi, enc: e.target.value as typeof wifi.enc })} className={inputCls}>
                    <option value="WPA">WPA / WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None</option>
                  </select>
                </label>
                {wifi.enc !== "nopass" && (
                  <label className={labelCls}>Password
                    <input value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} className={inputCls} />
                  </label>
                )}
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} /> Hidden network
                </label>
              </>
            )}
            {kind === "vcard" && (
              <div className="grid grid-cols-2 gap-3">
                <label className={`${labelCls} col-span-2`}>Full name
                  <input value={vcard.name} onChange={(e) => setVcard({ ...vcard, name: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Organization
                  <input value={vcard.org} onChange={(e) => setVcard({ ...vcard, org: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Title
                  <input value={vcard.title} onChange={(e) => setVcard({ ...vcard, title: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Phone
                  <input value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Email
                  <input value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} className={inputCls} />
                </label>
                <label className={`${labelCls} col-span-2`}>Website
                  <input value={vcard.url} onChange={(e) => setVcard({ ...vcard, url: e.target.value })} className={inputCls} />
                </label>
              </div>
            )}
            {kind === "email" && (
              <>
                <label className={labelCls}>To
                  <input value={emailF.to} onChange={(e) => setEmailF({ ...emailF, to: e.target.value })} placeholder="you@example.com" className={inputCls} />
                </label>
                <label className={labelCls}>Subject
                  <input value={emailF.subject} onChange={(e) => setEmailF({ ...emailF, subject: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Body
                  <textarea value={emailF.body} onChange={(e) => setEmailF({ ...emailF, body: e.target.value })} rows={3} className={`${inputCls} h-auto py-2`} />
                </label>
              </>
            )}
            {kind === "phone" && (
              <label className={labelCls}>Phone number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
              </label>
            )}
            {kind === "sms" && (
              <>
                <label className={labelCls}>Phone number
                  <input value={sms.to} onChange={(e) => setSms({ ...sms, to: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Message
                  <textarea value={sms.body} onChange={(e) => setSms({ ...sms, body: e.target.value })} rows={3} className={`${inputCls} h-auto py-2`} />
                </label>
              </>
            )}
            {kind === "upi" && (
              <div className="grid grid-cols-2 gap-3">
                <label className={`${labelCls} col-span-2`}>UPI ID (VPA)
                  <input value={upi.vpa} onChange={(e) => setUpi({ ...upi, vpa: e.target.value })} placeholder="yourname@upi" className={inputCls} />
                </label>
                <label className={labelCls}>Payee name
                  <input value={upi.name} onChange={(e) => setUpi({ ...upi, name: e.target.value })} className={inputCls} />
                </label>
                <label className={labelCls}>Amount (₹)
                  <input value={upi.amount} onChange={(e) => setUpi({ ...upi, amount: e.target.value })} inputMode="decimal" className={inputCls} />
                </label>
                <label className={`${labelCls} col-span-2`}>Note
                  <input value={upi.note} onChange={(e) => setUpi({ ...upi, note: e.target.value })} className={inputCls} />
                </label>
              </div>
            )}
            {kind === "whatsapp" && (
              <>
                <label className={labelCls}>WhatsApp number (with country code)
                  <input value={whatsapp.number} onChange={(e) => setWhatsapp({ ...whatsapp, number: e.target.value })} placeholder="+91 98765 43210" className={inputCls} />
                </label>
                <label className={labelCls}>Pre-filled message (optional)
                  <textarea value={whatsapp.message} onChange={(e) => setWhatsapp({ ...whatsapp, message: e.target.value })} rows={3} className={`${inputCls} h-auto py-2`} />
                </label>
              </>
            )}
            {kind === "maps" && (
              <>
                <label className={labelCls}>Place / address
                  <input value={maps.query} onChange={(e) => setMaps({ ...maps, query: e.target.value })} placeholder="e.g. Gateway of India, Mumbai" className={inputCls} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={labelCls}>Latitude (optional)
                    <input value={maps.lat} onChange={(e) => setMaps({ ...maps, lat: e.target.value })} className={inputCls} />
                  </label>
                  <label className={labelCls}>Longitude (optional)
                    <input value={maps.lng} onChange={(e) => setMaps({ ...maps, lng: e.target.value })} className={inputCls} />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setMaps({ query: "", lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
                      () => toast.error("Could not fetch location")
                    );
                  }}
                  className="h-9 px-3 rounded-lg border border-border text-xs hover:bg-accent"
                >
                  Use my current location
                </button>
              </>
            )}
            {(kind === "image" || kind === "video" || kind === "pdf") && (
              <>
                <label className={labelCls}>File URL
                  <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" className={inputCls} />
                </label>
                <FileUploader accept={kind} onUploaded={(u) => setFileUrl(u)} />
                <p className="text-[11px] text-muted-foreground">
                  The file URL is baked into the QR. Deleting the file later will break the QR — keep it hosted.
                </p>
              </>
            )}
            {kind === "links" && (
              <>
                <label className={labelCls}>Title
                  <input value={links.title} onChange={(e) => setLinks({ ...links, title: e.target.value })} placeholder="My links" className={inputCls} />
                </label>
                <label className={labelCls}>Subtitle
                  <input value={links.subtitle} onChange={(e) => setLinks({ ...links, subtitle: e.target.value })} className={inputCls} />
                </label>
                <div className="space-y-3">
                  {links.items.map((it, idx) => {
                    const t = (it.type || "website") as LinkType;
                    const meta = INPUT_META[t] ?? INPUT_META.link;
                    return (
                    <div key={idx} className="rounded-lg border border-border p-2 space-y-2">
                      <div className="grid grid-cols-[7rem_1fr_auto] gap-2 items-start">
                        <select
                          value={it.type}
                          onChange={(e) => {
                            const items = [...links.items]; items[idx] = { ...it, type: e.target.value, url: "" }; setLinks({ ...links, items });
                          }}
                          className={inputCls}
                        >
                          <option value="website">Website</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="phone">Phone</option>
                          <option value="email">Email</option>
                          <option value="maps">Maps</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="pdf">PDF</option>
                        </select>
                        <input
                          value={it.label}
                          onChange={(e) => { const items = [...links.items]; items[idx] = { ...it, label: e.target.value }; setLinks({ ...links, items }); }}
                          placeholder="Button label (e.g. Chat with us)" className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => setLinks({ ...links, items: links.items.filter((_, i) => i !== idx) })}
                          className="h-10 w-10 grid place-items-center rounded-lg border border-border hover:bg-accent"
                          aria-label="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <input
                          value={it.url}
                          inputMode={meta.inputMode}
                          onChange={(e) => { const items = [...links.items]; items[idx] = { ...it, url: e.target.value }; setLinks({ ...links, items }); }}
                          placeholder={meta.placeholder}
                          className={inputCls}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">{meta.label}{meta.help ? ` — ${meta.help}` : ""}</p>
                      </div>
                    </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setLinks({ ...links, items: [...links.items, { label: "", url: "", type: "website" }] })}
                    className="h-9 px-3 rounded-lg border border-border text-xs hover:bg-accent"
                  >
                    + Add link
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Encoded directly into a hosted static hub page. Links are fixed once the QR is printed.
                </p>
              </>
            )}



            <div className="grid grid-cols-3 gap-3 pt-2">
              <label className={labelCls}>Foreground
                <input type="color" value={fg} onChange={(e) => setFg(e.target.value.toUpperCase())} className="mt-1 w-full h-10 rounded-lg bg-background border border-border" />
              </label>
              <label className={labelCls}>Background
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value.toUpperCase())} className="mt-1 w-full h-10 rounded-lg bg-background border border-border" />
              </label>
              <label className={labelCls}>Size (px)
                <input type="number" min={128} max={2048} step={32} value={size} onChange={(e) => setSize(Math.max(128, Math.min(2048, Number(e.target.value) || 512)))} className={inputCls} />
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center justify-start gap-4">
            <div className="p-4 rounded-2xl border border-border bg-white">
              {canRender ? (
                <QRCodeSVG ref={svgRef} value={value!} size={220} fgColor={fg} bgColor={bg} level="M" includeMargin />
              ) : (
                <div className="w-[220px] h-[220px] grid place-items-center text-xs text-muted-foreground">Fill in the fields to preview</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button disabled={!canRender} onClick={downloadPng} className="h-10 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> PNG
              </button>
              <button disabled={!canRender} onClick={downloadSvg} className="h-10 rounded-lg border border-border text-sm disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> SVG
              </button>
              <button disabled={!canRender} onClick={downloadPdf} className="h-10 rounded-lg border border-border text-sm disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Static QRs are generated locally and downloaded to your device — nothing is saved to the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
