import { describe, expect, it } from "vitest";
import { loginUrlForCurrentPage, postLoginPath, safeRedirectPath } from "@/lib/auth/redirect";
import { setUrl } from "@/tests/mocks/next-navigation";

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/dashboard/tors/detail?id=7", "/profiles"])("keeps the in-site path %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  // กัน open redirect: ต้องเป็น path ในเว็บเท่านั้น
  it.each([
    ["missing", null],
    ["empty", ""],
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["relative path", "dashboard"],
    ["javascript URL", "javascript:alert(1)"],
  ])("rejects a %s", (_name, value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });
});

describe("loginUrlForCurrentPage", () => {
  it("remembers the current path and query in ?redirect=", () => {
    setUrl("/dashboard/tors/detail?id=7");

    expect(loginUrlForCurrentPage()).toBe("/login?redirect=%2Fdashboard%2Ftors%2Fdetail%3Fid%3D7");
  });

  it("is the plain login page from the home page", () => {
    setUrl("/");

    expect(loginUrlForCurrentPage()).toBe("/login");
  });
});

describe("postLoginPath", () => {
  it("goes back to the remembered page", () => {
    setUrl("/login?redirect=%2Fdashboard%2Ftors%2Fdetail%3Fid%3D7");

    expect(postLoginPath()).toBe("/dashboard/tors/detail?id=7");
  });

  it("goes home without a redirect", () => {
    setUrl("/login");

    expect(postLoginPath()).toBe("/");
  });

  it("goes home when the redirect points off the site", () => {
    setUrl("/login?redirect=https%3A%2F%2Fevil.example");

    expect(postLoginPath()).toBe("/");
  });
});
