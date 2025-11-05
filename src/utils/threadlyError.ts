export class ThreadlyApiError extends Error {
  constructor({
    message,
    code,
    status,
    data,
    url,
    method,
  }: {
    message: string;
    code?: string;
    status?: number;
    data?: unknown;
    url?: string;
    method?: string;
  }) {
    super(message);
    this.name = 'ThreadlyApiError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.url = url;
    this.method = method;
  }

  override readonly name: 'ThreadlyApiError';
  readonly code?: string;
  readonly status?: number;
  readonly data?: unknown;
  readonly url?: string;
  readonly method?: string;
}

export const isThreadlyApiError = (error: unknown): error is ThreadlyApiError =>
  error instanceof ThreadlyApiError;
