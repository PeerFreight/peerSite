// Open-redirect guard on ?next=: only same-site paths survive; anything an
// attacker could use to bounce a signed-in user off-site falls back.
import { describe, expect, it } from "vitest";
import { safeNext } from "../lib/portal/safe-next";

describe("safeNext", () => {
  it("passes ordinary same-site paths through", () => {
    expect(safeNext("/quotes")).toBe("/quotes");
    expect(safeNext("/loads/abc?tab=docs")).toBe("/loads/abc?tab=docs");
    expect(safeNext("/")).toBe("/");
  });

  it("rejects absolute and protocol-relative escapes", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("http://evil.com/phish")).toBe("/dashboard");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext("javascript:alert(1)")).toBe("/dashboard");
  });

  it("falls back on empty input and honors a custom fallback", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
    expect(safeNext("evil.com", "/onboarding")).toBe("/onboarding");
  });
});
