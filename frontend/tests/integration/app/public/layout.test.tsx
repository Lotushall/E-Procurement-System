import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicLayout from "@/app/(public)/layout";
import { signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";

describe("PublicLayout", () => {
  it("renders the site navbar around the page content inside main", async () => {
    signOut();

    renderWithQueryClient(
      <PublicLayout>
        <p>เนื้อหาหน้า</p>
      </PublicLayout>,
    );

    expect(screen.getByRole("main")).toContainElement(screen.getByText("เนื้อหาหน้า"));
    expect(screen.getByText("Lotushall Mining")).toBeInTheDocument();
    expect(await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" })).not.toHaveLength(0);
  });
});
