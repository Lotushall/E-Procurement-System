import { describe, expect, it } from "vitest";
import {
  cn,
  digitsOnly,
  formatCitizenId,
  formatCurrency,
  formatPhone,
  getInitials,
  isValidPhone,
  isValidThaiId,
  maskCitizenId,
  thaiIdError,
} from "@/lib/utils";

describe("cn", () => {
  it("lets the later tailwind class win", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("john michael doe")).toBe("JM");
  });

  it("ignores extra whitespace", () => {
    expect(getInitials("  jane   doe ")).toBe("JD");
  });

  it("works with a single word", () => {
    expect(getInitials("admin")).toBe("A");
  });
});

describe("digitsOnly", () => {
  it("strips every non-digit", () => {
    expect(digitsOnly("08-1234 5678 ext.")).toBe("0812345678");
  });
});

describe("formatCitizenId", () => {
  it("formats 13 digits as X-XXXX-XXXXX-XX-X", () => {
    expect(formatCitizenId("1103700012345")).toBe("1-1037-00012-34-5");
  });

  it("formats a partial id while typing", () => {
    expect(formatCitizenId("11037")).toBe("1-1037");
  });

  it("drops digits past the 13th", () => {
    expect(formatCitizenId("110370001234599")).toBe("1-1037-00012-34-5");
  });

  it("reformats an already formatted id", () => {
    expect(formatCitizenId("1-1037-00012-34-5")).toBe("1-1037-00012-34-5");
  });
});

describe("isValidThaiId", () => {
  it.each(["1103700012346", "0105512345671", "1-1037-00012-34-6"])("accepts %j with a correct check digit", (id) => {
    expect(isValidThaiId(id)).toBe(true);
  });

  it.each([
    ["1103700012345", "wrong check digit"],
    ["0105512345678", "wrong check digit"],
    ["110370001234", "12 digits"],
    ["11037000123466", "14 digits"],
    ["", "empty"],
  ])("rejects %j (%s)", (id) => {
    expect(isValidThaiId(id)).toBe(false);
  });

  // (11 - sum % 11) % 10: เศษ 1 → check digit 0, เศษ 0 → check digit 1 (ไม่ใช่ 11)
  it.each([
    ["1103700012010", "remainder 1"],
    ["1103700012061", "remainder 0"],
  ])("accepts %j (%s)", (id) => {
    expect(isValidThaiId(id)).toBe(true);
  });
});

describe("thaiIdError", () => {
  it("returns null for a valid id", () => {
    expect(thaiIdError("1103700012346", "เลขบัตรประชาชน")).toBeNull();
  });

  it("reports the digit count before the check digit", () => {
    expect(thaiIdError("12345", "เลขบัตรประชาชน")).toBe("เลขบัตรประชาชนต้องมี 13 หลัก");
  });

  it("reports a wrong check digit", () => {
    expect(thaiIdError("1103700012345", "เลขบัตรประชาชน")).toBe("เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง");
  });
});

describe("maskCitizenId", () => {
  it("hides the middle five digits", () => {
    expect(maskCitizenId("1103700012345")).toBe("1-1037-*****-34-5");
  });
});

describe("formatPhone", () => {
  it("formats a 10-digit mobile number as 0XX-XXX-XXXX", () => {
    expect(formatPhone("0812345678")).toBe("081-234-5678");
  });

  it("formats a 9-digit landline as 0X-XXX-XXXX", () => {
    expect(formatPhone("021234567")).toBe("02-123-4567");
  });

  it("drops digits past the 10th", () => {
    expect(formatPhone("081234567899")).toBe("081-234-5678");
  });
});

describe("isValidPhone", () => {
  it.each(["021234567", "0812345678", "081-234-5678", "02 123 4567"])("accepts %j", (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });

  it.each(["", "08123456", "08123456789", "812345678", "1812345678"])("rejects %j", (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
});

describe("formatCurrency", () => {
  it("adds thousands separators", () => {
    expect(formatCurrency(45000000)).toBe("45,000,000");
  });

  it("shows satang up to two decimal places", () => {
    expect(formatCurrency(1234.567)).toBe("1,234.57");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("0");
  });
});
