import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeShortId() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  target_url: z.string().url().max(2000),
  fg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0B0B12"),
  bg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#FFFFFF"),
});

export const listMyQrs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    let attempt = 0;
    while (attempt < 5) {
      const short = makeShortId();
      const { data: row, error } = await context.supabase
        .from("qr_codes")
        .insert({
          user_id: context.userId,
          name: data.name,
          short_id: short,
          target_url: data.target_url,
          fg_color: data.fg_color,
          bg_color: data.bg_color,
          is_dynamic: true,
        })
        .select()
        .single();
      if (!error) return row;
      if (!String(error.message).includes("duplicate")) throw new Error(error.message);
      attempt++;
    }
    throw new Error("Failed to allocate short id");
  });

export const updateQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(80).optional(),
      target_url: z.string().url().max(2000).optional(),
      is_active: z.boolean().optional(),
      fg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      bg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("qr_codes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("qr_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getQrStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: qr, error: qErr } = await context.supabase
      .from("qr_codes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (qErr) throw new Error(qErr.message);
    const { data: events } = await context.supabase
      .from("scan_events")
      .select("scanned_at, device, user_agent, referrer")
      .eq("qr_id", data.id)
      .order("scanned_at", { ascending: false })
      .limit(500);
    return { qr, events: events ?? [] };
  });

// Public server route helper — used by /r/$shortId
export const resolveShortAndTrack = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ shortId: z.string().min(3).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qr } = await supabaseAdmin
      .from("qr_codes")
      .select("id, target_url, is_active")
      .eq("short_id", data.shortId)
      .maybeSingle();
    if (!qr || !qr.is_active) return { url: null as string | null };

    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? null;
    const ref = req?.headers.get("referer") ?? null;
    const device = ua
      ? /mobile|android|iphone/i.test(ua)
        ? "mobile"
        : /ipad|tablet/i.test(ua)
          ? "tablet"
          : "desktop"
      : null;

    await supabaseAdmin.from("scan_events").insert({
      qr_id: qr.id,
      user_agent: ua,
      referrer: ref,
      device,
    });
    const { data: cur } = await supabaseAdmin
      .from("qr_codes")
      .select("scan_count")
      .eq("id", qr.id)
      .single();
    if (cur) {
      await supabaseAdmin
        .from("qr_codes")
        .update({ scan_count: (cur.scan_count ?? 0) + 1 })
        .eq("id", qr.id);
    }

    return { url: qr.target_url };
  });

