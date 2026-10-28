export interface Diagnostic {
  code: string;
  message: string;
  path?: string;
  field?: string;
}

export interface ManagedDocument {
  path: string;
  metadata: Record<string, unknown>;
  id?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function makeDiagnostic(
  code: string,
  message: string,
  details: { path?: string; field?: string } = {},
): Diagnostic {
  const diagnostic: Diagnostic = { code, message };
  if (details.path !== undefined) diagnostic.path = details.path;
  if (details.field !== undefined) diagnostic.field = details.field;
  return diagnostic;
}

export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const leftKey = `${left.path ?? ""}\u0000${left.code}\u0000${left.field ?? ""}\u0000${left.message}`;
    const rightKey = `${right.path ?? ""}\u0000${right.code}\u0000${right.field ?? ""}\u0000${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

export class ConformerFailure extends Error {
  readonly diagnostics: Diagnostic[];
  readonly exitCode: 1 | 2;

  constructor(diagnostics: Diagnostic | readonly Diagnostic[], exitCode: 1 | 2 = 1) {
    const list = Array.isArray(diagnostics) ? [...diagnostics] : [diagnostics];
    super(list[0]?.message ?? "Conformer failed");
    this.name = "ConformerFailure";
    this.diagnostics = sortDiagnostics(list);
    this.exitCode = exitCode;
  }
}

export function usageFailure(message: string): ConformerFailure {
  return new ConformerFailure(makeDiagnostic("usage", message), 2);
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
