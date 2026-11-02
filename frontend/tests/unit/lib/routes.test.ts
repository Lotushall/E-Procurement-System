import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";

describe("routes", () => {
  it("builds detail and edit urls with the id as a query param", () => {
    expect(routes.dashboards.tors.detail(12)).toBe("/dashboard/tors/detail?id=12");
    expect(routes.dashboards.tender_project.detail("5")).toBe("/dashboard/tender-projects/detail?id=5");
    expect(routes.dashboards.tender_project.edit(5)).toBe("/dashboard/tender-projects/edit?id=5");
    expect(routes.dashboards.vendors.detail(3)).toBe("/dashboard/vendors/detail?id=3");
    expect(routes.dashboards.user.detail(8)).toBe("/dashboard/users/detail?id=8");
    expect(routes.dashboards.user.edit(8)).toBe("/dashboard/users/edit?id=8");
  });

  describe("internal_employees.index", () => {
    it("has no query string without a search", () => {
      expect(routes.dashboards.internal_employees.index()).toBe("/dashboard/internal-employees");
      expect(routes.dashboards.internal_employees.index("")).toBe("/dashboard/internal-employees");
    });

    it("encodes the search term", () => {
      expect(routes.dashboards.internal_employees.index("สม ชาย&co")).toBe(
        `/dashboard/internal-employees?search=${encodeURIComponent("สม ชาย&co")}`,
      );
    });
  });
});
