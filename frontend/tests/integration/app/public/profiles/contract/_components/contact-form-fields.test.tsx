import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ContactFormFields } from "@/app/(public)/profiles/contract/_components/contact-form-fields";
import type { AddContactValues } from "@/app/(public)/profiles/contract/_schemas/schema";

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

function values(): Partial<AddContactValues> {
  return JSON.parse(screen.getByTestId("values").textContent ?? "{}");
}

function Harness({
  defaults,
  errors = {},
}: {
  defaults?: Partial<AddContactValues>;
  errors?: Record<string, { type: string; message: string }>;
}) {
  const { register, control } = useForm<AddContactValues>({
    defaultValues: {
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      lineId: "",
      otherContact: "",
      isMainContact: false,
      ...defaults,
    },
  });
  const values = useWatch({ control });
  return (
    <>
      <output data-testid="values">{JSON.stringify(values)}</output>
      <ContactFormFields register={register} control={control} errors={errors} />
    </>
  );
}

describe("ContactFormFields", () => {
  it("renders every contact field and the main-contact checkbox", () => {
    render(<Harness />);

    for (const label of ["ชื่อผู้ติดต่อ", "ตำแหน่ง", "เบอร์โทร", "อีเมล", "LINE ID", "ช่องทางติดต่ออื่น ๆ"]) {
      expect(field(label)).toBeInTheDocument();
    }
    expect(field("เบอร์โทร")).toHaveAttribute("placeholder", "0XX-XXX-XXXX");
    expect(field("เบอร์โทร")).toHaveAttribute("maxlength", "12");
    expect(field("อีเมล")).toHaveAttribute("type", "email");
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).not.toBeChecked();
  });

  it("formats the phone number as the user types and stores the formatted value", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(field("เบอร์โทร"), "0812345678");

    expect(field("เบอร์โทร")).toHaveValue("081-234-5678");
    expect(values().contactPhone).toBe("081-234-5678");
  });

  it("uses the 2-3-4 grouping for a 9-digit number and drops non-digits", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(field("เบอร์โทร"), "02abc1234567");

    expect(field("เบอร์โทร")).toHaveValue("02-123-4567");
  });

  it("formats a prefilled phone number", () => {
    render(<Harness defaults={{ contactPhone: "0812345678" }} />);
    expect(field("เบอร์โทร")).toHaveValue("081-234-5678");
  });

  it("toggles the main-contact checkbox", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" }));
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).toBeChecked();
    expect(values().isMainContact).toBe(true);

    await user.click(screen.getByText("เป็นผู้ติดต่อหลัก"));
    expect(values().isMainContact).toBe(false);
  });

  it("shows field errors and flags the inputs invalid", () => {
    render(
      <Harness
        errors={{
          contactName: { type: "x", message: "กรุณากรอกชื่อผู้ติดต่อ" },
          contactPhone: { type: "x", message: "เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)" },
          contactEmail: { type: "x", message: "อีเมลไม่ถูกต้อง" },
        }}
      />,
    );

    expect(screen.getByText("กรุณากรอกชื่อผู้ติดต่อ")).toBeInTheDocument();
    expect(screen.getByText("เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)")).toBeInTheDocument();
    expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(field("ชื่อผู้ติดต่อ")).toHaveAttribute("aria-invalid", "true");
    expect(field("เบอร์โทร")).toHaveAttribute("aria-invalid", "true");
    expect(field("ตำแหน่ง")).not.toHaveAttribute("aria-invalid", "true");
  });
});
