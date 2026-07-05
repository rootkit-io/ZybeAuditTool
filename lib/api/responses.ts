import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      fields: error.flatten().fieldErrors
    },
    { status: 400 }
  );
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
