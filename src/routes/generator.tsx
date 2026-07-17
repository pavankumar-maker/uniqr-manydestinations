import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { Download, Globe, MessageSquare, Phone, Mail, MapPin, CreditCard, Wifi, Type, Contact, Zap, Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { createQr } from "@/lib/qr.functions";

export const Route = createFileRoute("/generator")({
  head: () => ({
    meta: [
      { title: "QR Generator — NxtQR" },
      { name: "description", content: "Free QR code generator. Create Website, WhatsApp, UPI, WiFi, vCard and more with full customization." },
      { property: "og:title", content: "QR Generator — NxtQR" },
      { property: "og:description", content: "Generate customizable QR codes in seconds." },
    ],
  }),
  component: Generator,
});

type QRType = "url" | "text" | "whatsapp" | "phone" | "email" | "sms" | "maps" | "upi" | "wifi" | "vcard";

const types: { key: QRType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "url", label: "Website", icon: Globe },
  { key: "text", label: "Text", icon: Type },
  { key: "vcard", label: "vCard", icon: Contact },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "maps", label: "Maps", icon: MapPin },
  { key: "upi", label: "UPI", icon: CreditCard },
  { key: "wifi", label: "WiFi", icon: Wifi },
];

function Generator() {
  const [mode, setMode] = useState<"static" | "dynamic">("static");
  const [type, setType] = useState<QRType>("url");
  const [fields, setFields] = useState<Record<string, string>>({ url: "https://nxtqr.app" });
  const [fg, setFg] = useState("#0b0b12");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(280);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [name, setName] = useState("My QR");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const rawValue = useMemo(() => buildValue(type, fields), [type, fields]);
  const value = mode === "dynamic" && shortUrl ? shortUrl : rawValue;

  // Dynamic mode only supports http(s) targets (real URLs)
  const isHttp = /^https?:\/\//i.test(rawValue);
  const canDynamic = isHttp;

  useEffect(() => { setShortUrl(null); setErr(null); }, [rawValue, mode]);

  function update(k: string, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  function switchType(t: QRType) {
    setType(t);
    setFields(defaultsFor(t));
    setShortUrl(null);
  }

  async function createDynamic() {
    setErr(null);
    if (!canDynamic) { setErr("Dynamic QR requires an https:// URL target."); return; }
    setCreating(true);
    try {
      const row = await createQr({ data: { name: name || "My QR", target_url: rawValue, fg_color: fg, bg_color: bg } });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShortUrl(`${origin}/r/${(row as { short_id: string }).short_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create dynamic QR");
    } finally {
      setCreating(false);
    }
  }

  async function copyShort() {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }



  async function downloadPNG() {
    const dataUrl = await QRCode.toDataURL(value || " ", {
      errorCorrectionLevel: level, margin: 2, width: 1024,
      color: { dark: fg, light: bg },
    });
    triggerDownload(dataUrl, "qr.png");
  }

  async function downloadPDF() {
    const dataUrl = await QRCode.toDataURL(value || " ", {
      errorCorrectionLevel: level, margin: 2, width: 1024,
      color: { dark: fg, light: bg },
    });
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const qrSize = 320;
    doc.setFontSize(18);
    doc.text("NxtQR — QR Code", pageW / 2, 60, { align: "center" });
    doc.addImage(dataUrl, "PNG", (pageW - qrSize) / 2, 100, qrSize, qrSize);
    doc.setFontSize(10);
    doc.setTextColor(120);
    const label = (value.split("\n")[0] || "").slice(0, 90);
    if (label) doc.text(label, pageW / 2, 100 + qrSize + 30, { align: "center" });
    doc.save("qr.pdf");
  }

  function downloadSVG() {
    const svg = svgWrapRef.current?.querySelector("svg");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    triggerDownload(url, "qr.svg");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <section className="bg-hero border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-sm text-accent font-medium">Generator</div>
          <h1 className="mt-2 text-4xl md:text-5xl font-semibold">Create your QR in seconds</h1>
          <p className="mt-3 text-muted-foreground max-w-xl">Pick a type, fill the details, customize, and download.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 grid lg:grid-cols-[1fr_420px] gap-8">
        {/* Left */}
        <div className="space-y-8">
          {/* Mode toggle */}
          <div>
            <div className="text-sm font-medium mb-3">QR Mode</div>
            <div className="inline-flex p-1 rounded-xl border border-border bg-card/60">
              <button
                onClick={() => setMode("static")}
                className={`px-4 h-9 rounded-lg text-sm transition ${mode === "static" ? "bg-glow text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground"}`}
              >
                Static
              </button>
              <button
                onClick={() => setMode("dynamic")}
                className={`px-4 h-9 rounded-lg text-sm inline-flex items-center gap-1.5 transition ${mode === "dynamic" ? "bg-glow text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="w-3.5 h-3.5" /> Dynamic
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "static"
                ? "Encodes content directly into the QR. Works offline, cannot be edited or tracked."
                : "Encodes a short link that redirects to your target. Editable anytime, with scan analytics."}
            </p>
          </div>

          {/* Type selector */}
          <div>
            <div className="text-sm font-medium mb-3">QR Type</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {types.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => switchType(key)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs transition ${
                    type === key ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="text-sm font-medium">Content</div>
            <FieldsFor type={type} fields={fields} onChange={update} />
          </div>

          {/* Customization */}
          <div className="rounded-2xl border border-border bg-card p-6 grid sm:grid-cols-2 gap-5">
            <div className="col-span-full text-sm font-medium">Design</div>
            <ColorInput label="Foreground" value={fg} onChange={setFg} />
            <ColorInput label="Background" value={bg} onChange={setBg} />
            <div>
              <label className="text-xs text-muted-foreground">Size ({size}px)</label>
              <input type="range" min={160} max={400} value={size} onChange={(e) => setSize(+e.target.value)}
                className="w-full accent-[var(--primary)]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Error correction</label>
              <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm">
                <option value="L">L — Low (7%)</option>
                <option value="M">M — Medium (15%)</option>
                <option value="Q">Q — Quartile (25%)</option>
                <option value="H">H — High (30%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right - preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm font-medium mb-4">Preview</div>
            <div ref={svgWrapRef} className="grid place-items-center rounded-xl p-6" style={{ backgroundColor: bg }}>
              <QRCodeSVG value={value || " "} size={size} level={level} fgColor={fg} bgColor={bg} />
            </div>
            <div className="mt-3 text-xs font-mono text-muted-foreground truncate">
              {value.split("\n")[0] || "—"}
            </div>

            {mode === "dynamic" && (
              <div className="mt-5 rounded-xl border border-border bg-background/50 p-4 space-y-3">
                {!shortUrl ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">QR name</label>
                      <input value={name} onChange={(e) => setName(e.target.value)}
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm"
                        placeholder="Campaign / label" />
                    </div>
                    {signedIn === false ? (
                      <Link to="/auth"
                        className="inline-flex w-full items-center justify-center h-11 rounded-xl bg-glow text-primary-foreground text-sm font-medium shadow-brand">
                        Sign in to create dynamic QR
                      </Link>
                    ) : (
                      <button
                        onClick={createDynamic}
                        disabled={!canDynamic || creating || signedIn === null}
                        className="inline-flex w-full items-center justify-center gap-1.5 h-11 rounded-xl bg-glow text-primary-foreground text-sm font-medium shadow-brand disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4" /> {creating ? "Creating…" : "Create dynamic QR"}
                      </button>
                    )}
                    {!canDynamic && (
                      <p className="text-xs text-muted-foreground">Dynamic QR requires an https:// target. This content type isn't a URL.</p>
                    )}
                    {err && <p className="text-xs text-destructive">{err}</p>}
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">Short link (editable in Dashboard)</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate text-xs bg-input border border-border rounded-lg px-3 h-10 inline-flex items-center">{shortUrl}</code>
                      <button onClick={copyShort}
                        className="h-10 w-10 grid place-items-center rounded-lg border border-border hover:bg-secondary">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <Link to="/dashboard" className="text-xs text-primary underline">Manage in Dashboard →</Link>
                  </>
                )}
              </div>
            )}


            <div className="mt-5 grid grid-cols-3 gap-2">
              <button onClick={downloadPNG}
                className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-glow text-primary-foreground text-sm font-medium shadow-brand hover:opacity-90 transition">
                <Download className="w-4 h-4" /> PNG
              </button>
              <button onClick={downloadSVG}
                className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-sm hover:bg-secondary transition">
                <Download className="w-4 h-4" /> SVG
              </button>
              <button onClick={downloadPDF}
                className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-sm hover:bg-secondary transition">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg bg-input border border-border cursor-pointer" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 px-3 rounded-lg bg-input border border-border text-sm font-mono" />
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
    </div>
  );
}

function FieldsFor({ type, fields, onChange }: { type: QRType; fields: Record<string, string>; onChange: (k: string, v: string) => void }) {
  switch (type) {
    case "url":
      return <Input label="Website URL" value={fields.url} onChange={(v) => onChange("url", v)} placeholder="https://example.com" />;
    case "text":
      return (
        <div>
          <label className="text-xs text-muted-foreground">Text</label>
          <textarea value={fields.text ?? ""} onChange={(e) => onChange("text", e.target.value)}
            rows={4} className="mt-1 w-full p-3 rounded-lg bg-input border border-border text-sm" placeholder="Any text..." />
        </div>
      );
    case "whatsapp":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Phone (with country)" value={fields.phone} onChange={(v) => onChange("phone", v)} placeholder="919999999999" />
          <Input label="Message" value={fields.msg} onChange={(v) => onChange("msg", v)} placeholder="Hello!" />
        </div>
      );
    case "phone":
      return <Input label="Phone number" value={fields.phone} onChange={(v) => onChange("phone", v)} placeholder="+91 99999 99999" />;
    case "email":
      return (
        <div className="grid gap-4">
          <Input label="Email" value={fields.email} onChange={(v) => onChange("email", v)} placeholder="hello@nxtqr.app" />
          <Input label="Subject" value={fields.subject} onChange={(v) => onChange("subject", v)} />
          <Input label="Body" value={fields.body} onChange={(v) => onChange("body", v)} />
        </div>
      );
    case "sms":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Phone" value={fields.phone} onChange={(v) => onChange("phone", v)} />
          <Input label="Message" value={fields.msg} onChange={(v) => onChange("msg", v)} />
        </div>
      );
    case "maps":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Latitude" value={fields.lat} onChange={(v) => onChange("lat", v)} placeholder="12.9716" />
          <Input label="Longitude" value={fields.lng} onChange={(v) => onChange("lng", v)} placeholder="77.5946" />
        </div>
      );
    case "upi":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="UPI ID" value={fields.pa} onChange={(v) => onChange("pa", v)} placeholder="name@bank" />
          <Input label="Payee name" value={fields.pn} onChange={(v) => onChange("pn", v)} />
          <Input label="Amount (optional)" value={fields.am} onChange={(v) => onChange("am", v)} />
          <Input label="Note (optional)" value={fields.tn} onChange={(v) => onChange("tn", v)} />
        </div>
      );
    case "wifi":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Network (SSID)" value={fields.ssid} onChange={(v) => onChange("ssid", v)} />
          <Input label="Password" value={fields.password} onChange={(v) => onChange("password", v)} />
          <div>
            <label className="text-xs text-muted-foreground">Encryption</label>
            <select value={fields.enc ?? "WPA"} onChange={(e) => onChange("enc", e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm">
              <option value="WPA">WPA / WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None</option>
            </select>
          </div>
        </div>
      );
    case "vcard":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="First name" value={fields.fn} onChange={(v) => onChange("fn", v)} />
          <Input label="Last name" value={fields.ln} onChange={(v) => onChange("ln", v)} />
          <Input label="Organization" value={fields.org} onChange={(v) => onChange("org", v)} />
          <Input label="Title" value={fields.title} onChange={(v) => onChange("title", v)} />
          <Input label="Phone" value={fields.tel} onChange={(v) => onChange("tel", v)} placeholder="+91 99999 99999" />
          <Input label="Email" value={fields.email} onChange={(v) => onChange("email", v)} />
          <Input label="Website" value={fields.url} onChange={(v) => onChange("url", v)} placeholder="https://" />
          <Input label="Address" value={fields.adr} onChange={(v) => onChange("adr", v)} />
        </div>
      );
  }
}

function defaultsFor(t: QRType): Record<string, string> {
  switch (t) {
    case "url": return { url: "https://nxtqr.app" };
    case "text": return { text: "Hello from NxtQR" };
    case "vcard": return { fn: "Ada", ln: "Lovelace", org: "NxtQR", title: "Founder", tel: "+919999999999", email: "ada@nxtqr.app", url: "https://nxtqr.app", adr: "" };
    case "whatsapp": return { phone: "919999999999", msg: "Hi!" };
    case "phone": return { phone: "+919999999999" };
    case "email": return { email: "hello@nxtqr.app", subject: "", body: "" };
    case "sms": return { phone: "+919999999999", msg: "" };
    case "maps": return { lat: "12.9716", lng: "77.5946" };
    case "upi": return { pa: "demo@upi", pn: "NxtQR", am: "", tn: "" };
    case "wifi": return { ssid: "MyWiFi", password: "", enc: "WPA" };
  }
}

function buildValue(t: QRType, f: Record<string, string>): string {
  const enc = encodeURIComponent;
  switch (t) {
    case "url": return f.url || "";
    case "text": return f.text || "";
    case "whatsapp": return `https://wa.me/${(f.phone || "").replace(/\D/g, "")}${f.msg ? `?text=${enc(f.msg)}` : ""}`;
    case "phone": return `tel:${f.phone || ""}`;
    case "email": return `mailto:${f.email || ""}?subject=${enc(f.subject || "")}&body=${enc(f.body || "")}`;
    case "sms": return `sms:${f.phone || ""}${f.msg ? `?body=${enc(f.msg)}` : ""}`;
    case "maps": return `https://maps.google.com/?q=${f.lat || 0},${f.lng || 0}`;
    case "upi": {
      const p = new URLSearchParams();
      if (f.pa) p.set("pa", f.pa);
      if (f.pn) p.set("pn", f.pn);
      if (f.am) p.set("am", f.am);
      if (f.tn) p.set("tn", f.tn);
      p.set("cu", "INR");
      return `upi://pay?${p.toString()}`;
    }
    case "wifi": return `WIFI:T:${f.enc || "WPA"};S:${f.ssid || ""};P:${f.password || ""};;`;
    case "vcard": {
      const lines = [
        "BEGIN:VCARD", "VERSION:3.0",
        `N:${f.ln || ""};${f.fn || ""};;;`,
        `FN:${[f.fn, f.ln].filter(Boolean).join(" ")}`,
        f.org ? `ORG:${f.org}` : "",
        f.title ? `TITLE:${f.title}` : "",
        f.tel ? `TEL;TYPE=CELL:${f.tel}` : "",
        f.email ? `EMAIL:${f.email}` : "",
        f.url ? `URL:${f.url}` : "",
        f.adr ? `ADR;TYPE=WORK:;;${f.adr};;;;` : "",
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\n");
    }
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
