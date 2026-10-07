import { describe, expect, it } from "vitest";
import {
  isValidAddressPart,
  isValidCity,
  isValidPostcode,
  isValidStreet,
  isValidViennaCity,
  startsWithDigit,
} from "../../shared/address";

describe("isValidCity", () => {
  it.each(["Wien", "St. Pölten", "Frankfurt (Oder)", "L'Aquila", "Bad Fischau-Brunn"])(
    "accepts %j",
    (city) => {
      expect(isValidCity(city)).toBe(true);
    },
  );

  it.each(["1010 Wien", "Wien 1010", "Wien 3"])("rejects %j", (city) => {
    expect(isValidCity(city)).toBe(false);
  });
});

describe("isValidViennaCity", () => {
  it("requires Wien for Austrian postcodes starting with 1", () => {
    expect(isValidViennaCity("Wien", "1010", "AT")).toBe(true);
    expect(isValidViennaCity("Wien ", "1010", "AT")).toBe(true);
    expect(isValidViennaCity("Vienna", "1010", "AT")).toBe(false);
    expect(isValidViennaCity("wien", "1010", "AT")).toBe(false);
    expect(isValidViennaCity("Schwechat", "1300", "AT")).toBe(false);
  });

  it("does not check other postcodes or countries", () => {
    expect(isValidViennaCity("Graz", "8020", "AT")).toBe(true);
    expect(isValidViennaCity("Berlin", "10115", "DE")).toBe(true);
  });
});

describe("isValidPostcode", () => {
  it.each(["1010", "8020", "9992"])("accepts %j in Austria", (postcode) => {
    expect(isValidPostcode(postcode, "AT")).toBe(true);
  });

  it.each(["101", "10100", "A-1010", "1010 ", "1O10"])(
    "rejects %j in Austria",
    (postcode) => {
      expect(isValidPostcode(postcode, "AT")).toBe(false);
    },
  );

  it("does not check other countries", () => {
    expect(isValidPostcode("10115", "DE")).toBe(true);
    expect(isValidPostcode("SW1A 1AA", "GB")).toBe(true);
  });

  it("lets empty values through", () => {
    expect(isValidPostcode("", "AT")).toBe(true);
    expect(isValidPostcode(undefined, "AT")).toBe(true);
  });
});

describe("isValidStreet", () => {
  it.each(["Hauptstraße", "Straße des 17. Juni", "Am Hof", "Platz der 3 Linden"])(
    "accepts %j",
    (street) => {
      expect(isValidStreet(street)).toBe(true);
    },
  );

  it.each([
    "Hauptstraße 5",
    "Hauptstraße 5 ",
    "Hauptstraße 5a",
    "Hauptstraße 5A",
    "Hauptstraße 5 a",
    "Hauptstraße 5-7",
    "Hauptstraße 5/2/14",
    "Gasse 12.",
  ])("rejects %j", (street) => {
    expect(isValidStreet(street)).toBe(false);
  });

  it("lets empty values through", () => {
    expect(isValidStreet("")).toBe(true);
    expect(isValidStreet(undefined)).toBe(true);
  });
});

describe("isValidAddressPart", () => {
  it.each(["5", "5a", "12-14", "2", "14"])("accepts %j", (part) => {
    expect(isValidAddressPart(part)).toBe(true);
  });

  it.each(["5/2", "5/2/14", "Top 14", "top 14", "TOP14", "5 Top 3"])(
    "rejects %j",
    (part) => {
      expect(isValidAddressPart(part)).toBe(false);
    },
  );

  it("lets empty values through", () => {
    expect(isValidAddressPart("")).toBe(true);
    expect(isValidAddressPart(undefined)).toBe(true);
  });
});

describe("startsWithDigit", () => {
  it.each(["1", "1a", "12-14", "3 B"])("accepts %j", (part) => {
    expect(startsWithDigit(part)).toBe(true);
  });

  it.each(["a", "EG", "B1", " 1", "-1"])("rejects %j", (part) => {
    expect(startsWithDigit(part)).toBe(false);
  });

  it("lets empty values through", () => {
    expect(startsWithDigit("")).toBe(true);
    expect(startsWithDigit(undefined)).toBe(true);
  });
});
