import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ExternalLink, Globe, MessageCircle, Phone, Mail, MapPin, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from "lucide-react";

export const Route = createFileRoute("/s")({
  component: StaticHub,
  head: () => ({
    meta: [
      { title: "Links — NxtQR" },
      { name: "description", content: "A static multi-link hub encoded in a QR code." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Item = { label: string; url: string; type?: string };
type Payload = { title?: string; subtitle?: string; items: Item[] };

function decode(raw: string | null): Payload | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = decodeURIComponent(escape(atob(b64 + pad)));
    const p = JSON.parse(json) as Payload;
    if (!p || !Array.isArray(p.items)) return null;
    return p;
  } catch {
    return null;
  }
}

function iconFor(type?: string) {
  switch (type) {
    case "whatsapp": return <MessageCircle className="w-4 h-4" />;
    case "phone": return <Phone className="w-4 h-4" />;
    case "email": return <Mail className="w-4 h-4" />;
    case "maps": return <MapPin className="w-4 h-4" />;
    case "pdf": return <FileText className="w-4 h-4" />;
    case "image": return <ImageIcon className="w-4 h-4" />;
    case "video": return <VideoIcon className="w-4 h-4" />;
    case "website": return <Globe className="w-4 h-4" />;
    default: return <LinkIcon className="w-4 h-4" />;
  }
}

function StaticHub() {
  const payload = useMemo(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return decode(p.get("d"));
  }, []);

  if (!payload) {
    return (
      <main className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Invalid link</h1>
          <p className="text-sm text-muted-foreground mt-2">This static hub has no valid data.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md">
        <div className="h-24 rounded-2xl bg-gradient-to-br from-primary/60 to-glow/60" />
        <div className="-mt-6 mx-3 rounded-2xl bg-card border border-border p-5 shadow-brand">
          <h1 className="font-display text-xl font-semibold break-words">{payload.title || "Links"}</h1>
          {payload.subtitle && <p className="text-xs text-muted-foreground mt-1 break-words">{payload.subtitle}</p>}
        </div>
        <ul className="mt-4 space-y-2">
          {payload.items.map((it, i) => (
            <li key={i}>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 grid place-items-center rounded-lg bg-glow/10 text-primary shrink-0">
                    {iconFor(it.type)}
                  </span>
                  <span className="truncate text-sm font-medium">{it.label || it.url}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-center text-muted-foreground mt-6">Powered by NxtQR · Static multi-link</p>
      </div>
    </main>
  );
}
