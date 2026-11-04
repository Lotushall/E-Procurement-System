import { screen, waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { InternalGuard } from "@/app/dashboard/_components/internal-guard";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

function renderGuard() {
  return renderWithQueryClient(
    <InternalGuard>
      <p>เนื้อหาแดชบอร์ด</p>
    </InternalGuard>,
  );
}

describe("InternalGuard", () => {
  it("shows a spinner and hides the children while the user is loading, without redirecting", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    const { container } = renderGuard();

    expect(screen.queryByText("เนื้อหาแดชบอร์ด")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(container.querySelector(".h-svh")).toContainElement(screen.getByRole("status", { name: "Loading" }));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renders the children for an internal user and does not redirect", async () => {
    signInAs({ userType: "internal" });

    renderGuard();

    expect(await screen.findByText("เนื้อหาแดชบอร์ด")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-out visitor to /login and never shows the children", async () => {
    signOut();

    renderGuard();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("เนื้อหาแดชบอร์ด")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it.each(["company", "individual"] as const)(
    "redirects a %s (vendor) user to /profiles and never shows the children",
    async (userType) => {
      signInAs({ userType });

      renderGuard();

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profiles"));
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("เนื้อหาแดชบอร์ด")).not.toBeInTheDocument();
      expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    },
  );
});
