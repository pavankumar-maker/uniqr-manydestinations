import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/file/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat;
        if (!path) return new Response("Missing path", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("qr-files")
          .createSignedUrl(path, 60 * 60); // 1 hour
        if (error || !data?.signedUrl) return new Response("Not found", { status: 404 });
        return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": "no-store" } });
      },
    },
  },
});
