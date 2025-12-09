/**
 * Centralized error handling utilities for API routes
 * Ensures safe error logging and user-friendly error messages
 */

export interface SafeError {
  message: string;
  statusCode: number;
  code?: string;
  details?: string;
}

/**
 * Safely logs errors without exposing sensitive information
 */
export function logError(
  error: unknown,
  context: {
    route?: string;
    operation?: string;
    userId?: string;
    requestId?: string;
  } = {},
): void {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorName = error instanceof Error ? error.name : "Error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Only log stack traces in development
  const logData: Record<string, unknown> = {
    error: errorMessage,
    name: errorName,
    ...context,
  };

  if (process.env.NODE_ENV === "development" && errorStack) {
    logData.stack = errorStack;
  }

  // Remove any potentially sensitive data
  const sanitizedLog = JSON.stringify(logData, (key, value) => {
    // Remove sensitive keys
    if (
      typeof value === "string" &&
      (key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("key") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("auth"))
    ) {
      return "[REDACTED]";
    }
    return value;
  });

  console.error("API Error:", sanitizedLog);
}

/**
 * Converts unknown errors to safe error objects
 */
export function toSafeError(error: unknown, defaultMessage = "An error occurred"): SafeError {
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : defaultMessage;

    return {
      message,
      statusCode: 500,
      code: "INTERNAL_ERROR",
    };
  }

  return {
    message: defaultMessage,
    statusCode: 500,
    code: "UNKNOWN_ERROR",
  };
}

/**
 * Creates a user-friendly error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = "Something went wrong. Please try again.",
  statusCode = 500,
): Response {
  const safeError = toSafeError(error, defaultMessage);

  // Log the actual error for debugging
  logError(error, {
    operation: "createErrorResponse",
  });

  return Response.json(
    {
      error: safeError.message,
      code: safeError.code,
      ...(process.env.NODE_ENV === "development" && safeError.details
        ? { details: safeError.details }
        : {}),
    },
    { status: statusCode },
  );
}

/**
 * Wraps async route handlers with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options: {
    route?: string;
    defaultMessage?: string;
    defaultStatusCode?: number;
  } = {},
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      logError(error, {
        route: options.route,
        operation: handler.name,
      });

      return createErrorResponse(
        error,
        options.defaultMessage,
        options.defaultStatusCode,
      );
    }
  }) as T;
}

/**
 * Validates error response format
 */
export function isValidErrorResponse(response: unknown): response is { error: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as { error: unknown }).error === "string"
  );
}

