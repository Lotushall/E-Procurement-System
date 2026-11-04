import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuthLayout from "@/app/(auth)/layout";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";

describe("AuthLayout", () => {
  it("wraps the page in the auth card for a signed-out visitor", async () => {
    signOut();

    renderWithQueryClient(
      <AuthLayout>
        <p>เนื้อหาหน้า</p>
      </AuthLayout>,
    );

    const content = await screen.findByText("เนื้อหาหน้า");
    expect(content.closest('[data-slot="card"]')).toBeInTheDocument();
  });

  it("sends a signed-in user home instead of showing the page", async () => {
    signInAs();

    renderWithQueryClient(
      <AuthLayout>
        <p>เนื้อหาหน้า</p>
      </AuthLayout>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("เนื้อหาหน้า")).not.toBeInTheDocument();
  });
});
