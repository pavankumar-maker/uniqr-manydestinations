import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveShortAndTrack } from "@/lib/qr.functions";

export const Route = createFileRoute("/r/$shortId")({
  loader: async ({ params }) => {
    const { url } = await resolveShortAndTrack({ data: { shortId: params.shortId } });
    if (url) throw redirect({ href: url });
    return { notFound: true };
  },
  component: NotFoundPage,
  errorComponent: () => <NotFoundPage />,
});

function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background text-center px-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">Link unavailable</h1>
        <p className="mt-2 text-muted-foreground">This QR code is inactive or does not exist.</p>
        <a href="/" className="mt-6 inline-block text-primary underline">Back to NxtQR</a>
      </div>
    </div>
  );
}
