import { throwApiError } from "./errors.js";

export type ResourceDependency = { type: string; count: number };

export function assertResourceIsNotInUse(
  resourceType: string,
  resourceId: string,
  dependencies: ResourceDependency[],
) {
  const activeDependencies = dependencies.filter((dependency) => dependency.count > 0);
  if (activeDependencies.length === 0) return;

  throwApiError(409, "RESOURCE_IN_USE", "Resource cannot be deleted because related data exists", {
    resourceType,
    resourceId,
    dependencies: activeDependencies,
  });
}
