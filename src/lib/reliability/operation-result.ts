export type OperationSeverity = "info" | "warning" | "error" | "critical";
export type RecoveryAction = "none" | "retry" | "refresh" | "review_fields" | "contact_owner";

export type OperationFailure = {
  ok: false;
  code: string;
  severity: OperationSeverity;
  retryable: boolean;
  recoveryAction: RecoveryAction;
  userMessage: string;
  operationId: string;
  fieldErrors?: Record<string, string>;
};

export type OperationSuccess<T> = {
  ok: true;
  data: T;
  operationId: string;
  recovered?: boolean;
};

export type OperationResult<T> = OperationSuccess<T> | OperationFailure;

export function createOperationId() {
  return crypto.randomUUID();
}

export function operationFailure(input: Omit<OperationFailure, "ok" | "operationId"> & { operationId?: string }): OperationFailure {
  return { ok: false, operationId: input.operationId ?? createOperationId(), ...input };
}

export function operationSuccess<T>(data: T, operationId = createOperationId(), recovered = false): OperationSuccess<T> {
  return { ok: true, data, operationId, recovered };
}
