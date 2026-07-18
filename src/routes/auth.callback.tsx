import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "Completing sign in — UniQR" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing your secure sign in...");

  useEffect(() => {
    let isMounted = true;

    async function finishSignIn() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          navigate({ to: "/dashboard", replace: true });
        }
      });

      window.setTimeout(() => {
        if (isMounted) setMessage("Sign in is taking longer than expected. Please return to the sign-in page and try again.");
      }, 3500);

      return () => listener.subscription.unsubscribe();
    }

    const cleanupPromise = finishSignIn();

    return () => {
      isMounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [navigate]);

  return (
    <main className="min-h-dvh grid place-items-center bg-background px-6">
      <section className="w-full max-w-sm text-center">
        <Link to="/" className="mx-auto mb-6 flex w-fit items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-glow shadow-brand">
            <QrCode className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold">UniQR</span>
        </Link>
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <h1 className="font-display text-2xl font-semibold">Signing you in</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link to="/auth" className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}