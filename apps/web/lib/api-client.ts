import { apiErrorSchema, type ApiError, type ErrorCode } from '@tutorcrm/contracts';

export class ApiClientError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, searchParams?: RequestOptions['searchParams']): string {
  if (!searchParams) return path;
  const entries = Object.entries(searchParams).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.set(k, String(v));
  return `${path}?${qs.toString()}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, searchParams, headers, ...init } = options;

  const res = await fetch(buildUrl(path, searchParams), {
    ...init,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = await res.json();
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiClientError(
        parsed.data.error.code,
        parsed.data.error.message,
        res.status,
        parsed.data.error.details,
      );
    }
    throw new ApiClientError(
      'INTERNAL_ERROR',
      `Request failed with status ${res.status}`,
      res.status,
      payload,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiClientError) {
    return { error: { code: err.code, message: err.message, details: err.details } };
  }
  if (err instanceof Error) {
    return { error: { code: 'INTERNAL_ERROR', message: err.message } };
  }
  return { error: { code: 'INTERNAL_ERROR', message: 'Unknown error' } };
}
