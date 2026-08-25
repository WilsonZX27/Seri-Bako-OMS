export const reliabilityFlags = {
  observation: process.env.RELIABILITY_OBSERVATION_ENABLED !== "false",
  readRetry: process.env.RELIABILITY_READ_RETRY_ENABLED !== "false",
  draftRecovery: process.env.RELIABILITY_DRAFT_RECOVERY_ENABLED !== "false",
  mutationRecovery: process.env.RELIABILITY_MUTATION_RECOVERY_ENABLED === "true",
} as const;

export function mutationRecoveryEnabled(module: string) {
  if (!reliabilityFlags.mutationRecovery) return false;
  const enabledModules = (process.env.RELIABILITY_MUTATION_MODULES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return enabledModules.includes("*") || enabledModules.includes(module);
}
