import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: inserted, error: insErr } = await context.supabase
        .from("profiles")
        .insert({ id: context.userId, display_name: "" })
        .select("id, display_name, created_at")
        .single();
      if (insErr) throw new Error(insErr.message);
      return inserted;
    }
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ display_name: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.display_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: qrs } = await context.supabase
      .from("qr_codes")
      .select("id, scan_count, is_active");
    const totalQrs = qrs?.length ?? 0;
    const activeQrs = qrs?.filter((q) => q.is_active).length ?? 0;
    const totalScans = qrs?.reduce((s, q) => s + (q.scan_count ?? 0), 0) ?? 0;
    return { totalQrs, activeQrs, totalScans };
  });
