import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  Globe, MessageCircle, Facebook, Instagram, Twitter, Youtube, Linkedin,
  Mail, Phone, MapPin, CreditCard, FileText, Link as LinkIcon, Send,
  BadgeCheck, Share2, ExternalLink, Image as ImageIcon, Video as VideoIcon,
  X, Download, Play,
} from "lucide-react";
import { resolveShortAndTrack } from "@/lib/qr.functions";

export const Route = createFileRoute("/r/$shortId")({
  loader: async ({ params }) => {
    const res = await resolveShortAndTrack({ data: { shortId: params.shortId } });
    if (res.hub) return { hub: res.hub, notFound: false };
    if (res.url) throw redirect({ href: res.url });
    return { hub: null, notFound: true };
  },
  component: HubOrFallback,
  errorComponent: () => <NotFoundPage />,
  head: () => ({
    meta: [
      { title: "Connect · UniQR" },
      { name: "description", content: "All links in one place, powered by UniQR." },
    ],
  }),
});

type LinkMeta = { icon: React.ComponentType<{ className?: string }>; label: string; grad: string; };

const META: Record<string, LinkMeta> = {
  website:   { icon: Globe,         label: "Visit Website",   grad: "from-sky-500 to-indigo-600" },
  whatsapp:  { icon: MessageCircle, label: "Chat on WhatsApp",grad: "from-emerald-400 to-green-600" },
  facebook:  { icon: Facebook,      label: "Facebook",        grad: "from-blue-500 to-blue-700" },
  instagram: { icon: Instagram,     label: "Instagram",       grad: "from-fuchsia-500 via-pink-500 to-orange-400" },
  twitter:   { icon: Twitter,       label: "Twitter / X",     grad: "from-slate-700 to-black" },
  youtube:   { icon: Youtube,       label: "YouTube",         grad: "from-red-500 to-rose-700" },
  linkedin:  { icon: Linkedin,      label: "LinkedIn",        grad: "from-sky-600 to-blue-800" },
  tiktok:    { icon: LinkIcon,      label: "TikTok",          grad: "from-cyan-400 via-slate-900 to-pink-500" },
  telegram:  { icon: Send,          label: "Telegram",        grad: "from-sky-400 to-blue-600" },
  email:     { icon: Mail,          label: "Send Email",      grad: "from-amber-400 to-orange-600" },
  phone:     { icon: Phone,         label: "Call Now",        grad: "from-teal-400 to-emerald-600" },
  maps:      { icon: MapPin,        label: "Get Directions",  grad: "from-lime-400 to-green-600" },
  upi:       { icon: CreditCard,    label: "Pay via UPI",     grad: "from-violet-500 to-purple-700" },
  image:     { icon: ImageIcon,     label: "View Image",      grad: "from-rose-400 to-pink-600" },
  video:     { icon: VideoIcon,     label: "Watch Video",     grad: "from-red-500 to-orange-600" },
  pdf:       { icon: FileText,      label: "Open PDF",        grad: "from-red-600 to-rose-800" },
  file:      { icon: FileText,      label: "Download File",   grad: "from-zinc-500 to-slate-700" },
  link:      { icon: LinkIcon,      label: "Open Link",       grad: "from-neutral-500 to-neutral-800" },
};

// Curated cover imagery — free-to-use Unsplash photos, deterministic per hub
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Curated gradient palettes — deterministic per hub, always render, no network needed
const GRADIENTS = [
  ["#667eea", "#764ba2", "#f093fb"],
  ["#00c6fb", "#005bea", "#3b82f6"],
  ["#f093fb", "#f5576c", "#ff9a44"],
  ["#4facfe", "#00f2fe", "#43e97b"],
  ["#fa709a", "#fee140", "#ff9a9e"],
  ["#30cfd0", "#330867", "#5b247a"],
  ["#ff6a00", "#ee0979", "#8e2de2"],
  ["#a1c4fd", "#c2e9fb", "#667eea"],
];

function HubOrFallback() {
  const { hub, notFound } = Route.useLoaderData();
  const [viewer, setViewer] = useState<{ type: "image" | "video" | "pdf"; url: string; label: string } | null>(null);
  if (notFound || !hub) return <NotFoundPage />;

  const g = GRADIENTS[hash(hub.name) % GRADIENTS.length];
  const cover = `radial-gradient(circle at 20% 20%, ${g[0]} 0%, transparent 50%),
                 radial-gradient(circle at 80% 30%, ${g[2]} 0%, transparent 55%),
                 linear-gradient(135deg, ${g[1]} 0%, ${g[0]} 100%)`;
  const initials = hub.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("") || "N";

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: hub.name, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); alert("Link copied"); }
    } catch {}
  };

  return (
    <div className="min-h-dvh relative overflow-x-hidden bg-slate-50">
      {/* Ambient wash */}
      <div
        className="absolute inset-x-0 top-0 h-80 opacity-40 blur-3xl pointer-events-none"
        style={{ background: cover }}
      />

      <div className="relative max-w-md mx-auto px-4 pb-16 pt-3">
        {/* Cover banner */}
        <div className="relative h-24 sm:h-28 rounded-[1.4rem] overflow-hidden shadow-lg ring-1 ring-black/5">
          <div className="absolute inset-0" style={{ background: cover }} />
          {/* Decorative shapes */}
          <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 backdrop-blur-sm" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
          <button
            onClick={share}
            aria-label="Share"
            className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/95 hover:bg-white text-slate-900 shadow-md transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Identity card */}
        <div className="relative z-10 -mt-5 rounded-[1.4rem] bg-white px-4 pb-5 pt-12 text-center shadow-md ring-1 ring-slate-200">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <div
              className="h-20 w-20 rounded-2xl grid place-items-center text-2xl font-bold text-white shadow-xl ring-4 ring-white"
              style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
            >
              {initials}
            </div>
          </div>
          <div className="flex min-w-0 items-start justify-center gap-1.5 px-2">
            <h1 className="max-w-full break-words text-2xl font-semibold leading-tight tracking-tight text-slate-900">{hub.name}</h1>
            <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-sky-500" />
          </div>
          <p className="mt-1 text-sm text-slate-500">Tap a link below to connect</p>
        </div>

        {/* Links */}
        <div className="mt-8 space-y-3">
          {hub.links.length === 0 && (
            <p className="text-center text-sm text-slate-500">No links yet.</p>
          )}
          {hub.links.map((l: { label: string; url: string; type: string }, i: number) => {
            const meta = META[l.type] ?? META.link;
            const Icon = meta.icon;
            const isMedia = l.type === "image" || l.type === "video" || l.type === "pdf";

            if (isMedia) {
              return (
                <button
                  key={i}
                  onClick={() => setViewer({ type: l.type as "image" | "video" | "pdf", url: l.url, label: l.label || meta.label })}
                  className="group relative block w-full text-left rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg ring-1 ring-slate-200 hover:ring-slate-300 transition-all hover:-translate-y-0.5"
                >
                  {/* Media preview */}
                  <div className="relative w-full aspect-[16/9] bg-slate-100 overflow-hidden">
                    {l.type === "image" && (
                      <img src={l.url} alt={l.label || meta.label} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {l.type === "video" && (
                      <>
                        <video src={l.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                        <div className="absolute inset-0 grid place-items-center bg-black/25">
                          <span className="w-14 h-14 rounded-full bg-white/95 grid place-items-center shadow-xl">
                            <Play className="w-6 h-6 text-slate-900 fill-slate-900 ml-0.5" />
                          </span>
                        </div>
                      </>
                    )}
                    {l.type === "pdf" && (
                      <div className={`w-full h-full grid place-items-center bg-gradient-to-br ${meta.grad} text-white`}>
                        <FileText className="w-14 h-14 opacity-90" />
                      </div>
                    )}
                  </div>
                  {/* Meta bar */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`w-9 h-9 shrink-0 rounded-lg grid place-items-center text-white shadow-sm bg-gradient-to-br ${meta.grad}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{l.label || meta.label}</span>
                      <span className="block text-xs text-slate-500 truncate">Tap to {l.type === "image" ? "view" : l.type === "video" ? "play" : "open"}</span>
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-4 w-full pl-2 pr-4 py-2 rounded-2xl bg-white hover:bg-white shadow-sm hover:shadow-lg ring-1 ring-slate-200 hover:ring-slate-300 transition-all hover:-translate-y-0.5"
              >
                <span className={`w-12 h-12 shrink-0 rounded-xl grid place-items-center text-white shadow-md bg-gradient-to-br ${meta.grad}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 truncate">{l.label || meta.label}</span>
                  <span className="block text-xs text-slate-500 truncate">{meta.label}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
              </a>
            );
          })}
        </div>

        {/* Fullscreen viewer */}
        {viewer && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
            onClick={() => setViewer(null)}
          >
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <span className="text-sm font-medium truncate pr-4">{viewer.label}</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewer.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
                  aria-label="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setViewer(null)}
                  className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              {viewer.type === "image" && (
                <img src={viewer.url} alt={viewer.label} className="max-w-full max-h-full object-contain rounded-lg" />
              )}
              {viewer.type === "video" && (
                <video src={viewer.url} controls autoPlay playsInline className="max-w-full max-h-full rounded-lg bg-black" />
              )}
              {viewer.type === "pdf" && (
                <iframe src={viewer.url} title={viewer.label} className="w-full h-full rounded-lg bg-white" />
              )}
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
          Powered by <span className="font-semibold text-slate-600">UniQR</span>
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-dvh grid place-items-center bg-background text-center px-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Link unavailable</h1>
        <p className="mt-2 text-muted-foreground">This QR code is inactive or does not exist.</p>
        <a href="/" className="mt-6 inline-block text-primary underline">Back to UniQR</a>
      </div>
    </div>
  );
}
