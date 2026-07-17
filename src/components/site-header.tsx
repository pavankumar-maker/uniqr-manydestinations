import { Link, useNavigate } from "@tanstack/react-router";
import { QrCode, LayoutDashboard, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navLinks = (
    <>
      <a href="/#features" onClick={() => setOpen(false)} className="hover:text-foreground focus-visible:text-foreground transition">Features</a>
      <a href="/#types" onClick={() => setOpen(false)} className="hover:text-foreground focus-visible:text-foreground transition">QR Types</a>
      <Link to="/generator" onClick={() => setOpen(false)} className="hover:text-foreground focus-visible:text-foreground transition">Generator</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
          <div className="w-9 h-9 rounded-lg bg-glow grid place-items-center shadow-brand" aria-hidden>
            <QrCode className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            NxtQR<span className="text-gradient">.</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center justify-center gap-8 text-sm text-muted-foreground">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 justify-self-end">
          {signedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden /> <span className="hidden xs:inline sm:inline">Dashboard</span>
            </Link>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition">
                Sign in
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center h-10 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition"
              >
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="md:hidden inline-grid place-items-center w-11 h-11 rounded-lg border border-border bg-card/50 hover:bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile nav sheet */}
      <div
        id="mobile-nav"
        className={`md:hidden overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out ${open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <nav aria-label="Mobile" className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1 text-sm text-muted-foreground">
          {navLinks}
          {!signedIn && (
            <Link to="/auth" onClick={() => setOpen(false)} className="pt-2 mt-1 border-t border-border/60 hover:text-foreground transition">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
