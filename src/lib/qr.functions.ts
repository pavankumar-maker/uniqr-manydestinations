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

const ROUTING_MODES = ["single", "rotation", "weighted", "device", "priority"] as const;
const DEVICE_FILTERS = ["any", "mobile", "tablet", "desktop"] as const;

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
      routing_mode: z.enum(ROUTING_MODES).optional(),
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
    const { data: destinations } = await context.supabase
      .from("qr_destinations")
      .select("*")
      .eq("qr_id", data.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    return { qr, events: events ?? [], destinations: destinations ?? [] };
  });

// ---- Destinations CRUD ----
export const listDestinations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ qr_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("qr_destinations")
      .select("*")
      .eq("qr_id", data.qr_id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      qr_id: z.string().uuid(),
      label: z.string().max(80).default(""),
      target_url: z.string().url().max(2000),
      weight: z.number().int().min(1).max(100).default(1),
      device_filter: z.enum(DEVICE_FILTERS).default("any"),
      priority: z.number().int().min(0).max(1000).default(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // ownership check via RLS on qr_codes join in policy
    const { error } = await context.supabase.from("qr_destinations").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      label: z.string().max(80).optional(),
      target_url: z.string().url().max(2000).optional(),
      weight: z.number().int().min(1).max(100).optional(),
      device_filter: z.enum(DEVICE_FILTERS).optional(),
      priority: z.number().int().min(0).max(1000).optional(),
      is_active: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("qr_destinations").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("qr_destinations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public resolver — multi-destination routing
export const resolveShortAndTrack = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ shortId: z.string().min(3).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qr } = await supabaseAdmin
      .from("qr_codes")
      .select("id, target_url, is_active, routing_mode, rotation_cursor")
      .eq("short_id", data.shortId)
      .maybeSingle();
    if (!qr || !qr.is_active) return { url: null as string | null };

    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? null;
    const ref = req?.headers.get("referer") ?? null;
    const device: "mobile" | "tablet" | "desktop" | null = ua
      ? /mobile|android|iphone/i.test(ua)
        ? "mobile"
        : /ipad|tablet/i.test(ua)
          ? "tablet"
          : "desktop"
      : null;

    // Load destinations
    const { data: destsRaw } = await supabaseAdmin
      .from("qr_destinations")
      .select("id, target_url, weight, device_filter, priority, is_active, created_at")
      .eq("qr_id", qr.id)
      .eq("is_active", true);
    const dests = destsRaw ?? [];

    let chosen: string = qr.target_url ?? "";
    const mode = qr.routing_mode ?? "single";

    if (dests.length > 0 && mode !== "single") {
      if (mode === "device") {
        const matches = dests.filter((d) => d.device_filter === (device ?? "desktop"));
        const fallback = dests.filter((d) => d.device_filter === "any");
        const pool = matches.length ? matches : fallback.length ? fallback : dests;
        chosen = pool[0]?.target_url ?? chosen;
      } else if (mode === "priority") {
        const sorted = [...dests].sort((a, b) => b.priority - a.priority);
        chosen = sorted[0]?.target_url ?? chosen;
      } else if (mode === "rotation") {
        const sorted = [...dests].sort((a, b) =>
          String(a.created_at).localeCompare(String(b.created_at)),
        );
        const idx = (qr.rotation_cursor ?? 0) % sorted.length;
        chosen = sorted[idx]?.target_url ?? chosen;
        await supabaseAdmin
          .from("qr_codes")
          .update({ rotation_cursor: idx + 1 })
          .eq("id", qr.id);
      } else if (mode === "weighted") {
        const total = dests.reduce((s, d) => s + Math.max(1, d.weight), 0);
        let r = Math.random() * total;
        for (const d of dests) {
          r -= Math.max(1, d.weight);
          if (r <= 0) {
            chosen = d.target_url;
            break;
          }
        }
      }
    }

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

    return { url: chosen };
  });
