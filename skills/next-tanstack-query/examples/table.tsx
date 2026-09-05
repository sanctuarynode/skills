// Place at: apps/web/app/dashboard/things/_components/thing-table.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getThings } from "@/lib/data/things";
import { DataTable } from "@/components/ui/data-table"; // checked packages/ui first
import { ThingTableSkeleton } from "./thing-table-skeleton";

// Route-local: only this route renders this table shape. If a second route
// needs the identical UI, promote it to components/things/table/thing-table.tsx.
export function ThingTable({ orgSlug }: { orgSlug: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: [orgSlug, "things"], // identical key → reuses the prefetched cache
    queryFn: () => getThings(orgSlug),
  });

  if (error) throw error;
  if (isPending) return <ThingTableSkeleton />;
  return <DataTable data={data} />;
}
