import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useVendorProfileCompleteness } from "@/lib/vendor/profile/queries/useVendorProfileCompleteness";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import {
  makeCompanyVendorProfile,
  makeIndividualVendorProfile,
  makeVendorContact,
  makeVendorDocument,
} from "@/tests/fixtures/vendor-profile";
import { signInAs } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const COMPANY_DOCS = [
  "company_certificate",
  "authorized_person_id",
  "vat_registration",
  "shareholder_list",
  "financial_statement",
].map((documentType, i) => makeVendorDocument({ id: i + 1, documentType }));

const INDIVIDUAL_DOCS = ["citizen_id", "house_registration"].map((documentType, i) =>
  makeVendorDocument({ id: i + 1, documentType }),
);

function serveVendor(profile: VendorProfile | null) {
  server.use(
    http.get(apiUrl("/api/v1/vendor/profile"), () =>
      profile ? HttpResponse.json({ data: profile }) : HttpResponse.json({}, { status: 404 }),
    ),
  );
}

async function renderCompleteness(userType: "company" | "individual" = "company") {
  signInAs({ userType, emailVerifiedAt: "2026-01-01" });
  const rendered = renderHookWithQueryClient(() => useVendorProfileCompleteness());
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered.result.current;
}

describe("useVendorProfileCompleteness", () => {
  it("reports nothing incomplete for a full company vendor", async () => {
    serveVendor(makeCompanyVendorProfile({ document: COMPANY_DOCS }));
    const state = await renderCompleteness();
    expect(state).toEqual({
      isLoading: false,
      hasVertifyEmail: false,
      hasIncompleteAddress: false,
      hasIncompleteContact: false,
      hasIncompleteDocument: false,
    });
  });

  it("is loading and flags nothing before data arrives", () => {
    signInAs({ userType: "company" });
    serveVendor(makeCompanyVendorProfile());
    const { result } = renderHookWithQueryClient(() => useVendorProfileCompleteness());
    expect(result.current).toEqual({
      isLoading: true,
      hasVertifyEmail: false,
      hasIncompleteAddress: false,
      hasIncompleteContact: false,
      hasIncompleteDocument: false,
    });
  });

  it("flags an unverified email", async () => {
    signInAs({ userType: "company", emailVerifiedAt: null });
    serveVendor(makeCompanyVendorProfile({ document: COMPANY_DOCS }));
    const { result } = renderHookWithQueryClient(() => useVendorProfileCompleteness());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasVertifyEmail).toBe(true);
  });

  describe.each([
    ["address", { address: "" }],
    ["province", { province: "" }],
    ["postalCode", { postalCode: "" }],
  ])("company missing %s", (_name, detail) => {
    it("marks the address incomplete only", async () => {
      serveVendor(makeCompanyVendorProfile({ detail, document: COMPANY_DOCS }));
      const state = await renderCompleteness();
      expect(state.hasIncompleteAddress).toBe(true);
      expect(state.hasIncompleteContact).toBe(false);
      expect(state.hasIncompleteDocument).toBe(false);
    });
  });

  it("marks an individual vendor's address incomplete when province is blank", async () => {
    serveVendor(makeIndividualVendorProfile({ detail: { province: "" }, document: INDIVIDUAL_DOCS }));
    const state = await renderCompleteness("individual");
    expect(state.hasIncompleteAddress).toBe(true);
    expect(state.hasIncompleteDocument).toBe(false);
  });

  describe.each([
    ["no contacts", []],
    ["a nameless first contact", [makeVendorContact({ contactName: "" })]],
    ["a first contact without email", [makeVendorContact({ contactEmail: "" })]],
    ["a first contact without phone", [makeVendorContact({ contactPhone: "" })]],
  ])("with %s", (_name, contact) => {
    it("marks the contact incomplete", async () => {
      serveVendor(makeCompanyVendorProfile({ contact, document: COMPANY_DOCS }));
      const state = await renderCompleteness();
      expect(state.hasIncompleteContact).toBe(true);
      expect(state.hasIncompleteAddress).toBe(false);
    });
  });

  it("marks the contact incomplete when the contact list is missing", async () => {
    serveVendor(makeCompanyVendorProfile({ contact: undefined as never, document: COMPANY_DOCS }));
    const state = await renderCompleteness();
    expect(state.hasIncompleteContact).toBe(true);
  });

  it("marks documents incomplete when one required company document is missing", async () => {
    serveVendor(makeCompanyVendorProfile({ document: COMPANY_DOCS.slice(1) }));
    const state = await renderCompleteness();
    expect(state.hasIncompleteDocument).toBe(true);
  });

  it("marks documents incomplete when the document list is absent", async () => {
    serveVendor(makeCompanyVendorProfile({ document: undefined }));
    const state = await renderCompleteness();
    expect(state.hasIncompleteDocument).toBe(true);
  });

  it("marks an individual incomplete when a required document is missing", async () => {
    serveVendor(makeIndividualVendorProfile({ document: INDIVIDUAL_DOCS.slice(0, 1) }));
    const state = await renderCompleteness("individual");
    expect(state.hasIncompleteDocument).toBe(true);
  });

  it("ignores optional individual documents", async () => {
    serveVendor(makeIndividualVendorProfile({ document: INDIVIDUAL_DOCS }));
    const state = await renderCompleteness("individual");
    expect(state.hasIncompleteDocument).toBe(false);
  });

  it("marks address, contact and documents incomplete when the vendor has no profile", async () => {
    serveVendor(null);
    const state = await renderCompleteness();
    expect(state).toMatchObject({
      hasIncompleteAddress: true,
      hasIncompleteContact: true,
      hasIncompleteDocument: true,
    });
  });

  // useVendorProfile(user?.userType !== "internal") เปิดใช้งานระหว่าง user ยังโหลด (undefined !== "internal") จึงยิง request ก่อนรู้ว่าเป็น internal
  it.skip("BUG: fetches the vendor profile for internal users while the user is still loading — lib/vendor/profile/queries/useVendorProfileCompleteness.ts:15", async () => {
    const spy = vi.fn(() => HttpResponse.json({ data: makeCompanyVendorProfile() }));
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), spy));
    signInAs({ userType: "internal", emailVerifiedAt: null });

    const { result } = renderHookWithQueryClient(() => useVendorProfileCompleteness());
    // user โหลดเสร็จแล้ว (flag อีเมลขึ้น) แต่ไม่มีการเรียก vendor profile
    await waitFor(() => expect(result.current.hasVertifyEmail).toBe(true));

    expect(spy).not.toHaveBeenCalled();
  });

  // query ที่ถูก disable (internal) ค้างสถานะ pending จึงทำให้ isLoading เป็น true ตลอด
  // ต้องแก้คู่กับ B1 (:15): handler ค้างไว้ — ถ้า request ยังหลุดออกไป (B1) query จะ pending และ test นี้ยัง fail
  it.skip("BUG: isLoading stays true for internal users because the disabled vendor query stays pending — lib/vendor/profile/queries/useVendorProfileCompleteness.ts:40 (fix together with :15)", async () => {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => new Promise<never>(() => {})));
    signInAs({ userType: "internal", emailVerifiedAt: "2026-01-01" });

    const { result } = renderHookWithQueryClient(() => useVendorProfileCompleteness());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
