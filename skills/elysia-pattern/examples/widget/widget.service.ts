// Concrete service for the example `widget` module — the SKILL.md class shape
// with real names, plus one state-transition method (`archive`).
import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { widget } from "../../db/schema";

import type { InsertWidget, SelectWidget, UpdateWidget } from "./widget.schema";

export class WidgetService {
  // only the columns exposed externally — never `select *`
  private static readonly columns = {
    id: widget.id,
    name: widget.name,
    description: widget.description,
    status: widget.status,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };

  async list({ limit = 100, page = 1 }: { limit?: number; page?: number }) {
    return db
      .select(WidgetService.columns)
      .from(widget)
      .orderBy(desc(widget.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getById(id: string): Promise<SelectWidget | undefined> {
    const [row] = await db
      .select(WidgetService.columns)
      .from(widget)
      .where(eq(widget.id, id))
      .limit(1);
    return row;
  }

  async create(body: InsertWidget): Promise<SelectWidget | undefined> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(widget).values(body).returning(WidgetService.columns);
      return row;
    });
  }

  async update(id: string, body: UpdateWidget): Promise<SelectWidget | undefined> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(widget)
        .set(body)
        .where(eq(widget.id, id))
        .returning(WidgetService.columns);
      return row;
    });
  }

  async remove(id: string): Promise<{ id: string } | undefined> {
    const [row] = await db.delete(widget).where(eq(widget.id, id)).returning({ id: widget.id });
    return row;
  }

  // State transition: lock the row first, guard the precondition in JS — never
  // bake the status into the `where`. `.for("update")` serializes concurrent
  // archive calls so only one wins.
  async archive(id: string): Promise<SelectWidget | undefined> {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select(WidgetService.columns)
        .from(widget)
        .where(eq(widget.id, id))
        .for("update")
        .limit(1);

      if (!current || current.status !== "active") return undefined; // → 409 in the route

      const [updated] = await tx
        .update(widget)
        .set({ status: "archived" })
        .where(eq(widget.id, id))
        .returning(WidgetService.columns);
      return updated;
    });
  }
}
