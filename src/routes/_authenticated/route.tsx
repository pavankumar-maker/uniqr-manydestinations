import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };
    // No sign-in required — create an anonymous session on the fly.
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.user) {
      throw new Error("Unable to initialize session");
    }
    return { user: anon.user };
  },
  component: () => <Outlet />,
});
