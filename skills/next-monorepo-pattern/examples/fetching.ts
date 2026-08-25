// Place at: apps/web/lib/data/things.ts
"use server";

import { cacheLife, cacheTag } from "next/cache";
import { log } from "@/lib/log";
import { api } from "@/lib/api"; // your typed client

// Every fetching function uses "use cache" + cacheTag + cacheLife — cache
// components is a required next.config.ts setting for this convention.
export async function getThings(orgSlug: string) {
  "use cache";
  cacheTag(`${orgSlug}:things`); // tag format: "{scope}:{resource}"
  cacheLife("hours"); // presets: minutes | hours | days | weeks | max

  const { data, error } = await api.things.get(); // GET /things

  if (error) {
    log.error({ action: "getThings", scope: orgSlug, error });
    return { error: "Failed to load things" };
  }
  return { data };
}
