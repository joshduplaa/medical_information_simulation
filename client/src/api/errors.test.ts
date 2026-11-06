import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { toApiError } from "./errors";

const withResponse = (status: number, data: unknown) => {
  const err = new AxiosError("fail");
  err.response = { status, data, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } };
  return err;
};

describe("toApiError", () => {
  it("uses validation messages from ProblemDetails", () => {
    expect(toApiError(withResponse(400, { title: "One or more validation errors occurred.", errors: { LotNumber: ["Lot number must be at least 8 characters"] } })).message)
      .toBe("Lot number must be at least 8 characters");
  });
  it("uses the ProblemDetails title or legacy message", () => {
    expect(toApiError(withResponse(409, { title: "Only submitted runs can be graded." })).message).toBe("Only submitted runs can be graded.");
    expect(toApiError(withResponse(409, { errorCode: 0, message: "Lot number already exists." })).message).toBe("Lot number already exists.");
  });
  it("explains network failures", () => {
    const e = toApiError(new AxiosError("Network Error"));
    expect(e.status).toBe(0);
    expect(e.message).toMatch(/Cannot reach the MIS API/);
  });
  it("falls back to status-based messages", () => {
    expect(toApiError(withResponse(403, "")).message).toMatch(/permission/);
  });
});
