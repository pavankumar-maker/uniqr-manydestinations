import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-glow grid place-items-center shadow-brand">
            <QrCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            NxtQR<span className="text-gradient">.</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="/#features" className="hover:text-foreground transition">Features</a>
          <a href="/#types" className="hover:text-foreground transition">QR Types</a>
          
          <Link to="/generator" className="hover:text-foreground transition">Generator</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition">
            Sign in
          </a>
          <Link
            to="/generator"
            className="inline-flex items-center h-9 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition"
          >
            Try free
          </Link>
        </div>
      </div>
    </header>
  );
}
