import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/api-error";

const FALLBACK_MESSAGE = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

function axiosErrorWith(data: unknown) {
  const response = { data, status: 422, statusText: "", headers: {}, config: {} } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, response);
}

describe("getErrorMessage", () => {
  it("returns the message sent by the backend", () => {
    expect(getErrorMessage(axiosErrorWith({ message: "อีเมลนี้ถูกใช้งานแล้ว" }))).toBe("อีเมลนี้ถูกใช้งานแล้ว");
  });

  it("falls back when the response has no message", () => {
    expect(getErrorMessage(axiosErrorWith({ errors: {} }))).toBe(FALLBACK_MESSAGE);
  });

  it("falls back when the request never got a response", () => {
    expect(getErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(FALLBACK_MESSAGE);
  });

  it("falls back for errors that are not from axios", () => {
    expect(getErrorMessage(new Error("boom"))).toBe(FALLBACK_MESSAGE);
    expect(getErrorMessage("boom")).toBe(FALLBACK_MESSAGE);
  });
});
