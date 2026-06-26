// File 3 — the one-line registration in src/modules/routes.ts.
// Mount public routes BEFORE any authed sibling (see SKILL.md "Order matters"
// and elysia-zod case 5): a global guard propagates downward to later siblings.
import Elysia from "elysia";

import { widgetRoutes } from "./widget/widget.routes";

export const routes = new Elysia({ name: "routes" })
  // .use(healthRoutes)      // public first
  // .use(...other modules)
  .use(widgetRoutes);
