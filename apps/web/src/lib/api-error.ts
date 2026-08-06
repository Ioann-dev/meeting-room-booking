export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  /**
   * Machine-readable discriminant when the API responded with a domain
   * error body (`{ code, message }`, e.g. a `BookingErrorCode` -- see
   * `packages/shared/src/booking.ts`). Undefined for validation errors and
   * any other response shape that doesn't carry one.
   */
  readonly code: string | undefined;

  constructor(status: number, messages: string[], code?: string) {
    super(messages[0] ?? 'Request failed');
    this.status = status;
    this.messages = messages;
    this.code = code;
  }
}

interface ErrorBody {
  message?: string | string[];
  code?: string;
}

export async function throwIfError(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let messages: string[] = [`Request failed with status ${response.status}`];
  let code: string | undefined;
  try {
    const body = (await response.json()) as ErrorBody;
    if (Array.isArray(body.message)) {
      messages = body.message;
    } else if (typeof body.message === 'string') {
      messages = [body.message];
    }
    if (typeof body.code === 'string') {
      code = body.code;
    }
  } catch {
    // Response body wasn't JSON; keep the generic message above.
  }

  throw new ApiError(response.status, messages, code);
}
