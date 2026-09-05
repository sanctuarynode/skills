// Place at: apps/web/lib/action/things.ts
"use server";

import { updateTag } from "next/cache";
import { api } from "@/lib/api";
import { log } from "@/lib/log";
import type { CreateThing } from "@/lib/schema";

export async function createThing(orgSlug: string, body: CreateThing) {
  const { data, error } = await api.things.post(body);

  if (error) {
    log.error({ action: "createThing", scope: orgSlug, error }); // internal only
    throw new Error("Failed to create thing. Please try again."); // → toast text
  }

  updateTag(`${orgSlug}:things`); // invalidate the read cache — same tag as getThings
  return data;
}
