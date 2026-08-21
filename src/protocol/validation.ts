/** Human-readable protocol error, safe to render directly in the UI. */
export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

export function describeError(err: unknown): string {
  if (err instanceof ProtocolError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
