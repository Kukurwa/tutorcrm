import { NextResponse } from 'next/server';
import type { ZodError, ZodTypeAny, z } from 'zod';

import type { ApiError, ErrorCode } from '@tutorcrm/contracts';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  statusOverride?: number,
) {
  const payload: ApiError = { error: { code, message, details } };
  return NextResponse.json(payload, { status: statusOverride ?? STATUS_BY_CODE[code] });
}

export function validationErrorResponse(err: ZodError) {
  return errorResponse('VALIDATION_ERROR', 'Invalid request', err.flatten());
}

export async function parseJson<Schema extends ZodTypeAny>(
  request: Request,
  schema: Schema,
): Promise<
  { success: true; data: z.output<Schema> } | { success: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: errorResponse('VALIDATION_ERROR', 'Invalid JSON body'),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function parseSearchParams<Schema extends ZodTypeAny>(
  url: URL,
  schema: Schema,
):
  | { success: true; data: z.output<Schema> }
  | { success: false; response: NextResponse } {
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }
  return { success: true, data: parsed.data };
}
