import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  FILE_KIND_CONFIG,
  REQUIRED_DOCUMENTS,
  type FileKind,
} from "@/app/(public)/profiles/data/document-types";
import { useVendorProfileCompleteness } from "@/lib/vendor/profile/queries/useVendorProfileCompleteness";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import {
  makeCompanyVendorProfile,
  makeIndividualVendorProfile,
  makeVendorDocument,
} from "@/tests/fixtures/vendor-profile";
import { signInAs } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const TYPES = ["company", "individual"] as const;

describe("FILE_KIND_CONFIG", () => {
  it("accepts only PDF for pdf documents", () => {
    expect(FILE_KIND_CONFIG.pdf.accept).toBe(".pdf");
    expect(FILE_KIND_CONFIG.pdf.extensions).toEqual([".pdf"]);
    expect(FILE_KIND_CONFIG.pdf.errorMessage).toBe("ไฟล์ต้องเป็น PDF เท่านั้น");
  });

  it("accepts JPG, JPEG and PNG for image documents", () => {
    expect(FILE_KIND_CONFIG.image.accept).toBe(".jpg,.jpeg,.png");
    expect(FILE_KIND_CONFIG.image.extensions).toEqual([".jpg", ".jpeg", ".png"]);
    expect(FILE_KIND_CONFIG.image.errorMessage).toBe("ไฟล์ต้องเป็นรูปภาพ (JPG, JPEG, PNG) เท่านั้น");
  });

  it("keeps the accept attribute in sync with the validated extensions", () => {
    for (const config of Object.values(FILE_KIND_CONFIG)) {
      expect(config.accept.split(",")).toEqual(config.extensions);
    }
  });
});

describe.each(TYPES)("REQUIRED_DOCUMENTS.%s", (type) => {
  const docs = REQUIRED_DOCUMENTS[type];

  it("has no duplicate keys or labels", () => {
    expect(new Set(docs.map((d) => d.key)).size).toBe(docs.length);
    expect(new Set(docs.map((d) => d.label)).size).toBe(docs.length);
  });

  it("gives every document a key, a label and a known file kind", () => {
    const kinds = Object.keys(FILE_KIND_CONFIG) as FileKind[];
    for (const doc of docs) {
      expect(doc.key).toMatch(/^[a-z_]+$/);
      expect(doc.label.trim()).not.toBe("");
      expect(kinds).toContain(doc.fileKind);
    }
  });
});

describe("REQUIRED_DOCUMENTS contents", () => {
  it("requires all five company documents", () => {
    expect(REQUIRED_DOCUMENTS.company.map((d) => [d.key, d.required, d.fileKind])).toEqual([
      ["company_certificate", true, "pdf"],
      ["authorized_person_id", true, "image"],
      ["vat_registration", true, "pdf"],
      ["shareholder_list", true, "pdf"],
      ["financial_statement", true, "pdf"],
    ]);
  });

  it("requires the citizen id and house registration of an individual, the rest optional", () => {
    expect(REQUIRED_DOCUMENTS.individual.map((d) => [d.key, d.required, d.fileKind])).toEqual([
      ["citizen_id", true, "image"],
      ["house_registration", true, "image"],
      ["commercial_registration", false, "pdf"],
      ["vat_registration", false, "pdf"],
    ]);
  });
});

// useVendorProfileCompleteness อ่าน REQUIRED_DOCUMENTS[type].filter(required) — ตรวจว่า flag ที่นี่ตรงกับพฤติกรรมนั้นจริง
describe("required flags vs useVendorProfileCompleteness", () => {
  async function hasIncompleteDocument(profile: VendorProfile) {
    server.use(http.get(apiUrl("/api/v1/vendor/profile"), () => HttpResponse.json({ data: profile })));
    signInAs({ userType: profile.detail.type, emailVerifiedAt: "2026-01-01" });
    const { result } = renderHookWithQueryClient(() => useVendorProfileCompleteness());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result.current.hasIncompleteDocument;
  }

  const build = (type: (typeof TYPES)[number], keys: string[]) => {
    const document = keys.map((documentType, i) => makeVendorDocument({ id: i + 1, documentType }));
    return type === "company" ? makeCompanyVendorProfile({ document }) : makeIndividualVendorProfile({ document });
  };

  describe.each(TYPES)("%s", (type) => {
    const required = REQUIRED_DOCUMENTS[type].filter((d) => d.required).map((d) => d.key);

    it("is complete with exactly the required documents", async () => {
      expect(await hasIncompleteDocument(build(type, required))).toBe(false);
    });

    it.each(required)("is incomplete when required document %s is missing", async (missing) => {
      expect(await hasIncompleteDocument(build(type, required.filter((key) => key !== missing)))).toBe(true);
    });

    it("is incomplete with no documents at all", async () => {
      expect(await hasIncompleteDocument(build(type, []))).toBe(true);
    });
  });

  it("does not need the optional individual documents", async () => {
    const optional = REQUIRED_DOCUMENTS.individual.filter((d) => !d.required).map((d) => d.key);
    expect(optional.length).toBeGreaterThan(0);

    const required = REQUIRED_DOCUMENTS.individual.filter((d) => d.required).map((d) => d.key);
    expect(await hasIncompleteDocument(build("individual", required))).toBe(false);
    expect(await hasIncompleteDocument(build("individual", [...required, ...optional]))).toBe(false);
  });
});
