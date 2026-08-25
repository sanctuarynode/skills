// Place at: apps/web/app/dashboard/things/page.tsx
import { headers } from "next/headers";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { auth } from "@/lib/auth";
import { getQueryClient } from "@/lib/query";
import { getThings } from "@/lib/data/things";
import { ThingTable } from "./_components/thing-table";
import { DialogCreateThing } from "./_components/dialog-create-thing";

// Server component — page.tsx is never "use client". Interactive pieces
// (ThingTable, DialogCreateThing) live in _components/ next to this file.
export default async function Page() {
  const { session } = await auth.api.getSession({ headers: await headers() });
  const orgSlug = session?.activeOrganizationId ?? "";

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [orgSlug, "things"],
    queryFn: () => getThings(orgSlug),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DialogCreateThing orgSlug={orgSlug} />
      <ThingTable orgSlug={orgSlug} />
    </HydrationBoundary>
  );
}
