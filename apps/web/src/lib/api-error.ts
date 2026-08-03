export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Request failed');
    this.status = status;
    this.messages = messages;
  }
}

interface ErrorBody {
  message?: string | string[];
}

export async function throwIfError(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let messages: string[] = [`Request failed with status ${response.status}`];
  try {
    const body = (await response.json()) as ErrorBody;
    if (Array.isArray(body.message)) {
      messages = body.message;
    } else if (typeof body.message === 'string') {
      messages = [body.message];
    }
  } catch {
    // Response body wasn't JSON; keep the generic message above.
  }

  throw new ApiError(response.status, messages);
}
