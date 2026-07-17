import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Palette, Shield, Zap, Globe, Smartphone,
  CreditCard, MapPin, FileText, Image as ImageIcon, Video, MessageSquare,
  Mail, Phone, Link2, Layers,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QrPreview } from "@/components/qr-preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NxtQR — Unified QR Platform for Enterprises" },
      { name: "description", content: "Generate, customize, and track static & dynamic QR codes. Multi-link QR, digital business cards, analytics, and enterprise-grade security." },
      { property: "og:title", content: "NxtQR — Unified QR Platform for Enterprises" },
      { property: "og:description", content: "Generate, customize, and track static & dynamic QR codes. Multi-link QR, digital business cards, analytics, and enterprise-grade security." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, title: "Static & Dynamic QR", desc: "Create fixed QRs or dynamic ones you can update anytime without reprinting." },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Track scans by location, device, time and referrer with beautiful dashboards." },
  { icon: Palette, title: "Full Customization", desc: "Colors, gradients, logos, frames and shape styles that match your brand." },
  { icon: Layers, title: "Multi-Link QR", desc: "Route one QR to multiple destinations with smart rules and A/B splits." },
  { icon: Shield, title: "Enterprise Security", desc: "SSO, role-based access, password-protected QRs and audit logs." },
  { icon: CreditCard, title: "Digital Business Card", desc: "Share a rich, editable vCard profile from any single QR scan." },
];

const qrTypes = [
  { icon: Globe, name: "Website" },
  { icon: MessageSquare, name: "WhatsApp" },
  { icon: Phone, name: "Phone" },
  { icon: Mail, name: "Email" },
  { icon: Smartphone, name: "SMS" },
  { icon: MapPin, name: "Google Maps" },
  { icon: CreditCard, name: "UPI Payment" },
  { icon: FileText, name: "PDF" },
  { icon: ImageIcon, name: "Image" },
  { icon: Video, name: "Video" },
  { icon: Link2, name: "Multi-Link" },
  { icon: Layers, name: "vCard" },
];


function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 h-7 rounded-full border border-border bg-card/60 backdrop-blur">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Unified QR Platform · v1.0
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-semibold leading-[1.05]">
              One QR code.<br />
              <span className="text-gradient">Infinite destinations.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              NxtQR is the enterprise-grade platform to generate, customize, and track static &
              dynamic QR codes — websites, payments, vCards, files and more.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/generator"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-glow text-primary-foreground font-medium shadow-brand hover:opacity-90 transition"
              >
                Generate a QR <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center h-12 px-6 rounded-xl border border-border bg-card/40 backdrop-blur font-medium hover:bg-card transition"
              >
                Explore features
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div><span className="text-foreground font-semibold">10M+</span> scans tracked</div>
              <div className="w-px h-6 bg-border" />
              <div><span className="text-foreground font-semibold">50K+</span> QRs generated</div>
              <div className="w-px h-6 bg-border" />
              <div><span className="text-foreground font-semibold">99.99%</span> uptime</div>
            </div>
          </div>

          <QrPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-accent">Platform capabilities</div>
          <h2 className="mt-3 text-4xl font-semibold">Everything you need to run QR at scale</h2>
          <p className="mt-4 text-muted-foreground">
            Purpose-built for teams that need reliability, control and insight from every scan.
          </p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition">
              <div className="w-11 h-11 rounded-xl bg-glow/10 border border-border grid place-items-center mb-5">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y border-border/60 bg-card/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground text-center">
            Trusted by fast-moving teams worldwide
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center">
            {["Northwind", "Vertex Labs", "Kairo", "Lumen", "Helix", "Orbita"].map((n) => (
              <div key={n} className="text-center font-display text-lg text-muted-foreground/70 tracking-wide">
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-accent">How it works</div>
          <h2 className="mt-3 text-4xl font-semibold">Launch a live QR in three steps</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {[
            { step: "01", title: "Choose a type", desc: "Pick from 12+ QR types — URL, UPI, WiFi, vCard, WhatsApp and more." },
            { step: "02", title: "Design & customize", desc: "Match your brand with colors, logo, frames and error-correction levels." },
            { step: "03", title: "Deploy & track", desc: "Download in PNG/SVG/PDF and monitor every scan in real time." },
          ].map((s) => (
            <div key={s.step} className="relative rounded-2xl border border-border bg-card p-8">
              <div className="font-display text-5xl text-gradient font-semibold">{s.step}</div>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="rounded-3xl border border-border bg-card p-10 md:p-14">
          <div className="text-accent text-sm font-medium">Customer story</div>
          <p className="mt-4 text-2xl md:text-3xl font-display leading-snug max-w-4xl">
            "NxtQR replaced three tools for us. Our marketing team ships branded, trackable QR
            campaigns in minutes — not days. The analytics alone paid for the platform."
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-glow" />
            <div>
              <div className="text-sm font-medium">Priya Menon</div>
              <div className="text-xs text-muted-foreground">Head of Growth, Vertex Labs</div>
            </div>
          </div>
        </div>
      </section>

      {/* QR Types */}
      <section id="types" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div className="max-w-xl">
              <div className="text-sm font-medium text-accent">12+ QR Types</div>
              <h2 className="mt-3 text-4xl font-semibold">Every use case, one platform</h2>
            </div>
            <Link to="/generator" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Try the generator <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {qrTypes.map(({ icon: Icon, name }) => (
              <div key={name} className="aspect-square rounded-xl border border-border bg-background/50 hover:bg-background hover:border-primary/40 transition flex flex-col items-center justify-center gap-3 p-4">
                <Icon className="w-6 h-6 text-accent" />
                <span className="text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-hero p-12 md:p-16 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-semibold">Ready to unify your QR strategy?</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Launch your first dynamic QR in under a minute. No credit card required.
            </p>
            <Link
              to="/generator"
              className="mt-8 inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-glow text-primary-foreground font-medium shadow-brand hover:opacity-90 transition"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
