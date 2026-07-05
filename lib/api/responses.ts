import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      fields: error.flatten().fieldErrors
    },
    { status: 400 }
  );
}

export function apiError(message: string, status = 500, code = "API_ERROR", headers?: HeadersInit) {
  return NextResponse.json({ error: message, code }, { status, headers });
}
