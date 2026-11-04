import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { isNotFoundError, isPositiveId } from "@/lib/detail-page";

function axiosErrorWithStatus(status: number) {
  return new AxiosError("failed", "ERR", undefined, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("isPositiveId", () => {
  it.each([1, 7, 12345])("accepts %s", (id) => {
    expect(isPositiveId(id)).toBe(true);
  });

  it.each([0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (id) => {
    expect(isPositiveId(id)).toBe(false);
  });
});

describe("isNotFoundError", () => {
  it("is true for a 404 response", () => {
    expect(isNotFoundError(axiosErrorWithStatus(404))).toBe(true);
  });

  it.each([403, 500, 503])("is false for a %s response", (status) => {
    expect(isNotFoundError(axiosErrorWithStatus(status))).toBe(false);
  });

  it("is false for a network error with no response and for a non-axios error", () => {
    expect(isNotFoundError(new AxiosError("Network Error"))).toBe(false);
    expect(isNotFoundError(new Error("boom"))).toBe(false);
  });
});
