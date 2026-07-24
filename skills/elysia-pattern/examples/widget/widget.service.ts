// Concrete service for the example `widget` module — composes WidgetRepo +
// WidgetPolicy (the SKILL.md trio shape) with real names, plus one
// state-transition method (`archive`). The only layer widget.routes.ts calls.
import { ForbiddenException } from "elysia-http-exception";

import { db } from "../../db";
import { WidgetPolicy } from "./widget.policy";
import { WidgetRepo } from "./widget.repo";

import type { InsertWidget, SelectWidget, UpdateWidget } from "./widget.schema";

interface Actor {
  role: string | null;
  userId: string | null;
  organizationId: string;
}

// `reason` is a machine tag for server-side logging — never put it in the
// thrown message. If your project has a masked-error/structured-logging
// helper (a client-safe message plus a hidden `reason` recorded server-side),
// prefer that here — it keeps the throw self-auditing with no extra log line
// needed. This example sticks to elysia-http-exception, already in scope, to
// stay a portable, dependency-minimal reference — log `reason` yourself if
// you don't have an equivalent helper.
function deny(_actor: Actor, _reason: string): never {
  throw new ForbiddenException("Access denied.");
}

export class WidgetService {
  private readonly repo: WidgetRepo;

  constructor(private readonly actor: Actor) {
    this.repo = new WidgetRepo(actor.organizationId);
  }

  async list(query: { limit?: number; page?: number }) {
    const decision = WidgetPolicy.canList(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);
    return this.repo.list(query);
  }

  async getById(id: string): Promise<SelectWidget | undefined> {
    const decision = WidgetPolicy.canGet(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);
    return this.repo.findById(id);
  }

  async create(body: InsertWidget): Promise<SelectWidget | undefined> {
    const decision = WidgetPolicy.canCreate(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);

    return db.transaction(async (tx) => this.repo.insert(tx, body));
  }

  async update(id: string, body: UpdateWidget): Promise<SelectWidget | undefined> {
    const decision = WidgetPolicy.canUpdate(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);

    return db.transaction(async (tx) => this.repo.update(tx, id, body));
  }

  async remove(id: string): Promise<{ id: string } | undefined> {
    const decision = WidgetPolicy.canDelete(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);

    return db.transaction(async (tx) => this.repo.remove(tx, id));
  }

  // State transition: lock the row first (in the repo), guard the
  // precondition here in JS — never bake the status into the repo's `where`.
  // `.for("update")` (inside repo.lockForUpdate) serializes concurrent
  // archive calls so only one wins.
  async archive(id: string): Promise<SelectWidget | undefined> {
    const decision = WidgetPolicy.canArchive(this.actor.role);
    if (!decision.allowed) deny(this.actor, decision.reason);

    return db.transaction(async (tx) => {
      const current = await this.repo.lockForUpdate(tx, id);
      if (!current || current.status !== "active") return undefined; // → 409 in the route
      return this.repo.setStatus(tx, id, "archived");
    });
  }
}
