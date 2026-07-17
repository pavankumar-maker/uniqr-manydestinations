import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const presets = [
  { label: "Website", value: "https://nxtqr.app" },
  { label: "WhatsApp", value: "https://wa.me/919999999999" },
  { label: "UPI", value: "upi://pay?pa=demo@upi&pn=NxtQR&am=100" },
  { label: "vCard", value: "BEGIN:VCARD\nVERSION:3.0\nFN:Alex Doe\nORG:NxtQR\nTEL:+911234567890\nEMAIL:alex@nxtqr.app\nEND:VCARD" },
];

export function QrPreview() {
  const [value, setValue] = useState(presets[0].value);
  const [active, setActive] = useState(0);

  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-glow opacity-30 blur-3xl rounded-full" aria-hidden />
      <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-card">
        <div className="flex flex-wrap gap-2 mb-5">
          {presets.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setActive(i); setValue(p.value); }}
              className={`text-xs px-3 h-8 rounded-full border transition ${
                active === i
                  ? "bg-glow text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid place-items-center bg-background/60 rounded-xl border border-border p-6">
          <div className="p-4 rounded-xl bg-white">
            <QRCodeSVG value={value} size={200} level="H" />
          </div>
        </div>
        <div className="mt-4 text-xs font-mono text-muted-foreground truncate">
          {value.split("\n")[0]}
        </div>
      </div>
    </div>
  );
}
