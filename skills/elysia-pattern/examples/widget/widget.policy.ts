// Concrete policy for the example `widget` module — pure org-RBAC decisions,
// no DB import, unit-testable with a bare role string.
//
// checkOrgPermission wraps the ONE shared primitive every module's policy
// file wraps (../../lib/policy.ts), itself backed by whatever your project's
// RBAC source of truth is — a permissions map, a database-backed role table,
// a third-party authz library's ability-check. "widget" and its actions
// below are illustrative — a real module must first have a matching
// resource/action entry in that source of truth, or checkOrgPermission has
// nothing to check against.
import { checkOrgPermission } from "../../lib/policy";

import type { PolicyDecision } from "../../lib/policy";

export const WidgetPolicy = {
  canList: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "list"),
  canGet: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "get"),
  canCreate: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "create"),
  canUpdate: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "update"),
  canDelete: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "delete"),
  // No dedicated "archive" action — reuse "update" rather than inventing an
  // ungoverned action. Document this mapping choice wherever it's made, as
  // this comment does.
  canArchive: (role: string | null): PolicyDecision => checkOrgPermission(role, "widget", "update"),
};
