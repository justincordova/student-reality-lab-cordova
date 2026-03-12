import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent } from "@/utils/format";

describe("formatCurrency", () => {
  it("formats a positive number as USD currency", () => {
    expect(formatCurrency(50000)).toBe("$50,000");
  });

  it("returns em dash for zero", () => {
    expect(formatCurrency(0)).toBe("—");
  });

  it("returns em dash for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("returns em dash for Infinity", () => {
    expect(formatCurrency(Infinity)).toBe("—");
  });

  it("returns em dash for NaN", () => {
    expect(formatCurrency(NaN)).toBe("—");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("formats numbers without decimal places", () => {
    expect(formatCurrency(12345.67)).toBe("$12,346");
  });
});

describe("formatPercent", () => {
  it("formats a decimal as a percentage", () => {
    expect(formatPercent(0.5)).toBe("50%");
  });

  it("formats 0 as 0%", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats 1 as 100%", () => {
    expect(formatPercent(1)).toBe("100%");
  });

  it("returns em dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });

  it("returns em dash for values greater than 1", () => {
    expect(formatPercent(1.5)).toBe("—");
  });

  it("returns em dash for negative values", () => {
    expect(formatPercent(-0.1)).toBe("—");
  });

  it("returns em dash for NaN", () => {
    expect(formatPercent(NaN)).toBe("—");
  });
});
