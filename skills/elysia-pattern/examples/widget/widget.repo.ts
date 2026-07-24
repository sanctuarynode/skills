// Concrete repo for the example `widget` module — raw, tenant-scoped Drizzle
// access. No auth. NOT imported by widget.routes.ts — only widget.service.ts
// imports this. Extends a `TenantService` base class as the worked example
// for the SKILL.md "Scoped / multi-tenant projects" callout — swap this for
// your own scoping mechanism (or drop it entirely) if you don't need it.
import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { widget } from "../../db/schema";
import { TenantService } from "../../lib/tenant-service";

import type { Tx } from "../../lib/tx";
import type { InsertWidget, SelectWidget } from "./widget.schema";

export class WidgetRepo extends TenantService {
  static readonly returnableColumns = {
    id: widget.id,
    name: widget.name,
    description: widget.description,
    status: widget.status,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };

  async list({ limit = 100, page = 1 }: { limit?: number; page?: number }) {
    return db
      .select(WidgetRepo.returnableColumns)
      .from(widget)
      .where(this.scope(widget))
      .orderBy(desc(widget.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async findById(id: string): Promise<SelectWidget | undefined> {
    const [row] = await db
      .select(WidgetRepo.returnableColumns)
      .from(widget)
      .where(this.scope(widget, eq(widget.id, id)))
      .limit(1);
    return row;
  }

  async lockForUpdate(tx: Tx, id: string) {
    const [row] = await tx
      .select(WidgetRepo.returnableColumns)
      .from(widget)
      .where(this.scope(widget, eq(widget.id, id)))
      .for("update"); // ← serializes concurrent archive calls
    return row;
  }

  async insert(tx: Tx, body: InsertWidget) {
    const [row] = await tx
      .insert(widget)
      .values({ ...body, organizationId: this.organizationId })
      .returning(WidgetRepo.returnableColumns);
    return row;
  }

  async update(tx: Tx, id: string, body: Partial<InsertWidget>) {
    const [row] = await tx
      .update(widget)
      .set(body)
      .where(this.scope(widget, eq(widget.id, id)))
      .returning(WidgetRepo.returnableColumns);
    return row;
  }

  async remove(tx: Tx, id: string) {
    const [row] = await tx
      .delete(widget)
      .where(this.scope(widget, eq(widget.id, id)))
      .returning({ id: widget.id });
    return row;
  }

  async setStatus(tx: Tx, id: string, status: string) {
    const [row] = await tx
      .update(widget)
      .set({ status })
      .where(this.scope(widget, eq(widget.id, id)))
      .returning(WidgetRepo.returnableColumns);
    return row;
  }
}
