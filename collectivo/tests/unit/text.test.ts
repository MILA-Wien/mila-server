import { describe, expect, it } from "vitest";
import { isNotBlank } from "../../shared/text";

describe("isNotBlank", () => {
  it.each(["a", " a ", "1"])("accepts %j", (value) => {
    expect(isNotBlank(value)).toBe(true);
  });

  it.each([" ", "   ", "\t", " \n "])("rejects %j", (value) => {
    expect(isNotBlank(value)).toBe(false);
  });

  it("lets empty values through", () => {
    expect(isNotBlank("")).toBe(true);
    expect(isNotBlank(undefined)).toBe(true);
    expect(isNotBlank(null)).toBe(true);
  });
});
