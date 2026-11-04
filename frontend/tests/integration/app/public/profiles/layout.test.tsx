import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import ProfileLayout from "@/app/(public)/profiles/layout";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("ProfileLayout", () => {
  it("wraps the page with the profile header and sidebar for a signed-in user", async () => {
    signInAs({ userType: "company" });
    server.use(
      http.get(apiUrl("/api/v1/vendor/profile"), () =>
        HttpResponse.json({ data: { verificationStatus: "approved", detail: { type: "company" }, contact: [], document: [] } }),
      ),
    );

    renderWithQueryClient(
      <ProfileLayout>
        <p>เนื้อหาหน้า</p>
      </ProfileLayout>,
    );

    expect(await screen.findByText("เนื้อหาหน้า")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ข้อมูลผู้ค้า" })).toBeInTheDocument();
    expect(screen.getByText("เอกสารประกอบ")).toBeInTheDocument();
  });

  it("does not render the page for a signed-out visitor and redirects to login", async () => {
    signOut();

    renderWithQueryClient(
      <ProfileLayout>
        <p>เนื้อหาหน้า</p>
      </ProfileLayout>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("เนื้อหาหน้า")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "ข้อมูลผู้ค้า" })).not.toBeInTheDocument();
  });
});
