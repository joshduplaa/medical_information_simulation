import axios from "axios";

/** Error shown to the user. `status` is the HTTP status when there was one (0 = network failure). */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** Turns an axios error (ProblemDetails, validation errors, or the legacy {message} shape) into an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return new ApiError("Cannot reach the MIS API. Check that it is running and that VITE_API_BASE_URL is correct.", 0);
    }
    const { status, data } = err.response;
    if (data && typeof data === "object") {
      const d = data as { title?: string; message?: string; errors?: Record<string, string[]> };
      if (d.errors && Object.keys(d.errors).length > 0) {
        const messages = Object.values(d.errors).flat().filter(Boolean);
        if (messages.length) return new ApiError(messages.join(" "), status);
      }
      if (d.message) return new ApiError(d.message, status);
      if (d.title) return new ApiError(d.title, status);
    }
    if (typeof data === "string" && data.length > 0 && data.length < 300) return new ApiError(data, status);
    if (status === 401) return new ApiError("Your session has expired. Please sign in again.", status);
    if (status === 403) return new ApiError("You do not have permission to do that.", status);
    if (status === 404) return new ApiError("Not found.", status);
    return new ApiError(`Request failed (${status}).`, status);
  }
  return new ApiError(err instanceof Error ? err.message : "Unexpected error.", -1);
}
