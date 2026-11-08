import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  isValidCountryCode,
} from "../../shared/countries";

describe("COUNTRY_CODES", () => {
  it("contains the 249 ISO 3166-1 countries plus Kosovo, without duplicates", () => {
    expect(COUNTRY_CODES).toHaveLength(250);
    expect(new Set(COUNTRY_CODES).size).toBe(250);
    expect(COUNTRY_CODES).toContain("XK");
  });

  it("only contains two-letter uppercase codes", () => {
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has names in German and English for every code", () => {
    for (const locale of ["de", "en"]) {
      const names = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
      for (const code of COUNTRY_CODES) {
        expect(names.of(code), `${locale}:${code}`).toBeTruthy();
      }
    }
  });

  it("defaults to Austria", () => {
    expect(DEFAULT_COUNTRY_CODE).toBe("AT");
  });
});

describe("isValidCountryCode", () => {
  it.each(["AT", "DE", "XK"])("accepts %j", (code) => {
    expect(isValidCountryCode(code)).toBe(true);
  });

  it.each(["at", "AUT", "Österreich", "Austria", "EU", "", undefined, null])(
    "rejects %j",
    (code) => {
      expect(isValidCountryCode(code)).toBe(false);
    },
  );
});
