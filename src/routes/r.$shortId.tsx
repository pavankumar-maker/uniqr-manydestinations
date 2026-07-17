import { createFileRoute, redirect } from "@tanstack/react-router";
import { Globe, MessageCircle, Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, CreditCard, FileText, Link as LinkIcon, Send } from "lucide-react";
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
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  whatsapp: MessageCircle,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  tiktok: LinkIcon,
  telegram: Send,
  email: Mail,
  phone: Phone,
  maps: MapPin,
  upi: CreditCard,
  file: FileText,
  link: LinkIcon,
};

const LABELS: Record<string, string> = {
  website: "Website", whatsapp: "WhatsApp", facebook: "Facebook",
  instagram: "Instagram", twitter: "Twitter / X", youtube: "YouTube",
  linkedin: "LinkedIn", tiktok: "TikTok", telegram: "Telegram",
  email: "Email", phone: "Call", maps: "Directions", upi: "Pay via UPI",
  file: "Download", link: "Open link",
};

function HubOrFallback() {
  const { hub, notFound } = Route.useLoaderData();
  if (notFound || !hub) return <NotFoundPage />;
  return (
    <div className="min-h-screen py-10 px-5" style={{ backgroundColor: hub.bg }}>
      <div className="max-w-md mx-auto">
        <div
          className="w-20 h-20 rounded-2xl mx-auto grid place-items-center text-2xl font-bold shadow-lg"
          style={{ backgroundColor: hub.fg, color: hub.bg }}
        >
          {hub.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-center" style={{ color: hub.fg }}>
          {hub.name}
        </h1>
        <p className="mt-1 text-sm text-center opacity-60" style={{ color: hub.fg }}>
          Pick where you'd like to go
        </p>

        <div className="mt-8 space-y-3">
          {hub.links.length === 0 && (
            <p className="text-center text-sm opacity-60" style={{ color: hub.fg }}>
              No links yet.
            </p>
          )}
          {hub.links.map((l, i) => {
            const Icon = ICONS[l.type] ?? LinkIcon;
            return (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-5 h-14 rounded-2xl border-2 hover:scale-[1.02] active:scale-[0.98] transition-transform font-medium"
                style={{ borderColor: hub.fg, color: hub.fg, backgroundColor: hub.bg }}
              >
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{ backgroundColor: hub.fg, color: hub.bg }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 truncate">{l.label || LABELS[l.type] || "Open"}</span>
              </a>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs opacity-50" style={{ color: hub.fg }}>
          Powered by NxtQR
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-center px-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Link unavailable</h1>
        <p className="mt-2 text-muted-foreground">This QR code is inactive or does not exist.</p>
        <a href="/" className="mt-6 inline-block text-primary underline">Back to NxtQR</a>
      </div>
    </div>
  );
}
