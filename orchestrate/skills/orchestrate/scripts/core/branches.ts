import type { Plan, PlanTask, TaskState } from "../schemas.ts";

export function plannedBranchForTask(
  plan: Pick<Plan, "rootSlug">,
  t: Pick<PlanTask | TaskState, "name" | "type">
): string {
  return mergeWorkerTargetBranch(plan, t) ?? `orch/${plan.rootSlug}/${t.name}`;
}

export function mergeWorkerSlice(taskName: string): string | null {
  const match = /^merge-(.+)$/.exec(taskName);
  return match?.[1] ?? null;
}

export function mergeWorkerTargetBranch(
  plan: Pick<Plan, "rootSlug">,
  t: Pick<PlanTask | TaskState, "name" | "type">
): string | null {
  if (t.type !== "worker") return null;
  const slice = mergeWorkerSlice(t.name);
  return slice ? `orch/${plan.rootSlug}/${slice}` : null;
}

export function mergeWorkerSourceBranches(plan: Plan, t: PlanTask): string[] {
  if (t.type !== "worker" || !mergeWorkerSlice(t.name)) return [];
  return (t.dependsOn ?? []).flatMap(depName => {
    const dep = (plan.tasks ?? []).find(dep => dep.name === depName);
    if (!dep || dep.type !== "worker" || mergeWorkerSlice(dep.name)) return [];
    return [plannedBranchForTask(plan, dep)];
  });
}
