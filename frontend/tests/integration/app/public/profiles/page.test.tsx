import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Account from "@/app/(public)/profiles/page";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";

describe("profiles page (Account)", () => {
  it("shows the account info and change password sections", async () => {
    signInAs({ userType: "company", username: "vendor1", email: "v@example.com" });

    renderWithQueryClient(<Account />);

    expect(screen.getByRole("heading", { name: "ข้อมูลบัญชี" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "เปลี่ยนรหัสผ่าน" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("vendor1")).toBeInTheDocument();
  });
});
