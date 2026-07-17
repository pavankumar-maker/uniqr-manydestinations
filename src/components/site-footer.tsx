import { QrCode } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-glow grid place-items-center">
              <QrCode className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">NxtQR</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-sm">
            Enterprise digital identity & smart QR management. Generate, customize, and track every scan.
          </p>
        </div>
        <div>
          <div className="text-sm font-medium mb-3">Product</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/#features" className="hover:text-foreground">Features</a></li>
            <li><a href="/#types" className="hover:text-foreground">QR Types</a></li>
            <li><a href="/generator" className="hover:text-foreground">Generator</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium mb-3">Company</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">About</a></li>
            <li><a href="#" className="hover:text-foreground">Security</a></li>
            <li><a href="#" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} NxtQR Platform. All rights reserved.</span>
          <span>Built for NxtGenSec Development Internship 2026.</span>
        </div>
      </div>
    </footer>
  );
}
