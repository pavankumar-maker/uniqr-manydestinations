import { Link, useNavigate } from "@tanstack/react-router";
import { QrCode, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

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
          {signedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition"
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition">
                Sign in
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center h-9 px-4 rounded-lg bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
