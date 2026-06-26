// Concrete schema for the example `widget` module — drizzle-zod, no placeholders.
// Demonstrates the date/null coercions the elysia-zod skill prescribes.
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { widget } from "../../db/schema";

export const selectWidgetSchema = createSelectSchema(widget).extend({
  // createSelectSchema infers z.date(); JSON transmits dates as strings → coerce.
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // nullable column → .nullable(), not bare .optional() (which only allows undefined).
  description: z.string().nullable(),
});

export const createWidgetSchema = createInsertSchema(widget)
  .pick({ name: true, description: true })
  .extend({
    description: z.string().nullable().optional(),
  });

export const updateWidgetSchema = createWidgetSchema.partial();

export type SelectWidget = z.infer<typeof selectWidgetSchema>;
export type InsertWidget = z.infer<typeof createWidgetSchema>;
export type UpdateWidget = z.infer<typeof updateWidgetSchema>;
