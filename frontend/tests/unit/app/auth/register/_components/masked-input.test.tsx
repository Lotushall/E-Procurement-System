import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { MaskedInput } from "@/app/(auth)/register/_components/masked-input";
import type { RegisterValues } from "@/app/(auth)/register/_schemas/schema";
import { formatCitizenId, formatPhone } from "@/lib/utils";

function Harness({
  name = "phone",
  format = formatPhone,
  defaultValue,
  onValue,
}: {
  name?: "taxId" | "idCard" | "phone";
  format?: (value: string) => string;
  defaultValue?: unknown;
  onValue?: (value: unknown) => void;
}) {
  const { control } = useForm<RegisterValues>({
    defaultValues: { [name]: defaultValue } as Partial<RegisterValues>,
  });
  const current = useWatch({ control, name });
  onValue?.(current);

  return <MaskedInput control={control} name={name} format={format} placeholder="กรอกข้อมูล" aria-label="masked" />;
}

describe("MaskedInput", () => {
  it("formats what the user types and stores the formatted value in the form", async () => {
    const user = userEvent.setup();
    let stored: unknown;
    render(<Harness onValue={(value) => (stored = value)} />);

    await user.type(screen.getByLabelText("masked"), "0812345678");

    expect(screen.getByLabelText("masked")).toHaveValue("081-234-5678");
    expect(stored).toBe("081-234-5678");
  });

  it("uses the given format function", async () => {
    const user = userEvent.setup();
    render(<Harness name="taxId" format={formatCitizenId} />);

    await user.type(screen.getByLabelText("masked"), "1234567890123");

    expect(screen.getByLabelText("masked")).toHaveValue("1-2345-67890-12-3");
  });

  it("shows the form's current value", () => {
    render(<Harness defaultValue="081-234-5678" />);

    expect(screen.getByLabelText("masked")).toHaveValue("081-234-5678");
  });

  it("shows an empty input when the form value is not a string", () => {
    render(<Harness defaultValue={undefined} />);

    expect(screen.getByLabelText("masked")).toHaveValue("");
  });

  it("passes other props to the input", () => {
    render(<Harness />);

    expect(screen.getByPlaceholderText("กรอกข้อมูล")).toBe(screen.getByLabelText("masked"));
  });
});
