import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it, vi } from "vitest";
import { FIELD_ERRORS_TOAST, handleServerError } from "@/lib/form/server-errors";

const FALLBACK = "บันทึกไม่สำเร็จ";

function axiosError(status: number, data: unknown) {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

type FormLike = Parameters<typeof handleServerError<Record<string, string>>>[1];

function makeForm(values: Record<string, string> = { name: "", email: "" }) {
  const form = { setError: vi.fn(), getValues: vi.fn(() => values) };
  return form as typeof form & FormLike;
}

describe("handleServerError", () => {
  it("puts each 422 message on the field the backend names and asks the user to check the form", () => {
    const form = makeForm();

    const message = handleServerError(
      axiosError(422, { message: "ข้อมูลไม่ถูกต้อง", errors: { name: ["ชื่อซ้ำ", "อื่น"], email: ["อีเมลซ้ำ"] } }),
      form,
      FALLBACK,
    );

    expect(message).toBe(FIELD_ERRORS_TOAST);
    expect(form.setError).toHaveBeenCalledTimes(2);
    expect(form.setError).toHaveBeenNthCalledWith(1, "name", { type: "server", message: "ชื่อซ้ำ" }, { shouldFocus: true });
    expect(form.setError).toHaveBeenNthCalledWith(2, "email", { type: "server", message: "อีเมลซ้ำ" }, { shouldFocus: false });
  });

  it("toasts a 422 message whose key is not a form field, and still sets the matching ones", () => {
    const form = makeForm({ password: "" });

    const message = handleServerError(
      axiosError(422, { errors: { token: ["ลิงก์หมดอายุ"], password: ["รหัสผ่านสั้นไป"] } }),
      form,
      FALLBACK,
    );

    expect(message).toBe("ลิงก์หมดอายุ");
    expect(form.setError).toHaveBeenCalledExactlyOnceWith(
      "password",
      { type: "server", message: "รหัสผ่านสั้นไป" },
      { shouldFocus: true },
    );
  });

  it.each([
    ["a 422 without errors", axiosError(422, { message: "ข้อมูลไม่ถูกต้อง" }), "ข้อมูลไม่ถูกต้อง"],
    ["a 422 with empty errors", axiosError(422, { message: "ข้อมูลไม่ถูกต้อง", errors: {} }), "ข้อมูลไม่ถูกต้อง"],
    ["a non-422 with a message", axiosError(409, { message: "ซ้ำ" }), "ซ้ำ"],
    ["a non-422 errors object", axiosError(400, { errors: { name: ["x"] } }), FALLBACK],
    ["a response without a body", axiosError(500, undefined), FALLBACK],
    ["a non-axios error", new Error("boom"), FALLBACK],
  ])("uses the backend message or the fallback for %s, touching no field", (_name, error, expected) => {
    const form = makeForm();

    expect(handleServerError(error, form, FALLBACK)).toBe(expected);
    expect(form.setError).not.toHaveBeenCalled();
  });
});
